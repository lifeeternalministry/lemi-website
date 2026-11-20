// What people can pay for. Edit this file to add funds or items; nothing else needs to change.

// ACCOUNT A (giving). Donor chooses the amount.
export const FUNDS = {
  tithe:    { label: "Tithe" },
  offering: { label: "Offering" },
  building: { label: "Building Fund" },
  missions: { label: "Missions" },
};

export const GIVING_LIMITS = { minCents: 100, maxCents: 5_000_000 }; // $1 to $50,000

// Optional "help cover processing fees" estimate shown to donors.
// Uses Stripe's standard card rate; adjust if LEMI is approved for the nonprofit rate.
export const FEE = { percent: 0.029, fixedCents: 30 };

// ACCOUNT B (services). Fixed-price items only.
// Create each one in Stripe (Account B -> Product catalog), then paste its Price ID here.
// Quoted engagements (governance, oversight) are NOT listed here: send those as
// Stripe invoices from the dashboard; the webhook records them when paid.
//
// mode: "payment" for one-time, "subscription" for a recurring price (e.g. a monthly tuition plan).
export const SERVICES = {
  // Examples. Uncomment and replace the Price IDs once the Prophetess approves prices.
  // "school-application-fee": { label: "Leadership School: Application Fee", priceId: "price_XXXX", mode: "payment", maxQty: 1 },
  // "school-semester-tuition": { label: "Leadership School: Semester Tuition (paid in full)", priceId: "price_XXXX", mode: "payment", maxQty: 1 },
  // "school-tuition-monthly":  { label: "Leadership School: Monthly Tuition Plan", priceId: "price_XXXX", mode: "subscription", maxQty: 1 },
  // "leaders-conference":      { label: "LEMI Leaders Conference: Registration", priceId: "price_XXXX", mode: "payment", maxQty: 10 },
};
