import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};



const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // Next.jsでは text() を使う
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  // 各イベントに応じて処理を分ける
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const metadata = session.metadata;
        const siteKey = metadata?.siteKey;

        if (siteKey) {
          await adminDb.doc(`siteSettings/${siteKey}`).update({
            stripeCustomerId: customerId,
            subscriptionStatus: "active",
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const siteKey = await getSiteKeyByCustomerId(customerId);
        if (siteKey) {
          await adminDb.doc(`siteSettings/${siteKey}`).update({
            subscriptionStatus: "active",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const siteKey = await getSiteKeyByCustomerId(customerId);
        if (siteKey) {
          await adminDb.doc(`siteSettings/${siteKey}`).update({
            subscriptionStatus: "unpaid",
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const siteKey = await getSiteKeyByCustomerId(customerId);
        if (siteKey) {
          await adminDb.doc(`siteSettings/${siteKey}`).update({
            subscriptionStatus: "canceled",
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// 🔍 FirestoreからcustomerIdでsiteKeyを逆引きする補助関数
async function getSiteKeyByCustomerId(customerId: string): Promise<string | null> {
  const snapshot = await adminDb
    .collection("siteSettings")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }
  return null;
}
