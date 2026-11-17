/* Optional vim mode: normal / insert / visual (+ visual line). */
(function () {
  const cls = (c) => (!c || /\s/.test(c) ? 0 : /[\p{L}\p{N}_]/u.test(c) ? 1 : 2);

  class Vim {
    constructor(ed, onMode) {
      this.ed = ed;
      this.onMode = onMode;
      this.enabled = false;
      this.mode = 'normal';
      this.pending = '';
      this.count = '';
      this.reg = { text: '', line: false };
      this.goal = null;
      this.anchor = 0;
      this.block = document.createElement('div');
      this.block.className = 'vim-block';
      ed.scroller.appendChild(this.block);
      ed.on('cursor', () => this.drawBlock());
      ed.scroller.addEventListener('scroll', () => this.drawBlock(), { passive: true });
      ed.root.addEventListener('mouseup', () => {
        if (!this.enabled || this.mode === 'insert') return;
        const { s, e } = ed.sel;
        if (s !== e && this.mode === 'normal') { this.anchor = s; this.set('visual'); }
      });
    }
    setEnabled(on) {
      this.enabled = on;
      this.ed.vim = on ? this : null;
      this.set(on ? 'normal' : 'insert');
      if (!on) this.onMode(null);
    }
    blocking() { return this.enabled && this.mode !== 'insert'; }
    set(m) {
      this.mode = m;
      this.pending = '';
      this.count = '';
      this.ed.root.classList.toggle('vim-normal', this.enabled && m !== 'insert');
      this.onMode(this.enabled ? m : null);
      this.drawBlock();
    }
    drawBlock() {
      const b = this.block;
      if (!this.enabled || this.mode !== 'normal' || document.activeElement !== this.ed.root) { b.style.display = 'none'; return; }
      const ed = this.ed, c = ed.sel.s;
      let rect = ed.caretRect();
      if (!rect) { b.style.display = 'none'; return; }
      let w = 0;
      if (c < ed.text.length && ed.text[c] !== '\n') {
        const A = ed.posToDom(c), B = ed.posToDom(c + 1);
        try {
          const r = document.createRange();
          r.setStart(A[0], A[1]); r.setEnd(B[0], B[1]);
          const rr = r.getClientRects();
          if (rr.length) { const last = rr[rr.length - 1]; w = last.width; rect = last; }
        } catch (e) {}
      }
      const box = ed.scroller.getBoundingClientRect();
      b.style.display = 'block';
      b.style.left = rect.left - box.left + ed.scroller.scrollLeft + 'px';
      b.style.top = rect.top - box.top + ed.scroller.scrollTop + 'px';
      b.style.width = Math.max(w, 8) + 'px';
      b.style.height = rect.height + 'px';
    }
    /* motions */
    ls(c) { return this.ed.lineStart(c); }
    le(c) { return this.ed.lineEnd(c); }
    clampN(c) { const s = this.ls(c), e = this.le(c); return Math.max(s, Math.min(c, e - (e > s ? 1 : 0))); }
    wordFwd(c) {
      const T = this.ed.text, n = T.length, k = cls(T[c]);
      if (k) while (c < n && cls(T[c]) === k) c++;
      while (c < n && !cls(T[c])) c++;
      return Math.min(c, n);
    }
    wordBack(c) {
      const T = this.ed.text;
      if (c > 0) c--;
      while (c > 0 && !cls(T[c])) c--;
      const k = cls(T[c]);
      while (c > 0 && cls(T[c - 1]) === k) c--;
      return c;
    }
    wordEnd(c) {
      const T = this.ed.text, n = T.length;
      if (c < n - 1) c++;
      while (c < n - 1 && !cls(T[c])) c++;
      const k = cls(T[c]);
      while (c < n - 1 && cls(T[c + 1]) === k) c++;
      return c;
    }
    vert(c, d) {
      const ed = this.ed, i = ed.lineOf(c);
      if (this.goal == null) this.goal = c - ed.starts[i];
      const j = Math.max(0, Math.min(ed.lines.length - 1, i + d));
      return ed.starts[j] + Math.min(this.goal, Math.max(0, ed.lines[j].length - (this.mode === 'normal' && ed.lines[j].length ? 1 : 0)));
    }
    motion(k, c, n) {
      const ed = this.ed, T = ed.text;
      let keepGoal = false, r = null;
      for (let i = 0; i < n; i++) {
        switch (k) {
          case 'h': case 'ArrowLeft': r = Math.max(this.ls(c), c - 1); break;
          case 'l': case 'ArrowRight': r = Math.min(this.le(c), c + 1); break;
          case 'j': case 'ArrowDown': r = this.vert(c, 1); keepGoal = true; break;
          case 'k': case 'ArrowUp': r = this.vert(c, -1); keepGoal = true; break;
          case 'w': r = this.wordFwd(c); break;
          case 'b': r = this.wordBack(c); break;
          case 'e': r = this.wordEnd(c); break;
          case '0': case 'Home': r = this.ls(c); break;
          case '^': { const s = this.ls(c); r = s + T.slice(s, this.le(c)).match(/^\s*/)[0].length; break; }
          case '$': case 'End': r = Math.max(this.ls(c), this.le(c) - (this.mode === 'visual' ? 0 : 1)); break;
          case 'G': r = ed.starts[ed.lines.length - 1]; break;
          case 'gg': r = 0; break;
          default: return null;
        }
        c = r;
      }
      if (!keepGoal) this.goal = null;
      return c;
    }
    yank(text, line) {
      this.reg = { text, line };
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    }
    lineRange(c, n) {
      const ed = this.ed, i = ed.lineOf(c), j = Math.min(ed.lines.length - 1, i + n - 1);
      return [ed.starts[i], ed.starts[j] + ed.lines[j].length];
    }
    handle(e) {
      if (!this.enabled) return false;
      const ed = this.ed, k = e.key;
      if (this.mode === 'insert') {
        if (k === 'Escape' || (e.ctrlKey && k === '[')) {
          ed.readSel();
          this.set('normal');
          ed.setSel(this.clampN(Math.max(this.ls(ed.sel.s), ed.sel.s - 1)));
          return true;
        }
        return false;
      }
      if (e.metaKey || (e.altKey && k.length > 1)) return false;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(k)) return true;
      if (e.ctrlKey && k.toLowerCase() === 'r') { ed.redo(); ed.setSel(this.clampN(ed.sel.s)); return true; }
      if (e.ctrlKey && k !== '[') return false;
      ed.readSel();
      if (this.mode === 'visual' || this.mode === 'vline') return this.visualKey(e, k), true;
      this.normalKey(k);
      return true;
    }
    normalKey(k) {
      const ed = this.ed, T = ed.text, c = ed.sel.s;
      if (/^[1-9]$/.test(k) || (k === '0' && this.count)) { this.count += k; return; }
      const n = parseInt(this.count || '1', 10);
      const p = this.pending + k;
      if (p === 'g') { this.pending = 'g'; return; }
      if (['d', 'y', 'c'].includes(p) || /^[dyc]i$/.test(p)) { this.pending = p; return; }
      this.pending = '';
      this.count = '';
      const insertAt = (pos) => { this.set('insert'); ed.setSel(pos); };
      if (p.length === 1 || p === 'gg') {
        const mv = this.motion(p, c, n);
        if (mv != null) { ed.setSel(this.clampN(mv)); return; }
      }
      switch (p) {
        case 'Escape': return;
        case 'i': return insertAt(c);
        case 'a': return insertAt(Math.min(this.le(c), c + 1));
        case 'I': return insertAt(this.motion('^', c, 1));
        case 'A': return insertAt(this.le(c));
        case 'o': { const e = this.le(c); const ind = T.slice(this.ls(c), e).match(/^\s*/)[0]; ed.replace(e, e, '\n' + ind); return this.set('insert'); }
        case 'O': { const s = this.ls(c); const ind = T.slice(s, this.le(c)).match(/^\s*/)[0]; ed.replace(s, s, ind + '\n', s + ind.length); return this.set('insert'); }
        case 'x': { const e = Math.min(this.le(c), c + n); if (e > c) { this.yank(T.slice(c, e), false); ed.replace(c, e, '', c); ed.setSel(this.clampN(c)); } return; }
        case 'X': { const s = Math.max(this.ls(c), c - n); this.yank(T.slice(s, c), false); ed.replace(s, c, '', s); return; }
        case 'r': this.pending = 'r'; return;
        case 'D': { const e = this.le(c); this.yank(T.slice(c, e), false); ed.replace(c, e, '', c); ed.setSel(this.clampN(c)); return; }
        case 'C': { const e = this.le(c); this.yank(T.slice(c, e), false); ed.replace(c, e, '', c); return this.set('insert'); }
        case 'dd': case 'yy': case 'cc': {
          let [s, e] = this.lineRange(c, n);
          this.yank(T.slice(s, e) + '\n', true);
          if (p === 'yy') return;
          if (p === 'cc') { ed.replace(s, e, '', s); return this.set('insert'); }
          if (e < T.length) e++; else if (s > 0) s--;
          ed.replace(s, e, '', s);
          ed.setSel(this.clampN(Math.min(s + (s > 0 && e >= T.length ? 1 : 0), ed.text.length)));
          return;
        }
        case 'diw': case 'ciw': case 'yiw': {
          const k0 = cls(T[c]);
          let s = c, e = c;
          while (s > 0 && cls(T[s - 1]) === k0 && T[s - 1] !== '\n') s--;
          while (e < T.length && cls(T[e]) === k0 && T[e] !== '\n') e++;
          this.yank(T.slice(s, e), false);
          if (p === 'yiw') return;
          ed.replace(s, e, '', s);
          return p === 'ciw' ? this.set('insert') : ed.setSel(this.clampN(s));
        }
        case 'dw': case 'cw': case 'yw': case 'de': case 'ce': case 'd$': case 'c$': case 'db': case 'cb': case 'yb': case 'y$': {
          const m = p[1];
          let t = this.motion(m, c, n);
          if (m === 'e' || m === '$') t = m === '$' ? this.le(c) : t + 1;
          if (p === 'cw') t = Math.min(t, this.motion('e', c, n) + 1);
          const s = Math.min(c, t), e = Math.max(c, t);
          this.yank(T.slice(s, e), false);
          if (p[0] === 'y') return;
          ed.replace(s, e, '', s);
          return p[0] === 'c' ? this.set('insert') : ed.setSel(this.clampN(s));
        }
        case 'p': case 'P': {
          const r = this.reg;
          if (!r.text) return;
          if (r.line) {
            const body = r.text.replace(/\n$/, '');
            if (p === 'p') { const e = this.le(c); ed.replace(e, e, '\n' + body, e + 1); }
            else { const s = this.ls(c); ed.replace(s, s, body + '\n', s); }
          } else {
            const at = p === 'p' ? Math.min(this.le(c), c + 1) : c;
            ed.replace(at, at, r.text, at + r.text.length - 1);
          }
          ed.setSel(this.clampN(ed.sel.s));
          return;
        }
        case 'u': ed.undo(); ed.setSel(this.clampN(ed.sel.s)); return;
        case 'v': this.anchor = c; this.cur = c; this.set('visual'); ed.setSel(c, Math.min(c + 1, this.le(c))); return;
        case 'V': this.anchor = c; this.cur = c; this.set('vline'); { const [s, e] = this.lineRange(c, 1); ed.setSel(s, e); } return;
        case 'J': { const e = this.le(c); if (e < T.length) { const nx = T.slice(e + 1).match(/^\s*/)[0].length; ed.replace(e, e + 1 + nx, ' ', e); } return; }
        case '~': { const ch = T[c]; if (ch && ch !== '\n') { ed.replace(c, c + 1, ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase(), c + 1); ed.setSel(this.clampN(c + 1)); } return; }
        default:
          if (p.length === 2 && p[0] === 'r' && k.length === 1) { if (T[c] && T[c] !== '\n') { ed.replace(c, c + 1, k, c); } return; }
      }
    }
    visualKey(e, k) {
      const ed = this.ed, T = ed.text;
      if (k === 'Escape' || (e.ctrlKey && k === '[')) { const c = this.cur ?? ed.sel.s; this.set('normal'); ed.setSel(this.clampN(c)); this.cur = null; return; }
      const line = this.mode === 'vline';
      let s = ed.sel.s, en = ed.sel.e;
      if (/^[1-9]$/.test(k)) { this.count += k; return; }
      if (k === 'g' && !this.pending) { this.pending = 'g'; return; }
      const key = this.pending === 'g' && k === 'g' ? 'gg' : k;
      this.pending = '';
      const n = parseInt(this.count || '1', 10);
      this.count = '';
      const cur = this.cur ?? (ed.back ? s : Math.max(s, en - 1));
      const mv = this.motion(key, cur, n);
      if (mv != null) {
        this.cur = mv;
        const a = Math.min(this.anchor, mv), b = Math.max(this.anchor, mv);
        if (line) ed.setSel(this.ls(a), this.le(b));
        else ed.setSel(a, Math.min(T.length, b + 1));
        return;
      }
      if (k === 'v' || k === 'V') { if ((k === 'V') === line) { this.set('normal'); ed.setSel(this.clampN(s)); } else { this.set(k === 'V' ? 'vline' : 'visual'); } return; }
      if (k === 'o') { const a = this.anchor; this.anchor = cur; this.cur = a; return; }
      const sel = T.slice(s, en);
      if (k === 'y') { this.yank(sel + (line ? '\n' : ''), line); this.set('normal'); this.cur = null; ed.setSel(this.clampN(s)); return; }
      if (k === 'd' || k === 'x' || k === 'c') {
        this.yank(sel + (line ? '\n' : ''), line);
        let a = s, b = en;
        if (line && k !== 'c') { if (b < T.length) b++; else if (a > 0) a--; }
        ed.replace(a, b, '', a);
        this.cur = null;
        if (k === 'c') { this.set('insert'); return; }
        this.set('normal');
        ed.setSel(this.clampN(Math.min(a, ed.text.length)));
        return;
      }
      if (k === '>' || k === '<') { ed.indent(k === '<'); return; }
      if (k === '~') { ed.replace(s, en, sel.replace(/./g, (ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())), s, en); }
    }
  }
  window.Vim = Vim;
})();
