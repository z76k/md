/* Preview, split view, modes, status, focus, sharing, export, import, shortcuts, boot. */
(function () {
  const { $, $$, esc } = U;
  const App = window.App, S = App.S;

  /* ---------- preview ---------- */
  App.renderOpts = () => ({ noteExists: (name) => !!App.byName(name) });
  App.renderPreview = () => {
    if (!App.ed) return;
    if (S.mode === 'live' && !document.body.classList.contains('printing')) { App._pvStale = true; return; }
    const html = MD.render(App.ed.value, App.renderOpts());
    if (html === App._lastHtml && !App._pvStale) return;
    App._lastHtml = html;
    App._pvStale = false;
    const pv = $('#preview');
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const nk = Array.from(tpl.content.children), ok = Array.from(pv.children);
    let p = 0;
    while (p < nk.length && p < ok.length && nk[p].outerHTML === ok[p].outerHTML) p++;
    let s = 0;
    while (s < nk.length - p && s < ok.length - p && nk[nk.length - 1 - s].outerHTML === ok[ok.length - 1 - s].outerHTML) s++;
    for (let i = p; i < ok.length - s; i++) ok[i].remove();
    const ref = ok[ok.length - s] || null;
    for (let i = p; i < nk.length - s; i++) pv.insertBefore(nk[i], ref);
    App.invalidateSync();
  };
  let pvT;
  App.schedulePreview = () => {
    if (S.mode === 'live') { App._pvStale = true; return; }
    clearTimeout(pvT);
    const n = App.ed.text.length;
    pvT = setTimeout(App.renderPreview, n > 80000 ? 260 : n > 20000 ? 90 : 12);
  };
  App.copyText = async (t) => {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  };
  App.previewClick = (e, readOnly) => {
    const box = e.target.closest('.task-box');
    if (box) {
      e.preventDefault();
      if (readOnly) return;
      // Re-rendering only swaps the changed list block; neither pane's scroll position is touched.
      const ln = box.dataset.ln, ps = $('#pvScroll'), es = $('#edScroll'), pTop = ps.scrollTop, eTop = es.scrollTop;
      App.ed.toggleTask(+ln);
      App.renderPreview();
      ps.scrollTop = pTop;
      es.scrollTop = eTop;
      const nb = $('#preview .task-box[data-ln="' + ln + '"]');
      if (nb && nb.checked) nb.classList.add('pop');
      return;
    }
    const cp = e.target.closest('.copy-code');
    if (cp) { App.copyText(cp.closest('.codeblock').querySelector('code').textContent); cp.textContent = 'Copied ✓'; setTimeout(() => (cp.textContent = 'Copy'), 1200); return; }
    const wl = e.target.closest('a.wikilink');
    if (wl) { e.preventDefault(); if (!readOnly) App.openByName(wl.dataset.note); return; }
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      e.preventDefault();
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      const t = id && a.closest('.preview').querySelector('#' + CSS.escape(id));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /* ---------- split view: divider + two-way synced scrolling ---------- */
  App.applySplit = () => {
    const ed = $('#edPane'), pv = $('#pvPane');
    if (S.mode === 'split' && window.innerWidth > 760) { ed.style.flex = '0 0 ' + (S.split * 100).toFixed(2) + '%'; pv.style.flex = '1 1 0'; }
    else { ed.style.flex = ''; pv.style.flex = ''; }
  };
  const bindDivider = () => {
    const d = $('#divider'), panes = $('#panes');
    d.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      d.setPointerCapture(e.pointerId);
      d.classList.add('drag');
      const box = panes.getBoundingClientRect();
      const move = (ev) => {
        let r = U.clamp((ev.clientX - box.left) / box.width, 0.18, 0.82);
        if (Math.abs(r - 0.5) < 0.012) r = 0.5;
        S.split = r;
        App.applySplit();
      };
      const up = () => { d.classList.remove('drag'); d.removeEventListener('pointermove', move); App.save(); App.invalidateSync(); };
      d.addEventListener('pointermove', move);
      d.addEventListener('pointerup', up, { once: true });
    });
    d.addEventListener('dblclick', () => {
      const ed = $('#edPane');
      ed.style.transition = 'flex-basis .3s cubic-bezier(.2,.8,.2,1)';
      App.set('split', 0.5);
      setTimeout(() => { ed.style.transition = ''; App.invalidateSync(); }, 320);
    });
  };
  /* Block-anchored sync. The map pairs content positions: where each rendered block (heading, paragraph, list
     item, table row, code block, callout, quote, rule) starts in the editor and in the preview, from the source
     line where the block starts, plus both tops, the end of the text, and both bottoms. Scrolling one pane
     interpolates between neighbouring pairs, so the same block sits at the same height in both panes. */
  let map = null;
  App.invalidateSync = () => { map = null; };
  /* Sync only follows scrolling the user actually does (wheel, trackpad, touch, scrollbar drag, page keys).
     Scrolls caused by edits, re-renders or caret-following are ignored, so nothing re-aligns by itself. */
  const intent = { pane: null, until: 0 };
  const mark = (pane, ms) => { intent.pane = pane; intent.until = performance.now() + ms; };
  const bindIntent = (el, pane) => {
    el.addEventListener('wheel', () => mark(pane, 450), { passive: true });
    el.addEventListener('touchmove', () => mark(pane, 700), { passive: true });
    el.addEventListener('pointerdown', (e) => {
      // Only a press on the scrollbar itself counts (clicks on content are edits or caret moves). macOS overlay
      // scrollbars take no layout space, so the scrollbar is "the rightmost 16px" rather than "past clientWidth".
      if (e.target === el && e.offsetX >= el.clientWidth - 16) {
        mark(pane, 1e9);
        window.addEventListener('pointerup', () => mark(pane, 300), { once: true });
      }
    });
    el.addEventListener('keydown', (e) => { if (/^(PageUp|PageDown|Home|End|ArrowUp|ArrowDown)$/.test(e.key) || (e.key === ' ' && pane === 'pv')) mark(pane, 500); });
  };
  /* The space below the last line of text differs between panes (the editor keeps trailing empty lines, and a
     rendered paragraph is not the same height as a raw line). Size the preview's bottom space so that, scrolled to
     the very bottom, the last text in both panes ends at the same height. */
  const matchBottoms = () => {
    const es = $('#edScroll'), ps = $('#pvScroll'), pv = $('#preview'), ed = App.ed;
    if (S.mode !== 'split') { pv.style.paddingBottom = ''; return; }
    let k = ed.lines.length - 1;
    while (k > 0 && !ed.lines[k].trim()) k--;
    const lastPv = pv.lastElementChild;
    if (!ed.els[k] || !lastPv) return;
    const eGap = es.getBoundingClientRect().top - es.scrollTop + es.scrollHeight - ed.els[k].getBoundingClientRect().bottom;
    const pGap = ps.getBoundingClientRect().top - ps.scrollTop + ps.scrollHeight - lastPv.getBoundingClientRect().bottom;
    const diff = eGap - pGap;
    if (Math.abs(diff) < 1) return;
    const cur = parseFloat(getComputedStyle(pv).paddingBottom) || 0;
    pv.style.paddingBottom = Math.max(0, cur + diff) + 'px';
  };
  App.matchBottoms = matchBottoms;
  const buildMap = () => {
    matchBottoms();
    const es = $('#edScroll'), ps = $('#pvScroll'), els = App.ed.els, pv = $('#preview');
    const eBase = es.getBoundingClientRect().top - es.scrollTop, pBase = ps.getBoundingClientRect().top - ps.scrollTop;
    const eEnd = es.scrollHeight, pEnd = ps.scrollHeight;
    // Pairs of content positions (not scroll positions): where each block starts in the editor and in the preview.
    // Both panes share the same top padding, so the first block pairs up at the same height.
    const arr = [[0, 0]];
    let lastLn = -1;
    const push = (e, p) => { const prev = arr[arr.length - 1]; if (e > prev[0] + 0.5 && p > prev[1] + 0.5 && e < eEnd && p < pEnd) { arr.push([e, p]); return true; } return false; };
    for (const el of $$('#preview [data-line]')) {
      const ln = +el.dataset.line;
      if (ln <= lastLn || !els[ln]) continue;
      if (push(els[ln].getBoundingClientRect().top - eBase, el.getBoundingClientRect().top - pBase)) lastLn = ln;
    }
    // End of the text in both panes, then the end of each pane's empty bottom space.
    const lastEl = els[els.length - 1], lastPv = pv.lastElementChild;
    if (lastEl && lastPv) push(lastEl.getBoundingClientRect().bottom - eBase, lastPv.getBoundingClientRect().bottom - pBase);
    arr.push([eEnd, pEnd]);
    map = arr;
  };
  /* Which height in the pane is the anchor: the top edge at the very top, the middle once you've scrolled half a
     screen, and the bottom edge at the very bottom. It changes continuously, so both panes meet at the top and the
     bottom with an ease, and in between the block in the middle of one pane is in the middle of the other. */
  const anchorAt = (s, h, M) => {
    if (M <= 0) return 0;
    if (M < h) return U.clamp(s / M, 0, 1);
    const half = h / 2;
    return 0.5 * Math.min(1, s / half) + 0.5 * (1 - Math.min(1, (M - s) / half));
  };
  // Piecewise-linear lookup: column a -> column b.
  const lookup = (y, a, b) => {
    let lo = 0, hi = map.length - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (map[mid][a] <= y) lo = mid; else hi = mid - 1; }
    const p = map[lo], q = map[lo + 1] || p, span = q[a] - p[a];
    return span > 0 ? p[b] + ((y - p[a]) / span) * (q[b] - p[b]) : p[b];
  };
  // One rAF per frame, no matter how many scroll events arrive. The pane we move never feeds back, because only
  // the pane with user intent is allowed to drive.
  let raf = 0, driver = null, easing = false, idleSince = 0;
  const sync = (from) => {
    if (S.mode !== 'split') return;
    if (intent.pane !== from || performance.now() > intent.until) return;
    // A new gesture (after a pause, or from the other pane) may start far from the matched spot because typing
    // moved the editor. Only then do we glide; during the gesture itself the other pane follows exactly.
    if (driver !== from || performance.now() - idleSince > 500) easing = true;
    driver = from;
    idleSince = performance.now();
    if (!raf) raf = requestAnimationFrame(step);
  };
  const targetFor = (from) => {
    if (!map) buildMap();
    const es = $('#edScroll'), ps = $('#pvScroll');
    const src = from === 'ed' ? es : ps, other = from === 'ed' ? ps : es;
    const sM = Math.max(0, src.scrollHeight - src.clientHeight), oM = Math.max(0, other.scrollHeight - other.clientHeight);
    const f = anchorAt(src.scrollTop, src.clientHeight, sM);
    const y = src.scrollTop + f * src.clientHeight;
    const y2 = from === 'ed' ? lookup(y, 0, 1) : lookup(y, 1, 0);
    return [other, U.clamp(y2 - f * other.clientHeight, 0, oM)];
  };
  function step() {
    raf = 0;
    if (S.mode !== 'split' || !driver) return;
    const [other, want] = targetFor(driver);
    const diff = want - other.scrollTop;
    if (easing && Math.abs(diff) > 120) {
      // Glide in over a few frames, and keep going even after the wheel stops, until the panes match.
      other.scrollTop += diff * 0.35;
      raf = requestAnimationFrame(step);
      return;
    }
    easing = false;
    other.scrollTop = want;
  }
  // Line the panes up once when Split view opens, so they start in step.
  App.alignPanes = () => {
    if (S.mode !== 'split' || !App.ed) return;
    map = null;
    const [other, want] = targetFor('ed');
    other.scrollTop = want;
  };
  // Anything that moves blocks around makes the map stale: edits, resizes, fonts, and images finishing loading.
  const watchLayout = () => {
    const ro = new ResizeObserver(() => App.invalidateSync());
    ro.observe(App.ed.root);
    ro.observe($('#preview'));
    $('#preview').addEventListener('load', (e) => { if (e.target.tagName === 'IMG') App.invalidateSync(); }, true);
    App.ed.root.addEventListener('load', (e) => { if (e.target.tagName === 'IMG') App.invalidateSync(); }, true);
    App.ed.on('render', App.invalidateSync);
    if (document.fonts) document.fonts.addEventListener('loadingdone', App.invalidateSync);
  };

  /* ---------- modes ---------- */
  const MODES = ['live', 'split', 'preview'];
  App.setMode = (m) => {
    const prev = S.mode, b = document.body;
    S.mode = m;
    App.save();
    MODES.forEach((x) => b.classList.toggle('mode-' + x, x === m));
    App.ed.root.classList.toggle('live', m === 'live');
    if (prev !== m) { b.classList.add('switching'); clearTimeout(App._swT); App._swT = setTimeout(() => b.classList.remove('switching'), 360); }
    $$('#modeSeg button').forEach((x) => x.classList.toggle('on', x.dataset.mode === m));
    App.moveThumb();
    App.applySplit();
    if (m !== 'live') { App._pvStale = true; App.renderPreview(); }
    if (m !== 'split') $('#preview').style.paddingBottom = '';
    requestAnimationFrame(() => { App.invalidateSync(); App.ed.scrollCaret(); App.vim.drawBlock(); Gutter.invalidate(); if (m === 'split' && prev !== m) requestAnimationFrame(App.alignPanes); });
    if (prev !== m && window.Topbar) Topbar.flash();
    if (m === 'preview' && S.focus) App.set('focus', false);
  };
  App.moveThumb = () => {
    const on = $('#modeSeg button.on'), th = $('#modeSeg .thumb');
    if (on) { th.style.left = on.offsetLeft + 'px'; th.style.width = on.offsetWidth + 'px'; }
  };
  App.cycleMode = () => {
    const m = MODES[(MODES.indexOf(S.mode) + 1) % 3];
    App.setMode(m);
    if (m !== 'preview') App.ed.root.focus();
  };

  /* ---------- status + daily goal ---------- */
  const GK = 'neon-goal';
  const today = () => new Date().toLocaleDateString('en-CA');
  const goalData = () => { try { const g = JSON.parse(localStorage.getItem(GK) || '{}'); return g.date === today() ? g : { date: today(), words: 0 }; } catch (e) { return { date: today(), words: 0 }; } };
  App.trackGoal = () => { App._goalDirty = true; };
  let stT = 0;
  App.scheduleStatus = () => { if (!stT) stT = requestAnimationFrame(() => { stT = 0; App.updateStatus(); }); };
  App.updateStatus = () => {
    const ed = App.ed;
    if (!ed) return;
    const t = ed.value, words = U.countWords(t);
    if (App._goalDirty) {
      App._goalDirty = false;
      const d = words - (App.lastWords || 0);
      if (d > 0 && d < 40) { const g = goalData(); g.words += d; localStorage.setItem(GK, JSON.stringify(g)); }
    }
    App.lastWords = words;
    const ln = ed.lineOf(ed.sel.e), col = ed.sel.e - ed.starts[ln] + 1;
    const mins = Math.max(1, Math.round(words / 230));
    const L = [words.toLocaleString() + (words === 1 ? ' word' : ' words'), t.length.toLocaleString() + ' characters', mins + ' min read', 'Ln ' + (ln + 1) + ', Col ' + col];
    let label = L[S.stat] || L[0];
    if (ed.sel.e > ed.sel.s) label += ' · ' + U.countWords(ed.selectedText()) + ' selected';
    const st = $('#stat');
    st.textContent = label;
    st.title = L.join('  ·  ') + '\nClick to switch';
    const g = $('#goal');
    g.classList.toggle('on', S.goal > 0);
    if (S.goal > 0) {
      const w = goalData().words, pct = Math.min(100, (w / S.goal) * 100);
      g.querySelector('i').style.width = pct + '%';
      g.querySelector('span').textContent = w + ' / ' + S.goal + ' today';
      g.classList.toggle('done', w >= S.goal);
      if (w >= S.goal && !App._goalCheered) { App._goalCheered = true; U.toast('Daily goal reached. Nice work ✦'); }
    }
  };

  /* ---------- focus mode ---------- */
  App.applyFocus = () => {
    const b = document.body, ed = App.ed;
    b.classList.toggle('focus', !!S.focus);
    const dim = S.focus && S.focusScope !== 'none';
    ed.root.classList.toggle('dim', dim);
    ed.focusScope = dim ? S.focusScope : null;
    if (dim) ed.updateActive(); else ed.clearFocus();
    ed.typewriter = !!S.typewriter;
    b.classList.toggle('typewriter', !!S.typewriter);
    if (S.focus && S.mode === 'preview') App.setMode('live');
    requestAnimationFrame(() => ed.scrollCaret(true));
  };
  App.toggleFocus = () => {
    App.set('focus', !S.focus);
    if (S.focus) { App.ed.root.focus(); U.toast('Focus mode · move the mouse to show controls, Esc to leave', null, null, 2600); }
  };

  /* ---------- share links ---------- */
  App.shareLink = async (n) => {
    n = n || App.cur;
    App.flush();
    const payload = JSON.stringify({ v: 1, t: n.content, n: App.title(n), p: App.pvThemeId(), d: App.isDark() ? 1 : 0 });
    const url = location.href.split('#')[0] + '#share=' + (await U.compress(payload));
    await App.copyText(url);
    const kb = Math.round(url.length / 1024);
    U.toast(kb > 30 ? 'Share link copied (' + kb + ' KB, very long links may not survive some chat apps)' : 'Share link copied. Nothing was uploaded.');
    return url;
  };
  App.checkShare = async () => {
    const h = location.hash;
    if (!h.startsWith('#share=')) return false;
    try {
      const d = JSON.parse(await U.decompress(h.slice(7)));
      App.showShared(d);
      return true;
    } catch (e) {
      U.toast('That share link looks incomplete or broken.');
      return false;
    }
  };
  App.showShared = (d) => {
    const b = document.body;
    b.classList.add('shared');
    $('#themeStyle').textContent = Themes.css(Themes.list[d.p] ? d.p : 'oled', !!d.d);
    const pv = $('#sharePreview');
    pv.innerHTML = MD.render(d.t || '', { noteExists: () => false });
    pv.onclick = (e) => App.previewClick(e, true);
    document.title = (d.n || 'Shared note') + ' · Inkwyrm';
    $('#sharePrint').onclick = () => App.print(true);
    $('#shareDup').onclick = async () => {
      history.replaceState(null, '', location.pathname + location.search);
      b.classList.remove('shared');
      App.apply();
      await App.bootEditor();
      await App.newNote(d.t || '', {}, 0);
      U.toast('Added to your notes');
    };
  };

  /* ---------- copy / export / print ---------- */
  App.copyMarkdown = async () => { await App.copyText(App.ed.value); U.toast('Copied as Markdown'); };
  App.copyHtml = async () => { await App.copyText(MD.render(App.ed.value, App.renderOpts())); U.toast('Copied as HTML'); };
  App.inlineStyled = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    d.querySelectorAll('.code-head, .fn-back').forEach((x) => x.remove());
    d.querySelectorAll('.task-box').forEach((x) => x.replaceWith(document.createTextNode(x.checked ? '☑ ' : '☐ ')));
    const ST = {
      h1: 'font-size:26px;font-weight:700;margin:18px 0 8px', h2: 'font-size:21px;font-weight:700;margin:16px 0 6px', h3: 'font-size:17px;font-weight:700;margin:14px 0 6px',
      p: 'margin:0 0 10px;line-height:1.55', blockquote: 'margin:0 0 10px;padding:2px 12px;border-left:3px solid #ccc;color:#555',
      pre: 'background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto;font-family:Menlo,monospace;font-size:13px;line-height:1.45',
      code: 'font-family:Menlo,monospace;font-size:13px;background:#f1f1f1;padding:1px 4px;border-radius:3px',
      table: 'border-collapse:collapse;margin:0 0 10px', th: 'border:1px solid #ddd;padding:6px 10px;background:#f6f6f6;text-align:left', td: 'border:1px solid #ddd;padding:6px 10px',
      mark: 'background:#fff3a3', img: 'max-width:100%', hr: 'border:0;border-top:1px solid #ddd;margin:16px 0', a: 'color:#1a6fd1',
    };
    Object.entries(ST).forEach(([t, s]) => d.querySelectorAll(t).forEach((el) => el.setAttribute('style', s)));
    d.querySelectorAll('pre code').forEach((el) => el.setAttribute('style', 'font-family:Menlo,monospace;font-size:13px'));
    d.querySelectorAll('.callout').forEach((el) => el.setAttribute('style', 'border-left:3px solid #58a6ff;background:#f2f7ff;padding:8px 12px;margin:0 0 10px;border-radius:6px'));
    d.querySelectorAll('li.task').forEach((el) => el.setAttribute('style', 'list-style:none'));
    d.querySelectorAll('[data-line],[data-ln]').forEach((el) => { el.removeAttribute('data-line'); el.removeAttribute('data-ln'); });
    return '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;color:#222">' + d.innerHTML + '</div>';
  };
  App.copyRich = async () => {
    const html = App.inlineStyled(MD.render(App.ed.value, App.renderOpts()));
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([App.ed.value], { type: 'text/plain' }) })]);
    } catch (e) {
      const d = document.createElement('div');
      d.contentEditable = 'true';
      d.innerHTML = html;
      d.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(d);
      const r = document.createRange();
      r.selectNodeContents(d);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      document.execCommand('copy');
      d.remove();
    }
    U.toast('Copied as rich text. Paste into email or docs.');
  };
  const fname = (n) => (U.slug(App.title(n)) || 'note').slice(0, 60);
  App.downloadMd = (n) => { n = n || App.cur; U.download(fname(n) + '.md', n.content, 'text/markdown'); };
  App.previewCssText = async () => {
    try {
      for (const sh of document.styleSheets) if (sh.href && /preview\.css/.test(sh.href)) return Array.from(sh.cssRules).map((r) => r.cssText).join('\n');
    } catch (e) {}
    try { const r = await fetch('css/preview.css'); if (r.ok) return await r.text(); } catch (e) {}
    return '.preview{font-family:var(--pv-font);font-size:var(--fs);line-height:var(--lh);max-width:var(--col);margin:0 auto;padding:48px 24px;color:var(--p-fg)}.preview pre{background:var(--p-codebg);padding:14px;border-radius:10px;overflow:auto}.preview code{font-family:var(--code-font)}.preview blockquote{border-left:3px solid var(--p-quote);margin:0;padding:0 1em;color:var(--p-muted)}.preview table{border-collapse:collapse}.preview td,.preview th{border:1px solid var(--p-border);padding:6px 10px}.preview mark{background:var(--p-hlbg)}.preview a{color:var(--p-link)}';
  };
  App.exportHtml = async (n) => {
    n = n || App.cur;
    const css = await App.previewCssText();
    const root = getComputedStyle(document.documentElement);
    const vars = ['--pv-font', '--code-font', '--fs', '--lh', '--col', '--ui-font'].map((k) => k + ':' + root.getPropertyValue(k)).join(';');
    const doc = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + esc(App.title(n)) + '</title>\n<style>\n' +
      Themes.previewCss(App.pvThemeId(), App.isDark()) + '\n:root{' + vars + '}\nhtml,body{margin:0;background:var(--p-bg);color:var(--p-fg)}\n' + css + '\n</style></head>\n<body' + (S.serifPreview ? ' class="serif-pv"' : '') + '><article class="preview">\n' +
      MD.render(n.content, { noteExists: () => true }).replace(/<button class="copy-code"[^>]*>Copy<\/button>/g, '') + '\n</article></body></html>\n';
    U.download(fname(n) + '.html', doc, 'text/html');
  };
  App.print = (shared) => {
    const b = document.body;
    if (!shared) $('#preview').innerHTML = MD.render(App.ed.value, App.renderOpts()), (App._lastHtml = null);
    b.classList.add('printing');
    $('#preview').style.paddingBottom = '';
    setTimeout(() => window.print(), 60);
  };
  window.addEventListener('afterprint', () => { document.body.classList.remove('printing'); App._pvStale = true; App.renderPreview(); });

  /* ---------- import ---------- */
  App.importFiles = async (files) => {
    let k = 0;
    for (const f of Array.from(files || [])) {
      if (!/\.(md|markdown|txt|text)$/i.test(f.name) && !/^text\//.test(f.type)) continue;
      const text = (await f.text()).replace(/\r\n?/g, '\n');
      const base = f.name.replace(/\.[^.]+$/, '');
      await App.newNote(text, { title: /^\s*#\s/.test(text) ? '' : base, folder: '' }, 0);
      k++;
    }
    if (k) { App.renderList(true); U.toast('Imported ' + k + (k === 1 ? ' note' : ' notes')); }
    else U.toast('Only .md and .txt files can be imported');
  };
  const bindDrop = () => {
    const z = $('#dropZone');
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; depth++; z.classList.add('on'); });
    window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) z.classList.remove('on'); });
    window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      z.classList.remove('on');
      if (!document.body.classList.contains('shared')) App.importFiles(e.dataTransfer.files);
    });
  };

  /* ---------- global shortcuts ---------- */
  const bindKeys = () => {
    document.addEventListener('keydown', (e) => {
      if (document.body.classList.contains('shared')) return;
      const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
      if (mod && k === 'k') { e.preventDefault(); Palette.toggle(); return; }
      if (Palette.isOpen()) return;
      if (mod && !e.shiftKey && (k === '/' || e.code === 'Slash')) { e.preventDefault(); App.cycleMode(); return; }
      if (mod && k === 's') { e.preventDefault(); App.dirty = true; App.flush(); return; }
      if (mod && (k === '\\' || e.code === 'Backslash')) { e.preventDefault(); App.set('sidebar', !S.sidebar); return; }
      if (mod && e.shiftKey && k === 'f') { e.preventDefault(); App.toggleFocus(); return; }
      if (mod && e.altKey && e.code === 'KeyN') { e.preventDefault(); App.newNote(); return; }
      if (mod && !e.shiftKey && k === 'p') { e.preventDefault(); App.print(); return; }
      if (mod && e.shiftKey && k === 'c' && e.altKey) { e.preventDefault(); App.shareLink(); return; }
      if (mod && k === ',') { e.preventDefault(); Settings.toggle(); return; }
      if (mod && (k === '.' || e.code === 'Period')) { e.preventDefault(); Topbar.togglePinned(); return; }
      if (e.key === 'Escape') {
        if (window.Gallery && Gallery.isOpen()) { Gallery.close(); return; }
        if (Menu.isOpen()) { Menu.close(); return; }
        if (Settings.isOpen()) { Settings.close(); return; }
        if (S.focus && !S.vim) { App.toggleFocus(); }
      }
    }, true);
  };

  /* ---------- boot ---------- */
  App.boot = async () => {
    App.apply();
    bindDrop();
    window.addEventListener('hashchange', () => { if (location.hash.startsWith('#share=')) location.reload(); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => S.appearance === 'system' && App.apply('appearance'));
    if (await App.checkShare()) return;
    await App.bootEditor();
  };
  App.bootEditor = async () => {
    if (App.ed) return;
    const ed = (App.ed = new Editor($('#editor'), $('#edScroll')));
    App.vim = new Vim(ed, (m) => {
      const el = $('#vimMode');
      el.classList.toggle('on', !!m);
      el.dataset.m = m || '';
      el.textContent = { normal: 'NORMAL', insert: 'INSERT', visual: 'VISUAL', vline: 'V-LINE' }[m] || '';
    });
    ed.on('change', App.onChange);
    ed.on('cursor', () => { if (S.stat === 3 || ed.sel.e > ed.sel.s || App._hadSel) { App._hadSel = ed.sel.e > ed.sel.s; App.scheduleStatus(); } });
    ed.on('key', (e) => {
      if (!S.sounds || e.metaKey || e.ctrlKey || e.repeat) return;
      if (S.vim && App.vim.mode !== 'insert') return;
      const k = e.key;
      if (k === ' ') Sound.play('space');
      else if (k === 'Enter') Sound.play('enter');
      else if (k === 'Backspace' || k === 'Delete') Sound.play('back');
      else if (k.length === 1) Sound.play('key');
    });
    ed.on('link', (w) => {
      if (w.classList.contains('wl')) App.openByName(w.dataset.note);
      else { const href = w.dataset.href || w.textContent; if (/^https?:|^mailto:/.test(href)) window.open(href, '_blank', 'noopener'); }
    });
    $('#edScroll').addEventListener('scroll', () => sync('ed'), { passive: true });
    $('#pvScroll').addEventListener('scroll', () => sync('pv'), { passive: true });
    bindIntent($('#edScroll'), 'ed');
    bindIntent($('#pvScroll'), 'pv');
    watchLayout();
    Gutter.init(ed);
    $('#preview').addEventListener('mousedown', (e) => { if (e.target.closest('.task-box')) e.preventDefault(); });
    $('#preview').addEventListener('click', (e) => App.previewClick(e, false));
    new ResizeObserver(() => { App.invalidateSync(); App.moveThumb(); }).observe($('#panes'));
    window.addEventListener('resize', U.debounce(() => App.applySplit(), 100));
    $('#edScroll').addEventListener('mousedown', (e) => { if (e.target.id === 'edScroll') { e.preventDefault(); ed.root.focus(); ed.applySel(); } });
    $$('#modeSeg button').forEach((b) => (b.onclick = () => { App.setMode(b.dataset.mode); if (b.dataset.mode !== 'preview') ed.root.focus(); }));
    $('#focusBtn').onclick = () => App.toggleFocus();
    $('#shareBtn').onclick = () => App.shareLink();
    $('#paletteBtn').onclick = () => Palette.open();
    $('#stat').onclick = () => { App.set('stat', (S.stat + 1) % 4); App.updateStatus(); };
    let uiT;
    document.addEventListener('mousemove', (e) => {
      if (!S.focus) return;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) < 3) return;
      document.body.classList.add('ui-show');
      clearTimeout(uiT);
      uiT = setTimeout(() => document.body.classList.remove('ui-show'), 1800);
    });
    $('#main').addEventListener('click', () => { if (window.innerWidth <= 760 && S.sidebar) App.set('sidebar', false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) App.flush(); });
    window.addEventListener('pagehide', () => App.flush());
    bindDivider();
    bindKeys();
    App.bindSidebar();
    await App.load();
    App.apply();
    const last = App.byId(S.lastNote) || App.sorted(App.notes)[0];
    App.setMode(S.mode);
    App.open(last.id);
    App.renderList(true);
    ed.root.focus();
    ed.applySel();
    ed.updateActive();
  };
})();
