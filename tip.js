// Optional tip step inside the checkout popup (all shop pages).
//
//   TipPicker.mount('tipPicker', {
//     getBase:  () => items total after discounts, in USD (percent tips use this),
//     getTotal: () => what PayPal will charge, in USD (tip included),
//     onChange: (tipUSD) => store the tip so the page's checkout math includes it,
//   });
//
// Amounts are shown with the page's formatMoney() (visitor's currency) when
// it exists; everything stored and charged stays in USD.
(function(){
  const CHOICES = [
    { key: '0',  label: 'No tip' },
    { key: '10', label: '10%' },
    { key: '20', label: '20%' },
    { key: '30', label: '30%' },
    { key: 'custom', label: '✏️ Custom' },
  ];
  let opts = null;
  let choice = '0';
  let locked = false;

  const money = (usd) => (typeof window.formatMoney === 'function' ? window.formatMoney(usd) : '$' + Number(usd).toFixed(2));
  const round2 = (n) => Math.round(n * 100) / 100;

  function tipUSD(){
    if(choice === 'custom'){
      const v = parseFloat((document.getElementById('tipCustomInput') || {}).value);
      return isNaN(v) || v < 0.10 ? 0 : round2(v);
    }
    return round2(Math.max(opts.getBase(), 0) * Number(choice) / 100);
  }

  function update(){
    if(!opts) return;
    const tip = tipUSD();
    opts.onChange(tip);
    const box = document.getElementById('tipPickerBox');
    if(!box) return;
    box.querySelectorAll('.tp-chip').forEach(b => {
      b.classList.toggle('on', b.dataset.key === choice);
      const pct = Number(b.dataset.key);
      const amt = b.querySelector('.tp-amt');
      if(amt) amt.textContent = pct ? money(round2(Math.max(opts.getBase(), 0) * pct / 100)) : '';
    });
    document.getElementById('tipCustomWrap').style.display = choice === 'custom' ? 'block' : 'none';
    const err = document.getElementById('tipCustomErr');
    const raw = (document.getElementById('tipCustomInput') || {}).value;
    err.style.display = choice === 'custom' && raw && parseFloat(raw) < 0.10 ? 'block' : 'none';
    document.getElementById('tpThanks').style.display = tip > 0 ? 'block' : 'none';
    document.getElementById('tpTotal').textContent = money(opts.getTotal());
  }

  window.TipPicker = {
    mount(containerId, options){
      opts = options;
      choice = '0';
      locked = false;
      const el = document.getElementById(containerId);
      if(!el) return;
      el.innerHTML = `
        <div class="tp-box" id="tipPickerBox">
          <div class="tp-title">💖 Tip your seller <span>— optional, thank you!</span></div>
          <div class="tp-chips">
            ${CHOICES.map(c => `<button type="button" class="tp-chip" data-key="${c.key}">${c.label}<span class="tp-amt"></span></button>`).join('')}
          </div>
          <div id="tipCustomWrap" style="display:none;">
            <input type="number" id="tipCustomInput" min="0.10" step="0.01" placeholder="Amount in USD, e.g. 1.50">
            <div id="tipCustomErr" class="tp-err" style="display:none;">Tip must be at least $0.10 — or pick "No tip".</div>
          </div>
          <div id="tpThanks" class="tp-thanks" style="display:none;">🙏 Thank you — 100% goes to your seller!</div>
          <div class="tp-total-row"><span>You'll pay</span><b id="tpTotal"></b></div>
        </div>`;
      el.querySelectorAll('.tp-chip').forEach(b => b.addEventListener('click', () => {
        if(locked) return;
        choice = b.dataset.key;
        update();
        if(choice === 'custom') document.getElementById('tipCustomInput').focus();
      }));
      document.getElementById('tipCustomInput').addEventListener('input', () => { if(!locked) update(); });
      update();
    },
    // Freeze the tip while a PayPal payment is in progress, so the amount
    // charged always matches what we verify afterwards.
    lock(){ locked = true; const b = document.getElementById('tipPickerBox'); if(b) b.classList.add('locked'); },
    unlock(){ locked = false; const b = document.getElementById('tipPickerBox'); if(b) b.classList.remove('locked'); },
    refresh: update,
  };

  const css = document.createElement('style');
  css.textContent = `
    .tp-box{ margin-top:14px; padding:14px; border-radius:16px; background:linear-gradient(135deg, #FFF5F8, #F4F7FF); border:1px solid #F3D3E0; }
    .tp-box.locked{ opacity:.6; pointer-events:none; }
    .tp-title{ font:800 14.5px 'Baloo 2', sans-serif; color:#0F1B3D; }
    .tp-title span{ font:700 12px 'Nunito Sans', sans-serif; color:#6B7A99; }
    .tp-chips{ display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
    .tp-chip{ display:flex; flex-direction:column; align-items:center; gap:1px; min-width:62px; padding:8px 11px; border-radius:12px; cursor:pointer;
      background:#fff; border:1.5px solid #D7E3FF; color:#0F1B3D; font:800 13px 'Nunito Sans', sans-serif; transition:transform .12s ease, border-color .12s ease; }
    .tp-chip:hover{ transform:translateY(-2px); border-color:#FF6FA0; }
    .tp-chip.on{ background:linear-gradient(135deg, #FF6FA0, #FF7A29); border-color:transparent; color:#fff; box-shadow:0 8px 18px -10px rgba(255,90,120,0.9); }
    .tp-amt{ font-size:10.5px; font-weight:700; opacity:.8; }
    .tp-amt:empty{ display:none; }
    #tipCustomInput{ width:100%; margin-top:10px; padding:10px 12px; border-radius:10px; border:1.5px solid #D7E3FF; font:700 13px 'Nunito Sans', sans-serif; }
    .tp-err{ color:#C0392B; font-size:11.5px; font-weight:700; margin-top:5px; }
    .tp-thanks{ margin-top:8px; font-size:12px; font-weight:800; color:#D6336C; animation:tpPop .35s ease both; }
    .tp-total-row{ display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px dashed #E2C6D4; font-size:13px; font-weight:800; color:#6B7A99; }
    .tp-total-row b{ font:800 18px 'Baloo 2', sans-serif; color:#0F1B3D; }
    @keyframes tpPop{ from{ opacity:0; transform:translateY(4px); } to{ opacity:1; transform:none; } }
  `;
  document.head.appendChild(css);
})();
