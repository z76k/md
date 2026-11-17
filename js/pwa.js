/* Offline + install support. Does nothing when opened from a local file. */
(function () {
  const hosted = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // Home-screen icon for iOS: render the SVG icon to a PNG at runtime (iOS ignores SVG touch icons).
  if (hosted) {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 180;
        c.getContext('2d').drawImage(img, 0, 0, 180, 180);
        const link = document.querySelector('link[rel="apple-touch-icon"]');
        if (link) link.href = c.toDataURL('image/png');
      } catch (e) {}
    };
    img.src = 'icons/icon-maskable.svg';
  }

  if (!hosted || !('serviceWorker' in navigator)) return;
  const banner = document.getElementById('updateBanner');
  const show = (worker) => {
    banner.classList.add('show');
    document.getElementById('updateBtn').onclick = () => {
      if (window.App && App.flush) App.flush();
      worker.postMessage({ type: 'SKIP_WAITING' });
    };
    document.getElementById('updateDismiss').onclick = () => banner.classList.remove('show');
  };
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(w); });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch (e) {}
  });
})();
