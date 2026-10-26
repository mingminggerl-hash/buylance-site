// BuyRBLX buyer reviews — shared by the homepage and every game page.
// Renders into <section id="buyerReviews" class="rv"></section> (styles in
// reviews.css). Reads the public feed from the get_public_reviews() RPC and
// submits through submit_review(), which only accepts completed orders.
// The page's refreshAuthUI() calls initReviewFormState() whenever login
// state changes, so it's exposed on window below.
(function(){
  const MAX_TEXT = 600;
  const PAGE_SIZE = 6;
  const LONG_TEXT = 220;
  const STAR_LABELS = ['', 'Terrible 😞', 'Not great 😕', 'Okay 🙂', 'Great 😄', 'Amazing! 🤩'];

  let reviews = [];
  let loaded = false;
  let filter = 0;          // 0 = all, otherwise a star count
  let sort = 'newest';
  let visible = PAGE_SIZE;
  let shellReady = false;
  let pendingFormInit = false;
  let form = { mode: 'loading' };
  let pickedStars = 0;

  const $ = (sel) => document.querySelector(sel);

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  function safeUrl(url){
    return /^https:\/\/[^\s"'<>]+$/.test(url || '') ? url : '';
  }
  function timeAgo(iso){
    const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    const steps = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
    for(const [size, unit] of steps){
      const n = Math.floor(secs / size);
      if(n >= 1) return n + ' ' + unit + (n > 1 ? 's' : '') + ' ago';
    }
    return 'just now';
  }
  function starsHtml(value){
    const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
    return `<span class="rv-stars" aria-label="${value.toFixed(1)} out of 5 stars">` +
      `<span class="rv-stars-base">★★★★★</span><span class="rv-stars-fill" style="width:${pct}%">★★★★★</span></span>`;
  }
  function avatarHtml(name, url){
    const src = safeUrl(url);
    if(src) return `<div class="rv-avatar"><img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>`;
    const letter = (String(name || '?').trim()[0] || '?').toUpperCase();
    let h = 0;
    for(const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `<div class="rv-avatar"><span style="background:hsl(${h},70%,55%)">${esc(letter)}</span></div>`;
  }
  // Swap broken Roblox avatar images for the letter bubble.
  function wireAvatarFallbacks(scope){
    scope.querySelectorAll('.rv-avatar img').forEach(img => {
      img.addEventListener('error', () => {
        const name = img.closest('[data-name]')?.dataset.name || '?';
        img.parentElement.outerHTML = avatarHtml(name, '');
      }, { once: true });
    });
  }

  // ---------- data ----------
  async function loadReviews(){
    try {
      const { data, error } = await supabaseClient.rpc('get_public_reviews');
      if(error) throw error;
      reviews = data || [];
    } catch(e) {
      // Fall back to the plain table if the RPC isn't available.
      try {
        const { data, error } = await supabaseClient
          .from('reviews')
          .select('id, name, stars, review_text, created_at')
          .order('created_at', { ascending: false });
        if(error) throw error;
        reviews = (data || []).map(r => ({ ...r, items: [] }));
      } catch(e2) {
        console.warn('Could not load reviews:', e2);
        reviews = [];
      }
    }
    loaded = true;
    renderSummary();
    renderList();
  }

  // ---------- shell ----------
  function renderShell(){
    const root = $('#buyerReviews');
    if(!root) return false;
    root.classList.add('rv');
    root.innerHTML = `
      <div class="rv-head">
        <span class="rv-kicker">⭐ Buyer reviews</span>
        <h2>What <span class="rv-hl">Buyers</span> Are Saying</h2>
        <p>Every review comes from a real, completed order.</p>
      </div>
      <div class="rv-layout">
        <aside class="rv-summary" id="rvSummary"></aside>
        <div class="rv-main">
          <div class="rv-toolbar">
            <div class="rv-chips" id="rvChips"></div>
            <select class="rv-sort" id="rvSort" aria-label="Sort reviews">
              <option value="newest">Newest first</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </div>
          <div class="rv-list" id="rvList">
            <div class="rv-skeleton"></div><div class="rv-skeleton"></div>
          </div>
          <button class="rv-show-more" id="rvShowMore" style="display:none">Show more reviews</button>
        </div>
      </div>
      <div class="rv-form" id="rvForm"></div>`;

    $('#rvSort').addEventListener('change', e => { sort = e.target.value; visible = PAGE_SIZE; renderList(); });
    $('#rvShowMore').addEventListener('click', () => { visible += PAGE_SIZE; renderList(); });
    root.addEventListener('click', e => {
      const f = e.target.closest('[data-filter]');
      if(f && !f.disabled){
        filter = Number(f.dataset.filter);
        visible = PAGE_SIZE;
        renderSummary();
        renderList();
        if(f.classList.contains('rv-bar-row')) $('#rvList').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const more = e.target.closest('.rv-more-text');
      if(more){
        const p = more.closest('.rv-text');
        p.textContent = p.dataset.full;
      }
    });
    renderSummary();
    renderForm();
    return true;
  }

  // ---------- summary + filter chips ----------
  function renderSummary(){
    const box = $('#rvSummary');
    if(!box) return;
    const total = reviews.length;
    const counts = [0, 0, 0, 0, 0, 0];
    reviews.forEach(r => { counts[r.stars] = (counts[r.stars] || 0) + 1; });
    const avg = total ? reviews.reduce((s, r) => s + r.stars, 0) / total : 0;

    const bars = [5, 4, 3, 2, 1].map(n => {
      const pct = total ? Math.round(counts[n] / total * 100) : 0;
      return `<button class="rv-bar-row${filter === n ? ' active' : ''}" data-filter="${filter === n ? 0 : n}" ${counts[n] ? '' : 'disabled'}>
          <span class="rv-bar-label">${n} <b>★</b></span>
          <span class="rv-bar"><i data-w="${pct}"></i></span>
          <span class="rv-bar-num">${counts[n]}</span>
        </button>`;
    }).join('');

    box.innerHTML = `
      <div class="rv-score-row">
        <div class="rv-score">${total ? avg.toFixed(1) : '–'}</div>
        <div class="rv-score-side">
          ${starsHtml(avg)}
          <div class="rv-score-count">${loaded ? (total ? `Based on ${total} verified review${total > 1 ? 's' : ''}` : 'No reviews yet') : 'Loading reviews…'}</div>
        </div>
      </div>
      <div class="rv-bars">${bars}</div>
      <div class="rv-trust">
        <div>✅ Only buyers with a completed order can review</div>
        <div>🎮 Shown with the buyer's real Roblox name</div>
      </div>
      <a class="rv-write-btn" href="#rvForm">✍️ Write a review</a>`;
    // Animate the bars in after layout.
    requestAnimationFrame(() => box.querySelectorAll('.rv-bar i').forEach(i => { i.style.width = i.dataset.w + '%'; }));

    const chips = $('#rvChips');
    if(chips){
      const chip = (n, label) => `<button class="rv-chip-btn${filter === n ? ' active' : ''}" data-filter="${n}">${label}</button>`;
      chips.innerHTML = chip(0, `All <small>${total}</small>`) +
        [5, 4, 3, 2, 1].filter(n => counts[n]).map(n => chip(n, `${n}<span class="rv-chip-star">★</span> <small>${counts[n]}</small>`)).join('');
    }
  }

  // ---------- review cards ----------
  function itemsHtml(items){
    if(!Array.isArray(items) || !items.length) return '';
    const chips = items.slice(0, 2).map(it => {
      const qty = it.qty > 1 ? ` ×${it.qty}` : '';
      const label = [it.game, it.item].filter(Boolean).join(' · ');
      return `<span class="rv-item" title="${esc(label + qty)}"><span>${esc(label)}${esc(qty)}</span></span>`;
    }).join('');
    const extra = items.length > 2 ? `<span class="rv-item rv-item-more">+${items.length - 2} more</span>` : '';
    return `<div class="rv-items">${chips}${extra}</div>`;
  }

  function cardHtml(r, i){
    const text = (r.review_text || '').trim();
    let body;
    if(!text){
      body = `<p class="rv-text rv-text-empty">Left a ${r.stars}-star rating ⭐</p>`;
    } else if(text.length > LONG_TEXT){
      body = `<p class="rv-text" data-full="${esc(text)}">${esc(text.slice(0, LONG_TEXT).trimEnd())}…<button class="rv-more-text">Read more</button></p>`;
    } else {
      body = `<p class="rv-text">${esc(text)}</p>`;
    }
    return `
      <article class="rv-card s${r.stars}" data-name="${esc(r.name)}" style="animation-delay:${Math.min(i, 8) * 60}ms">
        <div class="rv-card-quote">”</div>
        <div class="rv-card-top">
          ${avatarHtml(r.name, r.avatar_url)}
          <div class="rv-who">
            <div class="rv-name"><span class="rv-name-text">${esc(r.name)}</span><span class="rv-verified" title="This buyer completed an order">✔ Verified buyer</span></div>
            <div class="rv-meta">${starsHtml(r.stars)}<span>·</span><time datetime="${esc(r.created_at)}">${esc(timeAgo(r.created_at))}</time></div>
          </div>
        </div>
        ${body}
        ${itemsHtml(r.items)}
      </article>`;
  }

  function renderList(){
    const list = $('#rvList');
    if(!list || !loaded) return;
    let shown = filter ? reviews.filter(r => r.stars === filter) : reviews.slice();
    if(sort === 'highest') shown.sort((a, b) => b.stars - a.stars || new Date(b.created_at) - new Date(a.created_at));
    else if(sort === 'lowest') shown.sort((a, b) => a.stars - b.stars || new Date(b.created_at) - new Date(a.created_at));
    else shown.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if(!shown.length){
      list.innerHTML = reviews.length
        ? `<div class="rv-empty"><span class="rv-empty-icon">🔍</span><b>No ${filter}-star reviews yet</b>Try another rating.</div>`
        : `<div class="rv-empty"><span class="rv-empty-icon">🏆</span><b>Be the first to review!</b>Finish an order and your review could be featured right here.</div>`;
      $('#rvShowMore').style.display = 'none';
      return;
    }
    list.innerHTML = shown.slice(0, visible).map(cardHtml).join('');
    wireAvatarFallbacks(list);
    $('#rvShowMore').style.display = shown.length > visible ? 'block' : 'none';
  }

  // ---------- write-a-review form ----------
  function loginButton(){
    return typeof window.openLoginModal === 'function'
      ? `<button class="rv-btn" type="button" onclick="openLoginModal()">Log in / Sign up</button>`
      : `<a class="rv-btn" href="login">Log in / Sign up</a>`;
  }

  function stateHtml(icon, title, sub, extra){
    return `<div class="rv-state"><span class="rv-state-icon">${icon}</span><h3>${title}</h3><p class="rv-form-sub">${sub}</p>${extra || ''}</div>`;
  }

  function renderForm(){
    const box = $('#rvForm');
    if(!box) return;
    if(form.mode === 'loading'){
      box.innerHTML = stateHtml('⏳', 'Checking your orders…', 'One sec while we look for orders you can review.');
    } else if(form.mode === 'loggedOut'){
      box.innerHTML = stateHtml('🔒', 'Log in to leave a review', 'Reviews are open to buyers with a completed order.', loginButton());
    } else if(form.mode === 'noOrder'){
      box.innerHTML = stateHtml('🛒', 'Reviews unlock after your first order', "Once your order is marked completed, come back here and tell everyone how it went.");
    } else if(form.mode === 'allDone'){
      box.innerHTML = stateHtml('🙌', "You've reviewed all your orders", 'Thanks for helping other buyers! Your next completed order can get a review too.');
    } else if(form.mode === 'thanks'){
      const colors = ['#FFB800', '#FF7A29', '#2F5FE0', '#7B5CFF', '#1E9E57'];
      const confetti = Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 90 + (i % 3) * 30;
        return `<i style="background:${colors[i % colors.length]};--x:${Math.round(Math.cos(angle) * dist)}px;--y:${Math.round(Math.sin(angle) * dist * 0.7)}px;--r:${i * 40}deg;animation-delay:${(i % 4) * 40}ms"></i>`;
      }).join('');
      box.innerHTML = `<div class="rv-thanks"><div class="rv-confetti">${confetti}</div>
        <span class="rv-thanks-icon">🎉</span>
        <h3>Thanks, ${esc(form.name)}! Your review is live.</h3>
        <p class="rv-form-sub">It's now showing at the top for everyone to see.</p>
        ${form.more ? '<button class="rv-btn" type="button" id="rvAnother" style="margin-top:14px">Review another order</button>' : ''}
      </div>`;
      const again = $('#rvAnother');
      if(again) again.addEventListener('click', () => initReviewFormState());
    } else if(form.mode === 'ready'){
      renderReadyForm(box);
    }
  }

  function orderSummary(order){
    const items = Array.isArray(order.items_json) ? order.items_json : [];
    const first = items[0] ? items[0].item : '';
    const extra = items.length > 1 ? ` +${items.length - 1} more` : '';
    return `Order #${order.order_number}${first ? ' · ' + first + extra : ''}`;
  }

  function renderReadyForm(box){
    pickedStars = 0;
    box.innerHTML = `
      <h3>⭐ Rate your order</h3>
      <p class="rv-form-sub">Your review shows on the site with your Roblox name and avatar.</p>
      <div class="rv-reviewer" data-name="${esc(form.name)}">
        ${avatarHtml(form.name, form.avatar)}
        <div>
          <div class="rv-reviewer-name">Reviewing as ${esc(form.name)}</div>
          <div class="rv-reviewer-order">${esc(orderSummary(form.order))}</div>
        </div>
      </div>
      <div class="rv-picker" role="radiogroup" aria-label="Your rating">
        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rv-pick" data-star="${n}" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}
      </div>
      <div class="rv-pick-label" id="rvPickLabel">Tap a star to rate</div>
      <textarea class="rv-textarea" id="rvText" maxlength="${MAX_TEXT}" placeholder="How was it? Was delivery fast? Was the seller friendly? (optional)"></textarea>
      <div class="rv-form-foot">
        <span class="rv-counter" id="rvCounter">0 / ${MAX_TEXT}</span>
        <button type="button" class="rv-btn" id="rvSubmit" disabled>Post review</button>
      </div>
      <div class="rv-error" id="rvError"></div>`;
    wireAvatarFallbacks(box);

    const picks = box.querySelectorAll('.rv-pick');
    const label = $('#rvPickLabel');
    const paint = (n) => picks.forEach(p => p.classList.toggle('on', Number(p.dataset.star) <= n));
    picks.forEach(p => {
      const n = Number(p.dataset.star);
      p.addEventListener('mouseenter', () => { paint(n); label.textContent = STAR_LABELS[n]; label.classList.add('on'); });
      p.addEventListener('mouseleave', () => {
        paint(pickedStars);
        label.textContent = pickedStars ? STAR_LABELS[pickedStars] : 'Tap a star to rate';
        label.classList.toggle('on', !!pickedStars);
      });
      p.addEventListener('click', () => {
        pickedStars = n;
        paint(n);
        picks.forEach(q => q.setAttribute('aria-checked', String(Number(q.dataset.star) === n)));
        p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump');
        label.textContent = STAR_LABELS[n];
        label.classList.add('on');
        $('#rvSubmit').disabled = false;
      });
    });
    $('#rvText').addEventListener('input', e => { $('#rvCounter').textContent = `${e.target.value.length} / ${MAX_TEXT}`; });
    $('#rvSubmit').addEventListener('click', submitReview);
  }

  async function submitReview(){
    const btn = $('#rvSubmit');
    const err = $('#rvError');
    if(!pickedStars){ err.textContent = 'Pick a star rating first.'; return; }
    btn.disabled = true;
    btn.textContent = 'Posting…';
    err.textContent = '';
    try {
      const { data, error } = await supabaseClient.rpc('submit_review', {
        p_order_id: form.order.id,
        p_name: form.name,
        p_stars: pickedStars,
        p_review_text: $('#rvText').value.trim()
      });
      if(error) throw error;
      if(data && !data.ok){
        if(data.error === 'already_reviewed'){ initReviewFormState(); return; }
        throw new Error(data.error);
      }
      const { data: nextId } = await supabaseClient.rpc('get_next_reviewable_order_id');
      form = { mode: 'thanks', name: form.name, more: !!nextId };
      renderForm();
      filter = 0;
      sort = 'newest';
      const sortEl = $('#rvSort');
      if(sortEl) sortEl.value = 'newest';
      loadReviews();
    } catch(e) {
      console.warn('Review submit failed:', e);
      err.textContent = "Sorry, something went wrong posting your review — please try again in a moment.";
      btn.disabled = false;
      btn.textContent = 'Post review';
    }
  }

  async function initReviewFormState(){
    if(!shellReady){ pendingFormInit = true; return; }
    form = { mode: 'loading' };
    renderForm();
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const user = session ? session.user : null;
      if(!user){ form = { mode: 'loggedOut' }; renderForm(); return; }

      const { data: orderId, error: findErr } = await supabaseClient.rpc('get_next_reviewable_order_id');
      if(findErr) throw findErr;
      if(!orderId){
        const { data: mine } = await supabaseClient.from('reviews').select('id').eq('user_id', user.id).limit(1);
        form = { mode: mine && mine.length ? 'allDone' : 'noOrder' };
        renderForm();
        return;
      }

      const [{ data: order }, { data: profile }] = await Promise.all([
        supabaseClient.from('orders').select('id, order_number, items_json').eq('id', orderId).single(),
        supabaseClient.from('profiles').select('roblox_username, roblox_avatar_url').eq('id', user.id).single()
      ]);
      form = {
        mode: 'ready',
        order: order || { id: orderId, order_number: '?', items_json: [] },
        name: (profile && profile.roblox_username) || (user.email || 'Buyer').split('@')[0],
        avatar: profile && profile.roblox_avatar_url
      };
      renderForm();
    } catch(e) {
      console.warn('Could not check review eligibility:', e);
      form = { mode: 'noOrder' };
      renderForm();
    }
  }
  window.initReviewFormState = initReviewFormState;

  function start(){
    if(shellReady || !renderShell()) return;
    shellReady = true;
    loadReviews();
    pendingFormInit = false;
    initReviewFormState();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
