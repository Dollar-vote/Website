# Turning on Payments (Stripe)

The payment system is **already built and deployed**. It just needs your Stripe keys to go live.
Until you add them, the pricing buttons work but show "Payments aren't switched on yet" and let owners continue without a charge — nothing breaks.

Everything below uses **TEST MODE** = fake money. No real cards are charged until you switch Stripe to live mode.

## What you do (about 15 minutes)

### 1. Create a free Stripe account
Go to https://stripe.com → Sign up. You can skip the full business activation while testing.

### 2. Create the three subscription products
In the Stripe Dashboard (make sure the **"Test mode"** toggle is ON, top-right):
- Go to **Product catalog → Add product**
- Create three recurring (monthly) prices:
  | Product name | Price | Billing |
  |---|---|---|
  | DollarVote Starter | $29 | Monthly |
  | DollarVote Growth | $59 | Monthly |
  | DollarVote Premium | $99 | Monthly |
- After creating each, copy its **Price ID** (looks like `price_1Abc...`).

### 3. Get your secret key
Stripe Dashboard → **Developers → API keys** → copy the **Secret key** (starts with `sk_test_...`).

### 4. Give me the keys (or paste them yourself)
The keys are stored as **Supabase function secrets** (never in the app code/browser). Either send them to me and I'll set them, or in the Supabase dashboard → Project → Edge Functions → Secrets, add:

```
STRIPE_SECRET_KEY    = sk_test_...
STRIPE_PRICE_STARTER = price_...   (the Starter price ID)
STRIPE_PRICE_GROWTH  = price_...   (the Growth price ID)
STRIPE_PRICE_PREMIUM = price_...   (the Premium price ID)
```

### 5. Set up the webhook (so payments record back)
Stripe Dashboard → **Developers → Webhooks → Add endpoint**:
- Endpoint URL: `https://vjsosuuognevznjcjeux.supabase.co/functions/v1/stripe-webhook`
- Events to send: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- After creating it, copy the **Signing secret** (starts with `whsec_...`) and add one more Supabase secret:
```
STRIPE_WEBHOOK_SECRET = whsec_...
```

### 6. Test it
Log in as a business owner, pick the Growth tier → you'll land on Stripe's checkout page. Use test card:
```
Card: 4242 4242 4242 4242   Exp: any future date   CVC: any 3 digits   ZIP: any
```
After paying, your `subscriptions` table marks you `active` on the `growth` tier.

## How it's wired (for reference)
- **`create-checkout`** (Supabase Edge Function): the logged-in owner clicks a tier → this creates a Stripe Checkout session and returns its URL → the app redirects there. Secret key stays server-side.
- **`stripe-webhook`** (Edge Function): Stripe calls this after payment → it verifies Stripe's signature → records the subscription with the service key (tamper-proof).
- **`subscriptions` table**: one row per owner — tier, status, Stripe IDs, renewal date. Owners can read only their own row; only the server can write it.
- Local copies of the function code live in `supabase/functions/`.

## Going live (later)
When ready for real money: flip Stripe to **live mode**, recreate the products/prices and webhook there, and swap the test keys (`sk_test_`/`whsec_`) for the live ones (`sk_live_`/...). Nothing in the app code changes.
