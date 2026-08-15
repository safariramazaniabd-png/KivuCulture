# AGENTS.md

## Project

- Static French-language cultural platform for the Kivu region (DRC).
- Main page is `kivu-culture.html`; CSS and vanilla JS remain inline.
- No `package.json`, build system, test runner, or formatter exists.
- Runtime resources are Google Fonts, Unsplash images, and Supabase JS v2 from CDNs.
- Deployment config files: `netlify.toml`, `_headers`, `_redirects`.

## Local Run

- Serve the directory over HTTP: `bash serve.sh` (listens on IPv4 and IPv6 at port `8000`).
- Open `http://localhost:8000/kivu-culture.html`; do not rely on `file://` for auth testing.
- Replace placeholders in `supabase-config.js` with the Supabase project URL and public anon key.
- Run `supabase-schema.sql` in the Supabase SQL editor before testing accounts.
- Enable the Email provider and add the local/deployed page URL to Supabase Auth redirect settings; email confirmation may prevent an immediate session after signup.

## Authentication And Data

- The bottom script creates the Supabase client, manages signup/login/session/logout, and updates the existing auth modal.
- `supabase-schema.sql` creates `profiles`, `artworks`, `certificates`, `orders`, and `events` with RLS policies.
- New users get a profile through the `auth.users` trigger; self-registration cannot select the `admin` role.
- Orders have an INSERT policy for authenticated users; the frontend inserts a `pending` order with `payment_reference = session_id` before redirecting to Stripe. Status is bumped to `paid` by the server-side webhook only (no client UPDATE policy).
- `supabase-schema.sql` includes a `profiles_self_update` policy allowing users to edit `first_name`, `last_name`, and `city` without changing their `role`.
- Never put a Supabase `service_role` key in `supabase-config.js` or browser code.
- Password reset uses `auth.resetPasswordForEmail()` with redirect to the current page.
- Seed accounts (`seed-data.sql`): `ambroise|rahel|jose|david|grace@kivu-culture.cd`, password `Kivu2026!`. When seeding `auth.users` directly, the string columns `email_change`, `email_change_token_new`, `email_change_token_current`, `confirmation_token`, `recovery_token` MUST be `''` (empty string), never NULL, or GoTrue fails at login with 500 "Database error querying schema" (supabase/auth#1940). `auth.identities` must also exist per user (see the `identities` CTE referencing user1..user5). `fix-identities.sql` repairs already-seeded rows.

## Structure And Gotchas

- The visual palette is defined by CSS variables such as `--lave`, `--noir`, and `--foret`; preserve these when editing styles.
- Responsive breakpoints are `1100px` and `768px`; touch devices get the native cursor via `@media (hover: none) and (pointer: coarse)`.
- `prefers-reduced-motion` is supported: animations are disabled when the user requests it.
- The ticker relies on duplicated items for its seamless animation; update both copies together.
- Newsletter stores emails in `newsletter_subscribers` table via Supabase.
- Agenda (`events` table) is dynamically loaded from Supabase with `category` column added. The table also has `ends_at` for multi-day events.
- Artisan public profiles are accessible by clicking artisan names in the catalog; a "Vérifié" badge appears when `verification_status === 'verified'`.
- Mobile navigation uses an animated hamburger toggle at `<768px` with slide-in menu, staggered link animation, Escape/click-outside-to-close, close (✕) button inside menu, and body scroll lock when open.
- Auth modal includes a "Continuer avec Google" button using Supabase OAuth (`signInWithOAuth` with `provider: 'google'`).
- Bug fixes applied: price shows `.toFixed(2)` with proper currency symbol; `editArtwork()` uses a data Map instead of DOM parsing; NaN check on price input; `ends_at` added to schema; admin user table shows ID instead of email; certificates/orders queries fixed; `escapeHtml` optimized and `sanitizeUrl` added for XSS protection.
- Gastronomy section images replaced from generic European food to African/Congolese cuisine via Unsplash.
- Orders have INSERT policy for authenticated users; the "Acheter" button in the catalog creates an order via Stripe Checkout (Phase 4).
- Certificates are loaded from Supabase (via the artisan's artwork IDs) and viewable in the account "Certificats" tab.
- Artisans get 5 free publications (`FREE_PUB_LIMIT = 5`); beyond that, a subscription prompt appears (demo frontend only).
- `artworks_update_owner_or_admin` RLS now allows artisans to publish (`status = 'published'`), edit, and archive their own works.
- Admin panel includes tabs: Dashboard, Users, Events (create/edit/delete), and Verifications (approve/reject profiles).

## Phase 3 — Deployment Notes

- `netlify.toml` publishes the root directory with SPA redirects (`/*` → `/kivu-culture.html`).
- `_headers` sets CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.
- `_redirects` is also provided for redundancy.
- `serve.sh` detects IPv6 support and falls back to IPv4 (`0.0.0.0`) if unavailable.
- Favicon is an inline SVG data URI in the HTML head.

## Phase 4 — Stripe Payments (Netlify Functions)

Two Netlify Functions handle payments:

### `create-checkout-session` (`netlify/functions/create-checkout-session.mjs`)
- Called from frontend (`createOrder()` in `kivu-culture.html`) when user clicks "Confirmer et payer"
- Creates a Stripe Checkout Session; the frontend then inserts the `pending` order itself
- Requires env vars: `STRIPE_SECRET_KEY`, `SUPABASE_ANON_KEY`
- Endpoint: `/api/create-checkout-session`

### `stripe-webhook` (`netlify/functions/stripe-webhook.mjs`)
- Listens for Stripe `checkout.session.completed` events
- Verifies the `stripe-signature` header (HMAC, 300s tolerance) then updates the matching order from `pending` → `paid`
- Requires env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- Endpoint: `/api/stripe-webhook`
- Register the webhook URL in Stripe Dashboard at `https://kivu-culture.netlify.app/api/stripe-webhook`

### Frontend
- `createOrder()` calls `/api/create-checkout-session` then inserts a `pending` order with `payment_reference = session_id`
- On return from Stripe, `?checkout=success` or `?checkout=cancel` is handled with alerts
- Tested end-to-end: login → session created → order `pending` → signed webhook → status `paid`
