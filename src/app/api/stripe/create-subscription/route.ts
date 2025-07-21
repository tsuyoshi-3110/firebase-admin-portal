import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

// 価格 ID とドメインは環境変数で管理してください
const PRICE_ID = process.env.STRIPE_DEFAULT_PRICE_ID!;
const DOMAIN = process.env.NEXT_PUBLIC_APP_URL!; // 例: https://admin.pageit.app

export async function POST(req: NextRequest) {
  const { siteKey } = await req.json();
  if (!siteKey) {
    return NextResponse.json({ error: "siteKey is required" }, { status: 400 });
  }

  const snap = await adminDb.doc(`siteSettings/${siteKey}`).get();
  const customerId = snap.data()?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // 新しいサブスクを Checkout で
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${DOMAIN}/sites?resume=success`,
    cancel_url: `${DOMAIN}/sites?resume=cancel`,
    metadata: { siteKey },
  });

  return NextResponse.json({ url: session.url });
}
