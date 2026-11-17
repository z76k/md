/* Command palette (fuzzy, recent-first), inline prompt/picker, and the note context menu. */
(function () {
  const { $, esc } = U;
  const App = window.App, S = App.S;
  const ICON = { mode: '◐', note: '▤', insert: '＋', copy: '⧉', export: '⇩', view: '◎', theme: '◑', font: 'Aa', open: '↗' };

  function ensureEditing() {
    if (S.mode === 'preview') App.setMode('live');
    App.ed.root.focus();
    App.ed.applySel();
  }
  function insertBlock(text, inner) {
    ensureEditing();
    const ed = App.ed, s = ed.sel.s, ls = ed.lineStart(s);
    const pre = s === ls ? '' : '\n\n';
    ed.insert(pre + text, inner ? [pre.length + inner[0], pre.length + inner[1]] : null);
  }
  const fontPick = async (key, label) => {
    const opts = App.FONTS.map((f) => ({ label: f, value: f, sub: S[key] === f ? 'current' : '' }));
    opts.push({ label: 'Type any installed font…', value: '\u0000custom' });
    let v = await P.pick(label, opts);
    if (v === '\u0000custom') v = await P.prompt(label + ' (any font on your Mac)', S[key]);
    if (v && v.trim()) { App.set(key, v.trim()); U.toast(label + ': ' + v.trim()); }
  };
  const toggle = (k, label) => () => { App.set(k, !S[k]); U.toast(label + (S[k] ? ' on' : ' off')); };

  function commands() {
    const C = [];
    const add = (id, title, sec, run, kbd, kw) => C.push({ id, title, sec, run, kbd: kbd || '', kw: kw || '' });
    add('mode-live', 'Switch to Live preview', 'mode', () => { App.setMode('live'); ensureEditing(); }, '', 'wysiwyg calmly');
    add('mode-split', 'Switch to Split view', 'mode', () => { App.setMode('split'); ensureEditing(); }, '', 'side by side markon');
    add('mode-preview', 'Switch to Preview only', 'mode', () => App.setMode('preview'), '', 'read');
    add('mode-cycle', 'Cycle editor mode', 'mode', App.cycleMode, 'Mod+/');
    add('new', 'New note', 'note', () => App.newNote(), 'Mod+Alt+N', 'create');
    add('rename', 'Rename note', 'note', () => App.rename());
    add('dup', 'Duplicate note', 'note', () => App.duplicate(), '', 'copy clone');
    add('pin', App.cur && App.cur.pinned ? 'Unpin note' : 'Pin note to top', 'note', () => App.togglePin());
    add('move', 'Move note to folder…', 'note', () => App.moveToFolder());
    add('folder', 'New folder', 'note', () => App.newFolder());
    add('delete', 'Delete note', 'note', () => App.remove(), '', 'remove trash');
    add('import', 'Import .md or .txt files', 'note', () => $('#importFile').click(), '', 'open upload');
    add('search', 'Search notes', 'note', () => { App.set('sidebar', true); setTimeout(() => $('#search').focus(), 50); }, '', 'find');
    add('copy-md', 'Copy as Markdown', 'copy', App.copyMarkdown);
    add('copy-html', 'Copy as HTML', 'copy', App.copyHtml);
    add('copy-rich', 'Copy as rich text', 'copy', App.copyRich, '', 'email docs formatted');
    add('share', 'Copy share link', 'copy', () => App.shareLink(), 'Mod+Alt+Shift+C', 'url publish');
    add('dl-md', 'Download as .md', 'export', () => App.downloadMd(), '', 'save file export');
    add('dl-html', 'Download as .html', 'export', () => App.exportHtml(), '', 'save file export');
    add('print', 'Print or save as PDF', 'export', () => App.print(), 'Mod+P', 'pdf');
    add('focus', 'Toggle focus mode', 'view', App.toggleFocus, 'Mod+Shift+F', 'zen distraction');
    add('typewriter', 'Toggle typewriter scrolling', 'view', toggle('typewriter', 'Typewriter scrolling'), '', 'center');
    add('sounds', 'Toggle typewriter sounds', 'view', toggle('sounds', 'Typewriter sounds'), '', 'audio keys click');
    add('vim', 'Toggle vim mode', 'view', toggle('vim', 'Vim mode'), '', 'modal hjkl');
    add('sidebar', 'Toggle sidebar', 'view', () => App.set('sidebar', !S.sidebar), 'Mod+\\', 'notes list');
    add('settings', 'Open settings', 'view', () => Settings.open(), 'Mod+,', 'preferences options');
    add('goal', 'Set daily writing goal…', 'view', async () => { const v = await P.prompt('Daily goal in words (0 to turn off)', String(S.goal || 500)); if (v != null) App.set('goal', Math.max(0, parseInt(v, 10) || 0)); });
    add('appearance', App.isDark() ? 'Switch to light appearance' : 'Switch to dark appearance', 'theme', () => App.set('appearance', App.isDark() ? 'light' : 'dark'), '', 'dark light mode');
    add('gallery', 'Browse themes', 'theme', () => Gallery.open(), '', 'theme gallery preview grid markon colors');
    add('serif', 'Toggle serif preview', 'view', toggle('serifPreview', 'Serif preview'), '', 'leafpad typography font');
    add('linenums', 'Cycle line numbers (off, near cursor, all)', 'view', () => {
      const next = { off: 'near', near: 'all', all: 'off' }[S.lineNumbers] || 'near';
      App.set('lineNumbers', next);
      U.toast('Line numbers: ' + { off: 'off', near: 'near cursor', all: 'all lines' }[next]);
    }, '', 'gutter');
    add('topbar', S.topbar === 'pinned' ? 'Auto-hide top bar' : 'Pin top bar', 'view', () => Topbar.togglePinned(), 'Mod+.', 'toolbar header');
    add('match', S.edMatch && S.pvMatch ? 'Editor and preview match app theme' : 'Make editor and preview match app theme', 'theme', () => { S.edMatch = S.pvMatch = true; App.set('edMatch', true); U.toast('Editor and preview follow the app theme'); }, '', 'reset override');
    for (const [id, t] of Object.entries(Themes.list)) {
      add('th-' + id, 'Theme: ' + t.name, 'theme', () => App.set('theme', id), '', 'color app');
      add('et-' + id, 'Editor theme override: ' + t.name, 'theme', () => { S.edMatch = false; App.set('edTheme', id); }, '', 'color pane');
      add('pt-' + id, 'Preview theme override: ' + t.name, 'theme', () => { S.pvMatch = false; App.set('pvTheme', id); }, '', 'color pane');
    }
    add('font-ed', 'Change editor font…', 'font', () => fontPick('edFont', 'Editor font'), '', 'typeface');
    add('font-pv', 'Change preview font…', 'font', () => fontPick('pvFont', 'Preview font'), '', 'typeface');
    add('font-code', 'Change code font…', 'font', () => fontPick('codeFont', 'Code font'), '', 'typeface mono');
    add('size-up', 'Increase font size', 'font', () => App.set('fontSize', Math.min(32, S.fontSize + 1)), '', 'bigger');
    add('size-down', 'Decrease font size', 'font', () => App.set('fontSize', Math.max(11, S.fontSize - 1)), '', 'smaller');
    add('wider', 'Wider text column', 'font', () => App.set('width', Math.min(1400, S.width + 60)));
    add('narrower', 'Narrower text column', 'font', () => App.set('width', Math.max(420, S.width - 60)));
    add('ins-table', 'Insert table', 'insert', () => insertBlock('| Column | Column | Column |\n| --- | --- | --- |\n|  |  |  |\n', [2, 8]));
    for (const t of ['note', 'tip', 'info', 'warning', 'danger', 'question']) {
      add('ins-co-' + t, 'Insert callout: ' + t, 'insert', () => { const s = '> [!' + t + '] Title\n> '; insertBlock(s, [6 + t.length, 11 + t.length]); });
    }
    add('ins-fold', 'Insert foldable callout', 'insert', () => insertBlock('> [!tip]- Click to expand\n> Hidden until opened.\n', [10, 25]));
    add('ins-code', 'Insert code block', 'insert', () => insertBlock('```js\n\n```\n', [3, 5]), '', 'snippet fence');
    add('ins-math', 'Insert math block', 'insert', () => insertBlock('$$\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\n$$\n', [3, 35]), '', 'latex equation');
    add('ins-task', 'Insert checklist', 'insert', () => insertBlock('- [ ] ', null), '', 'todo task');
    add('ins-hr', 'Insert divider', 'insert', () => insertBlock('---\n', null), '', 'horizontal rule');
    add('ins-fn', 'Insert footnote', 'insert', () => { ensureEditing(); const ed = App.ed; const k = (ed.value.match(/\[\^\d+\]:/g) || []).length + 1; const at = ed.sel.s; ed.replace(ed.text.length, ed.text.length, '\n\n[^' + k + ']: ', at); ed.insert('[^' + k + ']'); });
    add('ins-wiki', 'Insert link to another note', 'insert', async () => {
      const v = await P.pick('Link to note', App.sorted(App.notes).map((n) => ({ label: App.title(n), value: App.title(n) })));
      if (v) { ensureEditing(); App.ed.insert('[[' + v + ']]'); }
    }, '', 'wikilink');
    add('ins-date', 'Insert date', 'insert', () => { ensureEditing(); App.ed.insert(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })); }, '', 'today');
    add('ins-iso', 'Insert date (YYYY-MM-DD)', 'insert', () => { ensureEditing(); App.ed.insert(new Date().toLocaleDateString('en-CA')); }, '', 'today iso');
    add('ins-time', 'Insert date and time', 'insert', () => { ensureEditing(); App.ed.insert(new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })); }, '', 'now');
    return C;
  }
  const SEC = { mode: 'Modes', note: 'Notes', copy: 'Copy and share', export: 'Export', view: 'View', theme: 'Themes', font: 'Fonts and layout', insert: 'Insert', open: 'Open note', recent: 'Recent' };

  /* ---------- palette ---------- */
  const P = (window.Palette = {});
  let kind = 'cmd', items = [], idx = 0, resolver = null, opts = [], all = [];
  const ov = $('#palette'), inp = $('#palInput'), list = $('#palList');

  P.isOpen = () => ov.classList.contains('open');
  P.open = (q, k) => {
    kind = k || 'cmd';
    all = kind === 'cmd' ? commands() : [];
    ov.classList.add('open');
    inp.value = q || '';
    inp.placeholder = kind === 'cmd' ? 'Type a command or note name…' : inp.placeholder;
    idx = 0;
    filter();
    setTimeout(() => { inp.focus(); if (kind === 'prompt') inp.select(); }, 10);
  };
  P.close = (val) => {
    if (!P.isOpen()) return;
    ov.classList.remove('open');
    const r = resolver;
    resolver = null;
    if (r) r(val);
    kind = 'cmd';
    if (App.ed && S.mode !== 'preview' && !Settings.isOpen()) { App.ed.root.focus(); App.ed.applySel(); }
  };
  P.toggle = () => (P.isOpen() ? P.close(null) : P.open(''));
  P.prompt = (label, value) => new Promise((res) => {
    if (resolver) resolver(null);
    inp.placeholder = label;
    P.open(value || '', 'prompt');
    resolver = res;
  });
  P.pick = (label, options) => new Promise((res) => {
    if (resolver) resolver(null);
    opts = options;
    inp.placeholder = label;
    P.open('', 'pick');
    resolver = res;
  });

  function filter() {
    const q = inp.value.trim();
    let h = '';
    if (kind === 'prompt') {
      items = [{ run: () => P.close(inp.value) }];
      list.innerHTML = '<div class="pal-sec">' + esc(inp.placeholder) + '</div><div class="pal-item on" data-i="0"><span class="ic">↵</span>' + '<span class="lb">' + (q ? 'Press Enter to confirm' : 'Type, then press Enter') + '</span></div>';
      return hi();
      return;
    }
    if (kind === 'pick') {
      items = opts.map((o) => ({ ...o, m: U.fuzzy(q, o.label) })).filter((o) => o.m);
      if (q) items.sort((a, b) => b.m.score - a.m.score);
      items.forEach((o) => (o.run = () => P.close(o.value)));
      h = '<div class="pal-sec">' + esc(inp.placeholder) + '</div>' + items.map((o, i) => row(i, '›', U.markFuzzy(o.label, o.m.idx), o.sub || '')).join('');
      list.innerHTML = items.length ? h : '<div class="pal-empty">No matches</div>';
      return hi();
    }
    const notes = App.sorted(App.notes).map((n) => ({ id: 'open:' + n.id, title: App.title(n), sec: 'open', run: () => App.open(n.id), kw: n.folder || '', note: n }));
    const recent = S.recentCmds;
    if (!q) {
      const rec = recent.map((id) => all.find((c) => c.id === id)).filter(Boolean).slice(0, 5);
      const rest = all.filter((c) => !rec.includes(c));
      items = [...rec, ...rest, ...notes.slice(0, 8)];
      let lastSec = null;
      h = items.map((c, i) => {
        const sec = i < rec.length ? 'recent' : c.sec;
        const head = sec !== lastSec ? '<div class="pal-sec">' + SEC[sec] + '</div>' : '';
        lastSec = sec;
        return head + row(i, ICON[c.sec] || '›', esc(c.title), c.note ? (c.note.folder ? esc(c.note.folder) : U.fmtDate(c.note.updated)) : '', c.kbd);
      }).join('');
    } else {
      const scored = [];
      for (const c of [...all, ...notes]) {
        let m = U.fuzzy(q, c.title);
        let hl = m && m.idx;
        if (!m && c.kw) { m = U.fuzzy(q, c.kw); if (m) m.score -= 3; hl = null; }
        if (!m) continue;
        let sc = m.score + (recent.includes(c.id) ? 4 - recent.indexOf(c.id) * 0.4 : 0) + (c.sec === 'open' ? 1 : 0);
        scored.push({ c, sc, hl });
      }
      scored.sort((a, b) => b.sc - a.sc);
      items = scored.slice(0, 60).map((x) => x.c);
      h = scored.slice(0, 60).map((x, i) => row(i, ICON[x.c.sec] || '›', U.markFuzzy(x.c.title, x.hl), x.c.note ? (x.c.note.folder || U.fmtDate(x.c.note.updated)) : SEC[x.c.sec], x.c.kbd)).join('');
      if (!items.length) {
        items = [{ id: 'create', run: () => App.openByName(q) }];
        h = '<div class="pal-sec">No matches</div>' + row(0, '＋', 'Create note “' + esc(q) + '”', '');
      }
    }
    list.innerHTML = h;
    hi();
  }
  function row(i, ic, label, sub, kbd) {
    return '<div class="pal-item" data-i="' + i + '"><span class="ic">' + ic + '</span><span class="lb">' + label + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</span>' + (kbd ? '<span class="kbd">' + esc(U.kbd(kbd)) + '</span>' : '') + '</div>';
  }
  function hi() {
    idx = U.clamp(idx, 0, Math.max(0, items.length - 1));
    list.querySelectorAll('.pal-item').forEach((el) => el.classList.toggle('on', +el.dataset.i === idx));
    const on = list.querySelector('.pal-item.on');
    // One highlight that glides between rows; a freshly rendered list places it without animating.
    let g = list.querySelector('.pal-glide');
    const fresh = !g;
    if (fresh) { g = document.createElement('div'); g.className = 'pal-glide'; list.prepend(g); }
    if (!on) { g.style.opacity = 0; return; }
    if (fresh) g.style.transition = 'none';
    g.style.opacity = 1;
    g.style.transform = 'translateY(' + on.offsetTop + 'px)';
    g.style.height = on.offsetHeight + 'px';
    if (fresh) { void g.offsetHeight; g.style.transition = ''; }
    on.scrollIntoView({ block: 'nearest' });
  }
  function run(i) {
    const c = items[i];
    if (!c) return;
    if (kind === 'prompt' || kind === 'pick') return c.run();
    if (c.id && !c.id.startsWith('open:') && c.id !== 'create') {
      S.recentCmds = [c.id, ...S.recentCmds.filter((x) => x !== c.id)].slice(0, 8);
      App.save();
    }
    P.close(null);
    setTimeout(() => c.run(), 0);
  }
  inp.addEventListener('input', () => { idx = 0; filter(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) { e.preventDefault(); idx = (idx + 1) % Math.max(1, items.length); hi(); }
    else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) { e.preventDefault(); idx = (idx - 1 + items.length) % Math.max(1, items.length); hi(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(idx); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); P.close(null); }
  });
  list.addEventListener('mousemove', (e) => { const it = e.target.closest('.pal-item'); if (it && +it.dataset.i !== idx) { idx = +it.dataset.i; hi(); } });
  list.addEventListener('click', (e) => { const it = e.target.closest('.pal-item'); if (it) run(+it.dataset.i); });
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) P.close(null); });

  /* ---------- context menu ---------- */
  const M = (window.Menu = {});
  const menu = $('#ctxMenu');
  M.isOpen = () => menu.classList.contains('open');
  M.close = () => menu.classList.remove('open');
  M.note = (n, x, y) => {
    const acts = [
      ['Open', () => App.open(n.id)], ['Rename…', () => App.rename(n)], ['Duplicate', () => App.duplicate(n)],
      [n.pinned ? 'Unpin' : 'Pin to top', () => App.togglePin(n)], ['Move to folder…', () => App.moveToFolder(n)], null,
      ['Copy share link', () => App.shareLink(n)], ['Download .md', () => App.downloadMd(n)], ['Download .html', () => App.exportHtml(n)], null,
      ['Delete', () => App.remove(n), 'danger'],
    ];
    menu.innerHTML = acts.map((a, i) => (a ? '<button data-i="' + i + '" class="' + (a[2] || '') + '">' + a[0] + '</button>' : '<hr>')).join('');
    menu.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; M.close(); acts[+b.dataset.i][1](); };
    menu.classList.add('open');
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
    menu.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
  };
  document.addEventListener('mousedown', (e) => { if (M.isOpen() && !menu.contains(e.target)) M.close(); });
})();
