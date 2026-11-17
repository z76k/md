/* Line-number gutter. Each number is its own element, placed from the measured box of its line, so numbers
   always match real lines: empty lines get one, a wrapped line keeps a single number on its first visual row,
   and nothing drifts when fonts, sizes, widths or modes change. Only lines near the viewport are drawn. */
(function () {
  const G = (window.Gutter = {});
  let ed, host, mode = 'near', raf = 0, digits = 0;
  const cache = new Map(), shown = new Map(), pool = [];

  G.init = (editor) => {
    ed = editor;
    host = document.createElement('div');
    host.className = 'gutter';
    host.setAttribute('aria-hidden', 'true');
    ed.scroller.appendChild(host);
    ed.on('render', G.draw);
    ed.on('cursor', G.draw);
    ed.scroller.addEventListener('scroll', G.draw, { passive: true });
    new ResizeObserver(() => { cache.clear(); G.draw(); }).observe(ed.root);
    window.addEventListener('resize', () => { cache.clear(); G.draw(); });
  };
  G.setMode = (m) => {
    mode = m;
    ed.root.classList.toggle('ln-on', m !== 'off');
    host.hidden = m === 'off';
    cache.clear();
    G.draw();
  };
  G.invalidate = () => { cache.clear(); G.draw(); };
  G.draw = () => { if (!raf && ed) raf = requestAnimationFrame(draw); };

  // Height and top padding of a line's first visual row, cached per line type (class list).
  function metrics(el) {
    const key = el.className.replace(/\b(active|fp)\b/g, '');
    let m = cache.get(key);
    if (!m) {
      const cs = getComputedStyle(el);
      let lh = parseFloat(cs.lineHeight);
      if (!lh) lh = parseFloat(cs.fontSize) * 1.25;
      m = { lh, pt: parseFloat(cs.paddingTop) || 0 };
      cache.set(key, m);
    }
    return m;
  }
  function opacity(d) {
    if (mode === 'all') return d === 0 ? 1 : 0.62;
    if (d === 0) return 1;
    if (d <= 6) return 0.86 - d * 0.06;          // 0.80 … 0.50, clearly readable
    return Math.max(0.06, 0.5 - (d - 6) * 0.11);  // fades to almost nothing by ~10 lines away
  }
  function take(i) {
    let n = shown.get(i);
    if (n) return [n, false];
    n = pool.pop() || document.createElement('div');
    n.className = 'gn new';
    n.textContent = i + 1;
    host.appendChild(n);
    shown.set(i, n);
    return [n, true];
  }
  function clear() {
    for (const n of shown.values()) { n.remove(); pool.push(n); }
    shown.clear();
  }
  function draw() {
    raf = 0;
    const sc = ed.scroller;
    if (mode === 'off' || !sc.offsetParent) return clear();
    const scR = sc.getBoundingClientRect();
    if (!scR.height) return;
    const els = ed.els, n = els.length;
    if (String(n).length !== digits) { digits = String(n).length; ed.root.style.setProperty('--ln-d', Math.max(2, digits)); }
    let pad = cache.get('#root');
    if (!pad) { pad = parseFloat(getComputedStyle(ed.root).paddingLeft) || 0; cache.set('#root', pad); }
    const edR = ed.root.getBoundingClientRect();
    host.style.width = Math.max(0, edR.left - scR.left + sc.scrollLeft + pad - 14) + 'px';
    const top = scR.top - 120, bottom = scR.bottom + 120, st = sc.scrollTop;
    let lo = 0, hi = n - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (els[mid].getBoundingClientRect().bottom < top) lo = mid + 1; else hi = mid; }
    const cur = ed.lineOf(ed.sel.e);
    const seen = new Set(), fresh = [];
    for (let i = lo; i < n; i++) {
      const r = els[i].getBoundingClientRect();
      if (r.top > bottom) break;
      const m = metrics(els[i]);
      const [node, isNew] = take(i);
      node.style.transform = 'translateY(' + (r.top - scR.top + st + m.pt).toFixed(2) + 'px)';
      node.style.height = node.style.lineHeight = m.lh + 'px';
      node.style.opacity = opacity(Math.abs(i - cur));
      node.classList.toggle('cur', i === cur);
      if (isNew) fresh.push(node);
      seen.add(i);
    }
    for (const [i, node] of shown) if (!seen.has(i)) { node.remove(); shown.delete(i); pool.push(node); }
    // Numbers that just scrolled in appear at once; only cursor moves animate the fade.
    if (fresh.length) requestAnimationFrame(() => fresh.forEach((x) => x.classList.remove('new')));
  }
})();
