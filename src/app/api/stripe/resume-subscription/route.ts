import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { siteKey } = await req.json();
  if (!siteKey) {
    return NextResponse.json({ error: "siteKey is required" }, { status: 400 });
  }

  const snap = await adminDb.doc(`siteSettings/${siteKey}`).get();
  const customerId = snap.data()?.stripeCustomerId;

  const sub = (
    await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    })
  ).data[0];
  if (!sub || !sub.cancel_at_period_end) {
    return NextResponse.json({ error: "No cancelPending subscription" }, { status: 400 });
  }

  // 予約キャンセルを解除
  await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
  await adminDb.doc(`siteSettings/${siteKey}`).set(
    { cancelPending: false },
    { merge: true }
  );

  return NextResponse.json({ success: true });
}
