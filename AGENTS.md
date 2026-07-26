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
- Orders intentionally have no client INSERT/UPDATE policy; payment creation and webhooks belong in a server-side Edge Function/backend.
- `supabase-schema.sql` includes a `profiles_self_update` policy allowing users to edit `first_name`, `last_name`, and `city` without changing their `role`.
- Never put a Supabase `service_role` key in `supabase-config.js` or browser code.
- Password reset uses `auth.resetPasswordForEmail()` with redirect to the current page.

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
- Orders have INSERT policy for authenticated users; the "Acheter" button in the catalog creates an order (demo frontend, payment not processed).
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
