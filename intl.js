// Language + currency picker shared by the 12 shop pages.
//
// Currency: every price is stored and charged in USD (PayPal always charges USD).
// This only changes what's DISPLAYED — elements with data-usd="X" and the cart
// (through formatMoney) are repainted in the visitor's currency.
//
// Language: Google's website translator does the translating. The choice is kept
// in the "googtrans" cookie, so switching language reloads the page. English
// never loads Google's script. Item names, prices and the logo carry
// class="notranslate" so they stay as they are in-game.

const INTL_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'BRL', name: 'Brazilian Real' },
];
const INTL_LANGS = [
  { code: 'en', label: 'English (EN)' },
  { code: 'de', label: 'Deutsch (DE)' },
  { code: 'es', label: 'Español (ES)' },
  { code: 'ja', label: '日本語 (JP)', short: 'JP' },
  { code: 'fr', label: 'Français (FR)' },
  { code: 'it', label: 'Italiano (IT)' },
  { code: 'id', label: 'Bahasa Indonesia (ID)' },
  { code: 'pt', label: 'Português (BR)', short: 'BR' },
  { code: 'nl', label: 'Nederlands (NL)' },
  { code: 'pl', label: 'Polski (PL)' },
  { code: 'tr', label: 'Türkçe (TR)' },
];
const COMMON_CURRENCIES = INTL_CURRENCIES.map(c => c.code);
const CURRENCY_KEY = 'buylance_currency_pref';
const LANG_KEY = 'buyrblx_lang';

let CURRENT_CURRENCY = 'USD';
let CURRENT_RATE = 1; // multiply a USD amount by this to get CURRENT_CURRENCY

function intlStore(key, value){
  try {
    if(value === undefined) return localStorage.getItem(key);
    if(value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch(e){ return null; }
}

// ---------- Currency ----------
function currencySymbol(code){
  try {
    const part = new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find(p => p.type === 'currency');
    return part ? part.value : code;
  } catch(e){ return code; }
}

function formatMoney(usdAmount){
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency: CURRENT_CURRENCY, currencyDisplay: 'narrowSymbol',
    }).format(usdAmount * CURRENT_RATE);
  } catch(e){
    return '$' + (usdAmount * CURRENT_RATE).toFixed(2);
  }
}

function repaintAllPrices(){
  document.querySelectorAll('[data-usd]').forEach(el => {
    const usd = parseFloat(el.getAttribute('data-usd'));
    if(!isNaN(usd)) el.textContent = formatMoney(usd);
  });
  paintIntlButton();
  if(typeof renderCart === 'function') renderCart();
}

async function setCurrency(code, rate){
  CURRENT_CURRENCY = code;
  CURRENT_RATE = rate;
  repaintAllPrices();
}

async function fetchRateFor(code){
  if(code === 'USD') return 1;
  // Exchange rates are cached for 12 hours.
  const cacheKey = 'buylance_fx_' + code;
  try {
    const cached = JSON.parse(intlStore(cacheKey) || 'null');
    if(cached && (Date.now() - cached.t) < 12 * 60 * 60 * 1000) return cached.rate;
  } catch(e){}
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    const rate = data && data.rates && data.rates[code];
    if(rate){
      intlStore(cacheKey, JSON.stringify({ rate, t: Date.now() }));
      return rate;
    }
  } catch(e){
    console.warn('Exchange rate lookup failed, staying on USD.', e);
  }
  return null;
}

async function applyCurrency(code){
  if(!COMMON_CURRENCIES.includes(code)) code = 'USD';
  const rate = await fetchRateFor(code);
  if(rate){
    await setCurrency(code, rate);
    intlStore(CURRENCY_KEY, code);
  } else {
    await setCurrency('USD', 1);
  }
}

async function detectCurrencyFromLocation(forceRefresh){
  if(!forceRefresh){
    const saved = intlStore(CURRENCY_KEY);
    if(saved && COMMON_CURRENCIES.includes(saved)){ await applyCurrency(saved); return; }
  }
  try {
    // Only switches when the visitor's own currency is one we offer; otherwise USD.
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    const code = data && data.currency;
    await applyCurrency(COMMON_CURRENCIES.includes(code) ? code : 'USD');
  } catch(e){
    await setCurrency('USD', 1);
  }
}

// ---------- Language ----------
function currentLang(){
  const saved = intlStore(LANG_KEY);
  return INTL_LANGS.some(l => l.code === saved) ? saved : 'en';
}
function langShort(code){
  const l = INTL_LANGS.find(x => x.code === code);
  return (l && l.short) || code.toUpperCase();
}

function setTranslateCookie(code){
  const host = location.hostname;
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  // Clear every copy first (Google may set one on the parent domain too).
  document.cookie = 'googtrans=; ' + expired;
  if(host) {
    document.cookie = 'googtrans=; ' + expired + '; domain=' + host;
    document.cookie = 'googtrans=; ' + expired + '; domain=.' + host.replace(/^www\./, '');
  }
  if(code !== 'en') document.cookie = 'googtrans=/en/' + code + '; path=/';
}

