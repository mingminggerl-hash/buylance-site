# BuyRBLX site — notes for Claude

Static HTML shop for Roblox items (formerly "Buylance"), backed by Supabase project
`ihaokyisxukyghfpisut`. Domain is moving to buyrblx.com (not bought yet as of 2026-10-20).

## Owner's backlog — bring these up when they ask "what next?" or for suggestions
- **"How it works" section** on the homepage: 3 steps (buy → trade/join in-game → receive) + usual delivery time. Owner said they'd do it themselves; remind them.
- **Image speed fix**: product pictures are base64-embedded in the HTML (ps99.html ~16 MB, mm2.html ~11 MB). Move to separate image files + lazy loading.
- **Link previews / SEO**: no og:title, og:image, meta description or favicon on any page. Needs a logo/banner image from the owner.
- **Visitor stats**: Google Analytics or Microsoft Clarity — owner wants this once they have an audience.
- **Trust**: Trustpilot page + order counter — later, once there's an audience.
- **More games/bundles** (Blox Fruits, Da Hood, Jailbreak, MM2 bundles) — later.
- **PayPal is in sandbox mode** (`verify-paypal` uses api-m.sandbox.paypal.com) — owner will switch to live before real selling.
- **Adopt Me pictures** — owner is adding them; ask for real image files, not pasted base64.

## Gotchas
- Emails send from `noreply@buyrblx.com` via Resend: they only work once buyrblx.com is bought and verified in Resend.
- Supabase Auth → URL Configuration still needs `https://buyrblx.com` added (dashboard only).
- Promo code `BUYRBLX` was renamed from `BUYLANCE`; redemption checks look for both.
- DB → email edge functions authenticate with an `x-email-secret` header from `private.email_hook_headers()` (vault secret `email_hook_secret`); the functions run with verify_jwt off and check it via `check_email_hook_secret`.
- Table grants were stripped at some point; grant only what the site uses. Buyers may update only `profiles(roblox_username, roblox_avatar_url, roblox_id, vip_cancelled)` and `orders(discord_thread_id, last_buyer_activity_at)`. `guard_order_insert` keeps browser-created orders from starting as delivered/completed.
- Discord is reached through webhooks embedded in the HTML (order.html, index.html). `!remind` mentions `DISCORD_OWNER_ID` in order.html (falls back to @here until it's set).
- Admin order list: completed orders move from "This week" to "History" after 7 days. Order numbers are never renumbered.
