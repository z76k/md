/* The editing engine: a model-driven contenteditable. Every edit goes through the model, then lines are re-rendered
   with a prefix/suffix diff so only changed lines touch the DOM. */
(function () {
  const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
  const LIST = /^(\s*)([-*+]|(\d{1,9})([.)]))(\s+)(\[[ xX]\]\s+)?/;
  const isW = (c) => /[\p{L}\p{N}_]/u.test(c || '');

  class Editor {
    constructor(root, scroller) {
      this.root = root;
      this.scroller = scroller;
      root.contentEditable = 'true';
      root.spellcheck = false;
      root.setAttribute('autocapitalize', 'off');
      root.setAttribute('autocorrect', 'off');
      root.classList.add('ed');
      this.text = '';
      this.lines = [''];
      this.els = [];
      this.keys = [];
      this.starts = [0];
      this.sel = { s: 0, e: 0 };
      this.back = false;
      this.undoStack = [];
      this.redoStack = [];
      this.lastType = null;
      this.lastTime = 0;
      this.activeEls = [];
      this.fpEls = [];
      this.autoPair = true;
      this.typewriter = false;
      this.focusScope = null;
      this.readOnly = false;
      this.vim = null;
      this.ev = {};
      this._bind();
      this.render();
    }
    on(n, f) { (this.ev[n] = this.ev[n] || []).push(f); }
    emit(n, a) { (this.ev[n] || []).forEach((f) => f(a)); }

    /* ---------- rendering ---------- */
    render(force) {
      const lines = this.text.split('\n');
      const res = MDL.render(lines);
      const keys = res.map((r) => r.cls + '\u0002' + r.html);
      const ol = force ? 0 : this.keys.length, nl = keys.length;
      if (force) { this.els.forEach((el) => el.remove()); this.els = []; this.keys = []; }
      let p = 0;
      while (p < ol && p < nl && this.keys[p] === keys[p]) p++;
      let s = 0;
      while (s < ol - p && s < nl - p && this.keys[ol - 1 - s] === keys[nl - 1 - s]) s++;
      const removed = this.els.splice(p, ol - s - p);
      for (const el of removed) el.remove();
      const ref = this.els[p] || null;
      const frag = document.createDocumentFragment();
      const added = [];
      for (let k = p; k < nl - s; k++) {
        const d = document.createElement('div');
        d.className = 'line ' + res[k].cls;
        d.innerHTML = res[k].html || '<br>';
        added.push(d);
        frag.appendChild(d);
      }
      this.root.insertBefore(frag, ref);
      if (added.length < 20000) this.els.splice(p, 0, ...added);
      else this.els = this.els.slice(0, p).concat(added, this.els.slice(p));
      for (let k = p; k < this.els.length; k++) this.els[k]._i = k;
      this.keys = keys;
      this.lines = lines;
      const st = new Array(lines.length);
      let o = 0;
      for (let k = 0; k < lines.length; k++) { st[k] = o; o += lines[k].length + 1; }
      this.starts = st;
      this.activeEls = this.activeEls.filter((el) => el.isConnected);
      this.fpEls = this.fpEls.filter((el) => el.isConnected);
      this.emit('render');
    }
    lineOf(off) {
      const st = this.starts;
      let lo = 0, hi = st.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (st[mid] <= off) lo = mid; else hi = mid - 1; }
      return lo;
    }
    lineStart(off) { return this.starts[this.lineOf(off)]; }
    lineEnd(off) { const i = this.lineOf(off); return this.starts[i] + this.lines[i].length; }

    /* ---------- DOM <-> offsets ---------- */
    _texts(el) {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('.w') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
      const out = [];
      let n;
      while ((n = w.nextNode())) out.push(n);
      return out;
    }
    domToPos(node, offset) {
      if (node === this.root) {
        if (offset >= this.els.length) return this.text.length;
        return this.starts[offset] || 0;
      }
      const el = (node.nodeType === 1 ? node : node.parentElement).closest('.line');
      if (!el || el.parentNode !== this.root) return null;
      const r = document.createRange();
      r.setStart(el, 0);
      try { r.setEnd(node, offset); } catch (e) { return this.starts[el._i]; }
      const f = r.cloneContents();
      f.querySelectorAll('.w').forEach((w) => w.remove());
      return this.starts[el._i] + Math.min(f.textContent.length, this.lines[el._i].length);
    }
    posToDom(off) {
      const i = this.lineOf(off), el = this.els[i];
      let col = off - this.starts[i];
      const ts = this._texts(el);
      for (const t of ts) {
        if (col <= t.length) {
          if (col === t.length && t !== ts[ts.length - 1] && t.parentElement.closest('.mk')) { col -= t.length; continue; }
          return [t, col];
        }
        col -= t.length;
      }
      if (ts.length) { const t = ts[ts.length - 1]; return [t, t.length]; }
      return [el, 0];
    }
    readSel() {
      const ds = window.getSelection();
      if (!ds.rangeCount || !this.root.contains(ds.anchorNode)) return false;
      const a = this.domToPos(ds.anchorNode, ds.anchorOffset), f = this.domToPos(ds.focusNode, ds.focusOffset);
      if (a == null || f == null) return false;
      this.sel = { s: Math.min(a, f), e: Math.max(a, f) };
      this.back = f < a;
      return true;
    }
    applySel() {
      const ds = window.getSelection();
      const { s, e } = this.sel;
      const A = this.posToDom(this.back ? e : s), F = this.posToDom(this.back ? s : e);
      try { ds.setBaseAndExtent(A[0], A[1], F[0], F[1]); } catch (err) {}
    }
    setSel(s, e, back) {
      const n = this.text.length;
      this.sel = { s: U.clamp(Math.min(s, e ?? s), 0, n), e: U.clamp(Math.max(s, e ?? s), 0, n) };
      this.back = !!back;
      this.updateActive();
      this.applySel();
      this.scrollCaret();
    }

    /* ---------- active line(s) + focus dimming ---------- */
    updateActive() {
      const a = this.lineOf(this.sel.s), b = this.lineOf(this.sel.e);
      const want = this.els.slice(a, b + 1);
      for (const el of this.activeEls) if (!want.includes(el)) el.classList.remove('active');
      for (const el of want) el.classList.add('active');
      this.activeEls = want;
      if (this.focusScope) this._focus(a);
      this.emit('cursor');
    }
    _focus(a) {
      let p0 = a, p1 = a;
      if (this.focusScope !== 'line') {
        while (p0 > 0 && this.lines[p0 - 1].trim()) p0--;
        while (p1 < this.lines.length - 1 && this.lines[p1 + 1].trim()) p1++;
      }
      const want = this.els.slice(p0, p1 + 1);
      for (const el of this.fpEls) if (!want.includes(el)) el.classList.remove('fp');
      for (const el of want) el.classList.add('fp');
      this.fpEls = want;
      if (!window.CSS || !CSS.highlights) return;
      if (this.focusScope !== 'sentence') { CSS.highlights.delete('focus-dim'); return; }
      const ps = this.starts[p0], pe = this.starts[p1] + this.lines[p1].length;
      const T = this.text, c = this.sel.s;
      let ss = c;
      while (ss > ps && !/[.!?…]\s/.test(T.slice(ss - 2, ss))) ss--;
      let se = c;
      while (se < pe && !/[.!?…]/.test(T[se])) se++;
      if (se < pe) se++;
      const hl = new Highlight();
      const mkR = (x, y) => {
        if (y <= x) return;
        const A = this.posToDom(x), B = this.posToDom(y), r = new Range();
        try { r.setStart(A[0], A[1]); r.setEnd(B[0], B[1]); hl.add(r); } catch (e) {}
      };
      mkR(ps, ss);
      mkR(se, pe);
      CSS.highlights.set('focus-dim', hl);
    }
    clearFocus() {
      this.fpEls.forEach((el) => el.classList.remove('fp'));
      this.fpEls = [];
      if (window.CSS && CSS.highlights) CSS.highlights.delete('focus-dim');
    }

    caretRect() {
      const [n, o] = this.posToDom(this.sel.e);
      const r = document.createRange();
      try { r.setStart(n, o); r.collapse(true); } catch (e) { return null; }
      let rect = r.getClientRects()[0];
      if (!rect || (!rect.height && !rect.top)) rect = (n.nodeType === 1 ? n : n.parentElement).getBoundingClientRect();
      return rect;
    }
    scrollCaret(smooth) {
      const sc = this.scroller;
      if (!sc) return;
      const rect = this.caretRect();
      if (!rect) return;
      const box = sc.getBoundingClientRect();
      if (this.typewriter) {
        const target = sc.scrollTop + (rect.top - box.top) - box.height / 2 + rect.height / 2;
        sc.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'auto' });
      } else {
        const m = 80;
        if (rect.bottom > box.bottom - m) sc.scrollTop += rect.bottom - box.bottom + m;
        else if (rect.top < box.top + m) sc.scrollTop -= box.top + m - rect.top;
      }
    }

    /* ---------- model edits ---------- */
    _hist(type) {
      const now = Date.now();
      const merge = type === 'type' && this.lastType === 'type' && now - this.lastTime < 1200;
      if (!merge) {
        this.undoStack.push({ text: this.text, sel: { ...this.sel } });
        if (this.undoStack.length > 400) this.undoStack.shift();
      }
      this.redoStack = [];
      this.lastType = type;
      this.lastTime = now;
    }
    commit(text, s, e, type) {
      if (this.readOnly) return;
      this._hist(type || 'other');
      this.text = text;
      this._refresh(s, e ?? s);
      this.emit('change');
    }
    replace(from, to, ins, s, e, type) {
      const T = this.text;
      const caret = s ?? from + ins.length;
      this.commit(T.slice(0, from) + ins + T.slice(to), caret, e ?? caret, type);
    }
    _refresh(s, e) {
      this.render();
      this.sel = { s: U.clamp(s, 0, this.text.length), e: U.clamp(e, 0, this.text.length) };
      this.back = false;
      this.updateActive();
      if (document.activeElement === this.root) this.applySel();
      if (!this.keepScroll) this.scrollCaret();
    }
    undo() {
      if (!this.undoStack.length) return;
      this.redoStack.push({ text: this.text, sel: { ...this.sel } });
      const st = this.undoStack.pop();
      this.text = st.text;
      this.lastType = null;
      this._refresh(st.sel.s, st.sel.e);
      this.emit('change');
    }
    redo() {
      if (!this.redoStack.length) return;
      this.undoStack.push({ text: this.text, sel: { ...this.sel } });
      const st = this.redoStack.pop();
      this.text = st.text;
      this.lastType = null;
      this._refresh(st.sel.s, st.sel.e);
      this.emit('change');
    }
    setValue(text, caret) {
      this.text = text.replace(/\r\n?/g, '\n');
      this.undoStack = [];
      this.redoStack = [];
      this.lastType = null;
      this.render(true);
      const c = U.clamp(caret || 0, 0, this.text.length);
      this.sel = { s: c, e: c };
      this.updateActive();
      if (document.activeElement === this.root) this.applySel();
    }
    get value() { return this.text; }
    insert(str, selectInner) {
      const { s, e } = this.sel;
      const c = s + str.length;
      this.replace(s, e, str, selectInner ? s + selectInner[0] : c, selectInner ? s + selectInner[1] : c);
    }
    selectedText() { return this.text.slice(this.sel.s, this.sel.e); }

    typeText(ch) {
      const { s, e } = this.sel, T = this.text, prev = T[s - 1], next = T[e];
      const brk = /\s/.test(ch) ? 'break' : 'type';
      if (this.autoPair && ch.length === 1) {
        if (s !== e && '([{"\'`*_~='.includes(ch)) {
          const close = PAIRS[ch] || ch;
          return this.replace(s, e, ch + T.slice(s, e) + close, s + 1, e + 1);
        }
        if (s === e) {
          if (')]}"\'`*'.includes(ch) && next === ch && !(ch === '`' && prev === '`')) return this.setSel(s + 1);
          if (ch === '`' && prev === '`' && next === '`') return this.replace(s, e, '``', s + 1, s + 1, 'type');
          if (ch === '*' && prev === '*' && next !== '*' && T[s - 2] !== '*' && /(^|\s)$/.test(T.slice(this.lineStart(s), s - 1)))
            return this.replace(s, e, '***', s + 1, s + 1, 'type');
          if (PAIRS[ch]) {
            const quote = '"\'`'.includes(ch);
            const blocked = (quote && (isW(prev) || isW(next))) || (!quote && isW(next));
            if (!blocked) return this.replace(s, e, ch + PAIRS[ch], s + 1, s + 1, 'type');
          }
        }
      }
      this.replace(s, e, ch, undefined, undefined, brk);
    }
    enter() {
      const { s, e } = this.sel, T = this.text;
      const ls = this.lineStart(s), le = this.lineEnd(s), line = T.slice(ls, le), before = T.slice(ls, s);
      if (s !== e) return this.replace(s, e, '\n', undefined, undefined, 'enter');
      let m = line.match(/^(\s*)(`{3,}|~{3,})([\w+#.-]*)(\2)$/);
      if (m && s === le - m[4].length) {
        const ins = m[1] + m[2] + m[3] + '\n' + m[1] + '\n' + m[1] + m[2];
        return this.replace(ls, le, ins, ls + m[1].length * 2 + m[2].length + m[3].length + 1);
      }
      const inCode = /l-code|l-fence-start/.test(this.keys[this.lineOf(s)] || '');
      if (!inCode && (m = line.match(LIST)) && before.length >= m[0].length) {
        if (!line.slice(m[0].length).trim()) {
          if (m[1].length) return this.replace(ls, ls + Math.min(2, m[1].length), '', s - Math.min(2, m[1].length));
          return this.replace(ls, le, '', ls);
        }
        const marker = m[3] ? +m[3] + 1 + m[4] : m[2];
        const ins = '\n' + m[1] + marker + m[5] + (m[6] ? '[ ] ' : '');
        return this.replace(s, s, ins, undefined, undefined, 'enter');
      }
      if (!inCode && (m = line.match(/^(\s*>\s?)+/))) {
        if (!line.slice(m[0].length).trim() && !/\[!/.test(line)) return this.replace(ls, le, '', ls);
        const pre = m[0].replace(/\s*$/, ' ');
        return this.replace(s, s, '\n' + pre, undefined, undefined, 'enter');
      }
      const ind = before.match(/^[ \t]*/)[0];
      this.replace(s, s, '\n' + ind, undefined, undefined, 'enter');
    }
    backspace() {
      const { s, e } = this.sel, T = this.text;
      if (s !== e) return this.replace(s, e, '', s, s, 'del');
      if (s === 0) return;
      const ls = this.lineStart(s), before = T.slice(ls, s);
      const m = before.match(LIST);
      if (m && m[0].length === before.length && !/l-code/.test(this.keys[this.lineOf(s)] || '')) return this.replace(ls + m[1].length, s, '', ls + m[1].length, undefined, 'del');
      if (PAIRS[T[s - 1]] && PAIRS[T[s - 1]] === T[s]) return this.replace(s - 1, s + 1, '', s - 1, undefined, 'del');
      const n = /[\uDC00-\uDFFF]/.test(T[s - 1]) && s > 1 ? 2 : 1;
      this.replace(s - n, s, '', s - n, undefined, 'del');
    }
    del() {
      const { s, e } = this.sel;
      if (s !== e) return this.replace(s, e, '', s, s, 'del');
      const n = /[\uD800-\uDBFF]/.test(this.text[s]) ? 2 : 1;
      this.replace(s, s + n, '', s, undefined, 'del');
    }
    deleteWord(dir) {
      const { s, e } = this.sel, T = this.text;
      if (s !== e) return this.replace(s, e, '', s);
      if (dir < 0) {
        let i = s;
        while (i > 0 && /\s/.test(T[i - 1]) && T[i - 1] !== '\n') i--;
        if (i === s && T[i - 1] === '\n') i--;
        else if (isW(T[i - 1])) while (i > 0 && isW(T[i - 1])) i--;
        else if (i === s) i--;
        this.replace(i, s, '', i);
      } else {
        let i = s;
        while (i < T.length && /[ \t]/.test(T[i])) i++;
        if (isW(T[i])) while (i < T.length && isW(T[i])) i++;
        else if (i === s) i++;
        this.replace(s, i, '', s);
      }
    }
    indent(out) {
      const { s, e } = this.sel, T = this.text;
      const a = this.lineOf(s), b = this.lineOf(e);
      const isList = LIST.test(this.lines[a]);
      if (!out && a === b && !isList && s === e) return this.replace(s, e, /l-code/.test(this.keys[a]) ? '    ' : '  ');
      const unit = /l-code/.test(this.keys[a]) ? '    ' : '  ';
      let ns = s, ne = e;
      const lines = this.lines.slice();
      for (let k = a; k <= b; k++) {
        if (out) {
          const lead = lines[k].match(/^( {1,4}|\t)?/)[0];
          const cut = Math.min(lead.length, unit.length);
          lines[k] = lines[k].slice(cut);
          if (k === a) ns = Math.max(this.starts[a], ns - cut);
          ne -= cut;
        } else {
          lines[k] = unit + lines[k];
          if (k === a) ns += unit.length;
          ne += unit.length;
        }
      }
      this.commit(lines.join('\n'), ns, Math.max(ns, ne));
    }
    wrap(mark) {
      const { s, e } = this.sel, T = this.text, L = mark.length;
      if (T.slice(s - L, s) === mark && T.slice(e, e + L) === mark) return this.replace(s - L, e + L, T.slice(s, e), s - L, e - L);
      if (s === e) {
        let a = s, b = s;
        while (a > 0 && isW(T[a - 1])) a--;
        while (b < T.length && isW(T[b])) b++;
        if (a !== b) return this.replace(a, b, mark + T.slice(a, b) + mark, s + L);
        return this.replace(s, e, mark + mark, s + L);
      }
      this.replace(s, e, mark + T.slice(s, e) + mark, s + L, e + L);
    }
    toggleTask(lineIdx) {
      const l = this.lines[lineIdx], m = l.match(/^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/);
      if (!m) return;
      const p = this.starts[lineIdx] + m[1].length + 1;
      const keep = this.sel;
      // Ticking a box is not navigation: never scroll the editor to the caret for it.
      this.keepScroll = true;
      try { this.replace(p, p + 1, m[2] === ' ' ? 'x' : ' ', keep.s, keep.e); } finally { this.keepScroll = false; }
      const cb = this.els[lineIdx] && this.els[lineIdx].querySelector('.cb-w.on');
      if (cb) cb.classList.add('pop');
    }

    /* ---------- events ---------- */
    _bind() {
      const R = this.root;
      R.addEventListener('keydown', (e) => this._keydown(e));
      R.addEventListener('beforeinput', (e) => this._beforeinput(e));
      R.addEventListener('compositionstart', () => { this.composing = true; });
      R.addEventListener('compositionend', () => { this.composing = false; this._resync(); });
      R.addEventListener('paste', (e) => {
        e.preventDefault();
        if (this.readOnly || (this.vim && this.vim.blocking())) return;
        this.readSel();
        const txt = (e.clipboardData.getData('text/plain') || '').replace(/\r\n?/g, '\n');
        if (!txt) return;
        const { s, e: en } = this.sel;
        if (s !== en && /^(https?:\/\/|mailto:)\S+$/.test(txt.trim()) && !this.text.slice(s, en).includes('\n')) {
          const ins = '[' + this.text.slice(s, en) + '](' + txt.trim() + ')';
          return this.replace(s, en, ins);
        }
        this.replace(s, en, txt);
      });
      const copy = (e, cut) => {
        this.readSel();
        if (this.sel.s === this.sel.e) return;
        e.preventDefault();
        e.clipboardData.setData('text/plain', this.selectedText());
        if (cut && !this.readOnly) this.replace(this.sel.s, this.sel.e, '');
      };
      R.addEventListener('copy', (e) => copy(e, false));
      R.addEventListener('cut', (e) => copy(e, true));
      R.addEventListener('mousedown', (e) => {
        const cb = e.target.closest('.cb-w');
        if (cb) { e.preventDefault(); this.toggleTask(cb.closest('.line')._i); return; }
        const w = e.target.closest('.wl, .lnk, .url');
        if (w && (e.metaKey || e.ctrlKey)) { e.preventDefault(); this.emit('link', w); }
      });
      document.addEventListener('selectionchange', () => {
        if (document.activeElement !== R || this.composing) return;
        if (this.readSel()) this.updateActive();
      });
      R.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) return; // handled by the app
      });
    }
    _resync() {
      const parts = Array.from(this.root.children).filter((c) => c.classList.contains('line'));
      const txt = parts.map((el) => this._texts(el).map((t) => t.data).join('')).join('\n');
      if (txt === this.text) return;
      this._hist('other');
      this.text = txt;
      this.readSel();
      const s = this.sel.s, e = this.sel.e;
      this.render(true);
      this.sel = { s, e };
      this.updateActive();
      this.applySel();
      this.emit('change');
    }
    _keydown(e) {
      if (this.composing || e.isComposing) return;
      this.emit('key', e);
      if (this.vim && this.vim.handle(e)) { e.preventDefault(); return; }
      const mod = e.metaKey || e.ctrlKey, k = e.key;
      if (mod && !e.altKey) {
        const kl = k.toLowerCase();
        if (kl === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
        if (kl === 'y' && !U.isMac) { e.preventDefault(); this.redo(); return; }
        if (kl === 'b') { e.preventDefault(); this.readSel(); this.wrap('**'); return; }
        if (kl === 'i') { e.preventDefault(); this.readSel(); this.wrap('*'); return; }
        if (kl === 'e' && e.shiftKey) { e.preventDefault(); this.readSel(); this.wrap('`'); return; }
        if (kl === 'h' && e.shiftKey) { e.preventDefault(); this.readSel(); this.wrap('=='); return; }
      }
      if (this.readOnly) return;
      if (k === 'Enter' && !mod) { e.preventDefault(); this.readSel(); e.shiftKey ? this.replace(this.sel.s, this.sel.e, '\n') : this.enter(); return; }
      if (k === 'Tab' && !mod && !e.altKey) { e.preventDefault(); this.readSel(); this.indent(e.shiftKey); return; }
    }
    _beforeinput(e) {
      const t = e.inputType;
      if (t === 'insertCompositionText' && !(this.vim && this.vim.blocking())) return;
      e.preventDefault();
      if (this.readOnly || (this.vim && this.vim.blocking())) return;
      this.readSel();
      const range = () => {
        const r = e.getTargetRanges && e.getTargetRanges()[0];
        if (!r) return null;
        return [this.domToPos(r.startContainer, r.startOffset), this.domToPos(r.endContainer, r.endOffset)];
      };
      switch (t) {
        case 'insertText': if (e.data) this.typeText(e.data); break;
        case 'insertReplacementText': {
          const txt = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || e.data || '';
          const r = range();
          if (r && r[0] != null) this.replace(r[0], r[1], txt);
          break;
        }
        case 'insertParagraph': case 'insertLineBreak': this.enter(); break;
        case 'deleteContentBackward': this.backspace(); break;
        case 'deleteContentForward': this.del(); break;
        case 'deleteWordBackward': this.deleteWord(-1); break;
        case 'deleteWordForward': this.deleteWord(1); break;
        case 'deleteSoftLineBackward': case 'deleteHardLineBackward': {
          const { s, e: en } = this.sel;
          const ls = this.lineStart(s);
          this.replace(s === en && s === ls ? Math.max(0, s - 1) : ls, en, '');
          break;
        }
        case 'deleteSoftLineForward': case 'deleteHardLineForward': this.replace(this.sel.s, Math.max(this.sel.e, this.lineEnd(this.sel.s)), ''); break;
        case 'historyUndo': this.undo(); break;
        case 'historyRedo': this.redo(); break;
        case 'formatBold': this.wrap('**'); break;
        case 'formatItalic': this.wrap('*'); break;
        case 'insertFromDrop': {
          const txt = e.dataTransfer && e.dataTransfer.getData('text/plain');
          const r = range();
          if (txt) { if (r && r[0] != null) this.replace(r[0], r[0], txt); else this.insert(txt); }
          break;
        }
        default: break;
      }
    }

    /* ---------- scrolling helpers for split-view sync ---------- */
    topLine() {
      const top = this.scroller.getBoundingClientRect().top;
      let lo = 0, hi = this.els.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (this.els[mid].getBoundingClientRect().bottom < top) lo = mid + 1; else hi = mid;
      }
      const el = this.els[lo];
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return lo + U.clamp((top - r.top) / Math.max(1, r.height), 0, 1);
    }
    scrollToLine(f) {
      const i = Math.floor(f), el = this.els[U.clamp(i, 0, this.els.length - 1)];
      if (!el) return;
      const sc = this.scroller, r = el.getBoundingClientRect(), box = sc.getBoundingClientRect();
      sc.scrollTop += r.top - box.top + (f - i) * r.height;
    }
  }
  window.Editor = Editor;
})();