function startTranslation(){
  const lang = currentLang();
  document.documentElement.lang = lang;
  // Keep a stale cookie from turning the page back into another language.
  if(lang === 'en'){ if(/googtrans=\/en\/\w/.test(document.cookie)) setTranslateCookie('en'); return; }
  setTranslateCookie(lang);
  // Cards and the cart are drawn by scripts too — keep marking new ones.
  new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
    if(n.nodeType === 1){ if(n.matches('[data-usd], .seller-name, .ct-name')) n.classList.add('notranslate'); markNoTranslate(n); }
  }))).observe(document.body, { childList: true, subtree: true });
  const holder = document.createElement('div');
  holder.id = 'google_translate_element';
  holder.style.display = 'none';
  document.body.appendChild(holder);
  window.googleTranslateElementInit = function(){
    new google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
  };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.body.appendChild(s);
}

function markNoTranslate(root){
  (root || document).querySelectorAll('[data-usd], .seller-name, .logo, .hdr-logo, .ct-name, #headerUserName, #walletAmount, #walletDropdownAmount')
    .forEach(el => el.classList.add('notranslate'));
}

// ---------- Header button + popup ----------
function paintIntlButton(){
  const lab = document.getElementById('currencyLabel');
  if(lab) lab.textContent = CURRENT_CURRENCY;
  const lang = document.getElementById('langLabel');
  if(lang) lang.textContent = langShort(currentLang());
}

let intlDraft = null;

function intlSelectHtml(kind){
  const isLang = kind === 'lang';
  const items = isLang
    ? INTL_LANGS.map(l => ({ value: l.code, text: l.label }))
    : INTL_CURRENCIES.map(c => ({ value: c.code, text: `${c.code} <span class="lc-sym">${currencySymbol(c.code)}</span> <span class="lc-sub">${c.name}</span>` }));
  const cur = items.find(i => i.value === intlDraft[kind]) || items[0];
  return `
    <label class="lc-label">${isLang ? 'Language' : 'Currency'}</label>
    <div class="lc-select" data-kind="${kind}">
      <button type="button" class="lc-current notranslate" onclick="intlToggleList('${kind}')">${cur.text}<span class="lc-caret">▾</span></button>
      <div class="lc-list notranslate" role="listbox">
        ${items.map(i => `<div class="lc-opt${i.value === intlDraft[kind] ? ' on' : ''}" role="option" onclick="intlPick('${kind}','${i.value}')">${i.text}${i.value === intlDraft[kind] ? '<span class="lc-check">✓</span>' : ''}</div>`).join('')}
      </div>
    </div>`;
}

function renderIntlModal(){
  const box = document.getElementById('lcBody');
  if(box) box.innerHTML = intlSelectHtml('lang') + intlSelectHtml('currency');
}

function openIntlModal(){
  intlDraft = { lang: currentLang(), currency: CURRENT_CURRENCY };
  let modal = document.getElementById('lcModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'lcModal';
    modal.className = 'lc-overlay';
    modal.innerHTML = `
      <div class="lc-box" role="dialog" aria-modal="true" aria-labelledby="lcTitle">
        <div class="lc-glow"></div>
        <button type="button" class="lc-x" onclick="closeIntlModal()" aria-label="Close">✕</button>
        <h3 id="lcTitle"><span class="lc-globe">🌐</span> Choose your language and currency</h3>
        <div id="lcBody"></div>
        <p class="lc-note">Prices are shown in your currency — you're always charged in USD through PayPal.</p>
        <button type="button" class="lc-save" onclick="saveIntlModal()">Save</button>
      </div>`;
    modal.addEventListener('click', e => {
      if(e.target === modal) closeIntlModal();
      else if(!e.target.closest('.lc-select')) modal.querySelectorAll('.lc-select.open').forEach(s => s.classList.remove('open'));
    });
    document.body.appendChild(modal);
  }
  renderIntlModal();
  modal.classList.add('open');
}
function closeIntlModal(){
  const m = document.getElementById('lcModal');
  if(m) m.classList.remove('open');
}
function intlToggleList(kind){
  document.querySelectorAll('#lcModal .lc-select').forEach(s => {
    s.classList.toggle('open', s.dataset.kind === kind && !s.classList.contains('open'));
  });
}
function intlPick(kind, value){
  intlDraft[kind] = value;
  renderIntlModal();
}
async function saveIntlModal(){
  const langChanged = intlDraft.lang !== currentLang();
  if(intlDraft.currency !== CURRENT_CURRENCY) await applyCurrency(intlDraft.currency);
  if(langChanged){
    intlStore(LANG_KEY, intlDraft.lang === 'en' ? null : intlDraft.lang);
    setTranslateCookie(intlDraft.lang);
    location.reload();
    return;
  }
  closeIntlModal();
}
// Old name, still used by some buttons.
const toggleCurrencyMenu = openIntlModal;

document.addEventListener('keydown', e => { if(e.key === 'Escape') closeIntlModal(); });
document.addEventListener('DOMContentLoaded', () => {
  markNoTranslate();
  paintIntlButton();
  startTranslation();
  detectCurrencyFromLocation(false);
});
