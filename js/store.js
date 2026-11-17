/* Local persistence: notes in IndexedDB (localStorage fallback), settings in localStorage. */
(function () {
  const DB = 'neon-notes', STORE = 'notes';
  let dbp = null;
  const open = () => {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no idb'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  };
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
      const out = fn(st);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  };
  const LS = 'neon-notes-fallback';
  const lsAll = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { return []; } };
  const lsSave = (arr) => localStorage.setItem(LS, JSON.stringify(arr));
  let fallback = false;

  window.Store = {
    async all() {
      try { return await tx('readonly', (st) => st.getAll()); } catch (e) { fallback = true; return lsAll(); }
    },
    async put(note) {
      if (fallback) { const a = lsAll().filter((n) => n.id !== note.id); a.push(note); lsSave(a); return; }
      try { await tx('readwrite', (st) => st.put(note)); } catch (e) { fallback = true; return this.put(note); }
    },
    async del(id) {
      if (fallback) { lsSave(lsAll().filter((n) => n.id !== id)); return; }
      await tx('readwrite', (st) => st.delete(id));
    },
  };

  const SKEY = 'neon-settings';
  window.Prefs = {
    load(defaults) {
      try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch (e) { return Object.assign({}, defaults); }
    },
    save(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} },
  };
})();

/* Typewriter sounds synthesized with Web Audio. */
(function () {
  let ctx = null, master = null, noise = null;
  const init = () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 0.25;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  };
  const rnd = (a) => 1 + (Math.random() * 2 - 1) * a;
  function click(t, { freq, q, dur, gain, thunk, thunkF }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = rnd(0.12);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * rnd(0.15);
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain * rnd(0.2), t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur * rnd(0.2));
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
    if (thunk) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(thunkF * rnd(0.08), t);
      o.frequency.exponentialRampToValueAtTime(thunkF * 0.45, t + 0.06);
      og.gain.setValueAtTime(thunk * rnd(0.2), t);
      og.gain.exponentialRampToValueAtTime(0.0005, t + 0.08);
      o.connect(og).connect(master);
      o.start(t);
      o.stop(t + 0.1);
    }
  }
  const SOUNDS = {
    key: { freq: 3200, q: 1.6, dur: 0.045, gain: 0.55, thunk: 0.12, thunkF: 180 },
    space: { freq: 1500, q: 1.1, dur: 0.08, gain: 0.6, thunk: 0.28, thunkF: 120 },
    back: { freq: 2400, q: 2.2, dur: 0.05, gain: 0.45, thunk: 0.08, thunkF: 240 },
  };
  window.Sound = {
    volume: 0.5,
    play(kind) {
      try { init(); } catch (e) { return; }
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.value = this.volume;
      const t = ctx.currentTime + 0.002;
      if (kind === 'enter') {
        click(t, { freq: 2600, q: 1.4, dur: 0.05, gain: 0.6, thunk: 0.3, thunkF: 140 });
        // carriage-return bell-ish ping
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 1780 * rnd(0.02);
        g.gain.setValueAtTime(0.0001, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g).connect(master);
        o.start(t + 0.05);
        o.stop(t + 0.65);
        click(t + 0.09, { freq: 900, q: 0.8, dur: 0.12, gain: 0.35, thunk: 0.18, thunkF: 90 });
        return;
      }
      click(t, SOUNDS[kind] || SOUNDS.key);
    },
  };
})();
