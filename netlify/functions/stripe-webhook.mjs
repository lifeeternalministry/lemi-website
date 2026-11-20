// POST /api/stripe-webhook?account=giving   (Account A endpoint)
// POST /api/stripe-webhook?account=services (Account B endpoint)
// Stripe calls this after a payment. We verify the signature, then save one ledger record.
// Events to subscribe to in Stripe: checkout.session.completed,
// checkout.session.async_payment_succeeded, invoice.paid
import { stripeFor, webhookSecretFor, json } from "../lib/stripe-accounts.mjs";
import { buildRecord, saveRecord } from "../lib/ledger.mjs";

export default async (req, _context, deps = {}) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const account = new URL(req.url).searchParams.get("account");
  const secret = webhookSecretFor(account);
  if (!secret) return json({ error: "Unknown account" }, 400);

  const signature = req.headers.get("stripe-signature");
  const raw = await req.text(); // must be the raw body for signature checks

  let event;
  try {
    event = await stripeFor(account).webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.warn("webhook signature failed:", err.message);
    return json({ error: "Bad signature" }, 400);
  }

  const rec = buildRecord(event, account);
  if (!rec) return json({ received: true, recorded: false });

  try {
    await (deps.save || saveRecord)(rec);
  } catch (err) {
    console.error("ledger save failed:", err.message);
    return json({ error: "Save failed" }, 500); // Stripe retries automatically
  }
  return json({ received: true, recorded: true });
};

export const config = { path: "/api/stripe-webhook" };
