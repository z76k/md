/* Theme gallery: every theme as a dark + light card with its 4 main colours and a mini editor/preview sample. */
(function () {
  const { $, esc } = U;
  const App = window.App, S = App.S;
  const ov = $('#themeGallery'), grid = $('#tgGrid');
  let target = 'both';

  const sp = (c, t, extra) => '<span style="color:' + c + (extra ? ';' + extra : '') + '">' + esc(t) + '</span>';
  function card(id, t, dark) {
    const p = Themes.palette(id, dark), sw = Themes.swatches(id, dark), mk = p.mk || p.faint;
    const cur = target === 'editor' ? App.edThemeId() : target === 'preview' ? App.pvThemeId() : S.theme;
    const on = App.isDark() === dark && cur === id;
    return '<button class="tg-card' + (on ? ' on' : '') + '" data-id="' + id + '" data-dark="' + (dark ? 1 : 0) + '" style="background:' + p.bg + ';color:' + p.fg + ';--tg-acc:' + p.accent + '" title="Apply ' + esc(t.name) + ' (' + (dark ? 'dark' : 'light') + ')">' +
      '<div class="tg-top"><span class="tg-name">' + esc(t.name) + '</span><span class="tg-mode" style="background:' + (p.ppanel || p.panel) + '">' + (dark ? 'dark' : 'light') + '</span></div>' +
      '<div class="tg-sw">' + sw.map((c) => '<i style="background:' + c + '"></i>').join('') + '</div>' +
      '<div class="tg-mini">' +
        '<div class="tg-ed">' +
          '<div>' + sp(mk, '# ') + sp(p.h1, 'Heading', 'font-weight:700') + '</div>' +
          '<div>' + sp(mk, '**') + sp(p.bold, 'bold', 'font-weight:700') + sp(mk, '**') + ' ' + sp(mk, '[') + sp(p.link, 'link') + sp(mk, '](…)') + '</div>' +
          '<div>' + sp(p.list, '- ') + sp(p.italic, '*soft*') + ' ' + sp(p.code, '`code`') + '</div>' +
          '<div>' + sp(p.kw, 'const ') + sp(p.fn, 'glow') + sp(p.op, ' = ') + sp(p.str, '"neon"') + '</div>' +
        '</div>' +
        '<div class="tg-pv" style="background:' + Themes.previewBg(id, dark) + '">' +
          '<div class="tg-ph" style="color:' + p.h1 + '">Heading</div>' +
          '<div>Text with <b>bold</b> and <u style="color:' + p.link + '">a link</u>.</div>' +
          '<div class="tg-code" style="background:' + (p.pcodebg || p.codebg) + '">' + sp(p.kw, 'fn ') + sp(p.num, '42') + '</div>' +
        '</div>' +
      '</div></button>';
  }
  function render() {
    const groups = [['Inkwyrm', (t) => !t.group], ['Markon presets', (t) => t.group === 'markon']];
    grid.innerHTML = groups.map(([label, f]) => '<div class="tg-sec">' + label + '</div>' +
      Object.entries(Themes.list).filter(([, t]) => f(t)).map(([id, t]) => '<div class="tg-group">' + card(id, t, true) + card(id, t, false) + '</div>').join('')).join('');
    ov.querySelectorAll('#tgTarget button').forEach((b) => b.classList.toggle('on', b.dataset.t === target));
  }
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.tg-card');
    if (!c) return;
    const id = c.dataset.id, dark = c.dataset.dark === '1';
    // "Whole app" sets the one app theme and puts both panes back on it; the pane targets are overrides.
    if (target === 'both') { S.theme = id; S.edMatch = S.pvMatch = true; }
    else if (target === 'editor') { S.edTheme = id; S.edMatch = false; }
    else { S.pvTheme = id; S.pvMatch = false; }
    S.appearance = dark ? 'dark' : 'light';
    App.save();
    App.apply('theme');
    render();
    U.toast((target === 'both' ? 'Theme' : target === 'editor' ? 'Editor override' : 'Preview override') + ': ' + Themes.list[id].name + (dark ? ' dark' : ' light'), null, null, 1800);
  });
  ov.querySelector('#tgTarget').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) { target = b.dataset.t; render(); }
  });
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) G.close(); });
  $('#tgClose').onclick = () => G.close();

  const G = (window.Gallery = {});
  G.isOpen = () => ov.classList.contains('open');
  G.open = () => { render(); ov.classList.add('open'); setTimeout(() => { const on = grid.querySelector('.tg-card.on'); (on || grid.querySelector('.tg-card')).focus({ preventScroll: true }); if (on) on.scrollIntoView({ block: 'center' }); }, 30); };
  G.close = () => { ov.classList.remove('open'); if (App.ed && S.mode !== 'preview' && !Settings.isOpen()) App.ed.root.focus(); };
})();
