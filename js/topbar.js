/* Auto-hiding frosted top bar. Slides down when the pointer nears the top edge (or on ⌘.), stays while hovered,
   focused, or while something it opened is still open, then slides away about a second after the pointer leaves. */
(function () {
  const App = window.App, S = App.S, b = document.body;
  const bar = document.getElementById('topbar'), main = document.getElementById('main');
  const ZONE = 40;
  let hideT = 0, inZone = false;

  const held = () => bar.matches(':hover') || !!bar.querySelector(':focus-visible') || inZone ||
    (window.Palette && Palette.isOpen()) || (window.Menu && Menu.isOpen()) || (window.Settings && Settings.isOpen()) || (window.Gallery && Gallery.isOpen());
  const show = () => { clearTimeout(hideT); hideT = 0; b.classList.add('tb-show'); };
  const hideSoon = (ms) => {
    clearTimeout(hideT);
    hideT = setTimeout(function check() {
      if (held()) { hideT = setTimeout(check, 300); return; }
      b.classList.remove('tb-show');
      hideT = 0;
    }, ms == null ? 1000 : ms);
  };

  document.addEventListener('mousemove', (e) => {
    const r = main.getBoundingClientRect();
    const near = e.clientY <= r.top + ZONE && e.clientX >= r.left && e.clientX <= r.right;
    if (near) { inZone = true; show(); }
    else if (inZone) { inZone = false; if (!bar.matches(':hover')) hideSoon(); }
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { if (inZone) { inZone = false; hideSoon(); } });
  bar.addEventListener('mouseenter', show);
  bar.addEventListener('mouseleave', () => hideSoon());
  bar.addEventListener('focusin', show);
  bar.addEventListener('focusout', () => hideSoon());
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t && t.clientY <= main.getBoundingClientRect().top + ZONE) { show(); hideSoon(2500); }
  }, { passive: true });

  window.Topbar = {
    show,
    flash() { if (b.classList.contains('tb-pinned') && !S.focus) return; show(); hideSoon(1400); },
    togglePinned() {
      App.set('topbar', S.topbar === 'pinned' ? 'auto' : 'pinned');
      show();
      if (S.topbar !== 'pinned') hideSoon(1400);
      U.toast(S.topbar === 'pinned' ? 'Top bar pinned' : 'Top bar hides until you move to the top edge', null, null, 1800);
    },
  };
})();
