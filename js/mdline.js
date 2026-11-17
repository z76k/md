/* Editor-side line highlighter. Invariant: the text content of every rendered line (ignoring .w widgets)
   equals the source line exactly, so caret offsets map 1:1. */
(function () {
  const esc = U.esc;
  const mk = (s, c) => (s ? '<span class="mk' + (c ? ' ' + c : '') + '">' + esc(s) + '</span>' : '');
  const W = (cls, inner) => '<span class="w ' + cls + '" contenteditable="false">' + inner + '</span>';

  const INL = new RegExp([
    '(?<code>(?<bt>`+)(?<ct>[^`]|[^`][^]*?[^`])\\k<bt>(?!`))',
    '(?<math>\\$(?=[^\\s$])(?<mt>[^$]*?[^\\s$])\\$(?![\\d$]))',
    '(?<img>!\\[(?<ia>[^\\]]*)\\]\\((?<iu>[^)]*)\\))',
    '(?<wl>\\[\\[(?<wt>[^\\]]+)\\]\\])',
    '(?<fn>\\[\\^(?<ft>[^\\]]+)\\])',
    '(?<lnk>\\[(?<lt>[^\\]]*)\\]\\((?<lu>[^)]*)\\))',
    '(?<em>(?<ed>\\*\\*\\*|\\*\\*|\\*|___|__|_)(?=\\S)(?<et>.*?[^\\s\\\\])\\k<ed>)',
    '(?<del>~~(?=\\S)(?<dt>.*?\\S)~~)',
    '(?<hl>==(?=\\S)(?<ht>.*?\\S)==)',
    '(?<url>https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?\'"])',
    '(?<tag>(?<![\\p{L}\\p{N}_&#])#[\\p{L}_][\\p{L}\\p{N}_/-]*)',
    '(?<esc>\\\\[\\\\`*_{}\\[\\]()#+\\-.!|~=$<>])',
  ].join('|'), 'gu');

  function safe(u) { return /^\s*(javascript|vbscript|data:(?!image\/))/i.test(u) ? '' : u; }

  function inl(s) {
    let out = '', last = 0, m;
    const re = new RegExp(INL.source, 'gu');
    while ((m = re.exec(s))) {
      const g = m.groups, i = m.index;
      if (g.em && g.ed[0] === '_') {
        const before = s[i - 1] || '', after = s[i + m[0].length] || '';
        if (/[\p{L}\p{N}]/u.test(before) || /[\p{L}\p{N}]/u.test(after)) { re.lastIndex = i + 1; continue; }
      }
      out += esc(s.slice(last, i));
      last = i + m[0].length;
      if (g.code) out += '<span class="c">' + mk(g.bt) + esc(g.ct) + mk(g.bt) + '</span>';
      else if (g.math) out += '<span class="mth"><span class="msrc">' + esc(m[0]) + '</span>' + W('math-w', MATH.render(g.mt, false)) + '</span>';
      else if (g.img) {
        const src = safe(g.iu.trim().split(/\s+/)[0]);
        out += '<span class="imgs">' + mk('![') + esc(g.ia) + mk('](' + g.iu + ')') + '</span>' + (src ? W('img-w', '<img src="' + esc(src) + '" alt="">') : '');
      } else if (g.wl) {
        const p = g.wt.indexOf('|');
        out += '<span class="wl" data-note="' + esc((p < 0 ? g.wt : g.wt.slice(0, p)).split('#')[0].trim()) + '">' + (p < 0 ? mk('[[') + esc(g.wt) : mk('[[' + g.wt.slice(0, p + 1)) + esc(g.wt.slice(p + 1))) + mk(']]') + '</span>';
      } else if (g.fn) out += '<span class="fnr">' + esc(m[0]) + '</span>';
      else if (g.lnk) out += '<span class="lnk" data-href="' + esc(safe(g.lu)) + '">' + mk('[') + '<span class="lt">' + inl(g.lt) + '</span>' + mk('](') + mk(g.lu, 'url') + mk(')') + '</span>';
      else if (g.em) {
        const cls = g.ed.length === 3 ? 'b i' : g.ed.length === 2 ? 'b' : 'i';
        out += '<span class="' + cls + '">' + mk(g.ed) + inl(g.et) + mk(g.ed) + '</span>';
      } else if (g.del) out += '<span class="s">' + mk('~~') + inl(g.dt) + mk('~~') + '</span>';
      else if (g.hl) out += '<span class="hl">' + mk('==') + inl(g.ht) + mk('==') + '</span>';
      else if (g.url) out += '<span class="url">' + esc(m[0]) + '</span>';
      else if (g.tag) out += '<span class="tag">' + esc(m[0]) + '</span>';
      else if (g.esc) out += mk('\\') + esc(m[0].slice(1));
    }
    return out + esc(s.slice(last));
  }

  const CO = (type) => (MD.CALLOUT[type.toLowerCase()] || ['note', '✎']);

  function mdLine(t, co, head) {
    let m;
    if ((m = t.match(/^( {0,3})(#{1,6})(\s+|$)(.*)$/))) {
      const n = m[2].length;
      return ['l-h l-h' + n, mk(m[1] + m[2] + m[3], 'hm') + '<span class="h">' + inl(m[4]) + '</span>'];
    }
    if (/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(t)) return ['l-hr', mk(t, 'hrm')];
    if ((m = t.match(/^(\s*>\s?)+/))) {
      const pre = m[0], rest = t.slice(pre.length);
      if (co) {
        const [cls, icon] = CO(co);
        if (head) {
          const h = rest.match(/^(\[!\w+\][+-]?)(\s*)(.*)$/);
          if (h) return ['l-callout l-co-head c-' + cls, mk(pre, 'qm') + W('co-icon', icon) + mk(h[1] + h[2], 'co-tag') + '<span class="co-title">' + (h[3] ? inl(h[3]) : '') + '</span>' + (h[3] ? '' : W('co-def', co[0].toUpperCase() + co.slice(1)))];
        }
        return ['l-callout c-' + cls, mk(pre, 'qm') + body(rest)];
      }
      return ['l-quote', mk(pre, 'qm') + body(rest)];
    }
    return body(t, true);
  }
  // list / table / footnote / plain
  function body(t, top) {
    let m, cls = '';
    if ((m = t.match(/^(\s*)([-*+]|\d{1,9}[.)])(\s+)(\[[ xX]\]\s|\[[ xX]\]$)?/))) {
      const done = m[4] && !/\[ \]/.test(m[4]);
      const bullet = /\d/.test(m[2]) ? 'ol' : 'ul';
      let h = esc(m[1]) + '<span class="lm ' + bullet + '" data-depth="' + Math.min(3, Math.floor(m[1].length / 2)) + '">' + esc(m[2]) + '</span>' + esc(m[3]);
      if (m[4]) h += W('cb-w' + (done ? ' on' : ''), '') + mk(m[4], 'tk');
      h += inl(t.slice(m[0].length));
      cls = 'l-li' + (m[4] ? ' l-task' : '') + (done ? ' l-done' : '');
      return top ? [cls, h] : h;
    }
    if ((m = t.match(/^(\[\^[^\]]+\]:)(.*)$/))) { const h = '<span class="fnr">' + esc(m[1]) + '</span>' + inl(m[2]); return top ? ['l-fn', h] : h; }
    if (/^\s*\|.*\|\s*$/.test(t) || /^\s*\|?\s*:?-{2,}:?\s*\|/.test(t)) {
      const h = /^\s*\|?[\s:|-]+$/.test(t) ? mk(t, 'tsep') : t.split(/(\|)/).map((p) => (p === '|' ? mk('|', 'pipe') : inl(p))).join('');
      return top ? ['l-table', h] : h;
    }
    const h = inl(t);
    return top ? ['', h] : h;
  }

  const cache = new Map();
  const memo = (key, fn) => {
    let v = cache.get(key);
    if (!v) { v = fn(); if (cache.size > 30000) cache.clear(); cache.set(key, v); }
    return v;
  };

  /* Returns [{cls, html}] for each line. */
  function render(lines) {
    const out = new Array(lines.length);
    let fence = null, cst = {}, math = false, co = null, inQ = false;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i];
      if (fence) {
        if (fence.re.test(t)) { out[i] = { cls: 'l-fence l-fence-end', html: mk(t, 'fm') }; fence = null; continue; }
        const lang = fence.lang, sIn = cst;
        const r = memo('c' + lang + '\u0001' + JSON.stringify(sIn) + '\u0001' + t, () => {
          const x = lang && HL.supported(lang) ? HL.line(lang, t, sIn) : [esc(t), {}];
          return { cls: 'l-code', html: x[0], st: x[1] };
        });
        cst = r.st;
        out[i] = r;
        continue;
      }
      if (math) {
        if (/\$\$\s*$/.test(t)) math = false;
        out[i] = { cls: 'l-math' + (math ? '' : ' l-math-end'), html: '<span class="mx">' + esc(t) + '</span>' };
        continue;
      }
      let m = t.match(/^(\s{0,3})(`{3,}|~{3,})(\s*)([^\s`]*)(.*)$/);
      if (m) {
        fence = { lang: m[4], re: new RegExp('^\\s{0,3}\\' + m[2][0] + '{' + m[2].length + ',}\\s*$') };
        cst = {};
        out[i] = { cls: 'l-fence l-fence-start', html: mk(m[1] + m[2] + m[3], 'fm') + '<span class="fl">' + esc(m[4]) + '</span>' + mk(m[5], 'fm') };
        co = null; inQ = false;
        continue;
      }
      if (/^\s*\$\$/.test(t)) {
        const one = /^\s*\$\$.+\$\$\s*$/.test(t);
        math = !one;
        out[i] = { cls: 'l-math l-math-start' + (one ? ' l-math-end' : ''), html: '<span class="mx">' + esc(t) + '</span>' };
        continue;
      }
      let head = false;
      if (/^\s*>/.test(t)) {
        if (!inQ) {
          inQ = true;
          const h = t.match(/^(\s*>\s?)+\[!(\w+)\]/);
          co = h ? h[2] : null;
          head = !!h;
        }
      } else { inQ = false; co = null; }
      out[i] = memo('m' + (co || '') + (head ? '!' : '') + '\u0001' + t, () => {
        const r = mdLine(t, co, head);
        return { cls: r[0], html: r[1] };
      });
    }
    return out;
  }

  window.MDL = { render, inline: inl };
})();
