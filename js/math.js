/* Tiny LaTeX-to-HTML renderer for $inline$ and $$block$$ math. Covers the common subset. */
(function () {
  const esc = U.esc;
  const SYM = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ',
    iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ', sigma: 'σ', tau: 'τ',
    upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ',
    Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    infty: '∞', cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
    approx: '≈', equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', propto: '∝', to: '→', rightarrow: '→', leftarrow: '←',
    Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', iff: '⟺', implies: '⟹', leftrightarrow: '↔', mapsto: '↦',
    uparrow: '↑', downarrow: '↓', in: '∈', notin: '∉', ni: '∋', subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇',
    cup: '∪', cap: '∩', setminus: '∖', emptyset: '∅', varnothing: '∅', forall: '∀', exists: '∃', nexists: '∄', neg: '¬',
    land: '∧', lor: '∨', wedge: '∧', vee: '∨', oplus: '⊕', otimes: '⊗', partial: '∂', nabla: '∇', ldots: '…', cdots: '⋯',
    vdots: '⋮', ddots: '⋱', dots: '…', angle: '∠', perp: '⊥', parallel: '∥', circ: '∘', bullet: '•', star: '⋆', ast: '∗',
    degree: '°', prime: '′', hbar: 'ℏ', ell: 'ℓ', Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ', langle: '⟨', rangle: '⟩', lfloor: '⌊',
    rfloor: '⌋', lceil: '⌈', rceil: '⌉', vert: '|', mid: '∣', Vert: '‖', '|': '‖', '{': '{', '}': '}', '%': '%', '$': '$',
    '&': '&', '#': '#', '_': '_', ll: '≪', gg: '≫', top: '⊤', bot: '⊥', therefore: '∴', because: '∵', checkmark: '✓',
  };
  const BIG = { sum: '∑', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭', oint: '∮', bigcup: '⋃', bigcap: '⋂', bigoplus: '⨁' };
  const FUN = new Set('sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh log ln lg exp max min sup inf lim liminf limsup det dim ker deg gcd arg Pr mod'.split(' '));
  const SPACE = { ',': '&thinsp;', ':': '&#8197;', ';': '&ensp;', '!': '', quad: '&emsp;', qquad: '&emsp;&emsp;', ' ': '&nbsp;' };
  const BB = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', H: 'ℍ', E: '𝔼' };
  const ACC = { hat: '̂', bar: '̄', vec: '⃗', dot: '̇', ddot: '̈', tilde: '̃', check: '̌', acute: '́', grave: '̀' };

  function render(src, display) {
    let p = 0;
    const s = src;
    const peek = () => s[p];
    const ws = () => { while (p < s.length && /\s/.test(s[p])) p++; };

    function cmdName() {
      p++; // backslash
      if (!/[a-zA-Z]/.test(s[p] || '')) return s[p++] || '';
      const st = p;
      while (/[a-zA-Z]/.test(s[p] || '')) p++;
      return s.slice(st, p);
    }
    function arg() {
      ws();
      if (s[p] === '{') { p++; const h = seq('}'); p++; return h; }
      return atom(true);
    }
    function rawArg() {
      ws();
      if (s[p] !== '{') return s[p++] || '';
      let d = 0, st = ++p;
      while (p < s.length) { if (s[p] === '{') d++; else if (s[p] === '}') { if (!d) break; d--; } p++; }
      return s.slice(st, p++);
    }
    function optArg() {
      ws();
      if (s[p] !== '[') return null;
      p++;
      const h = seq(']');
      p++;
      return h;
    }
    function env(name) {
      const end = '\\end{' + name + '}';
      const e = s.indexOf(end, p);
      const body = s.slice(p, e < 0 ? s.length : e);
      p = e < 0 ? s.length : e + end.length;
      const rows = body.split(/\\\\/).map((r) => r.split('&').map((c) => render(c.trim(), false)));
      const cls = name === 'cases' ? 'm-cases' : 'm-mat';
      let t = '<span class="m-table"><table>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table></span>';
      const D = { pmatrix: ['(', ')'], bmatrix: ['[', ']'], vmatrix: ['|', '|'], Bmatrix: ['{', '}'], cases: ['{', ''] }[name];
      if (D) t = '<span class="m-delim m-tall">' + D[0] + '</span>' + t + (D[1] ? '<span class="m-delim m-tall">' + D[1] + '</span>' : '');
      return '<span class="' + cls + '">' + t + '</span>';
    }
    function command() {
      const name = cmdName();
      if (name in SPACE) return SPACE[name];
      if (name === '\\') return '<br>';
      if (SYM[name]) return '<span class="m-sym">' + SYM[name] + '</span>';
      if (BIG[name]) return '<span class="m-big" data-big>' + BIG[name] + '</span>';
      if (FUN.has(name)) return '<span class="m-fn"' + (name === 'lim' ? ' data-big' : '') + '>' + name + '</span>';
      switch (name) {
        case 'frac': case 'dfrac': case 'tfrac': {
          const a = arg(), b = arg();
          return '<span class="m-frac"><span class="m-num">' + a + '</span><span class="m-den">' + b + '</span></span>';
        }
        case 'binom': {
          const a = arg(), b = arg();
          return '<span class="m-delim">(</span><span class="m-frac m-binom"><span class="m-num">' + a + '</span><span class="m-den">' + b + '</span></span><span class="m-delim">)</span>';
        }
        case 'sqrt': {
          const n = optArg(), x = arg();
          return '<span class="m-sqrt">' + (n ? '<sup class="m-root">' + n + '</sup>' : '') + '<span class="m-rad">√</span><span class="m-sqc">' + x + '</span></span>';
        }
        case 'text': case 'textrm': case 'mbox': case 'textnormal': return '<span class="m-text">' + esc(rawArg()) + '</span>';
        case 'mathrm': case 'operatorname': return '<span class="m-rm">' + arg() + '</span>';
        case 'mathbf': case 'textbf': case 'boldsymbol': case 'bm': return '<b class="m-rm">' + arg() + '</b>';
        case 'mathit': case 'textit': return '<i>' + arg() + '</i>';
        case 'mathbb': return '<span class="m-rm">' + rawArg().replace(/[A-Z]/g, (c) => BB[c] || c) + '</span>';
        case 'mathcal': case 'mathscr': return '<span class="m-cal">' + arg() + '</span>';
        case 'overline': case 'bar': return '<span class="m-over">' + arg() + '</span>';
        case 'underline': return '<span class="m-under">' + arg() + '</span>';
        case 'left': case 'right': case 'big': case 'Big': case 'bigg': case 'Bigg': case 'bigl': case 'bigr': case 'Bigl': case 'Bigr': {
          ws();
          let d = s[p] === '\\' ? command() : esc(s[p++] || '');
          if (d === '.') d = '';
          return '<span class="m-delim">' + d + '</span>';
        }
        case 'begin': return env(rawArg());
        case 'end': rawArg(); return '';
        case 'displaystyle': case 'limits': case 'nolimits': return '';
        default:
          if (ACC[name]) { const x = arg(); return '<span class="m-acc">' + x + '<span class="m-accm">' + ACC[name] + '</span></span>'; }
          return '<span class="m-err">\\' + esc(name) + '</span>';
      }
    }
    function atom(single) {
      const c = s[p];
      if (c === undefined) return '';
      if (c === '{') { p++; const h = seq('}'); p++; return h; }
      if (c === '\\') return command();
      p++;
      if (/[a-zA-Z]/.test(c)) return '<i>' + c + '</i>';
      if (/[0-9.]/.test(c)) {
        let n = c;
        if (!single) while (/[0-9.]/.test(s[p] || '')) n += s[p++];
        return n;
      }
      if ('+-=<>'.includes(c)) return '<span class="m-op">' + ({ '-': '−', '<': '&lt;', '>': '&gt;' }[c] || c) + '</span>';
      if (c === ',') return ',<span class="m-thin"></span>';
      if (c === "'") return '′';
      if (c === '~') return '&nbsp;';
      if (/\s/.test(c)) return '';
      return esc(c);
    }
    function seq(end) {
      let out = '';
      while (p < s.length && s[p] !== end) {
        if (s[p] === '}' && end !== '}') { p++; continue; }
        let base = atom(false);
        let sup = null, sub = null;
        for (;;) {
          ws();
          if (s[p] === '^') { p++; sup = arg(); }
          else if (s[p] === '_') { p++; sub = arg(); }
          else break;
        }
        if (sup !== null || sub !== null) {
          if (/data-big/.test(base) && (display || /m-fn/.test(base))) {
            base = '<span class="m-limits">' + (sup !== null ? '<span class="m-lim-up">' + sup + '</span>' : '') + base + (sub !== null ? '<span class="m-lim-dn">' + sub + '</span>' : '') + '</span>';
          } else if (sup !== null && sub !== null) {
            base += '<span class="m-ss"><sup>' + sup + '</sup><sub>' + sub + '</sub></span>';
          } else base += sup !== null ? '<sup>' + sup + '</sup>' : '<sub>' + sub + '</sub>';
        }
        out += base;
      }
      return out;
    }
    try {
      const h = seq(undefined);
      return '<span class="math' + (display ? ' math-display' : '') + '">' + h + '</span>';
    } catch (e) {
      return '<code class="m-err">' + esc(src) + '</code>';
    }
  }
  window.MATH = { render };
})();
