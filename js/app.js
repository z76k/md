/* App core: settings, notes, sidebar. */
(function () {
  const { $, $$, esc } = U;
  const DEFAULTS = {
    mode: 'live', theme: 'oled', edMatch: true, pvMatch: true, edTheme: 'oled', pvTheme: 'oled', appearance: 'dark',
    edFont: 'System Mono', pvFont: 'Iowan Old Style', codeFont: 'System Mono',
    fontSize: 18, lineHeight: 1.7, width: 720,
    vim: false, sounds: false, volume: 0.5,
    focus: false, focusScope: 'paragraph', typewriter: false,
    sidebar: window.innerWidth > 760, sort: 'recent', split: 0.5, topbar: 'auto',
    goal: 0, stat: 0, autoPair: true, customCSS: '', customOn: false, spellcheck: false, serifPreview: false, lineNumbers: 'near',
    folders: [], collapsed: {}, lastNote: null, recentCmds: [],
  };
  const STACKS = {
    'System Sans': '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, sans-serif',
    'System Serif': 'ui-serif, "Iowan Old Style", Charter, Georgia, serif',
    'System Mono': 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    'System Rounded': 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif',
  };
  const FONTS = ['System Sans', 'System Serif', 'System Mono', 'System Rounded', 'Avenir Next', 'Helvetica Neue', 'Futura', 'Gill Sans', 'Optima',
    'Iowan Old Style', 'Charter', 'Palatino', 'Georgia', 'Baskerville', 'Hoefler Text', 'Didot', 'American Typewriter', 'Courier New',
    'Menlo', 'Monaco', 'SF Mono', 'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'iA Writer Quattro S', 'Inter'];
  const stack = (name, generic) => STACKS[name] || '"' + String(name).replace(/["\\;{}]/g, '') + '", ' + generic;

  const App = (window.App = { S: Prefs.load(DEFAULTS), notes: [], cur: null, ed: null, tag: null, query: '', FONTS, DEFAULTS });
  const S = App.S;
  // One-time move to the app-wide theme model: the old editor theme becomes the app theme, both panes match it,
  // and old custom CSS (which froze editor colours) is kept but switched off until "Apply custom CSS" is turned on.
  try {
    const raw = JSON.parse(localStorage.getItem('neon-settings') || '{}');
    if (raw && Object.keys(raw).length && !('theme' in raw)) {
      S.theme = raw.edTheme || 'oled';
      S.edMatch = S.pvMatch = true;
      S.customOn = false;
    }
  } catch (e) {}
  if (typeof S.lineNumbers !== 'string') S.lineNumbers = 'near';
  if (!Themes.list[S.theme]) S.theme = 'oled';
  App.save = () => Prefs.save(S);
  App.set = (k, v) => { S[k] = v; App.save(); App.apply(k); };
  App.edThemeId = () => (S.edMatch ? S.theme : S.edTheme);
  App.pvThemeId = () => (S.pvMatch ? S.theme : S.pvTheme);

  App.isDark = () => S.appearance === 'dark' || (S.appearance === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  let fadeT;
  App.fadeTheme = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const h = document.documentElement;
    h.classList.add('theme-fade');
    clearTimeout(fadeT);
    fadeT = setTimeout(() => h.classList.remove('theme-fade'), 260);
  };
  App.apply = (k) => {
    const all = !k, root = document.documentElement.style, ed = App.ed;
    if (all || /theme|Theme|appearance|Match|custom/.test(k)) {
      if (!all) App.fadeTheme();
      $('#themeStyle').textContent = Themes.css(S.theme, App.isDark(), App.edThemeId(), App.pvThemeId());
      $('#customStyle').textContent = S.customOn ? S.customCSS || '' : '';
      const meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.content = Themes.palette(S.theme, App.isDark()).bg;
    }
    if (all || k === 'edFont') root.setProperty('--ed-font', stack(S.edFont, 'monospace'));
    if (all || k === 'pvFont') root.setProperty('--pv-font', stack(S.pvFont, 'serif'));
    if (all || k === 'codeFont') root.setProperty('--code-font', stack(S.codeFont, 'monospace'));
    if (all || k === 'fontSize') root.setProperty('--fs', S.fontSize + 'px');
    if (all || k === 'lineHeight') root.setProperty('--lh', S.lineHeight);
    if (all || k === 'width') root.setProperty('--col', S.width + 'px');
    if (all || k === 'sidebar') document.body.classList.toggle('sb-hidden', !S.sidebar);
    if (all || k === 'split') App.applySplit && App.applySplit();
    if (all || k === 'serifPreview') { document.body.classList.toggle('serif-pv', !!S.serifPreview); App.invalidateSync && App.invalidateSync(); }
    if (all || k === 'topbar') document.body.classList.toggle('tb-pinned', S.topbar === 'pinned');
    if (!ed) return;
    if (all || k === 'lineNumbers') Gutter.setMode(S.lineNumbers);
    if (all || k === 'vim') App.vim.setEnabled(!!S.vim);
    if (all || k === 'autoPair') ed.autoPair = !!S.autoPair;
    if (all || k === 'spellcheck') ed.root.spellcheck = !!S.spellcheck;
    if (all || k === 'sounds' || k === 'volume') { Sound.volume = S.volume; $('#soundInd').hidden = !S.sounds; }
    if (all || /focus|typewriter/.test(k)) App.applyFocus();
    if (all || k === 'goal') App.updateStatus();
    if (all || /Font|fontSize|lineHeight|width/.test(k)) Gutter.invalidate();
    if (/Font|fontSize|lineHeight|width/.test(k || '')) { ed.scrollCaret(); App.invalidateSync && App.invalidateSync(); }
  };
  App.fontStack = stack;

  /* ---------- notes ---------- */
  App.title = (n) => n.title || MD.title(n.content);
  App.byId = (id) => App.notes.find((n) => n.id === id);
  App.byName = (name) => {
    const k = name.trim().toLowerCase();
    return App.notes.find((n) => App.title(n).toLowerCase() === k);
  };
  const mkNote = (content, extra) => Object.assign({ id: U.uid(), title: '', content: content || '', created: Date.now(), updated: Date.now(), pinned: false, folder: '' }, extra || {});

  App.load = async () => {
    App.notes = (await Store.all()) || [];
    if (!App.notes.length && !localStorage.getItem('neon-welcomed')) {
      const w = window.WELCOME;
      for (const [i, c] of w.entries()) {
        const n = mkNote(c, { created: Date.now() - i * 1000, updated: Date.now() - i * 60000, pinned: i === 0 });
        App.notes.push(n);
        await Store.put(n);
      }
      localStorage.setItem('neon-welcomed', '1');
    }
    if (!App.notes.length) { const n = mkNote('# '); App.notes.push(n); await Store.put(n); }
    // The app was renamed: update the two notes it created on first run (nothing else is touched).
    if (!localStorage.getItem('inkwyrm-renamed')) {
      for (const n of App.notes) {
        if (/^# (Welcome to Neon Notes|Shortcuts cheat sheet)/.test(n.content) && n.content.includes('Neon Notes')) {
          n.content = n.content.replace(/Neon Notes/g, 'Inkwyrm');
          await Store.put(n);
        }
      }
      localStorage.setItem('inkwyrm-renamed', '1');
    }
  };
  App.newNote = async (content, extra, caret) => {
    const n = mkNote(content == null ? '# ' : content, extra);
    App.notes.push(n);
    await Store.put(n);
    App.open(n.id, caret == null ? n.content.length : caret);
    if (S.mode === 'preview') App.setMode('live');
    App.ed.root.focus();
    App.ed.applySel();
    return n;
  };
  App.open = (id, caret) => {
    const n = App.byId(id);
    if (!n) return;
    App.flush();
    App.cur = n;
    S.lastNote = id;
    App.save();
    App.ed.setValue(n.content, caret == null ? (n.caret || 0) : caret);
    App.lastWords = U.countWords(n.content);
    App.ed.scroller.scrollTop = 0;
    $("#pvScroll").scrollTop = 0;
    App.updateTitle();
    App.renderList();
    App.renderPreview(true);
    App.updateStatus();
    if (window.innerWidth <= 760 && S.sidebar) App.set('sidebar', false);
  };
  const persist = U.debounce(() => App.flush(), 350);
  App.flush = () => {
    const n = App.cur;
    if (!n || !App.dirty) return;
    App.dirty = false;
    n.caret = App.ed.sel.s;
    Store.put(n).then(() => {
      // The top bar hides by default, so the status bar carries a twin of the saved indicator.
      for (const el of $$('#saved, #savedMini')) {
        el.classList.remove('dirty');
        el.textContent = 'Saved';
        el.classList.add('show');
      }
      clearTimeout(App._st);
      App._st = setTimeout(() => $$('#saved, #savedMini').forEach((el) => el.classList.remove('show')), 1600);
    });
  };
  const relist = U.debounce(() => { App.renderList(); App.updateTitle(); }, 400);
  App.onChange = () => {
    const n = App.cur;
    if (!n) return;
    n.content = App.ed.value;
    n.updated = Date.now();
    App.dirty = true;
    for (const el of $$('#saved, #savedMini')) {
      el.textContent = 'Editing';
      el.classList.add('show', 'dirty');
    }
    persist();
    relist();
    App.schedulePreview();
    App.trackGoal();
    App.scheduleStatus();
  };
  App.updateTitle = () => {
    const t = App.cur ? App.title(App.cur) : '';
    $('#noteTitle').textContent = t;
    document.title = t && t !== 'Untitled' ? t + ' · Inkwyrm' : 'Inkwyrm';
  };
  App.rename = async (n) => {
    n = n || App.cur;
    const v = await Palette.prompt('Rename note', App.title(n));
    if (v == null) return;
    n.title = v.trim() === MD.title(n.content) ? '' : v.trim();
    n.updated = Date.now();
    await Store.put(n);
    App.renderList();
    App.updateTitle();
  };
  App.duplicate = async (n) => {
    n = n || App.cur;
    App.flush();
    const t = App.title(n);
    const c = n.title ? n.content : n.content.replace(/^(#\s*)?(.*)$/m, (m, h, x) => (h || '') + x + ' copy');
    await App.newNote(c, { title: n.title ? t + ' copy' : '', folder: n.folder }, 0);
    U.toast('Duplicated “' + t + '”');
  };
  App.remove = async (n) => {
    n = n || App.cur;
    const wasCur = n === App.cur;
    if (wasCur) App.flush();
    App.notes = App.notes.filter((x) => x !== n);
    await Store.del(n.id);
    if (wasCur) {
      App.cur = null;
      if (!App.notes.length) await App.newNote('# ');
      else App.open(sorted(App.notes)[0].id);
    } else App.renderList();
    U.toast('Deleted “' + App.title(n) + '”', async () => {
      App.notes.push(n);
      await Store.put(n);
      App.open(n.id);
    }, 'Undo', 7000);
  };
  App.togglePin = async (n) => {
    n = n || App.cur;
    n.pinned = !n.pinned;
    await Store.put(n);
    App.renderList();
    U.toast(n.pinned ? 'Pinned to top' : 'Unpinned');
  };
  App.allFolders = () => Array.from(new Set([...S.folders, ...App.notes.map((n) => n.folder).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
  App.newFolder = async () => {
    const v = await Palette.prompt('New folder name', '');
    if (!v || !v.trim()) return null;
    const f = v.trim();
    if (!S.folders.includes(f)) { S.folders.push(f); App.save(); }
    App.renderList();
    return f;
  };
  App.moveToFolder = async (n) => {
    n = n || App.cur;
    const opts = [{ label: 'No folder', value: '' }, ...App.allFolders().map((f) => ({ label: f, value: f })), { label: 'New folder…', value: '\u0000new' }];
    let v = await Palette.pick('Move “' + App.title(n) + '” to…', opts);
    if (v == null) return;
    if (v === '\u0000new') { v = await App.newFolder(); if (v == null) return; }
    n.folder = v;
    await Store.put(n);
    App.renderList();
    U.toast(v ? 'Moved to ' + v : 'Moved out of folder');
  };
  App.openByName = async (name) => {
    const n = App.byName(name);
    if (n) return App.open(n.id);
    App.flush();
    await App.newNote('# ' + name + '\n\n', { folder: App.cur ? App.cur.folder : '' });
    U.toast('Created “' + name + '”');
  };

  /* ---------- sidebar list ---------- */
  const TAG_RE = /(^|\s)#([\p{L}_][\p{L}\p{N}_/-]*)/gu;
  App.tagsOf = (n) => {
    const out = new Set();
    const body = n.content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
    for (const m of body.matchAll(TAG_RE)) out.add(m[2].toLowerCase());
    return out;
  };
  const sorted = (arr) => {
    const k = S.sort, t = (n) => App.title(n).toLowerCase();
    return arr.slice().sort((a, b) => k === 'oldest' ? a.updated - b.updated : k === 'az' ? t(a).localeCompare(t(b)) : k === 'za' ? t(b).localeCompare(t(a)) : b.updated - a.updated);
  };
  App.sorted = sorted;
  const excerpt = (n, q) => {
    const c = n.content;
    if (q) {
      const i = c.toLowerCase().indexOf(q);
      if (i >= 0) {
        const s = Math.max(0, i - 24), seg = c.slice(s, i + q.length + 50).replace(/\s+/g, ' ');
        const j = i - s - (c.slice(s, i).length - c.slice(s, i).replace(/\s+/g, ' ').length);
        return (s ? '…' : '') + esc(seg.slice(0, j)) + '<b>' + esc(seg.slice(j, j + q.length)) + '</b>' + esc(seg.slice(j + q.length));
      }
    }
    const lines = c.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!n.title) lines.shift();
    const t = lines.find((l) => !/^(```|---|\$\$|\|)/.test(l)) || '';
    return esc(t.replace(/^[#>\-*+\d.)\s[\]x!]+/, '').replace(/[*_`~=[\]]|\(http[^)]*\)/g, '').slice(0, 110)) || '<i style="opacity:.6">Empty note</i>';
  };
  App.renderList = (animate) => {
    $('#noteList').classList.toggle('anim', !!animate);
    const q = App.query.trim().toLowerCase();
    let arr = App.notes;
    if (App.tag) arr = arr.filter((n) => App.tagsOf(n).has(App.tag));
    if (q) {
      const words = q.split(/\s+/);
      arr = arr.filter((n) => { const h = (App.title(n) + '\n' + n.content).toLowerCase(); return words.every((w) => h.includes(w)); });
    }
    arr = sorted(arr);
    const item = (n) => '<div class="note-item' + (n === App.cur ? ' on' : '') + '" data-id="' + n.id + '">' +
      (n.pinned ? '<span class="pin" title="Pinned">●</span>' : '') +
      '<div class="t">' + esc(App.title(n)) + '</div><div class="x">' + excerpt(n, q) + '</div>' +
      '<div class="d">' + U.fmtDate(n.updated) + '</div>' +
      '<button class="icon-btn more" title="More"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button></div>';
    const folders = App.allFolders();
    const pinned = arr.filter((n) => n.pinned);
    let h = '';
    if (!folders.length && !pinned.length) h = arr.map(item).join('');
    else {
      const group = (key, label, list) => {
        if (!list.length && key !== 'f:' + label) return '';
        const closed = S.collapsed[key];
        return '<div class="folder-h' + (closed ? ' closed' : '') + '" data-key="' + esc(key) + '"><span class="caret">▾</span>' + esc(label) + '<span class="n">' + list.length + '</span></div>' + (closed ? '' : list.map(item).join(''));
      };
      if (pinned.length) h += group('pinned', 'Pinned', pinned);
      for (const f of folders) h += group('f:' + f, f, arr.filter((n) => !n.pinned && n.folder === f));
      h += group('root', 'Notes', arr.filter((n) => !n.pinned && !n.folder));
    }
    $('#noteList').innerHTML = h || '<div class="pal-empty">No notes match.</div>';
    const counts = {};
    App.notes.forEach((n) => App.tagsOf(n).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 18);
    $('#tagbar').innerHTML = tags.map((t) => '<button class="chip' + (App.tag === t ? ' on' : '') + '" data-tag="' + esc(t) + '">#' + esc(t) + '</button>').join('');
  };

  App.bindSidebar = () => {
    const list = $('#noteList');
    list.addEventListener('click', (e) => {
      const fh = e.target.closest('.folder-h');
      if (fh) { const k = fh.dataset.key; S.collapsed[k] = !S.collapsed[k]; App.save(); return App.renderList(); }
      const it = e.target.closest('.note-item');
      if (!it) return;
      const n = App.byId(it.dataset.id);
      if (e.target.closest('.more')) { const r = e.target.closest('.more').getBoundingClientRect(); return Menu.note(n, r.right, r.bottom); }
      App.open(n.id);
    });
    list.addEventListener('contextmenu', (e) => {
      const it = e.target.closest('.note-item');
      if (!it) return;
      e.preventDefault();
      Menu.note(App.byId(it.dataset.id), e.clientX, e.clientY);
    });
    $('#tagbar').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      App.tag = App.tag === c.dataset.tag ? null : c.dataset.tag;
      App.renderList();
    });
    $('#search').addEventListener('input', U.debounce((e) => { App.query = e.target.value; App.renderList(); }, 90));
    $('#search').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const f = $('#noteList .note-item'); if (f) { App.open(f.dataset.id); App.ed.root.focus(); } }
      if (e.key === 'Escape') { e.target.value = ''; App.query = ''; App.renderList(); App.ed.root.focus(); }
    });
    const sort = $('#sort');
    sort.value = S.sort;
    sort.addEventListener('change', () => { App.set('sort', sort.value); App.renderList(); });
    $('#newNoteBtn').onclick = () => App.newNote();
    $('#newFolderBtn').onclick = () => App.newFolder();
    $('#importBtn').onclick = () => $('#importFile').click();
    $('#trashHint').onclick = () => Palette.open('');
    $('#importFile').onchange = (e) => { App.importFiles(e.target.files); e.target.value = ''; };
    $('#sbToggle').onclick = () => App.set('sidebar', !S.sidebar);
    $('#noteTitle').onclick = () => App.rename();
    setInterval(() => { if (!App.query) App.renderList(); }, 60000);
  };

  document.addEventListener('DOMContentLoaded', () => App.boot());
})();
