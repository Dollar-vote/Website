# Supabase Edge Functions

These are server-side functions (deployed to the DollarVote Supabase project) that
power payments. The live, deployed versions run in Supabase; these are the source
copies kept in the repo. See `../../PAYMENTS_SETUP.md` to turn payments on.

- **create-checkout/** — starts a Stripe Checkout session for the logged-in owner's chosen tier.
- **stripe-webhook/** — records subscription status when Stripe reports a payment event.

Both no-op safely until the Stripe secrets are configured.
