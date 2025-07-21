// app/api/create-stripe-customer/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";



export async function POST(req: Request) {
  const body = await req.json();

  try {
    const customer = await stripe.customers.create({
      email: body.email,
      name: body.name,
      metadata: body.metadata,
    });

    // サブスクリプションを追加するならこちらも追加
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_DEFAULT_PRICE_ID! }],
      metadata: {
        siteKey: body.metadata.siteKey,
      },
    });

    return NextResponse.json({
      customerId: customer.id,
      subscriptionId: subscription.id,
    });
  } catch (error: any) {
    console.error("Stripe Error:", error);
    return new NextResponse("Stripe customer creation failed", { status: 500 });
  }
}
