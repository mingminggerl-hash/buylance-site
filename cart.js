// Shared cart drawer + checkout for every shop page (index + the 11 game pages).
//
// Include after supabase-config.js and tip.js, before the page's own script:
//   <link rel="stylesheet" href="cart.css">   (in <head>)
//   <script src="cart.js"></script>
//
// The page provides: currentUser, walletBalance / useWalletCredit,
// loadWalletBalance(), formatMoney(), CURRENT_CURRENCY, openLoginModal().
// Everything here is plain globals because product buttons call
// addToCart(...), toggleCart() etc. straight from onclick attributes.
//
// Discounts: only one applies per order — a typed code, a personal reward
// code (loyalty / win-back), or the daily 5% (unlocks after $10 of completed
// orders; then once per 24 hours after use, orders of $2+). The order row records which one in discount_code_used;
// 'DAILY5' starts the 24-hour countdown in the database.

document.body.insertAdjacentHTML('beforeend', `
<div class="ct-overlay" id="cartOverlay">
  <aside class="ct-drawer" role="dialog" aria-label="Your cart">
    <div class="ct-head">
      <div class="ct-head-row">
        <span class="ct-head-ico" id="ctHeadIco">🛒</span>
        <div>
          <div class="ct-title">Your Cart</div>
          <div class="ct-sub" id="ctHeadSub">Nothing here yet</div>
        </div>
        <button class="ct-close" onclick="toggleCart()" title="Close">✕</button>
      </div>
    </div>
    <div class="ct-scroll">
      <div id="cartItemsWrap"></div>
      <div id="ctExtras">
        <div class="ct-rewards" id="ctRewards"></div>
        <div class="ct-box" id="ctWalletBox" style="display:none;">
          <div class="ct-wallet" onclick="toggleWalletDiscount()">
            <span style="font-size:20px;">💰</span>
            <div style="flex:1; font-size:12.5px; font-weight:800;">Use my cashback <b id="ctWalletAmt"></b></div>
            <span class="ct-switch" id="ctWalletSwitch"></span>
          </div>
        </div>
        <div class="ct-box">
          <button class="ct-code-toggle" id="ctCodeToggle" onclick="toggleCodeBox()">🏷️ Have a code?<span id="ctCodeChip"></span><span class="chev">▾</span></button>
          <div class="ct-code-body" id="ctCodeBody">
            <div class="ct-code-row">
              <input type="text" id="promoInput" placeholder="Enter code" autocomplete="off" onkeydown="if(event.key==='Enter') applyPromoCode()">
              <button id="ctApplyBtn" onclick="applyPromoCode()">Apply</button>
            </div>
            <div id="promoMsg" style="display:none;"></div>
          </div>
        </div>
        <div class="ct-sum">
          <div class="ct-sum-row"><span>Subtotal</span><span id="cartSubtotal">$0.00</span></div>
          <div class="ct-sum-row green" id="ctDiscRow" style="display:none;"><span id="ctDiscLabel">Discount</span><span id="ctDiscAmt"></span></div>
          <div class="ct-sum-row small"><span>Processing fee</span><span id="cartFee">$0.00</span></div>
          <div class="ct-sum-row green" id="cartTipRow" style="display:none;"><span>Tip 💖</span><span id="cartTipAmount"></span></div>
          <div class="ct-sum-row green" id="ctWalletRow" style="display:none;"><span>Cashback used</span><span id="ctWalletUsed"></span></div>
          <div class="ct-note" id="cartCurrencyNote" style="display:none;">Shown for reference — you'll be charged in USD via PayPal.</div>
        </div>
      </div>
    </div>
    <div class="ct-foot">
      <div class="ct-total-row">
        <div><div class="ct-total-label">Total</div><span class="ct-save" id="ctSave" style="display:none;"></span></div>
        <div class="ct-total" id="cartTotal">$0.00</div>
      </div>
      <button class="ct-go" id="ctGoBtn" onclick="openCheckoutModal()">Checkout →</button>
      <div class="ct-trust"><span>🔒 Secure PayPal checkout</span><span>⚡ Fast delivery</span></div>
    </div>
  </aside>
</div>

<div class="modal-overlay" id="checkoutModal">
  <div class="modal-box">
    <button class="modal-close" onclick="closeCheckoutModal()">✕</button>
    <div id="checkoutForm">
      <h3>🛒 Ready to Check Out</h3>
      <p class="sub">Pay securely with PayPal below — your order is created automatically once payment is confirmed.</p>
      <div class="ct-co-sum" id="ctCoSum"></div>
      <label>Roblox Username</label>
      <div id="checkoutRobloxKnown" style="display:none; align-items:center; gap:10px; margin-top:4px; padding:10px 12px; background:#F7F9FF; border-radius:10px;">
        <img id="checkoutRobloxAvatarImg" src="" alt="" style="width:40px; height:40px; border-radius:50%; background:#E4E9F7;">
        <div>
          <div id="checkoutRobloxDisplayName" style="font-weight:800; font-size:13px;"></div>
          <div id="checkoutRobloxHandle" style="font-size:11.5px; color:var(--muted); font-weight:600;"></div>
        </div>
      </div>
      <div id="checkoutRobloxMissing" style="display:none; font-size:12px; color:#C0392B; font-weight:700; margin-top:6px; line-height:1.5;">
        You haven't set a Roblox username on your account yet.
        <a href="settings.html" style="color:var(--brand-blue); font-weight:800;">Set it in Settings →</a>
      </div>
      <div style="font-size:11px; color:var(--muted); font-weight:600; margin-top:6px;">
        This is pulled from your account. If it's ever wrong, just let us know in the order chat and we'll sort it out.
      </div>
      <div style="background:#EEF3FF; border-radius:10px; padding:12px 14px; margin-top:14px; font-size:11.5px; color:var(--muted); font-weight:600; line-height:1.6;">
        <b style="color:var(--ink);">⏱️ NOTE:</b> Delivery usually takes 5–15 minutes after payment — but it's not guaranteed. Delays can happen from Roblox trade cooldowns or account restrictions. If it's taking longer than usual, that just means your order needs a bit more time to process — we haven't forgotten about you.
      </div>
      <div id="mutationWarningBox" style="display:none; background:#FFF4E5; border:1px solid #FFD79A; border-radius:10px; padding:12px 14px; margin-top:10px; font-size:11.5px; color:var(--ink); font-weight:600; line-height:1.6;">
        <b>⚠️ We noticed you're ordering a Grow a Garden 1 pet with a mutation.</b><br>
        Note: please read this — mutation pets are harder to stock and harder to find a seller for, so they usually take more time to source than pets without a mutation. We don't always have every mutation in stock, but we'll get it to you if we do.
        <div style="margin-top:8px; font-weight:800;">
          <span id="mutationTimerCounting">Please take a moment to read — you can submit in <span id="mutationTimerCount">5</span>s.</span>
          <span id="mutationTimerDone" style="display:none;">✅ Thanks for reading — you're good to submit.</span>
        </div>
      </div>
      <div id="checkoutFormError" style="display:none; color:#C0392B; font-size:12.5px; font-weight:700; margin-top:10px;"></div>
      <div id="tipPicker"></div>
      <div id="paypal-button-container" style="margin-top:14px;"></div>
      <div id="paypalProcessingNote" style="display:none; text-align:center; font-size:12.5px; color:var(--muted); font-weight:700; margin-top:8px;">Confirming your payment — please don't close this window…</div>
    </div>
    <div class="modal-success ct-success" id="checkoutSuccess">
      <div class="big">🎉</div>
      <h3 id="ctSuccessTitle">Order placed!</h3>
      <p class="sub">Payment received! Your order is on its way — we'll deliver in-game shortly.</p>
      <a id="checkoutOrderChatLink" href="#" style="display:inline-block; margin-top:10px; background:var(--brand-blue); color:#fff; text-decoration:none; font-weight:800; font-size:13px; padding:10px 18px; border-radius:10px;">💬 Open Order Chat</a>
    </div>
  </div>
</div>`);

