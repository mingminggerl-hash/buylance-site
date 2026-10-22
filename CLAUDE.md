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
- Cart + checkout live in one shared file for all 12 shop pages: `cart.js` + `cart.css` (drawer and checkout popup markup are injected by cart.js; pages only keep header buttons calling `toggleCart()` / `addToCart(...)`). All money math is `computeCartTotals()`. Tip step is tip.js.
- Discounts: one per order — typed code (BUYRBLX / personal), personal reward code (loyalty, win-back), or **daily 5%** (`get_daily_discount()`: unlocks once completed orders total $10, then orders of $2+, comes back 24h after use). The order row stores `discount_code_used` / `discount_amount`; `DAILY5` makes trigger `on_order_daily_discount` record a row in `daily_discount_claims`. The old "$10 spent → 5%" reward is off (trigger `on_order_spend_milestone` disabled, owner's call 2026-10-22).
- Payments: `verify-paypal` records verified PayPal orders in `paypal_payments`; trigger `order_payment_check` sets `orders.payment_verified` (browser can't fake it; server-side inserts mark themselves trusted via `set_config('buyrblx.trusted_insert','1',true)`). Admin order page shows ✅ verified / ⚠️ not verified (orders after 2026-10-22).
- Crown VIP: $9.99 for 30 days, no auto-renew, can't rebuy while active (`profiles.vip_until`, `vip_spins`; `get_vip_status()`). Trigger `order_vip_activate` turns it on from a *verified* order with "Crown VIP Pass (1 Month)" (VIP-only orders auto-complete) and adds 1 spin. `spin_wheel_vip.html` → `spin_vip_wheel()`: odds Candy 40 / Luger 35 / Sugar 15 / Bat 10 (owner's call, shown on the page — keep page and SQL in sync); the prize becomes a free order (payment_method `vip_spin`). Admin can hand out VIP with `select grant_vip('email')`. Cron `expire-vip` clears the old `is_vip` flag. Header 👑 VIP badge + VIP card button come from cart.js.
- Reviews: stars limited to 1–5 (`reviews_stars_range`). The old `submit_review(text,int,text)` now just returns order_required, and policy "Users can post one review" now needs a completed order (DROP kept timing out on the approval popup; both are harmless as is).
- Pages load local .js/.css as `file.js?v=<hash>` so browsers don't keep old copies. **After editing any .js/.css, run `python3 tools/version-assets.py`** (updates the ?v= in every page).
- 🥷/🪙 were replaced with 🧠/💰 — Unicode 13+ emoji render as boxes on older Windows; avoid them.
- Product pictures live in `img/<hash>.webp` (max 600px, shown ~216px), with `loading="lazy"`. New pictures go in `img/` as files — never base64 in the HTML.
- Visitor counter: `visit.js` calls `count_visit()` once per browser per day (`site_visits` table, Manila date); admin dashboard shows it via `get_visit_stats()`.
- pg_cron `auto-resolve-stale-orders` (hourly, `private.auto_resolve_stale_orders()`): delivered 3+ days without confirm/dispute → completed; in_progress + seller reminded + buyer silent 7 days → cancelled and total + wallet used credited to wallet (owner approved this rule).
