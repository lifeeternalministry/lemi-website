// GET /api/export-payments?year=2026[&account=giving][&mode=test]
// Exports LIVE payments by default. Add &mode=test to see sandbox payments.
// Header: Authorization: Bearer <LEMI_ADMIN_TOKEN>
// Downloads a CSV of recorded payments, used to prepare year-end giving statements.
import { listRecords } from "../lib/ledger.mjs";
import { json } from "../lib/stripe-accounts.mjs";
import { timingSafeEqual } from "node:crypto";

function authorized(req) {
  const token = process.env.LEMI_ADMIN_TOKEN;
  if (!token || token.length < 24) return false;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(records) {
  const head = ["date", "account", "kind", "fund_or_item", "amount_usd", "fee_covered_usd", "recurring", "name", "email", "address", "stripe_id"];
  const rows = records.map((r) => [
    r.created.slice(0, 10), r.account, r.kind, r.fund || r.item || "",
    (r.amountCents / 100).toFixed(2), (r.feeCoveredCents / 100).toFixed(2), r.recurring ? "yes" : "no",
    r.name, r.email,
    r.address ? [r.address.line1, r.address.line2, r.address.city, r.address.state, r.address.postal_code, r.address.country].filter(Boolean).join(", ") : "",
    r.stripeObject,
  ]);
  return [head, ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

export default async (req) => {
  if (!authorized(req)) return json({ error: "Not authorized" }, 401);
  const url = new URL(req.url);
  const year = url.searchParams.get("year") || String(new Date().getUTCFullYear());
  const account = url.searchParams.get("account");
  const mode = url.searchParams.get("mode") || "live";
  if (!/^\d{4}$/.test(year) || (account && !["giving", "services"].includes(account)) || !["live", "test"].includes(mode)) {
    return json({ error: "Bad parameters" }, 400);
  }
  const csv = toCsv(await listRecords(year, account, mode));
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="lemi-payments-${mode === "test" ? "TEST-" : ""}${year}${account ? "-" + account : ""}.csv"`,
      "cache-control": "no-store",
    },
  });
};

export const config = { path: "/api/export-payments" };
