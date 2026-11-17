/* Markdown parser: GFM + Obsidian extras (callouts, ==highlights==, [[wikilinks]], math, footnotes). */
(function () {
  const esc = U.esc;
  const RE = {
    fence: /^(\s{0,3})(`{3,}|~{3,})\s*([^\s`]*)\s*(.*)$/,
    heading: /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/,
    hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
    quote: /^ {0,3}> ?/,
    list: /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)(.*)$/,
    tableSep: /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,
    fnDef: /^\[\^([^\]]+)\]:\s?(.*)$/,
    math: /^\s*\$\$/,
  };
  const CALLOUT = {
    note: ['note', '✎'], todo: ['note', '☐'], abstract: ['info', '≡'], summary: ['info', '≡'], tldr: ['info', '≡'],
    info: ['info', 'ℹ'], tip: ['tip', '✦'], hint: ['tip', '✦'], important: ['tip', '✦'], success: ['tip', '✓'],
    check: ['tip', '✓'], done: ['tip', '✓'], question: ['question', '?'], help: ['question', '?'], faq: ['question', '?'],
    warning: ['warning', '⚠'], caution: ['warning', '⚠'], attention: ['warning', '⚠'], failure: ['danger', '✕'],
    fail: ['danger', '✕'], missing: ['danger', '✕'], danger: ['danger', 'ϟ'], error: ['danger', 'ϟ'], bug: ['danger', '✱'],
    example: ['example', '❖'], quote: ['quote', '❝'], cite: ['quote', '❝'],
  };
  const indent = (t) => { const m = t.match(/^[ \t]*/)[0]; return m.replace(/\t/g, '    ').length; };
  const isStart = (t) => (RE.heading.test(t) && /^ {0,3}#/.test(t)) || RE.fence.test(t) || RE.quote.test(t) || RE.hr.test(t) || RE.list.test(t) || RE.math.test(t) || RE.fnDef.test(t);

  function safeUrl(u) {
    u = (u || '').trim();
    if (/^\s*(javascript|vbscript|file):/i.test(u) || (/^data:/i.test(u) && !/^data:image\//i.test(u))) return '#';
    return u;
  }

  /* ---------- inline ---------- */
  function inline(src, ctx) {
    const stash = [];
    const put = (h) => '\u0000' + (stash.push(h) - 1) + '\u0000';
    let s = src;
    s = s.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (m, t, c) => put('<code>' + esc(c.replace(/^ (.+) $/, '$1')) + '</code>'));
    s = s.replace(/\$\$([^$]+?)\$\$/g, (m, t) => put(MATH.render(t, true)));
    s = s.replace(/(^|[^\\$\w])\$(?=\S)([^$\n]*?\S)\$(?![\d$])/g, (m, pre, t) => pre + put(MATH.render(t, false)));
    s = s.replace(/\\([\\`*_{}[\]()#+\-.!|~=<>$])/g, (m, c) => put(esc(c)));
    s = s.replace(/<(https?:\/\/[^\s>]+)>/g, (m, u) => put('<a href="' + esc(safeUrl(u)) + '" target="_blank" rel="noopener">' + esc(u) + '</a>'));
    s = s.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)/g, (m, alt, u, title) =>
      put('<img src="' + esc(safeUrl(u)) + '" alt="' + esc(alt) + '"' + (title ? ' title="' + esc(title) + '"' : '') + ' loading="lazy">'));
    s = s.replace(/\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (m, name, hash, alias) => {
      name = name.trim();
      const ok = !ctx.opts.noteExists || ctx.opts.noteExists(name);
      return put('<a class="wikilink' + (ok ? '' : ' missing') + '" href="#" data-note="' + esc(name) + '">' + esc(alias || name + (hash || '')) + '</a>');
    });
    s = s.replace(/\[\^([^\]]+)\]/g, (m, id) => {
      if (!ctx.fn[id]) return m;
      let k = ctx.fnOrder.indexOf(id);
      if (k < 0) k = ctx.fnOrder.push(id) - 1;
      return put('<sup class="fn-ref"><a href="#fn-' + esc(U.slug(id)) + '" id="fnref-' + esc(U.slug(id)) + '">' + (k + 1) + '</a></sup>');
    });
    s = s.replace(/\[([^\]]*)\]\(\s*<?([^)\s>]*)>?(?:\s+"([^"]*)")?\s*\)/g, (m, text, u, title) =>
      put('<a href="' + esc(safeUrl(u)) + '"' + (title ? ' title="' + esc(title) + '"' : '') + (/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : '') + '>' + inline(text, ctx) + '</a>'));
    s = esc(s);
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, (m, pre, u) => pre + put('<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>'));
    s = s.replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
      .replace(/\*(?=[^\s*])([\s\S]*?[^\s*])\*/g, '<em>$1</em>')
      .replace(/(^|[^\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
      .replace(/==(?=\S)([\s\S]*?\S)==/g, '<mark>$1</mark>')
      .replace(/(^|\s)#([\p{L}_][\p{L}\p{N}_/-]*)/gu, '$1<span class="tag">#$2</span>')
      .replace(/( {2,}|\\)?\n/g, '<br>\n');
    let guard = 0;
    while (s.indexOf('\u0000') >= 0 && guard++ < 6) s = s.replace(/\u0000(\d+)\u0000/g, (m, k) => stash[k]);
    return s;
  }

  /* ---------- blocks ---------- */
  function cells(row) {
    let r = row.trim();
    if (r.startsWith('|')) r = r.slice(1);
    if (r.endsWith('|') && !r.endsWith('\\|')) r = r.slice(0, -1);
    const out = [];
    let cur = '', code = false;
    for (let i = 0; i < r.length; i++) {
      const c = r[i];
      if (c === '`') code = !code;
      if (c === '\\' && r[i + 1] === '|') { cur += '|'; i++; continue; }
      if (c === '|' && !code) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  }

  function blocks(L, ctx) {
    let out = '', i = 0;
    const dl = (n) => ' data-line="' + n + '"';
    while (i < L.length) {
      const { t, n } = L[i];
      if (!t.trim()) { i++; continue; }
      let m;
      if ((m = t.match(RE.fence))) {
        const fch = m[2][0], flen = m[2].length, lang = m[3];
        const body = [];
        i++;
        while (i < L.length && !new RegExp('^\\s{0,3}\\' + fch + '{' + flen + ',}\\s*$').test(L[i].t)) body.push(L[i++].t);
        i++;
        const code = body.join('\n');
        const hl = lang && HL.supported(lang) ? HL.block(lang, code) : esc(code);
        out += '<div class="codeblock"' + dl(n) + '><div class="code-head"><span>' + esc(lang || 'text') + '</span><button class="copy-code" type="button">Copy</button></div><pre><code' + (lang ? ' class="lang-' + esc(lang) + '"' : '') + '>' + hl + '</code></pre></div>';
        continue;
      }
      if (RE.math.test(t)) {
        const one = t.trim().match(/^\$\$(.+)\$\$$/);
        let tex;
        if (one) { tex = one[1]; i++; }
        else {
          const body = [t.replace(/^\s*\$\$/, '')];
          i++;
          while (i < L.length && !/\$\$\s*$/.test(L[i].t)) body.push(L[i++].t);
          if (i < L.length) body.push(L[i++].t.replace(/\$\$\s*$/, ''));
          tex = body.join(' ');
        }
        out += '<div class="math-block"' + dl(n) + '>' + MATH.render(tex, true) + '</div>';
        continue;
      }
      if ((m = t.match(RE.heading)) && /^ {0,3}#/.test(t)) {
        const lvl = m[1].length, txt = m[2] || '';
        let id = U.slug(txt) || 'h';
        while (ctx.ids[id]) id += '-' + ctx.ids[id]++;
        ctx.ids[id] = 1;
        out += '<h' + lvl + ' id="' + esc(id) + '"' + dl(n) + '>' + inline(txt, ctx) + '</h' + lvl + '>';
        i++;
        continue;
      }
      if (RE.hr.test(t)) { out += '<hr' + dl(n) + '>'; i++; continue; }
      if (t.includes('|') && i + 1 < L.length && RE.tableSep.test(L[i + 1].t) && L[i + 1].t.includes('-')) {
        const head = cells(t);
        const al = cells(L[i + 1].t).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : /^:-+/.test(c) ? 'left' : ''));
        const st = (k) => (al[k] ? ' style="text-align:' + al[k] + '"' : '');
        let h = '<div class="table-wrap"' + dl(n) + '><table><thead><tr>' + head.map((c, k) => '<th' + st(k) + '>' + inline(c, ctx) + '</th>').join('') + '</tr></thead><tbody>';
        i += 2;
        while (i < L.length && L[i].t.includes('|') && L[i].t.trim()) {
          const r = cells(L[i].t);
          h += '<tr' + dl(L[i].n) + '>' + head.map((x, k) => '<td' + st(k) + '>' + inline(r[k] || '', ctx) + '</td>').join('') + '</tr>';
          i++;
        }
        out += h + '</tbody></table></div>';
        continue;
      }
      if (RE.quote.test(t)) {
        const body = [];
        while (i < L.length && RE.quote.test(L[i].t)) { body.push({ t: L[i].t.replace(RE.quote, ''), n: L[i].n }); i++; }
        const cm = body[0].t.match(/^\[!(\w+)\]([+-]?)\s*(.*)$/);
        if (cm) {
          const type = cm[1].toLowerCase(), [cls, icon] = CALLOUT[type] || ['note', '✎'];
          const title = cm[3] || type[0].toUpperCase() + type.slice(1);
          const inner = blocks(body.slice(1), ctx);
          const head = '<span class="callout-icon">' + icon + '</span><span class="callout-title">' + inline(title, ctx) + '</span>';
          if (cm[2]) out += '<details class="callout c-' + cls + '"' + (cm[2] === '+' ? ' open' : '') + dl(n) + '><summary>' + head + '<span class="callout-fold">›</span></summary><div class="callout-body">' + inner + '</div></details>';
          else out += '<div class="callout c-' + cls + '"' + dl(n) + '><div class="callout-head">' + head + '</div>' + (inner ? '<div class="callout-body">' + inner + '</div>' : '') + '</div>';
        } else out += '<blockquote' + dl(n) + '>' + blocks(body, ctx) + '</blockquote>';
        continue;
      }
      if ((m = t.match(RE.fnDef))) {
        const body = [m[2]];
        i++;
        while (i < L.length && (indent(L[i].t) >= 2 && L[i].t.trim())) body.push(L[i++].t.trim());
        ctx.fn[m[1]] = body.join('\n');
        continue;
      }
      if (RE.list.test(t)) { const r = list(L, i, ctx); out += r.html; i = r.i; continue; }
      // paragraph (with setext headings)
      const para = [t];
      i++;
      let setext = 0;
      while (i < L.length && L[i].t.trim()) {
        const x = L[i].t;
        if (/^ {0,3}=+\s*$/.test(x)) { setext = 1; i++; break; }
        if (/^ {0,3}-+\s*$/.test(x) && !RE.list.test(x)) { setext = 2; i++; break; }
        if (isStart(x) || (x.includes('|') && i + 1 < L.length && RE.tableSep.test(L[i + 1].t))) break;
        para.push(x.replace(/^\s+/, ''));
        i++;
      }
      const txt = para.join('\n');
      if (setext) out += '<h' + setext + ' id="' + esc(U.slug(txt)) + '"' + dl(n) + '>' + inline(txt, ctx) + '</h' + setext + '>';
      else out += '<p' + dl(n) + '>' + inline(txt, ctx) + '</p>';
    }
    return out;
  }

  function list(L, i, ctx) {
    const m0 = L[i].t.match(RE.list);
    const base = indent(m0[1]), ordered = /\d/.test(m0[2]), start = parseInt(m0[2], 10);
    const items = [];
    let loose = false;
    while (i < L.length) {
      const m = L[i].t.match(RE.list);
      if (!m || indent(m[1]) < base || indent(m[1]) > base + 1 || /\d/.test(m[2]) !== ordered) break;
      const ci = m[1].length + m[2].length + Math.max(1, Math.min(4, m[3].length || 1));
      const first = L[i];
      const body = [{ t: m[4], n: first.n }];
      i++;
      let blank = false;
      while (i < L.length) {
        const t = L[i].t;
        if (!t.trim()) {
          let j = i + 1;
          while (j < L.length && !L[j].t.trim()) j++;
          if (j < L.length && indent(L[j].t) >= ci) { for (; i < j; i++) body.push({ t: '', n: L[i].n }); blank = true; continue; }
          const mm = j < L.length && L[j].t.match(RE.list);
          if (mm && indent(mm[1]) === base && /\d/.test(mm[2]) === ordered) { loose = true; i = j; }
          break;
        }
        const ind = indent(t);
        if (ind > base) { body.push({ t: t.replace(/^\t/, '    ').slice(Math.min(ind, ci)), n: L[i].n }); i++; continue; }
        if (isStart(t) || blank) break;
        body.push({ t: t.trim(), n: L[i].n });
        i++;
      }
      items.push({ body, n: first.n, blank });
      if (i < L.length && !L[i].t.trim()) break;
    }
    let h = ordered ? '<ol' + (start !== 1 ? ' start="' + start + '"' : '') + '>' : '<ul>';
    for (const it of items) {
      let task = it.body[0].t.match(/^\[([ xX])\](?:\s+|$)(.*)$/);
      if (task) it.body[0] = { t: task[2], n: it.n };
      let inner = blocks(it.body, ctx);
      if (!loose && !it.blank) inner = inner.replace(/<p data-line="\d+">([\s\S]*?)<\/p>/, '$1');
      if (task) {
        const on = task[1] !== ' ';
        h += '<li class="task' + (on ? ' done' : '') + '" data-line="' + it.n + '"><input type="checkbox" class="task-box" data-ln="' + it.n + '"' + (on ? ' checked' : '') + '><div class="task-body">' + inner + '</div></li>';
      } else h += '<li data-line="' + it.n + '">' + inner + '</li>';
    }
    h += ordered ? '</ol>' : '</ul>';
    return { html: h, i };
  }

  function render(src, opts) {
    opts = opts || {};
    const ctx = { fn: {}, fnOrder: [], ids: {}, opts };
    let lines = src.replace(/\r\n?/g, '\n').split('\n').map((t, n) => ({ t, n }));
    let front = '';
    if (lines.length && lines[0].t === '---') {
      let e = 1;
      while (e < lines.length && e < 60 && lines[e].t !== '---') e++;
      if (e < lines.length && lines[e].t === '---' && lines.slice(1, e).every((l) => /^[\w-]+:|^\s+|^\s*-|^$/.test(l.t))) {
        front = '<div class="frontmatter" data-line="0"><pre><code>' + HL.block('yaml', lines.slice(1, e).map((l) => l.t).join('\n')) + '</code></pre></div>';
        lines = lines.slice(e + 1);
      }
    }
    // pre-scan footnote definitions so refs resolve anywhere
    for (const l of lines) { const m = l.t.match(RE.fnDef); if (m) ctx.fn[m[1]] = ctx.fn[m[1]] || m[2]; }
    let html = front + blocks(lines, ctx);
    if (ctx.fnOrder.length) {
      html += '<section class="footnotes"><hr><ol>' + ctx.fnOrder.map((id) => {
        const s = U.slug(id);
        return '<li id="fn-' + esc(s) + '">' + inline(ctx.fn[id], ctx) + ' <a href="#fnref-' + esc(s) + '" class="fn-back">↩</a></li>';
      }).join('') + '</ol></section>';
    }
    return html;
  }

  function title(src) {
    const lines = src.split('\n');
    for (const l of lines) {
      const t = l.trim();
      if (!t || t === '---') continue;
      return t.replace(/^#+\s*/, '').replace(/[*_`~=[\]]/g, '').replace(/\(.*?\)/g, '').slice(0, 80).trim() || 'Untitled';
    }
    return 'Untitled';
  }

  window.MD = { render, inline: (s) => inline(s, { fn: {}, fnOrder: [], ids: {}, opts: {} }), title, CALLOUT };
})();