let cart = [];
let appliedPromoCode = null;   // { code, percent, isPersonal } or null
let pendingReward = null;      // personal reward code waiting to be used: { code, percent, reason }
let dailyDiscount = null;      // { available, percent, min_spend, next_at } from get_daily_discount
let rewardChoice = 'auto';     // 'auto' | 'daily' | 'reward' | 'none'
let currentTipAmount = 0;      // picked in the checkout popup (tip.js)
let mutationTimerInterval = null;
let checkoutRobloxData = null; // { username, avatarUrl } from the buyer's profile
let ctServerOffsetMs = 0;      // server clock minus this device's clock
let ctJustAdded = null;        // key of the item to animate in on next render
let ctBumpKey = null;          // key whose quantity just changed

const REWARD_REASON_LABELS = {
  win_back: 'Welcome-back reward',
  spend_milestone: 'Spending reward',
  order_milestone: 'Loyalty reward',
};

const ctEsc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const ctRound = (n) => Math.round(n * 100) / 100;
const ctMoney = (usd) => (typeof formatMoney === 'function' ? formatMoney(usd) : '$' + Number(usd).toFixed(2));
const ctReducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- storage ----------
// The cart survives reloads and page switches via this browser's localStorage,
// and (for logged-in buyers) is mirrored to Supabase for cart reminders.
const CART_STORAGE_KEY = 'buylance_cart_v1';
let cartSyncTimeout = null;
function saveCartToStorage(){
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch(e){}
  if(!currentUser) return;
  clearTimeout(cartSyncTimeout);
  cartSyncTimeout = setTimeout(async () => {
    try {
      await supabaseClient.rpc('sync_cart_snapshot', { p_cart_json: cart, p_item_count: cart.reduce((s,i) => s + i.qty, 0) });
    } catch(e){ console.warn('Cart sync failed (non-critical):', e); }
  }, 1500);
}
function loadCartFromStorage(){
  try { cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || []; } catch(e){ cart = []; }
}

