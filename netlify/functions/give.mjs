// POST /api/give  { fund, amount, monthly, coverFees }
// Creates a Stripe Checkout Session on ACCOUNT A (Giving).
import { stripeFor, SITE_URL, json } from "../lib/stripe-accounts.mjs";
import { FUNDS, GIVING_LIMITS, FEE } from "../lib/catalog.mjs";

export function feeCoverCents(cents) {
  // Amount to add so that, after the card fee, LEMI receives the full gift.
  const gross = Math.ceil((cents + FEE.fixedCents) / (1 - FEE.percent));
  return gross - cents;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  const fund = FUNDS[body.fund];
  if (!fund) return json({ error: "Please choose a fund." }, 400);

  const cents = Math.round(Number(body.amount) * 100);
  if (!Number.isFinite(cents) || cents < GIVING_LIMITS.minCents || cents > GIVING_LIMITS.maxCents) {
    return json({ error: "Please enter an amount between $1 and $50,000." }, 400);
  }

  const monthly = body.monthly === true;
  const cover = body.coverFees === true ? feeCoverCents(cents) : 0;
  const metadata = {
    account: "giving",
    fund: body.fund,
    fund_label: fund.label,
    gift_cents: String(cents),
    fee_cover_cents: String(cover),
  };

  const params = {
    mode: monthly ? "subscription" : "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cents + cover,
        product_data: {
          name: `${fund.label}: Life Eternal Ministry International`,
          ...(cover ? { description: "Includes an amount to help cover processing fees" } : {}),
        },
        ...(monthly ? { recurring: { interval: "month" } } : {}),
      },
    }],
    // Address is needed for year-end giving statements.
    billing_address_collection: "required",
    metadata,
    success_url: `${SITE_URL}/payment-thanks.html?type=give&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/give.html`,
  };

  if (monthly) {
    params.subscription_data = { metadata };
  } else {
    params.submit_type = "donate";
    params.customer_creation = "always";
    params.payment_intent_data = { metadata };
  }

  try {
    const session = await stripeFor("giving").checkout.sessions.create(params);
    return json({ url: session.url });
  } catch (err) {
    console.error("give checkout error:", err.message);
    return json({ error: "We couldn't start checkout. Please try again." }, 500);
  }
};

export const config = { path: "/api/give" };
