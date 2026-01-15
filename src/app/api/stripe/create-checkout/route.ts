import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { getUserSubscription } from '@/lib/subscription'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { priceType } = body // 'pro' | 'credits_10' | 'credits_30' | 'credits_100'

    if (!priceType) {
      return NextResponse.json(
        { error: 'Price type is required' },
        { status: 400 }
      )
    }

    // Map price type to Stripe price ID
    const priceMap: Record<string, string> = {
      pro: STRIPE_PRICES.PRO_MONTHLY,
      credits_10: STRIPE_PRICES.CREDITS_10,
      credits_30: STRIPE_PRICES.CREDITS_30,
      credits_100: STRIPE_PRICES.CREDITS_100,
    }

    const priceId = priceMap[priceType]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid price type' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const userEmail = session.user.email

    // Get or create Stripe customer
    const subscription = await getUserSubscription(userEmail)
    let customerId = subscription.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_email: userEmail,
        },
      })
      customerId = customer.id
    }

    // Determine if subscription or one-time purchase
    const isSubscription = priceType === 'pro'

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL || 'https://www.ytdj.ai'}/account?checkout=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'https://www.ytdj.ai'}/pricing?checkout=cancelled`,
      metadata: {
        user_email: userEmail,
        price_type: priceType,
      },
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Create checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
