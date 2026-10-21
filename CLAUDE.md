# BuyRBLX site — notes for Claude

Static HTML shop for Roblox items (formerly "Buylance"), backed by Supabase project
`ihaokyisxukyghfpisut`. Domain is moving to buyrblx.com (not bought yet as of 2026-10-20).

## Owner's backlog — bring these up when they ask "what next?" or for suggestions
- **"How it works" section** on the homepage: 3 steps (buy → trade/join in-game → receive) + usual delivery time. Owner said they'd do it themselves; remind them.
- **Link previews / SEO**: no og:title, og:image, meta description or favicon on any page. Needs a logo/banner image from the owner.
- **Trust**: Trustpilot page + order counter — later, once there's an audience.
- **More games/bundles** (Blox Fruits, Da Hood, Jailbreak, MM2 bundles) — later.
- **PayPal is in sandbox mode** (`verify-paypal` uses api-m.sandbox.paypal.com) — owner will switch to live before real selling.
- **Adopt Me pictures** — owner is adding them; ask for real image files, not pasted base64.
- **Cloudflare proxy (orange cloud)** for caching — once GitHub's HTTPS certificate is issued and "Enforce HTTPS" is on; then set Cloudflare SSL/TLS mode to Full.

## Gotchas
- Emails send from `noreply@buyrblx.com` via Resend: they only work once buyrblx.com is bought and verified in Resend.
- Supabase Auth → URL Configuration still needs `https://buyrblx.com` added (dashboard only).
- Promo code `BUYRBLX` was renamed from `BUYLANCE`; redemption checks look for both.
- DB → email edge functions authenticate with an `x-email-secret` header from `private.email_hook_headers()` (vault secret `email_hook_secret`); the functions run with verify_jwt off and check it via `check_email_hook_secret`.
- Table grants were stripped at some point; grant only what the site uses. Buyers may update only `profiles(roblox_username, roblox_avatar_url, roblox_id, vip_cancelled)` and `orders(discord_thread_id, last_buyer_activity_at)`. `guard_order_insert` keeps browser-created orders from starting as delivered/completed.
- Discord goes through the `discord-notify` edge function (events: new_order, order_chat, order_remind, order_confirmed, order_disputed, message_report, new_ticket, ticket_urgent). Webhook URLs are secrets DISCORD_ORDERS_WEBHOOK (orders forum: one thread per order, incl. reports) and DISCORD_TICKETS_WEBHOOK (support forum, incl. urgent flags); the owner's Discord ID (for @mentions) is in the function. Never put webhook URLs back in the pages.
- Admin order list: completed orders move from "This week" to "History" after 7 days. Order numbers are never renumbered.
- Checkout code is duplicated: index.html has the newer cart (reward discounts, smooth fee via calculateProcessingFee); the 11 game pages share an older copy (flat fee tiers $0.75/$1.00/$1.50, BUYRBLX only). The tip step is shared (tip.js, `checkoutAmountsUSD()` per page). Owner hasn't decided on unifying yet.
- Reviews cleanup still pending (needs owner approval): drop `submit_review(text,int,text)`, drop policy "Users can post one review", add `reviews_stars_range` check.
- 🥷/🪙 were replaced with 🧠/💰 — Unicode 13+ emoji render as boxes on older Windows; avoid them.
- Product pictures live in `img/<hash>.webp` (max 600px, shown ~216px), with `loading="lazy"`. New pictures go in `img/` as files — never base64 in the HTML.
- Visitor counter: `visit.js` calls `count_visit()` once per browser per day (`site_visits` table, Manila date); admin dashboard shows it via `get_visit_stats()`.
- pg_cron `auto-resolve-stale-orders` (hourly, `private.auto_resolve_stale_orders()`): delivered 3+ days without confirm/dispute → completed; in_progress + seller reminded + buyer silent 7 days → cancelled and total + wallet used credited to wallet (owner approved this rule).