// ---------- adding / changing items ----------
function addToCart(key, name, game, price, minQty, isMutation, isLocked){
  minQty = minQty || 1;
  const btn = ctClickedButton();
  const pic = btn && ctCardImage(btn);
  const existing = cart.find(i => i.key === key);
  if(existing){
    if(!existing.locked){ existing.qty++; ctBumpKey = key; }
  } else {
    const src = pic ? pic.getAttribute('src') : '';
    cart.push({ key, name, game, price, qty:minQty, min:minQty, mutation:!!isMutation, locked:!!isLocked, img: /^img\//.test(src) ? src : '' });
    ctJustAdded = key;
  }
  saveCartToStorage();
  renderCart();
  if(btn && !isLocked){
    ctFlyToCart(pic);
    ctButtonFeedback(btn);
    showCartToast(`✅ ${name} added`, { label:'View cart', onClick: () => toggleCart(true) });
  }
}
// "Buy N at once" bundle button — qty × unit price, no discount.
function addPetBundle(key, name, game, price, qty){
  const btn = ctClickedButton();
  const pic = btn && ctCardImage(btn);
  const existing = cart.find(i => i.key === key);
  if(existing){ existing.qty += qty; ctBumpKey = key; }
  else {
    const src = pic ? pic.getAttribute('src') : '';
    cart.push({ key, name, game, price, qty, min:1, mutation:false, img: /^img\//.test(src) ? src : '' });
    ctJustAdded = key;
  }
  saveCartToStorage();
  renderCart();
  if(btn){ ctFlyToCart(pic); showCartToast(`✅ ${qty}× ${name} added`, { label:'View cart', onClick: () => toggleCart(true) }); }
}
function changeQty(key, delta){
  const item = cart.find(i => i.key === key);
  if(!item || item.locked) return;           // prizes/gifts stay at qty 1
  if(delta < 0 && item.qty <= item.min) return;
  item.qty += delta;
  ctBumpKey = key;
  saveCartToStorage();
  renderCart();
}
function removeFromCart(key){
  const item = cart.find(i => i.key === key);
  if(item && item.locked){
    showCartToast("This prize can't be removed — check out with it whenever you're ready!");
    return;
  }
  const row = document.querySelector(`.ct-item[data-key="${CSS.escape(key)}"]`);
  const finish = () => { cart = cart.filter(i => i.key !== key); saveCartToStorage(); renderCart(); };
  if(row && !ctReducedMotion()){ row.classList.add('ct-out'); setTimeout(finish, 220); } else finish();
}

// The button that was clicked to add something (product cards use onclick).
function ctClickedButton(){
  const ev = window.event;
  const t = ev && ev.target;
  return t && t.closest ? t.closest('button, a, .seller-card') : null;
}
function ctCardImage(el){
  const card = el.closest('.seller-card, [class*="card"]');
  return card ? card.querySelector('img') : null;
}
function ctCartTarget(){
  const sticky = document.getElementById('stickyCart');
  if(sticky && sticky.classList.contains('show')) return sticky;
  return document.querySelector('.cart-icon') || sticky;
}
function ctFlyToCart(img){
  const target = ctCartTarget();
  if(!img || !target || ctReducedMotion() || !img.animate){ ctBumpBadges(); return; }
  const from = img.getBoundingClientRect(), to = target.getBoundingClientRect();
  if(!from.width || from.bottom < 0 || from.top > innerHeight){ ctBumpBadges(); return; }
  const ghost = img.cloneNode();
  ghost.removeAttribute('loading');
  ghost.className = 'ct-fly';
  Object.assign(ghost.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost.animate([
    { transform:'translate(0,0) scale(1) rotate(0)', opacity:1 },
    { transform:`translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(.55) rotate(-12deg)`, opacity:1, offset:.5 },
    { transform:`translate(${dx}px, ${dy}px) scale(.12) rotate(10deg)`, opacity:.3 },
  ], { duration:750, easing:'cubic-bezier(.45,0,.55,1)' }).onfinish = () => { ghost.remove(); ctBumpBadges(); };
}
function ctBumpBadges(){
  ['cartCount', 'cartCountFloating', 'ctHeadIco'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('ct-bump'); void el.offsetWidth; el.classList.add('ct-bump');
  });
}
function ctButtonFeedback(btn){
  if(!btn.classList || !btn.classList.contains('seller-cart') || btn.dataset.ctBusy) return;
  btn.dataset.ctBusy = '1';
  const old = btn.innerHTML;
  btn.innerHTML = '✓ Added!';
  btn.classList.add('ct-added');
  setTimeout(() => { btn.innerHTML = old; btn.classList.remove('ct-added'); delete btn.dataset.ctBusy; }, 1100);
}

// Bottom-of-screen message, optionally with one action button.
function showCartToast(msg, action){
  let toast = document.getElementById('ctToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'ctToast';
    toast.className = 'ct-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${ctEsc(msg)}</span>` + (action ? `<button type="button">${ctEsc(action.label)}</button>` : '');
  toast.classList.toggle('has-btn', !!action);
  if(action) toast.querySelector('button').onclick = () => { toast.classList.remove('show'); action.onClick(); };
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => toast.classList.remove('show'), action ? 3200 : 2800);
}
const showSpinPrizeToast = showCartToast;

// ---------- free prizes ----------
// Puts any unredeemed spin-wheel prize into the cart as a locked $0 item.
// Supabase is the source of truth, so it comes back on any device.
async function syncSpinPrizeIntoCart(){
  if(!currentUser) return;
  try {
    const { data: status, error } = await supabaseClient.rpc('get_spin_status', { p_user_id: currentUser.id });
    if(error || !status) return;
    const hasPrize = status.last_won_item && !status.prize_redeemed;
    const inCart = cart.some(i => i.key === 'spin50-prize');
    if(hasPrize && !inCart){
      cart.push({ key:'spin50-prize', name:status.last_won_item, game:'🎰 Spin Wheel Prize', price:0, qty:1, min:1, mutation:false, locked:true });
      ctJustAdded = 'spin50-prize';
      saveCartToStorage(); renderCart();
      showSpinPrizeBanner(status.last_won_item);
    } else if(!hasPrize && inCart){
      cart = cart.filter(i => i.key !== 'spin50-prize');
      saveCartToStorage(); renderCart();
    }
  } catch(e){ console.warn('Spin prize sync failed:', e); }
}
function showSpinPrizeBanner(itemName){
  if(document.getElementById('spinPrizeBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'spinPrizeBanner';
  banner.style.cssText = 'position:fixed; top:90px; left:50%; transform:translateX(-50%); z-index:500; background:linear-gradient(90deg,#FF7A29,#FF9A52); color:#fff; font-weight:800; font-size:14px; padding:14px 22px; border-radius:30px; box-shadow:0 8px 24px rgba(255,122,41,0.4); display:flex; align-items:center; gap:12px; max-width:90vw; text-align:center;';
  banner.innerHTML = `<span>🎁 Check your cart to see your winning prize — <b>${ctEsc(itemName)}</b>!</span>
    <button onclick="document.getElementById('spinPrizeBanner').remove()" style="background:rgba(255,255,255,0.25); border:none; color:#fff; border-radius:50%; width:22px; height:22px; cursor:pointer; font-weight:800; flex-shrink:0;">✕</button>`;
  document.body.appendChild(banner);
}

// ---------- money math ----------
// Deterministic processing fee: the same amount always gives the same fee,
// scaling $0.50 → $1.50 (cap at $20+) with a few cents of jitter.
function calculateProcessingFee(price){
  const MIN_FEE = 0.50, MAX_FEE = 1.50, CAP_AT_PRICE = 20;
  let fee = MIN_FEE + (MAX_FEE - MIN_FEE) * Math.min(price / CAP_AT_PRICE, 1);
  let hash = 0;
  const str = price.toFixed(2);
  for(let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  fee = Math.min(fee + (hash % 8) / 100, MAX_FEE);
  return Math.round(fee * 100) / 100;
}

// Not unlocked yet: the daily 5% needs $10 of completed orders first.
function dailyLocked(){
  return !!(dailyDiscount && dailyDiscount.unlocked === false);
}
function dailyReady(subtotal){
  return !!(currentUser && dailyDiscount && dailyDiscount.available && subtotal >= dailyDiscount.min_spend);
}
// The one discount that applies right now, or null.
function activeDiscount(subtotal){
  if(subtotal <= 0) return null;
  if(appliedPromoCode) return { kind:'promo', code:appliedPromoCode.code, percent:appliedPromoCode.percent, label:`Code ${appliedPromoCode.code}` };
  let choice = rewardChoice;
  if(choice === 'auto'){
    // Best deal first; on a tie keep the personal code for another day.
    const dailyPct = dailyReady(subtotal) ? dailyDiscount.percent : 0;
    choice = pendingReward && pendingReward.percent > dailyPct ? 'reward' : 'daily';
  }
  if(choice === 'reward' && pendingReward) return { kind:'reward', code:pendingReward.code, percent:pendingReward.percent, label:REWARD_REASON_LABELS[pendingReward.reason] || 'Reward' };
  if(choice === 'daily' && dailyReady(subtotal)) return { kind:'daily', code:'DAILY5', percent:dailyDiscount.percent, label:'Daily 5% off' };
  return null;
}

// All the cart math in one place — the drawer, the tip step and PayPal use it.
function computeCartTotals(){
  const subtotal = ctRound(cart.reduce((s,i) => s + i.price * i.qty, 0));
  const discountInfo = activeDiscount(subtotal);
  const discount = discountInfo ? ctRound(subtotal * discountInfo.percent / 100) : 0;
  const afterDiscount = ctRound(subtotal - discount);
  const fee = afterDiscount > 0 ? calculateProcessingFee(afterDiscount) : 0;
  const tip = currentTipAmount || 0;
  const walletDiscount = (currentUser && walletBalance > 0 && useWalletCredit) ? ctRound(Math.min(walletBalance, afterDiscount + fee)) : 0;
  const total = ctRound(Math.max(afterDiscount + fee + tip - walletDiscount, 0));
  return { subtotal, discountInfo, discount, afterDiscount, fee, tip, walletDiscount, total };
}
function checkoutAmountsUSD(){
  const t = computeCartTotals();
  return { base: t.afterDiscount, total: t.total };
}

// ---------- rewards (daily 5% + personal codes) ----------
async function loadCartRewards(){
  if(!currentUser){ pendingReward = null; dailyDiscount = null; renderCart(); return; }
  try {
    const [rw, daily] = await Promise.all([
      supabaseClient.rpc('get_pending_auto_reward'),
      supabaseClient.rpc('get_daily_discount'),
    ]);
    pendingReward = rw.data && rw.data.ok ? rw.data : null;
    dailyDiscount = daily.data && daily.data.ok ? daily.data : null;
    if(dailyDiscount && dailyDiscount.server_now) ctServerOffsetMs = new Date(dailyDiscount.server_now) - Date.now();
  } catch(e){ console.warn('Could not load rewards:', e); }
  renderCart();
}
function ctMsUntilDaily(){
  if(!dailyDiscount || !dailyDiscount.next_at) return 0;
  return Math.max(new Date(dailyDiscount.next_at) - (Date.now() + ctServerOffsetMs), 0);
}
function ctCountdownParts(ms){
  const s = Math.ceil(ms / 1000);
  return { h: Math.floor(s / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
}
function ctCountdownText(ms){
  const p = ctCountdownParts(ms);
  return p.h > 0 ? `${p.h}h ${String(p.m).padStart(2,'0')}m` : `${p.m}m ${String(p.s).padStart(2,'0')}s`;
}

function pickReward(kind){
  const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const current = activeDiscount(subtotal);
  if(current && current.kind === kind){
    rewardChoice = 'none';
  } else {
    rewardChoice = kind;
    if(appliedPromoCode){
      appliedPromoCode = null;
      ctPromoMsg('Your code was removed — only one discount can apply at a time.', 'var(--muted)');
    }
  }
  renderCart();
}

function renderRewards(subtotal, active){
  const box = document.getElementById('ctRewards');
  const cards = [];
  if(!currentUser){
    cards.push(`<button class="ct-rw login" onclick="openLoginModal()">
      <span class="ct-rw-ico">🎁</span>
      <span class="ct-rw-txt"><span class="ct-rw-title">Log in for rewards</span><span class="ct-rw-sub">5% off every day after $10 spent, plus cashback</span></span>
      <span class="ct-rw-side">›</span></button>`);
  } else if(dailyDiscount){
    const pct = dailyDiscount.percent, min = dailyDiscount.min_spend;
    if(dailyLocked()){
      const goal = dailyDiscount.unlock_spend, spent = Number(dailyDiscount.spent) || 0;
      cards.push(`<div class="ct-rw progress">
        <span class="ct-rw-ico">🔒</span>
        <span class="ct-rw-txt"><span class="ct-rw-title">Spend ${ctMoney(ctRound(goal - spent))} more to unlock ${pct}% off every day</span>
          <span class="ct-rw-sub">${ctMoney(spent)} of ${ctMoney(goal)} spent · counts once an order is completed</span>
          <div class="ct-bar"><i style="width:${Math.max(4, Math.min(100, spent / goal * 100))}%"></i></div></span></div>`);
    } else if(!dailyDiscount.available){
      cards.push(`<button class="ct-rw cooldown" onclick="showDailyCountdown()">
        <span class="ct-rw-ico">⏳</span>
        <span class="ct-rw-txt"><span class="ct-rw-title">Daily ${pct}% used</span><span class="ct-rw-sub">Comes back 24h after you used it</span></span>
        <span class="ct-rw-side" data-ct-countdown>${ctCountdownText(ctMsUntilDaily())}</span></button>`);
    } else if(subtotal < min){
      const need = min - subtotal;
      cards.push(`<div class="ct-rw progress">
        <span class="ct-rw-ico">⚡</span>
        <span class="ct-rw-txt"><span class="ct-rw-title">Add ${ctMoney(need)} more for ${pct}% off</span>
          <span class="ct-rw-sub">Your daily ${pct}% unlocks on orders of ${ctMoney(min)}+</span>
          <div class="ct-bar"><i style="width:${Math.max(4, Math.min(100, subtotal / min * 100))}%"></i></div></span></div>`);
    } else {
      const on = active && active.kind === 'daily';
      cards.push(`<button class="ct-rw ${on ? 'on' : ''}" onclick="pickReward('daily')">
        <span class="ct-rw-ico">⚡</span>
        <span class="ct-rw-txt"><span class="ct-rw-title">Daily ${pct}% OFF${on ? ' applied!' : ''}</span>
          <span class="ct-rw-sub">${on ? `You save ${ctMoney(ctRound(subtotal * pct / 100))} today` : 'Tap to use today\'s discount'}</span></span>
        <span class="ct-switch"></span></button>`);
    }
  }
  if(currentUser && pendingReward && subtotal > 0){
    const on = active && active.kind === 'reward';
    cards.push(`<button class="ct-rw ${on ? 'on' : ''}" onclick="pickReward('reward')">
      <span class="ct-rw-ico">🎟️</span>
      <span class="ct-rw-txt"><span class="ct-rw-title">${pendingReward.percent}% ${ctEsc(REWARD_REASON_LABELS[pendingReward.reason] || 'reward')}</span>
        <span class="ct-rw-sub">${on ? `You save ${ctMoney(ctRound(subtotal * pendingReward.percent / 100))}` : 'One-time code — tap to use it'}</span></span>
      <span class="ct-switch"></span></button>`);
  }
  if(cards.length > 1 && subtotal > 0) cards.push(`<div style="font-size:10.5px; font-weight:800; color:#8A96B3; text-align:center;">One discount per order — we pick the best one for you</div>`);
  box.innerHTML = cards.join('');
}

// Countdown popup shown when the buyer taps a used daily discount.
function showDailyCountdown(){
  closeDailyCountdown();
  const wrap = document.createElement('div');
  wrap.className = 'ct-pop-wrap';
  wrap.id = 'ctPopWrap';
  wrap.onclick = (e) => { if(e.target === wrap) closeDailyCountdown(); };
  wrap.innerHTML = `
    <div class="ct-pop" role="dialog" aria-label="Next daily discount">
      <div class="ct-pop-clock">⏰</div>
      <h4>Your next 5% unlocks in</h4>
      <div class="ct-digits">
        <div class="ct-digit"><b data-ct-h>0</b><span>hours</span></div>
        <div class="ct-digit"><b data-ct-m>00</b><span>mins</span></div>
        <div class="ct-digit"><b data-ct-s>00</b><span>secs</span></div>
      </div>
      <p>You get 5% off one order (${ctMoney(dailyDiscount ? dailyDiscount.min_spend : 2)}+) every day.<br>It comes back 24 hours after you use it.</p>
      <button type="button" onclick="closeDailyCountdown()">Got it 👍</button>
    </div>`;
  document.body.appendChild(wrap);
  ctTick();
}
// "Check My Daily 5%" button: ready → toast, used → countdown popup.
async function showDailyDiscountStatus(){
  if(!currentUser){ showCartToast('Log in to get 5% off every day ⚡'); openLoginModal(); return; }
  await loadCartRewards();
  if(!dailyDiscount){ showCartToast("Couldn't check right now — please try again."); return; }
  if(dailyLocked()){
    const left = ctRound(dailyDiscount.unlock_spend - (Number(dailyDiscount.spent) || 0));
    showCartToast(`🔒 Spend ${ctMoney(left)} more to unlock 5% off every day`);
  } else if(dailyDiscount.available){
    showCartToast(`⚡ Your 5% is ready — it applies by itself on orders of ${ctMoney(dailyDiscount.min_spend)}+`, { label:'Open cart', onClick: () => toggleCart(true) });
  } else {
    showDailyCountdown();
  }
}
function closeDailyCountdown(){
  const w = document.getElementById('ctPopWrap');
  if(w) w.remove();
}

// One timer keeps every countdown on screen live.
let ctTickRefreshing = false;
function ctTick(){
  if(!dailyDiscount || dailyDiscount.available || dailyLocked()) return;
  const ms = ctMsUntilDaily();
  document.querySelectorAll('[data-ct-countdown]').forEach(el => { el.textContent = ctCountdownText(ms); });
  const p = ctCountdownParts(ms);
  const set = (attr, v) => document.querySelectorAll(`[${attr}]`).forEach(el => { el.textContent = v; });
  set('data-ct-h', p.h); set('data-ct-m', String(p.m).padStart(2,'0')); set('data-ct-s', String(p.s).padStart(2,'0'));
  if(ms <= 0 && !ctTickRefreshing){
    ctTickRefreshing = true;
    closeDailyCountdown();
    loadCartRewards().finally(() => { ctTickRefreshing = false; });
  }
}
setInterval(ctTick, 1000);

// ---------- drawer ----------
function ctGameIcon(game){
  const m = String(game || '').match(/^\s*(\p{Extended_Pictographic}️?)/u);
  return m ? m[1] : '🎮';
}
function ctGameName(game){
  return String(game || '').replace(/^[\s\p{Extended_Pictographic}️‍]+/u, '') || 'Item';
}

function renderCart(){
  const totalQty = cart.reduce((s,i) => s + i.qty, 0);
  ['cartCount', 'cartCountFloating'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = totalQty; });
  document.getElementById('ctHeadSub').textContent = totalQty ? `${totalQty} item${totalQty === 1 ? '' : 's'} ready to go` : 'Nothing here yet';

  const wrap = document.getElementById('cartItemsWrap');
  if(cart.length === 0){
    wrap.innerHTML = `<div class="ct-empty">
      <div class="ct-empty-ico">🛒</div>
      <h4>Your cart is empty</h4>
      <p>Pick something cool — it'll show up here.</p>
      <button type="button" onclick="toggleCart(false)">Start shopping ✨</button></div>`;
  } else {
    const games = [...new Set(cart.map(i => i.game))];
    wrap.innerHTML = games.map(g => `<div class="ct-game">${ctEsc(ctGameIcon(g))} ${ctEsc(ctGameName(g))}</div>` + cart.filter(i => i.game === g).map(i => {
      const thumb = i.img ? `<img src="${ctEsc(i.img)}" alt="">` : (i.locked ? '🎁' : ctEsc(ctGameIcon(g)));
      const anim = i.key === ctJustAdded ? ' ct-in' : '';
      const k = ctEsc(JSON.stringify(i.key));
      if(i.locked) return `
        <div class="ct-item locked${anim}" data-key="${ctEsc(i.key)}">
          <div class="ct-thumb">${thumb}</div>
          <div class="ct-info">
            <div class="ct-name">${ctEsc(i.name)}</div>
            <div class="ct-row"><span class="ct-lock">🔒 Free prize · qty locked</span><span class="ct-free">FREE</span></div>
          </div>
        </div>`;
      return `
        <div class="ct-item${anim}" data-key="${ctEsc(i.key)}">
          <div class="ct-thumb">${thumb}</div>
          <div class="ct-info">
            <div class="ct-name">${ctEsc(i.name)}</div>
            <div class="ct-unit">${ctMoney(i.price)} each</div>
            <div class="ct-row">
              <div class="ct-qty">
                <button type="button" onclick="changeQty(${k}, -1)" ${i.qty <= i.min ? 'disabled' : ''} aria-label="Less">−</button>
                <span class="${i.key === ctBumpKey ? 'bump' : ''}">${i.qty}</span>
                <button type="button" onclick="changeQty(${k}, 1)" aria-label="More">+</button>
              </div>
              <div class="ct-line">${ctMoney(i.price * i.qty)}</div>
            </div>
          </div>
          <button type="button" class="ct-remove" onclick="removeFromCart(${k})" title="Remove">✕</button>
        </div>`;
    }).join('')).join('');
  }
  ctJustAdded = null;
  ctBumpKey = null;

  const t = computeCartTotals();
  document.getElementById('ctExtras').style.display = cart.length ? 'block' : 'none';
  renderRewards(t.subtotal, t.discountInfo);

  // wallet
  const walletBox = document.getElementById('ctWalletBox');
  const canWallet = currentUser && walletBalance > 0;
  walletBox.style.display = canWallet ? 'block' : 'none';
  if(canWallet){
    document.getElementById('ctWalletAmt').textContent = ctMoney(walletBalance);
    document.getElementById('ctWalletSwitch').classList.toggle('on', !!useWalletCredit);
  }

  // code chip
  document.getElementById('ctCodeChip').innerHTML = appliedPromoCode
    ? `<span class="ct-chip">${ctEsc(appliedPromoCode.code)} −${appliedPromoCode.percent}% <button type="button" onclick="event.stopPropagation(); removePromoCode()" title="Remove code">✕</button></span>` : '';

  document.getElementById('cartSubtotal').textContent = ctMoney(t.subtotal);
  document.getElementById('ctDiscRow').style.display = t.discount > 0 ? 'flex' : 'none';
  if(t.discount > 0){
    document.getElementById('ctDiscLabel').textContent = `${t.discountInfo.label} (−${t.discountInfo.percent}%)`;
    document.getElementById('ctDiscAmt').textContent = '−' + ctMoney(t.discount);
  }
  document.getElementById('cartFee').textContent = ctMoney(t.fee);
  document.getElementById('cartTipRow').style.display = t.tip > 0 ? 'flex' : 'none';
  if(t.tip > 0) document.getElementById('cartTipAmount').textContent = ctMoney(t.tip);
  document.getElementById('ctWalletRow').style.display = t.walletDiscount > 0 ? 'flex' : 'none';
  if(t.walletDiscount > 0) document.getElementById('ctWalletUsed').textContent = '−' + ctMoney(t.walletDiscount);
  const note = document.getElementById('cartCurrencyNote');
  note.style.display = (typeof CURRENT_CURRENCY !== 'undefined' && CURRENT_CURRENCY !== 'USD') ? 'block' : 'none';

  ctAnimateTotal(t.total);
  const saved = ctRound(t.discount + t.walletDiscount);
  const saveEl = document.getElementById('ctSave');
  saveEl.style.display = saved > 0 ? 'inline-block' : 'none';
  if(saved > 0) saveEl.textContent = `🎉 You save ${ctMoney(saved)}`;
  const go = document.getElementById('ctGoBtn');
  go.disabled = cart.length === 0;
  go.textContent = cart.length ? `Checkout · ${ctMoney(t.total)} →` : 'Checkout →';
}

// Counts the total up/down instead of jumping.
let ctShownTotal = null;
function ctAnimateTotal(target){
  const el = document.getElementById('cartTotal');
  const from = ctShownTotal;
  ctShownTotal = target;
  cancelAnimationFrame(el._raf);
  if(from === null || from === target || target === 0 || ctReducedMotion()){ el.textContent = ctMoney(target); return; }
  const start = performance.now(), dur = 380;
  const step = (now) => {
    const k = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = ctMoney(from + (target - from) * eased);
    if(k < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

function toggleWalletDiscount(){
  useWalletCredit = !useWalletCredit;
  const legacy = document.getElementById('applyWalletCheckbox');
  if(legacy) legacy.checked = useWalletCredit;
  renderCart();
}
function toggleCodeBox(force){
  const body = document.getElementById('ctCodeBody');
  const open = typeof force === 'boolean' ? force : !body.classList.contains('open');
  body.classList.toggle('open', open);
  document.getElementById('ctCodeToggle').classList.toggle('open', open);
  if(open) setTimeout(() => document.getElementById('promoInput').focus(), 50);
}

function toggleCart(force){
  const overlay = document.getElementById('cartOverlay');
  const open = typeof force === 'boolean' ? force : !overlay.classList.contains('open');
  overlay.classList.toggle('open', open);
  document.documentElement.style.overflow = open ? 'hidden' : '';
  if(open){
    const toast = document.getElementById('ctToast');
    if(toast) toast.classList.remove('show');
    renderCart();
    const ico = document.getElementById('ctHeadIco');
    ico.classList.remove('wiggle'); void ico.offsetWidth; ico.classList.add('wiggle');
    if(currentUser){ loadCartRewards(); syncSpinPrizeIntoCart(); }
  }
}
document.getElementById('cartOverlay').addEventListener('click', (e) => {
  if(e.target.id === 'cartOverlay') toggleCart(false);
});
document.addEventListener('keydown', (e) => {
  if(e.key !== 'Escape') return;
  if(document.getElementById('ctPopWrap')) closeDailyCountdown();
  else if(document.getElementById('cartOverlay').classList.contains('open')) toggleCart(false);
});
window.addEventListener('scroll', () => {
  const btn = document.getElementById('stickyCart');
  if(btn) btn.classList.toggle('show', window.scrollY > 400);
});

// ---------- codes ----------
function ctPromoMsg(text, color){
  const msg = document.getElementById('promoMsg');
  msg.style.display = text ? 'block' : 'none';
  msg.style.color = color || '#C0392B';
  msg.textContent = text || '';
}
function removePromoCode(){
  appliedPromoCode = null;
  document.getElementById('promoInput').value = '';
  ctPromoMsg('');
  renderCart();
}
async function applyPromoCode(){
  const input = document.getElementById('promoInput');
  const code = input.value.trim().toUpperCase();
  if(!code){ appliedPromoCode = null; ctPromoMsg('Please enter a code.'); renderCart(); return; }
  if(!currentUser){ ctPromoMsg('❌ Please log in first to use the code.'); return; }

  const btn = document.getElementById('ctApplyBtn');
  btn.disabled = true;
  try {
    if(code === 'BUYRBLX' || code === 'BUYLANCE'){
      // BUYLANCE = the code's old name; using either counts as using BUYRBLX.
      const [a, b] = await Promise.all([
        supabaseClient.rpc('has_redeemed_promo', { p_code: 'BUYRBLX' }),
        supabaseClient.rpc('has_redeemed_promo', { p_code: 'BUYLANCE' }),
      ]);
      if(a.error || b.error) throw (a.error || b.error);
      if(a.data || b.data){
        appliedPromoCode = null;
        ctPromoMsg("❌ You've already used this code once — it's limited to one use per account.");
        return;
      }
      appliedPromoCode = { code: 'BUYRBLX', percent: 10, isPersonal: false };
    } else {
      const { data, error } = await supabaseClient.rpc('check_personal_discount_code', { p_code: code });
      if(error) throw error;
      if(!data.ok){
        const errMap = {
          invalid_code: '❌ Invalid code.',
          already_used: '❌ This code has already been used.',
          expired: '❌ This code has expired.',
          not_logged_in: '❌ Please log in first to use the code.',
        };
        appliedPromoCode = null;
        ctPromoMsg(errMap[data.error] || '❌ Invalid code.');
        return;
      }
      appliedPromoCode = { code, percent: data.discount_percent, isPersonal: true };
    }
    ctPromoMsg(`✅ Code applied — ${appliedPromoCode.percent}% off your order!`, '#1E8E3E');
  } catch(e){
    console.warn('Promo code check failed:', e);
    appliedPromoCode = null;
    ctPromoMsg('Something went wrong checking that code — please try again.');
  } finally {
    btn.disabled = false;
    renderCart();
  }
}

// ---------- checkout popup ----------
async function loadCheckoutRobloxInfo(){
  const knownBox = document.getElementById('checkoutRobloxKnown');
  const missingBox = document.getElementById('checkoutRobloxMissing');
  checkoutRobloxData = null;
  knownBox.style.display = 'none';
  missingBox.style.display = 'none';
  if(!currentUser) return;
  const { data: profile } = await supabaseClient.from('profiles').select('roblox_username, roblox_avatar_url').eq('id', currentUser.id).single();
  if(profile && profile.roblox_username){
    checkoutRobloxData = { username: profile.roblox_username, avatarUrl: profile.roblox_avatar_url || '' };
    document.getElementById('checkoutRobloxAvatarImg').src = checkoutRobloxData.avatarUrl;
    document.getElementById('checkoutRobloxDisplayName').textContent = checkoutRobloxData.username;
    document.getElementById('checkoutRobloxHandle').textContent = '@' + checkoutRobloxData.username;
    knownBox.style.display = 'flex';
  } else {
    missingBox.style.display = 'block';
  }
}

async function openCheckoutModal(){
  if(cart.length === 0) return;
  if(!currentUser){
    showCartToast('Log in first to check out 🙂');
    openLoginModal();
    return;
  }
  const { data: profile } = await supabaseClient.from('profiles').select('frozen_until').eq('id', currentUser.id).single();
  if(profile && profile.frozen_until && new Date(profile.frozen_until) > new Date()){
    alert('⚠️ Your account is temporarily frozen until ' + new Date(profile.frozen_until).toLocaleDateString() + ' due to a 3rd warning. New orders are paused until then. Contact support if you believe this is a mistake.');
    return;
  }
  toggleCart(false);
  document.getElementById('checkoutForm').style.display = 'block';
  document.getElementById('checkoutSuccess').classList.remove('show');
  document.getElementById('checkoutModal').classList.add('open');
  checkoutClearError();
  loadCheckoutRobloxInfo();

  const t = computeCartTotals();
  const qty = cart.reduce((s,i) => s + i.qty, 0);
  document.getElementById('ctCoSum').innerHTML = `🛍️ ${qty} item${qty === 1 ? '' : 's'}${t.discountInfo ? ` · ${ctEsc(t.discountInfo.label)} −${t.discountInfo.percent}%` : ''}<b>${ctMoney(t.total)}</b>`;

  // Grow a Garden 1 mutation pets: make the buyer read the note for 5s.
  const box = document.getElementById('mutationWarningBox');
  const paypalContainer = document.getElementById('paypal-button-container');
  const countingEl = document.getElementById('mutationTimerCounting');
  const doneEl = document.getElementById('mutationTimerDone');
  const countEl = document.getElementById('mutationTimerCount');
  if(mutationTimerInterval){ clearInterval(mutationTimerInterval); mutationTimerInterval = null; }
  countingEl.style.display = 'inline';
  doneEl.style.display = 'none';
  countEl.textContent = '5';
  if(cart.some(i => i.mutation)){
    box.style.display = 'block';
    paypalContainer.style.opacity = '0.4';
    paypalContainer.style.pointerEvents = 'none';
    const startTime = Date.now();
    mutationTimerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      countEl.textContent = Math.max(0, Math.ceil((5000 - elapsed) / 1000));
      if(elapsed >= 5000){
        clearInterval(mutationTimerInterval);
        mutationTimerInterval = null;
        countingEl.style.display = 'none';
        doneEl.style.display = 'inline';
        paypalContainer.style.opacity = '1';
        paypalContainer.style.pointerEvents = 'auto';
      }
    }, 200);
  } else {
    box.style.display = 'none';
    paypalContainer.style.opacity = '1';
    paypalContainer.style.pointerEvents = 'auto';
  }

  // Optional tip step (tip.js) — resets to "No tip" each time.
  currentTipAmount = 0;
  TipPicker.mount('tipPicker', {
    getBase: () => checkoutAmountsUSD().base,
    getTotal: () => checkoutAmountsUSD().total,
    onChange: (tip) => { currentTipAmount = tip; renderCart(); },
  });

  renderPayPalButtons();
}

function closeCheckoutModal(){
  document.getElementById('checkoutModal').classList.remove('open');
  document.getElementById('checkoutForm').style.display = 'block';
  document.getElementById('checkoutSuccess').classList.remove('show');
  if(mutationTimerInterval){ clearInterval(mutationTimerInterval); mutationTimerInterval = null; }
  currentTipAmount = 0;
  renderCart();
}
function checkoutShowError(msg){
  const el = document.getElementById('checkoutFormError');
  el.textContent = msg;
  el.style.display = 'block';
}
function checkoutClearError(){
  document.getElementById('checkoutFormError').style.display = 'none';
}

// Validates the form + cart and returns everything needed for PayPal and
// the Supabase order, or null if something required is missing.
function buildCheckoutPayload(){
  checkoutClearError();
  if(!currentUser){ checkoutShowError('Please log in first to place an order!'); return null; }
  const roblox = checkoutRobloxData ? checkoutRobloxData.username : '';
  if(!roblox){ checkoutShowError('Please set your Roblox username in Settings first, then come back.'); return null; }
  if(cart.length === 0){ checkoutShowError('Your cart is empty.'); return null; }
  const t = computeCartTotals();
  return {
    roblox,
    email: currentUser.email || '',
    avatarUrl: checkoutRobloxData.avatarUrl || null,
    itemsJson: cart.map(i => ({ game: i.game, item: i.name, qty: i.qty, price: i.price })),
    totalUSD: t.total,
    walletDiscount: t.walletDiscount,
    tip: t.tip,
    fee: t.fee,
    discount: t.discount,
    discountInfo: t.discountInfo,
  };
}

function renderPayPalButtons(){
  const container = document.getElementById('paypal-button-container');
  container.innerHTML = '';
  if(typeof paypal === 'undefined'){
    container.innerHTML = '<p style="color:#C0392B; font-size:12.5px; font-weight:700;">PayPal isn\'t set up yet — the site owner needs to add a PayPal Client ID.</p>';
    return;
  }
  paypal.Buttons({
    createOrder: function(data, actions){
      const payload = buildCheckoutPayload();
      if(!payload) return actions.reject();
      if(payload.totalUSD <= 0){
        checkoutShowError('This order totals $0 — free items need at least one paid item to check out. Please add a paid item, or contact support.');
        return actions.reject();
      }
      TipPicker.lock(); // the tip can't change while PayPal is open
      return actions.order.create({
        purchase_units: [{ amount: { value: payload.totalUSD.toFixed(2), currency_code: 'USD' } }]
      });
    },
    onApprove: async function(data, actions){
      const processingNote = document.getElementById('paypalProcessingNote');
      processingNote.style.display = 'block';
      try {
        // Capture finalizes the payment on PayPal's side.
        await actions.order.capture();
        const payload = buildCheckoutPayload();
        if(!payload){ processingNote.style.display = 'none'; TipPicker.unlock(); return; }
        // Server-side check so nobody can fake a "successful" payment.
        const { data: verifyResult, error: verifyError } = await supabaseClient.functions.invoke('verify-paypal', {
          body: { paypalOrderId: data.orderID, expectedTotal: payload.totalUSD }
        });
        if(verifyError || !verifyResult || !verifyResult.verified){
          checkoutShowError('We could not verify your PayPal payment. If you were charged, please contact support with your PayPal receipt.');
        } else {
          await finalizeOrder(data.orderID, payload);
        }
      } catch(e){
        console.error('PayPal approval handling failed:', e);
        checkoutShowError('Something went wrong finishing your order. If you were charged, please contact support.');
      }
      processingNote.style.display = 'none';
      TipPicker.unlock();
    },
    onCancel: function(){ TipPicker.unlock(); },
    onError: function(err){
      console.error('PayPal button error:', err);
      TipPicker.unlock();
      checkoutShowError('PayPal ran into an error. Please try again.');
    }
  }).render('#paypal-button-container');
}

// Runs only after the payment is verified server-side: saves the order,
// spends wallet credit, marks the discount used, and pings Discord.
async function finalizeOrder(paypalOrderId, payload){
  const { roblox, email, avatarUrl, itemsJson, totalUSD, walletDiscount, tip, fee, discount, discountInfo } = payload;

  const { data: order, error } = await supabaseClient
    .from('orders')
    .insert([{
      user_id: currentUser.id,
      roblox_username: roblox,
      roblox_avatar_url: avatarUrl,
      user_email: email,
      items_json: itemsJson,
      total_amount: totalUSD,
      status: 'waiting_for_seller',
      payment_method: 'paypal',
      payment_status: 'paid',
      paypal_order_id: paypalOrderId,
      wallet_amount_used: walletDiscount || 0,
      paypal_amount_charged: totalUSD,
      tip_amount: tip || 0,
      processing_fee: fee || 0,
      discount_code_used: discountInfo ? discountInfo.code : null,  // 'DAILY5' starts the 24h countdown
      discount_amount: discount || 0,
    }])
    .select()
    .single();

  if(error || !order){
    console.error('Order creation failed:', error);
    checkoutShowError('Payment succeeded, but saving your order failed — please contact support with your PayPal receipt.');
    return;
  }

  if(walletDiscount > 0){
    try { await supabaseClient.rpc('deduct_wallet_credit', { p_amount: walletDiscount, p_order_id: order.id }); }
    catch(e){ console.warn('Wallet deduction failed:', e); }
  }

  // Only now — after the order truly succeeded — mark the code as used,
  // so an abandoned checkout never burns it.
  try {
    if(discountInfo && discountInfo.kind === 'promo'){
      if(appliedPromoCode && appliedPromoCode.isPersonal) await supabaseClient.rpc('redeem_personal_discount_code', { p_code: discountInfo.code });
      else await supabaseClient.rpc('record_promo_redemption', { p_code: 'BUYRBLX' });
    } else if(discountInfo && discountInfo.kind === 'reward'){
      await supabaseClient.rpc('redeem_personal_discount_code', { p_code: discountInfo.code });
    }
  } catch(e){ console.warn('Discount redemption record failed:', e); }

  // Clear the snapshot so this doesn't trigger a "you left something" reminder.
  try { await supabaseClient.rpc('clear_cart_snapshot'); } catch(e){}
  if(cart.some(i => i.key === 'free-mm2-reward')){
    try { await supabaseClient.rpc('mark_20_reward_claimed'); } catch(e){}
  }
  if(cart.some(i => i.key === 'spin50-prize')){
    try { await supabaseClient.rpc('mark_spin_prize_redeemed'); } catch(e){}
  }

  sendDiscordOrderWebhook(order);

  cart = [];
  appliedPromoCode = null;
  pendingReward = null;
  rewardChoice = 'auto';
  useWalletCredit = false;
  currentTipAmount = 0;
  document.getElementById('promoInput').value = '';
  ctPromoMsg('');
  if(typeof loadWalletBalance === 'function') loadWalletBalance();
  saveCartToStorage();
  loadCartRewards();

  document.getElementById('checkoutForm').style.display = 'none';
  document.getElementById('ctSuccessTitle').textContent = order.order_number ? `Order #${order.order_number} placed!` : 'Order placed!';
  document.getElementById('checkoutSuccess').classList.add('show');
  document.getElementById('checkoutOrderChatLink').href = 'order.html?id=' + order.id;
  ctConfetti(document.getElementById('checkoutSuccess'));
}

function ctConfetti(host){
  if(!host || ctReducedMotion()) return;
  const colors = ['#FF7A29', '#FF4F8B', '#7B5CFF', '#2F5FE0', '#22C55E', '#FFB800'];
  for(let n = 0; n < 36; n++){
    const p = document.createElement('i');
    p.className = 'ct-confetti';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[n % colors.length];
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    p.style.animationDuration = (1.4 + Math.random()) + 's';
    host.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }
}

// Asks our server (discord-notify) to post the new order to Discord. The
// webhook URL stays on the server. A failure here doesn't affect the order.
async function sendDiscordOrderWebhook(order){
  try {
    await supabaseClient.functions.invoke('discord-notify', { body: { event: 'new_order', order_id: order.id } });
  } catch(e){
    console.warn('Discord notification failed (order is still saved fine):', e);
  }
}
