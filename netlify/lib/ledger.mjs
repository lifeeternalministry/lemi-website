// Every completed payment is saved as one JSON record in Netlify Blobs (store "payments"),
// keyed by mode/year/account/id, where mode is "live" or "test" (sandbox).
// This is what year-end giving statements are built from; the export reads live records only
// unless asked for test ones, so sandbox payments never mix with real gifts.
import { getStore } from "@netlify/blobs";

const STORE = "payments";

export function ledgerKey(rec) {
  return `${rec.livemode ? "live" : "test"}/${rec.created.slice(0, 4)}/${rec.account}/${rec.id}`;
}

// Which of LEMI's accounts a payment belongs to, from the metadata our checkout functions set.
// Payments with no tag (e.g. an invoice sent from the Stripe dashboard) belong to "services".
// Each webhook endpoint records only its own payments. In live mode the two Stripe accounts are
// separate anyway; in the sandbox both endpoints receive every event, and this stops duplicates.
function belongsTo(account, meta) {
  const tagged = meta.account;
  if (tagged) return tagged === account;
  return account === "services";
}

// Turn a Stripe event into a flat record. Returns null for events we don't record.
export function buildRecord(event, account) {
  const obj = event.data.object;
  const meta = obj.metadata || {};
  const created = new Date((obj.created || event.created) * 1000).toISOString();

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    // Subscriptions: the first charge also produces invoice.paid, so record those there instead.
    if (obj.mode === "subscription") return null;
    // Bank payments that haven't cleared yet arrive again as async_payment_succeeded.
    if (obj.payment_status !== "paid") return null;
    if (!belongsTo(account, meta)) return null;
    const d = obj.customer_details || {};
    return {
      id: obj.payment_intent || obj.id,
      account,
      kind: account === "giving" ? "gift" : "purchase",
      fund: meta.fund_label || null,
      item: meta.item_label || null,
      amountCents: obj.amount_total,
      feeCoveredCents: Number(meta.fee_cover_cents || 0),
      currency: obj.currency,
      recurring: false,
      name: d.name || null,
      email: d.email || null,
      address: d.address || null,
      created,
      livemode: Boolean(event.livemode),
      stripeObject: obj.id,
    };
  }

  if (event.type === "invoice.paid") {
    if (!obj.amount_paid) return null;
    // Recurring gifts/plans carry our metadata on the subscription; dashboard invoices may not.
    const subMeta = obj.subscription_details?.metadata || obj.parent?.subscription_details?.metadata || {};
    const m = { ...subMeta, ...meta };
    if (!belongsTo(account, m)) return null;
    return {
      id: obj.id,
      account,
      // Giving account: a monthly gift. Services account: a paid invoice
      // (a quoted governance or oversight engagement, or a tuition installment).
      kind: account === "giving" ? "gift" : "invoice",
      fund: m.fund_label || null,
      item: m.item_label || obj.lines?.data?.[0]?.description || null,
      amountCents: obj.amount_paid,
      feeCoveredCents: Number(m.fee_cover_cents || 0),
      currency: obj.currency,
      recurring: Boolean(obj.subscription || obj.parent?.subscription_details),
      name: obj.customer_name || null,
      email: obj.customer_email || null,
      address: obj.customer_address || null,
      created,
      livemode: Boolean(event.livemode),
      stripeObject: obj.id,
    };
  }

  return null;
}

export async function saveRecord(rec) {
  await getStore(STORE).setJSON(ledgerKey(rec), rec);
}

export async function listRecords(year, account, mode = "live") {
  const store = getStore(STORE);
  const prefix = account ? `${mode}/${year}/${account}/` : `${mode}/${year}/`;
  const { blobs } = await store.list({ prefix });
  const out = [];
  for (const b of blobs) {
    const rec = await store.get(b.key, { type: "json" });
    if (rec) out.push(rec);
  }
  return out.sort((a, b) => a.created.localeCompare(b.created));
}
