// Tiny DOM helpers, icons, modals and toasts. No framework needed.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; // only ever used with static strings
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  upload: '<path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
  print: '<path d="M7 9V4h10v5"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6"/>',
  food: '<path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18M17 21V3c-2.5 1-4 3.5-4 7v4h4"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 15 6 12c1-4 4.5-8.5 12-9 0 7.5-5 11-9 12z"/><circle cx="14.5" cy="9.5" r="1.5"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13 7 4 4"/>',
  hide: '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-2.6 3.2M6.4 7.4C4.2 9 3 12 3 12s4 6 9 6a8.7 8.7 0 0 0 4-1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.6L20 16M20 20v-4h-4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5z"/><path d="M14 3v5h5"/>',
};

export function icon(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
  return span;
}

let toastWrap;
export function toast(message, kind = 'info', ms = 4500) {
  if (!toastWrap) { toastWrap = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(toastWrap); }
  const t = h('div', { class: `toast toast-${kind}` }, icon(kind === 'error' ? 'alert' : kind === 'success' ? 'check' : 'info', 16), h('span', {}, message));
  toastWrap.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

export function modal({ title, body, actions = [], wide = false, onClose }) {
  const prev = document.activeElement;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); onClose?.(); prev?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: `modal ${wide ? 'modal-wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('x'))),
    h('div', { class: 'modal-body' }, body),
    actions.length ? h('div', { class: 'modal-actions' }, actions.map((a) => h('button', { class: `btn ${a.primary ? 'btn-primary' : 'btn-ghost'}`, onclick: () => a.onClick(close) }, a.label))) : null
  );
  const wrap = h('div', { class: 'modal-wrap', onmousedown: (e) => { if (e.target === wrap) close(); } }, box);
  document.body.append(wrap);
  document.addEventListener('keydown', onKey);
  setTimeout(() => (box.querySelector('input, textarea, select, button.btn-primary') || box).focus(), 30);
  return { close, box };
}

export function choose(title, options, describe) {
  return new Promise((resolve) => {
    let done = false;
    const list = h('div', { class: 'choice-list' }, options.map((o, i) => h('button', { class: 'choice', onclick: () => { done = true; m.close(); resolve(o); } }, describe(o, i))));
    const m = modal({ title, body: list, onClose: () => { if (!done) resolve(null); } });
  });
}

// Hand-drawn chart illustrations in the style of the portfolio card.
export function sketch(kind = 'bars', seed = 1) {
  const r = (i) => (Math.sin(seed * 99 + i * 17) + 1) / 2;
  const hl = 'var(--accent)', fill = 'var(--sketch-fill)', ink = 'var(--sketch-ink)';
  const j = (v, i, a = 3) => (v + (r(i) - 0.5) * a).toFixed(1);
  let body = '';
  const axes = `<path d="M${j(40, 1)} ${j(20, 2)} L${j(40, 3, 2)} ${j(150, 4)} L${j(260, 5)} ${j(152, 6)}" stroke="${ink}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (kind === 'bars') {
    const hs = [0, 1, 2].map((i) => 50 + r(i + 10) * 70);
    const hi = Math.floor(r(30) * 3);
    hs.forEach((ht, i) => {
      const x = 70 + i * 62;
      body += `<path d="M${j(x, i + 40)} ${150} L${j(x, i + 41)} ${j(150 - ht, i + 42)} L${j(x + 36, i + 43)} ${j(150 - ht, i + 44)} L${j(x + 36, i + 45)} 150 Z" fill="${i === hi ? hl : fill}" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>`;
    });
    body += `<path d="M${j(60, 70)} ${j(70, 71, 8)} L${j(130, 72)} ${j(40, 73, 8)} L${j(190, 74)} ${j(60, 75, 8)} L${j(250, 76)} ${j(25, 77, 8)}" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (kind === 'line') {
    const pts = Array.from({ length: 6 }, (_, i) => [60 + i * 38, 130 - i * 14 - r(i + 50) * 30]);
    body += `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')}" stroke="${hl}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    const pts2 = Array.from({ length: 6 }, (_, i) => [60 + i * 38, 120 - r(i + 80) * 40]);
    body += `<path d="M${pts2.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')}" stroke="${fill}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (kind === 'dots') {
    for (let i = 0; i < 9; i++) {
      const x = 65 + i * 22 + r(i) * 10, y = 135 - i * 11 - r(i + 9) * 25;
      body += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(9 + r(i + 20) * 7).toFixed(1)}" fill="${i === 6 ? hl : fill}" stroke="${ink}" stroke-width="5"/>`;
    }
  } else if (kind === 'area') {
    const pts = Array.from({ length: 7 }, (_, i) => [45 + i * 35, 120 - r(i + 60) * 60 - i * 5]);
    body += `<path d="M45 150 L${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} L255 150 Z" fill="${hl}" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>`;
  } else if (kind === 'hbars') {
    [0, 1, 2, 3].forEach((i) => {
      const w = 60 + r(i + 90) * 150;
      body += `<path d="M48 ${j(32 + i * 30, i)} L${j(48 + w, i + 1)} ${j(32 + i * 30, i + 2)} L${j(48 + w, i + 3)} ${j(52 + i * 30, i + 4)} L48 ${j(52 + i * 30, i + 5)} Z" fill="${i === 0 ? hl : fill}" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>`;
    });
  }
  const wrap = document.createElement('div');
  wrap.className = 'sketch';
  wrap.innerHTML = `<svg viewBox="0 0 300 170" aria-hidden="true">${kind === 'hbars' ? '' : axes}${body}</svg>`;
  return wrap;
}

export function debounce(fn, ms = 150) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function downloadBlob(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
