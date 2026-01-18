import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getCreditAmountForPrice } from '@/lib/stripe'
import {
  upgradeToProTier,
  downgradeToFreeTier,
  addCredits,
  resetMonthlyCredits,
  getUserSubscription,
} from '@/lib/subscription'
import { getServerSupabase } from '@/lib/supabase'
import Stripe from 'stripe'

/**
 * Check if a Stripe event has already been processed (for idempotency)
 * Returns true if already processed, false if new event
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = getServerSupabase()
  const { data } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('event_id', eventId)
    .single()

  return !!data
}

/**
 * Mark a Stripe event as processed
 */
async function markEventProcessed(
  eventId: string,
  eventType: string,
  status: 'processed' | 'failed' = 'processed',
  error?: string
): Promise<void> {
  const supabase = getServerSupabase()
  await supabase.from('stripe_events').upsert({
    event_id: eventId,
    event_type: eventType,
    status,
    error: error || null,
    processed_at: new Date().toISOString(),
  }, {
    onConflict: 'event_id',
  })
}

/**
 * Log payment event to audit trail for compliance
 */
async function logPaymentAudit(
  stripeEventId: string,
  eventType: string,
  userEmail: string | null,
  amountCents: number | null,
  status: 'success' | 'failed' | 'pending',
  actionTaken: string,
  metadata?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  const supabase = getServerSupabase()

  try {
    await supabase.from('payment_audit_log').insert({
      stripe_event_id: stripeEventId,
      event_type: eventType,
      user_email: userEmail,
      amount_cents: amountCents,
      currency: 'usd',
      status,
      action_taken: actionTaken,
      metadata: metadata || {},
      error_message: errorMessage || null,
    })
  } catch (err) {
    // Don't fail the webhook if audit logging fails
    console.error('[Webhook] Failed to log payment audit:', err)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Idempotency check - skip if already processed
  try {
    const alreadyProcessed = await isEventProcessed(event.id)
    if (alreadyProcessed) {
      console.log(`[Webhook] Event ${event.id} already processed, skipping`)
      return NextResponse.json({ received: true, duplicate: true })
    }
  } catch (err) {
    // If we can't check (table doesn't exist yet), continue processing
    console.warn('[Webhook] Could not check event idempotency:', err)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, event.id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription, event.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, event.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice, event.id)
        break
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    try {
      await markEventProcessed(event.id, event.type, 'processed')
    } catch (err) {
      console.warn('[Webhook] Could not mark event as processed:', err)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)

    // Mark event as failed for debugging
    try {
      await markEventProcessed(
        event.id,
        event.type,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
    } catch (err) {
      console.warn('[Webhook] Could not mark event as failed:', err)
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const userEmail = session.metadata?.user_email
  const priceType = session.metadata?.price_type

  if (!userEmail) {
    console.error('No user email in checkout metadata')
    await logPaymentAudit(eventId, 'checkout.session.completed', null, session.amount_total, 'failed', 'none', { session_id: session.id }, 'No user email in metadata')
    return
  }

  if (priceType === 'pro') {
    // Subscription checkout - upgrade to pro
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    await upgradeToProTier(userEmail, customerId, subscriptionId)
    await logPaymentAudit(eventId, 'checkout.session.completed', userEmail, session.amount_total, 'success', 'upgrade_to_pro', {
      session_id: session.id,
      customer_id: customerId,
      subscription_id: subscriptionId,
    })
    console.log(`[Webhook] Upgraded ${userEmail} to pro tier`)
  } else if (priceType?.startsWith('credits_')) {
    // Credit pack purchase - find amount by looking at line items
    const stripe = getStripe()
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
    const priceId = lineItems.data[0]?.price?.id

    if (priceId) {
      const creditAmount = getCreditAmountForPrice(priceId)
      if (creditAmount) {
        await addCredits(userEmail, creditAmount, 'purchase', {
          stripe_session_id: session.id,
          price_type: priceType,
        })
        await logPaymentAudit(eventId, 'checkout.session.completed', userEmail, session.amount_total, 'success', 'add_credits', {
          session_id: session.id,
          credit_amount: creditAmount,
          price_type: priceType,
        })
        console.log(`[Webhook] Added ${creditAmount} credits to ${userEmail}`)
      } else {
        await logPaymentAudit(eventId, 'checkout.session.completed', userEmail, session.amount_total, 'failed', 'add_credits', { price_id: priceId }, 'Unknown price ID')
        console.error(`[Webhook] Unknown credit pack price ID: ${priceId}`)
      }
    }
  }

  // Update stripe_customer_id if not set
  const supabase = getServerSupabase()
  const customerId = session.customer as string
  if (customerId) {
    await supabase
      .from('user_subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_email', userEmail)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, eventId: string) {
  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(subscription.customer as string)

  if (customer.deleted) return

  const userEmail = customer.metadata?.user_email || customer.email

  if (!userEmail) {
    console.error('[Webhook] No user email found for subscription update')
    await logPaymentAudit(eventId, 'customer.subscription.updated', null, null, 'failed', 'none', { subscription_id: subscription.id }, 'No user email found')
    return
  }

  // Check subscription status
  if (subscription.status === 'active') {
    // Ensure user is on pro tier
    const currentSub = await getUserSubscription(userEmail)
    if (currentSub.tier !== 'pro') {
      await upgradeToProTier(
        userEmail,
        subscription.customer as string,
        subscription.id
      )
      await logPaymentAudit(eventId, 'customer.subscription.updated', userEmail, null, 'success', 'upgrade_to_pro', {
        subscription_id: subscription.id,
        subscription_status: subscription.status,
      })
      console.log(`[Webhook] Upgraded ${userEmail} to pro tier via subscription update`)
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, eventId: string) {
  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(subscription.customer as string)

  if (customer.deleted) return

  const userEmail = customer.metadata?.user_email || customer.email

  if (!userEmail) {
    console.error('[Webhook] No user email found for subscription deletion')
    await logPaymentAudit(eventId, 'customer.subscription.deleted', null, null, 'failed', 'none', { subscription_id: subscription.id }, 'No user email found')
    return
  }

  await downgradeToFreeTier(userEmail)
  await logPaymentAudit(eventId, 'customer.subscription.deleted', userEmail, null, 'success', 'downgrade', {
    subscription_id: subscription.id,
  })
  console.log(`[Webhook] Downgraded ${userEmail} to free tier`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice, eventId: string) {
  // Only handle subscription renewals (not initial payments)
  if (invoice.billing_reason !== 'subscription_cycle') {
    return
  }

  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(invoice.customer as string)

  if (customer.deleted) return

  const userEmail = customer.metadata?.user_email || customer.email

  if (!userEmail) {
    console.error('[Webhook] No user email found for invoice')
    await logPaymentAudit(eventId, 'invoice.paid', null, invoice.amount_paid, 'failed', 'none', { invoice_id: invoice.id }, 'No user email found')
    return
  }

  // Reset monthly credits
  await resetMonthlyCredits(userEmail)
  await logPaymentAudit(eventId, 'invoice.paid', userEmail, invoice.amount_paid, 'success', 'reset_credits', {
    invoice_id: invoice.id,
    billing_reason: invoice.billing_reason,
  })
  console.log(`[Webhook] Reset monthly credits for ${userEmail}`)
}
