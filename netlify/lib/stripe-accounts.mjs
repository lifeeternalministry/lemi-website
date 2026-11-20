// Two Stripe accounts, one site.
//   giving   -> Account A: tithes, offerings, funds (nonprofit rate)
//   services -> Account B: events, school tuition, store, invoices (standard rate)
// Keys live ONLY in Netlify environment variables, never in the repo:
//   STRIPE_SECRET_KEY_GIVING      STRIPE_WEBHOOK_SECRET_GIVING
//   STRIPE_SECRET_KEY_SERVICES    STRIPE_WEBHOOK_SECRET_SERVICES
import Stripe from "stripe";

export const ACCOUNTS = ["giving", "services"];

export const SITE_URL = (process.env.SITE_URL || process.env.URL || "https://www.lifeeternalministry.com").replace(/\/$/, "");

const clients = {};

function envFor(account) {
  const suffix = account.toUpperCase();
  return {
    key: process.env[`STRIPE_SECRET_KEY_${suffix}`],
    webhookSecret: process.env[`STRIPE_WEBHOOK_SECRET_${suffix}`],
  };
}

export function stripeFor(account) {
  if (!ACCOUNTS.includes(account)) throw new Error(`Unknown Stripe account: ${account}`);
  if (!clients[account]) {
    const { key } = envFor(account);
    if (!key) throw new Error(`Missing STRIPE_SECRET_KEY_${account.toUpperCase()}`);
    clients[account] = new Stripe(key);
  }
  return clients[account];
}

export function webhookSecretFor(account) {
  if (!ACCOUNTS.includes(account)) return null;
  return envFor(account).webhookSecret || null;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
