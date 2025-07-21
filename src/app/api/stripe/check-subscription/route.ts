// src/app/api/check-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const siteKey = req.nextUrl.searchParams.get("siteKey");
  if (!siteKey) {
    return NextResponse.json({ status: "none" }, { status: 400 });
  }

  const snap = await adminDb.doc(`siteSettings/${siteKey}`).get();
  const data = snap.data() ?? {};
  const customerId = data.stripeCustomerId as string | undefined;

  /* 無料プラン判定（isFreePlan が undefined でも true 扱い） */
  const isFreePlan = data.isFreePlan !== false;
  if (isFreePlan || !customerId) {
    return NextResponse.json({ status: "none" }); // 無料 → 課金不要
  }

  /* Stripe でサブスク確認 */
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 5,
  });

  const hasActive = subs.data.some((s) =>
    ["active", "trialing"].includes(s.status)
  );
  const hasCanceled = subs.data.some((s) => s.status === "canceled");

  const status = hasActive ? "active" : hasCanceled ? "canceled" : "none";
  return NextResponse.json({ status }); // ← ここをフロントが読む
}
