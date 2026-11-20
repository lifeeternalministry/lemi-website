// POST /api/purchase  { item, quantity }
// Creates a Stripe Checkout Session on ACCOUNT B (Ministry Services) for a fixed-price item
// listed in netlify/lib/catalog.mjs (tuition, application fee, conference registration...).
import { stripeFor, SITE_URL, json } from "../lib/stripe-accounts.mjs";
import { SERVICES } from "../lib/catalog.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  const item = SERVICES[body.item];
  if (!item) return json({ error: "That item isn't available." }, 400);

  const qty = Number.parseInt(body.quantity ?? 1, 10);
  if (!Number.isInteger(qty) || qty < 1 || qty > (item.maxQty ?? 1)) {
    return json({ error: "Invalid quantity." }, 400);
  }

  const mode = item.mode === "subscription" ? "subscription" : "payment";
  const metadata = { account: "services", item: body.item, item_label: item.label };

  const params = {
    mode,
    line_items: [{ price: item.priceId, quantity: qty }],
    billing_address_collection: "required",
    metadata,
    success_url: `${SITE_URL}/payment-thanks.html?type=purchase&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/${(body.returnTo || "services.html").replace(/[^a-z0-9\-.]/gi, "")}`,
  };
  if (mode === "subscription") {
    params.subscription_data = { metadata };
  } else {
    params.customer_creation = "always";
    params.payment_intent_data = { metadata };
  }

  try {
    const session = await stripeFor("services").checkout.sessions.create(params);
    return json({ url: session.url });
  } catch (err) {
    console.error("purchase checkout error:", err.message);
    return json({ error: "We couldn't start checkout. Please try again." }, 500);
  }
};

export const config = { path: "/api/purchase" };
