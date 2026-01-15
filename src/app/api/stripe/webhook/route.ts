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
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userEmail = session.metadata?.user_email
  const priceType = session.metadata?.price_type

  if (!userEmail) {
    console.error('No user email in checkout metadata')
    return
  }

  if (priceType === 'pro') {
    // Subscription checkout - upgrade to pro
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    await upgradeToProTier(userEmail, customerId, subscriptionId)
    console.log(`Upgraded ${userEmail} to pro tier`)
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
        console.log(`Added ${creditAmount} credits to ${userEmail}`)
      } else {
        console.error(`Unknown credit pack price ID: ${priceId}`)
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

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(subscription.customer as string)

  if (customer.deleted) return

  const userEmail = customer.metadata?.user_email || customer.email

  if (!userEmail) {
    console.error('No user email found for subscription update')
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
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(subscription.customer as string)

  if (customer.deleted) return

  const userEmail = customer.metadata?.user_email || customer.email

  if (!userEmail) {
    console.error('No user email found for subscription deletion')
    return
  }

  await downgradeToFreeTier(userEmail)
  console.log(`Downgraded ${userEmail} to free tier`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Only handle subscription renewals (not initial payments)
  if (invoice.billing_reason !== 'subscription_cycle') {
    return
  }

  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(invoice.customer as string)

  if (customer.deleted) return

  const userEmail = customer.metadata?.user_email || customer.email

  if (!userEmail) {
    console.error('No user email found for invoice')
    return
  }

  // Reset monthly credits
  await resetMonthlyCredits(userEmail)
  console.log(`Reset monthly credits for ${userEmail}`)
}
