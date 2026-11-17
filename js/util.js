/* Shared helpers */
(function () {
  const U = (window.U = {});
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.debounce = (fn, ms) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.slug = (s) => String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
  U.isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  U.mod = U.isMac ? '⌘' : 'Ctrl+';
  U.kbd = (s) => s.replace(/Mod\+?/g, U.mod).replace(/Shift\+?/g, U.isMac ? '⇧' : 'Shift+').replace(/Alt\+?/g, U.isMac ? '⌥' : 'Alt+');

  U.fmtDate = (t) => {
    const d = new Date(t), now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (diff < 86400 * 6) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  };

  U.download = (name, text, type) => {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* base64url + deflate compression for share links */
  const b64 = (bytes) => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64 = (str) => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  const pipe = async (bytes, stream) => {
    const s = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(s).arrayBuffer());
  };
  U.compress = async (str) => {
    const bytes = new TextEncoder().encode(str);
    if (window.CompressionStream) {
      try { return 'z' + b64(await pipe(bytes, new CompressionStream('deflate-raw'))); } catch (e) {}
    }
    return 'u' + b64(bytes);
  };
  U.decompress = async (str) => {
    const kind = str[0], bytes = unb64(str.slice(1));
    if (kind === 'z') return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
    return new TextDecoder().decode(bytes);
  };

  /* Fuzzy match: returns {score, idx} or null. Rewards consecutive and word-start hits. */
  U.fuzzy = (q, text) => {
    if (!q) return { score: 0, idx: [] };
    const t = text.toLowerCase(), ql = q.toLowerCase();
    let ti = 0, score = 0, prev = -2;
    const idx = [];
    for (let qi = 0; qi < ql.length; qi++) {
      const c = ql[qi];
      if (c === ' ') continue;
      const f = t.indexOf(c, ti);
      if (f < 0) return null;
      let s = 1;
      if (f === prev + 1) s += 4;
      if (f === 0 || /[\s\-_/.:]/.test(t[f - 1])) s += 3;
      score += s - Math.min(3, (f - ti) * 0.05);
      idx.push(f);
      prev = f;
      ti = f + 1;
    }
    if (t.startsWith(ql)) score += 6;
    return { score: score - t.length * 0.01, idx };
  };
  U.markFuzzy = (text, idx) => {
    if (!idx || !idx.length) return U.esc(text);
    const set = new Set(idx);
    let out = '';
    for (let i = 0; i < text.length; i++) out += set.has(i) ? '<b>' + U.esc(text[i]) + '</b>' : U.esc(text[i]);
    return out;
  };

  U.countWords = (s) => {
    const m = s.replace(/```[\s\S]*?```/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu);
    return m ? m.length : 0;
  };

  U.toast = (msg, action, actionLabel, ms = 4200) => {
    const host = document.getElementById('toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>' + U.esc(msg) + '</span>';
    if (action) {
      const b = document.createElement('button');
      b.textContent = actionLabel || 'Undo';
      b.onclick = () => { action(); close(); };
      el.appendChild(b);
    }
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
    setTimeout(close, ms);
  };
})();
