# LEMI Payments: Setup and Handover

Stripe payments for www.lifeeternalministry.com. Two Stripe accounts:

| Account | Used for | Website page / endpoint |
| --- | --- | --- |
| **A: Giving** | Tithes, offerings, building fund, missions | `give.html` → `/api/give` |
| **B: Ministry Services** | School tuition, application fees, conference registration, invoices | `/api/purchase` (items in `netlify/lib/catalog.mjs`) |

During sandbox testing, one sandbox key stands in for both accounts.

## Important: do not deploy by drag-and-drop

Netlify Functions (the payment code in `netlify/functions/`) **do not run on drag-and-drop deploys.** Deploy through GitHub instead. This also lets future staff take over.

### One-time GitHub setup
1. On github.com, create a **private** repo named `lemi-website` (ideally under a LEMI-owned GitHub organization, not a personal account).
2. Upload the contents of this folder (everything except `node_modules`). On GitHub: **Add file → Upload files**, then drag the files in.
3. In Netlify, open the LEMI site → **Site configuration → Build & deploy → Link repository** → GitHub → choose `lemi-website`.
   - Build command: *(leave blank)*
   - Publish directory: `.`
4. Netlify reads `netlify.toml` and `package.json`, installs Stripe, and deploys the functions.
5. Check **Logs & metrics → Functions**: you should see `give`, `purchase`, `stripe-webhook`, `export-payments`.

From now on, any change committed to GitHub deploys automatically.

## Environment variables (Netlify → Site configuration → Environment variables)

Tick **Contains secret values** on each. Never put these in code, chat or email.

| Key | Value |
| --- | --- |
| `STRIPE_SECRET_KEY_GIVING` | Account A secret key (`sk_test_…` now, `sk_live_…` at launch) |
| `STRIPE_SECRET_KEY_SERVICES` | Account B secret key (same sandbox key while testing) |
| `STRIPE_WEBHOOK_SECRET_GIVING` | Signing secret from the giving webhook (`whsec_…`) |
| `STRIPE_WEBHOOK_SECRET_SERVICES` | Signing secret from the services webhook |
| `LEMI_ADMIN_TOKEN` | A random password of 24+ characters, for downloading payment records |

Redeploy after adding or changing variables (Deploys → Trigger deploy).

## Webhooks (Stripe → Developers → Webhooks → Add destination)

Create two, after the GitHub deploy is live:

| Endpoint URL | Events |
| --- | --- |
| `https://www.lifeeternalministry.com/api/stripe-webhook?account=giving` | `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid` |
| `https://www.lifeeternalministry.com/api/stripe-webhook?account=services` | same three |

Copy each one's signing secret into the matching Netlify variable.

## Test (sandbox)

1. Open `/give.html`, choose a fund, give $25 with card `4242 4242 4242 4242`, any future expiry, any CVC.
2. You should land on `payment-thanks.html`.
3. In Stripe → Webhooks → your endpoint, the event should show **200 OK**.
4. Repeat with **Monthly** checked.

The Give page is not linked from the menu yet. Add a **Give** link to the header and footer only after the test gift works.

## Payment records and year-end statements

Every completed payment is saved in Netlify Blobs (store `payments`). To download a year as a spreadsheet:

```
curl -H "Authorization: Bearer YOUR_LEMI_ADMIN_TOKEN" \
  "https://www.lifeeternalministry.com/api/export-payments?year=2026&account=giving" -o giving-2026.csv
```

Use the CSV to prepare each donor's year-end statement. Stripe does not create these automatically.

## Adding tuition or event items (Account B)

1. Stripe (Account B) → Product catalog → create the product and price.
2. Copy its Price ID (`price_…`) into `netlify/lib/catalog.mjs` under `SERVICES` (examples are there, commented out).
3. Commit to GitHub. A page button sends `{ item: "school-semester-tuition" }` to `/api/purchase`.

Quoted engagements (governance, oversight) are sent as Stripe **invoices** from the dashboard; the webhook records them when paid.

## Going live (checklist)

- [ ] Stripe accounts in LEMI's legal name, EIN and bank account; Prophetess Young as owner; developer has Developer role only
- [ ] Nonprofit discount requested on Account A (tuition and tickets stay on Account B)
- [ ] Live keys and live webhook secrets replace the test ones in Netlify
- [ ] One real $1 gift made and refunded
- [ ] Give link added to menu and footer

## File map

```
netlify.toml                      functions folder + headers + redirects
package.json                      Stripe + Netlify Blobs dependencies
give.html, payment-thanks.html    public pages
netlify/lib/catalog.mjs           funds and items  (edit this to change what people pay for)
netlify/lib/stripe-accounts.mjs   picks Account A or B
netlify/lib/ledger.mjs            saves payment records
netlify/functions/give.mjs        /api/give
netlify/functions/purchase.mjs    /api/purchase
netlify/functions/stripe-webhook.mjs   /api/stripe-webhook
netlify/functions/export-payments.mjs  /api/export-payments
```
