/* Settings panel: every option, remembered in localStorage. */
(function () {
  const { $, $$, esc } = U;
  const App = window.App, S = App.S;
  const panel = $('#settings'), body = $('#settingsBody');

  const fontFound = (name) => {
    if (/^System /.test(name)) return true;
    const c = fontFound.c || (fontFound.c = document.createElement('canvas').getContext('2d'));
    const txt = 'mmmmmmmmmlli1WQ@#&ﬁ';
    return ['monospace', 'serif', 'sans-serif'].some((g) => {
      c.font = '64px ' + g;
      const w0 = c.measureText(txt).width;
      c.font = '64px "' + name.replace(/"/g, '') + '", ' + g;
      return c.measureText(txt).width !== w0;
    });
  };
  const themeOpts = (v) => [['Inkwyrm', (t) => !t.group], ['Markon presets', (t) => t.group === 'markon']].map(([label, f]) =>
    '<optgroup label="' + label + '">' + Object.entries(Themes.list).filter(([, t]) => f(t)).map(([id, t]) => '<option value="' + id + '"' + (id === v ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</optgroup>').join('');
  const sel = (k, label, options) => '<div class="row"><label>' + label + '</label><select class="field" data-k="' + k + '">' + options + '</select></div>';
  const opt = (pairs, v) => pairs.map(([val, l]) => '<option value="' + val + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + l + '</option>').join('');
  const tog = (k, label, hint) => '<div class="row"><label>' + label + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</label><button class="toggle' + (S[k] ? ' on' : '') + '" data-t="' + k + '" role="switch" aria-checked="' + !!S[k] + '"></button></div>';
  const rng = (k, label, min, max, step, fmt) => '<div class="row"><label>' + label + '</label><input type="range" data-r="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[k] + '"><span class="val" data-v="' + k + '">' + fmt(S[k]) + '</span></div>';
  const font = (k, label) => '<div class="stack"><label>' + label + ' <span class="hint" data-ff="' + k + '"></span></label><input class="field" list="fontList" data-f="' + k + '" value="' + esc(S[k]) + '" placeholder="Any installed font name"></div>';
  const FMT = { fontSize: (v) => v + 'px', lineHeight: (v) => (+v).toFixed(2), width: (v) => v + 'px', volume: (v) => Math.round(v * 100) + '%' };

  function build() {
    body.innerHTML =
      '<datalist id="fontList">' + App.FONTS.map((f) => '<option value="' + esc(f) + '">').join('') + '</datalist>' +
      '<div class="set-group"><h4>Appearance</h4>' +
      sel('appearance', 'Mode', opt([['dark', 'Dark'], ['light', 'Light'], ['system', 'Match system']], S.appearance)) +
      sel('theme', 'App theme', themeOpts(S.theme)) +
      '<div class="hint" style="margin:-4px 0 6px">Colours everything: editor and syntax, preview, sidebar, bars, palette, menus.</div>' +
      tog('edMatch', 'Editor matches app theme') +
      (S.edMatch ? '' : sel('edTheme', 'Editor theme', themeOpts(S.edTheme))) +
      tog('pvMatch', 'Preview matches app theme') +
      (S.pvMatch ? '' : sel('pvTheme', 'Preview theme', themeOpts(S.pvTheme))) +
      '<div class="row"><label>All themes<div class="hint">Cards with colours and a mini sample</div></label><button class="btn" id="galleryBtn">Browse themes</button></div>' +
      tog('serifPreview', 'Serif preview', 'Clean serif headings and text in the preview, with a thin line under H1 and H2.') +
      tog('customOn', 'Apply custom CSS', 'Your own variables below, layered on top of the app theme.') +
      '<div class="stack"><textarea class="field" id="customCss" spellcheck="false" placeholder=":root {\n  --e-bg: #000;\n  --n-h1: #ff2bd6;\n}">' + esc(S.customCSS) + '</textarea>' +
      '<div style="display:flex;gap:6px"><button class="btn" id="cssStarter">Start from current theme</button><button class="btn" id="cssClear">Clear</button></div>' +
      '<div class="hint">Override any CSS variable (editor --e-*, neon --n-*, code --t-*, preview --p-*). Applies live. Fixed colours here stay fixed when you switch themes.</div></div></div>' +
      '<div class="set-group"><h4>Typography</h4>' +
      font('edFont', 'Editor font') + font('pvFont', 'Preview font') + font('codeFont', 'Code font') +
      rng('fontSize', 'Size', 11, 32, 1, FMT.fontSize) + rng('lineHeight', 'Line height', 1.2, 2.4, 0.05, FMT.lineHeight) + rng('width', 'Column width', 420, 1400, 10, FMT.width) +
      '</div>' +
      '<div class="set-group"><h4>Writing</h4>' +
      tog('autoPair', 'Auto-close brackets and quotes') + tog('spellcheck', 'Spellcheck') +
      sel('lineNumbers', 'Line numbers', opt([['off', 'Off'], ['near', 'Near cursor'], ['all', 'All']], S.lineNumbers)) +
      sel('topbar', 'Top bar', opt([['auto', 'Auto-hide (top edge)'], ['pinned', 'Pinned']], S.topbar)) +
      tog('vim', 'Vim mode', 'Normal, insert and visual modes. Esc to leave insert.') +
      '<div class="row"><label>Daily goal<div class="hint">Words per day, 0 turns it off</div></label><input class="field" type="number" min="0" step="50" data-n="goal" value="' + (S.goal || 0) + '" style="width:100px"></div>' +
      '</div>' +
      '<div class="set-group"><h4>Focus</h4>' +
      tog('focus', 'Focus mode', 'Hides everything but the text. Move the mouse to bring controls back.') +
      sel('focusScope', 'Highlight', opt([['paragraph', 'Current paragraph'], ['sentence', 'Current sentence'], ['line', 'Current line'], ['none', 'Nothing dimmed']], S.focusScope)) +
      tog('typewriter', 'Typewriter scrolling', 'Keeps the current line in the middle of the screen.') +
      '</div>' +
      '<div class="set-group"><h4>Sounds</h4>' +
      tog('sounds', 'Typewriter sounds') + rng('volume', 'Volume', 0, 1, 0.05, FMT.volume) +
      '<button class="btn" id="soundTest">Play a sample</button></div>' +
      '<div class="set-group"><h4>Your data</h4><div class="hint" style="margin-bottom:8px">Notes live only in this browser (IndexedDB). Back them up now and then.</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" id="backupBtn">Download backup</button><button class="btn" id="restoreBtn">Restore backup</button><button class="btn" id="resetBtn">Reset settings</button></div>' +
      '<input type="file" id="restoreFile" accept=".json,application/json" hidden></div>' +
      '<div class="set-group" style="border:0"><h4>Shortcuts</h4><div class="hint" style="line-height:1.9">' +
      [['Mod+K', 'Command palette'], ['Mod+/', 'Cycle Live / Split / Read'], ['Mod+B', 'Bold'], ['Mod+I', 'Italic'], ['Mod+Shift+E', 'Inline code'], ['Mod+Shift+H', 'Highlight'],
        ['Mod+S', 'Save now'], ['Mod+\\', 'Toggle sidebar'], ['Mod+Shift+F', 'Focus mode'], ['Mod+Alt+N', 'New note'], ['Mod+P', 'Print or PDF'], ['Mod+,', 'Settings'], ['Mod+.', 'Pin or auto-hide the top bar'],
        ['Mod+Click', 'Follow link or [[wikilink]] in the editor'], ['Tab / Shift+Tab', 'Indent / outdent']]
        .map(([k, l]) => '<span class="kbd">' + esc(U.kbd(k)) + '</span> ' + esc(l)).join('<br>') + '</div></div>';
    $$('[data-ff]', body).forEach((el) => updFound(el.dataset.ff));
  }
  function updFound(k) {
    const el = body.querySelector('[data-ff="' + k + '"]');
    if (el) el.textContent = fontFound(S[k]) ? '✓ found' : '· not installed, using fallback';
  }

  body.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.k) App.set(t.dataset.k, t.value);
    if (t.dataset.n) App.set(t.dataset.n, Math.max(0, parseInt(t.value, 10) || 0));
  });
  body.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.r) {
      const v = parseFloat(t.value);
      App.set(t.dataset.r, v);
      body.querySelector('[data-v="' + t.dataset.r + '"]').textContent = FMT[t.dataset.r](v);
    }
    if (t.dataset.f && t.value.trim()) { App.set(t.dataset.f, t.value.trim()); updFound(t.dataset.f); }
    if (t.id === 'customCss') { S.customOn = true; App.set('customCSS', t.value); const tg = body.querySelector('[data-t="customOn"]'); if (tg) tg.classList.add('on'); }
  });
  body.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.t) {
      const k = t.dataset.t;
      // Turning a match off starts the override on the current app theme, so nothing jumps.
      if (k === 'edMatch' && S.edMatch) S.edTheme = S.theme;
      if (k === 'pvMatch' && S.pvMatch) S.pvTheme = S.theme;
      App.set(k, !S[k]);
      t.classList.toggle('on', !!S[k]);
      t.setAttribute('aria-checked', !!S[k]);
      if (k === 'edMatch' || k === 'pvMatch') { const y = body.scrollTop; build(); body.scrollTop = y; }
      return;
    }
    if (t.id === 'galleryBtn') Gallery.open();
    if (t.id === 'cssStarter') { const ta = $('#customCss'); ta.value = Themes.starter(S.theme, App.isDark()); S.customOn = true; App.set('customCSS', ta.value); build(); }
    if (t.id === 'cssClear') { $('#customCss').value = ''; S.customOn = false; App.set('customCSS', ''); build(); }
    if (t.id === 'soundTest') { const seq = ['key', 'key', 'key', 'space', 'key', 'key', 'back', 'key', 'enter']; seq.forEach((k, i) => setTimeout(() => Sound.play(k), i * 120)); }
    if (t.id === 'backupBtn') {
      App.flush();
      U.download('inkwyrm-backup-' + new Date().toLocaleDateString('en-CA') + '.json', JSON.stringify({ app: 'inkwyrm', v: 1, notes: App.notes, settings: S }, null, 1), 'application/json');
    }
    if (t.id === 'restoreBtn') $('#restoreFile').click();
    if (t.id === 'resetBtn') {
      const keep = { folders: S.folders, collapsed: S.collapsed, lastNote: S.lastNote };
      Object.keys(S).forEach((k) => delete S[k]);
      Object.assign(S, App.DEFAULTS, keep);
      App.save();
      App.apply();
      App.setMode(S.mode);
      build();
      U.toast('Settings reset');
    }
  });
  body.addEventListener('change', async (e) => {
    if (e.target.id !== 'restoreFile' || !e.target.files[0]) return;
    try {
      const data = JSON.parse(await e.target.files[0].text());
      let k = 0;
      for (const n of data.notes || []) {
        if (!n.id || typeof n.content !== 'string') continue;
        if (!App.byId(n.id)) App.notes.push(n);
        else Object.assign(App.byId(n.id), n);
        await Store.put(n);
        k++;
      }
      App.renderList(true);
      U.toast('Restored ' + k + ' notes');
    } catch (err) { U.toast('That file is not an Inkwyrm backup'); }
    e.target.value = '';
  });

  const Settings = (window.Settings = {});
  Settings.isOpen = () => panel.classList.contains('open');
  Settings.open = () => { build(); panel.classList.add('open'); };
  Settings.close = () => { panel.classList.remove('open'); if (App.ed && S.mode !== 'preview') App.ed.root.focus(); };
  Settings.toggle = () => (Settings.isOpen() ? Settings.close() : Settings.open());
  $('#settingsBtn').onclick = Settings.toggle;
  $('#settingsClose').onclick = Settings.close;
})();
