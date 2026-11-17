/* Code syntax highlighter: line-by-line with carried state so the editor and preview share it. */
(function () {
  const esc = U.esc;
  const set = (s) => new Set(s.split(' '));
  const span = (c, s) => (s ? '<span class="t-' + c + '">' + esc(s) + '</span>' : '');

  const L = {
    js: {
      kw: set('var let const function return if else for while do switch case break continue new delete typeof instanceof in of class extends super this import export from default try catch finally throw async await yield static get set void with debugger as'),
      lit: set('true false null undefined NaN Infinity'),
      types: set('Array Object String Number Boolean Promise Map Set Date RegExp Error Math JSON Symbol console window document'),
      lc: ['//'], bc: ['/*', '*/'], str: '"\'', ms: ['`'], caps: true,
    },
    py: {
      kw: set('def return if elif else for while break continue pass class import from as try except finally raise with lambda yield global nonlocal assert del in is not and or async await match case'),
      lit: set('True False None self cls'),
      types: set('int str float list dict set tuple bool bytes object print len range open type super isinstance enumerate zip map filter'),
      lc: ['#'], str: '"\'', ms: ['"""', "'''"], deco: true, caps: true,
    },
    rust: {
      kw: set('fn let mut const static if else match for while loop break continue return struct enum impl trait pub use mod crate super self Self where as in ref move async await dyn type unsafe extern'),
      lit: set('true false None Some Ok Err'),
      types: set('i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box Rc Arc HashMap'),
      lc: ['//'], bc: ['/*', '*/'], str: '"', caps: true, macro: true,
    },
    go: {
      kw: set('package import func return if else for range switch case default break continue go defer select chan map struct interface type var const fallthrough goto'),
      lit: set('true false nil iota'),
      types: set('int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 string bool byte rune error any make len cap append new panic'),
      lc: ['//'], bc: ['/*', '*/'], str: '"\'', ms: ['`'], caps: true,
    },
    c: {
      kw: set('if else for while do switch case default break continue return goto struct union enum typedef sizeof static extern const volatile register inline auto signed unsigned #include #define #ifdef #ifndef #endif #if #else #pragma class public private protected namespace template new delete virtual override using'),
      lit: set('true false NULL nullptr'),
      types: set('int char float double void long short bool size_t uint8_t uint32_t int32_t int64_t FILE std string vector'),
      lc: ['//'], bc: ['/*', '*/'], str: '"\'', caps: true, pre: true,
    },
    java: {
      kw: set('public private protected class interface extends implements static final abstract void return if else for while do switch case default break continue new try catch finally throw throws import package this super instanceof synchronized volatile transient enum record var'),
      lit: set('true false null'),
      types: set('int long short byte char float double boolean String Integer List Map ArrayList HashMap Object System'),
      lc: ['//'], bc: ['/*', '*/'], str: '"\'', deco: true, caps: true,
    },
    lua: {
      kw: set('local function return if then elseif else end for while do repeat until break in and or not goto'),
      lit: set('true false nil self'),
      types: set('print pairs ipairs table string math require type tostring tonumber setmetatable'),
      lc: ['--'], bc: ['--[[', ']]'], str: '"\'', ms: ['[['],
    },
    sql: {
      kw: set('select from where and or not insert into values update set delete create table drop alter add index view join left right inner outer full on as group by order having limit offset distinct union all case when then else end exists in is like between primary key foreign references default null unique with returning asc desc count sum avg min max'),
      lit: set('true false'),
      types: set('int integer bigint varchar text boolean date timestamp serial float numeric char json jsonb'),
      lc: ['--'], bc: ['/*', '*/'], str: '\'"', ci: true,
    },
    bash: {
      kw: set('if then else elif fi for in do done while until case esac function return local export source alias unset readonly shift exit'),
      lit: set('true false'),
      types: set('echo cd ls cat grep sed awk mkdir rm cp mv chmod sudo git npm brew curl printf read test'),
      lc: ['#'], str: '"\'', vars: true, flags: true,
    },
  };
  L.ts = Object.assign({}, L.js, {
    kw: new Set([...L.js.kw, ...'interface type enum implements private public protected readonly declare namespace keyof infer is abstract satisfies'.split(' ')]),
    types: new Set([...L.js.types, ...'string number boolean any unknown never void object Record Partial Readonly'.split(' ')]),
  });

  const ALIAS = {
    javascript: 'js', jsx: 'js', mjs: 'js', node: 'js', typescript: 'ts', tsx: 'ts', python: 'py', py3: 'py',
    rs: 'rust', golang: 'go', h: 'c', cpp: 'c', 'c++': 'c', cc: 'c', hpp: 'c', cs: 'java', csharp: 'java', kotlin: 'java',
    sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash', yml: 'yaml', htm: 'html', xml: 'html', svg: 'html', vue: 'html',
    md: 'markdown', scss: 'css', less: 'css', jsonc: 'json', postgres: 'sql', mysql: 'sql', sqlite: 'sql',
  };
  const norm = (lang) => {
    lang = (lang || '').toLowerCase();
    return ALIAS[lang] || lang;
  };

  const NUM = /^(0x[\da-f_]+|0b[01_]+|\d[\d_]*\.?\d*(e[+-]?\d+)?[a-z]*|\.\d+)/i;

  function generic(D, line, st) {
    let out = '', i = 0;
    const n = line.length;
    if (st.bc) {
      const e = line.indexOf(st.bc);
      if (e < 0) return [span('com', line), st];
      out += span('com', line.slice(0, e + st.bc.length));
      i = e + st.bc.length;
      st = {};
    } else if (st.ms) {
      const e = line.indexOf(st.ms.end);
      if (e < 0) return [span('str', line), st];
      out += span('str', line.slice(0, e + st.ms.end.length));
      i = e + st.ms.end.length;
      st = {};
    }
    let plain = '';
    const flush = () => { if (plain) { out += esc(plain); plain = ''; } };
    while (i < n) {
      const c = line[i], rest = line.slice(i);
      if (D.bc && rest.startsWith(D.bc[0])) {
        flush();
        const e = line.indexOf(D.bc[1], i + D.bc[0].length);
        if (e < 0) { out += span('com', rest); return [out, { bc: D.bc[1] }]; }
        out += span('com', line.slice(i, e + D.bc[1].length)); i = e + D.bc[1].length; continue;
      }
      if (D.lc && D.lc.some((x) => rest.startsWith(x)) && !(D.pre && c === '#')) {
        if (!(D.vars && c === '#' && i > 0 && /\S/.test(line[i - 1]))) { flush(); out += span('com', rest); return [out, {}]; }
      }
      if (D.pre && c === '#' && /^\s*$/.test(line.slice(0, i))) {
        flush(); const m = rest.match(/^#\s*\w+/); out += span('kw', m[0]); i += m[0].length; continue;
      }
      const msd = D.ms && D.ms.find((x) => rest.startsWith(x));
      if (msd) {
        flush();
        const end = msd === '[[' ? ']]' : msd;
        const e = line.indexOf(end, i + msd.length);
        if (e < 0) { out += span('str', rest); return [out, { ms: { end } }]; }
        out += span('str', line.slice(i, e + end.length)); i = e + end.length; continue;
      }
      if (D.str.includes(c)) {
        flush();
        let j = i + 1;
        while (j < n && line[j] !== c) j += line[j] === '\\' ? 2 : 1;
        out += span('str', line.slice(i, j + 1)); i = j + 1; continue;
      }
      if (D.vars && c === '$') {
        const m = rest.match(/^\$(\{[^}]*\}|\w+|[@#?$!*0-9])/);
        if (m) { flush(); out += span('var', m[0]); i += m[0].length; continue; }
      }
      if (D.flags && c === '-' && (i === 0 || line[i - 1] === ' ')) {
        const m = rest.match(/^--?[\w-]+/);
        if (m) { flush(); out += span('attr', m[0]); i += m[0].length; continue; }
      }
      if (D.deco && c === '@') {
        const m = rest.match(/^@[\w.]+/);
        if (m) { flush(); out += span('fn', m[0]); i += m[0].length; continue; }
      }
      if (/\d/.test(c) || (c === '.' && /\d/.test(line[i + 1] || ''))) {
        if (i === 0 || !/[\w$]/.test(line[i - 1])) {
          const m = rest.match(NUM);
          if (m) { flush(); out += span('num', m[0]); i += m[0].length; continue; }
        }
      }
      if (/[A-Za-z_$]/.test(c)) {
        const m = rest.match(/^[\w$]+/);
        const w = m[0], k = D.ci ? w.toLowerCase() : w;
        flush();
        let after = line.slice(i + w.length);
        if (D.macro && after[0] === '!') out += span('fn', w + '!'), i++;
        else if (D.kw.has(k)) out += span('kw', w);
        else if (D.lit.has(k)) out += span('lit', w);
        else if (D.types.has(k)) out += span('type', w);
        else if (/^\s*\(/.test(after)) out += span('fn', w);
        else if (D.caps && /^[A-Z][a-z]/.test(w)) out += span('type', w);
        else out += esc(w);
        i += w.length; continue;
      }
      if (/[+\-*/%=<>!&|^~?:]/.test(c)) {
        flush(); const m = rest.match(/^[+\-*/%=<>!&|^~?:]+/); out += span('op', m[0]); i += m[0].length; continue;
      }
      if (/[{}()[\];,.]/.test(c)) { flush(); out += span('punct', c); i++; continue; }
      plain += c; i++;
    }
    flush();
    return [out, {}];
  }

  function html(line, st) {
    let out = '', i = 0;
    if (st.com) {
      const e = line.indexOf('-->');
      if (e < 0) return [span('com', line), st];
      out += span('com', line.slice(0, e + 3)); i = e + 3; st = {};
    }
    const re = /<!--|<\/?[\w:-]+|\/?>|"[^"]*"|'[^']*'|[\w:-]+(?==)|&\w+;/g;
    re.lastIndex = i;
    let m, last = i, inTag = !!st.tag;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index));
      const t = m[0];
      if (t === '<!--') {
        const e = line.indexOf('-->', m.index + 4);
        if (e < 0) { out += span('com', line.slice(m.index)); return [out, { com: 1 }]; }
        out += span('com', line.slice(m.index, e + 3)); re.lastIndex = e + 3;
      } else if (t[0] === '<') { out += span('tag', t); inTag = true; }
      else if (t === '>' || t === '/>') { out += span('tag', t); inTag = false; }
      else if (t[0] === '"' || t[0] === "'") out += inTag ? span('str', t) : esc(t);
      else if (t[0] === '&') out += span('lit', t);
      else out += inTag ? span('attr', t) : esc(t);
      last = re.lastIndex;
    }
    out += esc(line.slice(last));
    return [out, inTag ? { tag: 1 } : {}];
  }

  function css(line, st) {
    let out = '', i = 0, depth = st.d || 0;
    if (st.bc) {
      const e = line.indexOf('*/');
      if (e < 0) return [span('com', line), st];
      out += span('com', line.slice(0, e + 2)); i = e + 2;
    }
    const n = line.length;
    let plain = '';
    const flush = () => { if (plain) { out += depth > 0 ? esc(plain) : span('tag', plain); plain = ''; } };
    while (i < n) {
      const rest = line.slice(i), c = line[i];
      let m;
      if (rest.startsWith('/*')) {
        flush(); const e = line.indexOf('*/', i + 2);
        if (e < 0) { out += span('com', rest); return [out, { bc: 1, d: depth }]; }
        out += span('com', line.slice(i, e + 2)); i = e + 2; continue;
      }
      if (c === '{' || c === '}') { flush(); depth += c === '{' ? 1 : -1; out += span('punct', c); i++; continue; }
      if (c === '"' || c === "'") { flush(); const e = line.indexOf(c, i + 1); const s = line.slice(i, e < 0 ? n : e + 1); out += span('str', s); i += s.length; continue; }
      if (c === '@' && (m = rest.match(/^@[\w-]+/))) { flush(); out += span('kw', m[0]); i += m[0].length; continue; }
      if (depth > 0 && (m = rest.match(/^(--)?[\w-]+(?=\s*:)/)) && !/:\s*[\w-]*\s*:/.test(rest.slice(0, 1))) {
        const before = line.slice(0, i).trimEnd();
        if (!before || /[{;]$/.test(before)) { flush(); out += span('prop', m[0]); i += m[0].length; continue; }
      }
      if (depth > 0 && (m = rest.match(/^#[\da-f]{3,8}\b/i))) { flush(); out += span('num', m[0]); i += m[0].length; continue; }
      if (depth > 0 && (m = rest.match(/^-?\d*\.?\d+(px|em|rem|%|vh|vw|s|ms|deg|fr|ch|ex)?/)) && !/[\w-]/.test(line[i - 1] || '')) { flush(); out += span('num', m[0]); i += m[0].length; continue; }
      if (depth > 0 && (m = rest.match(/^[\w-]+(?=\()/))) { flush(); out += span('fn', m[0]); i += m[0].length; continue; }
      if (depth > 0 && (m = rest.match(/^!important/))) { flush(); out += span('kw', m[0]); i += m[0].length; continue; }
      if (c === ';' || c === ':' || c === ',') { flush(); out += span('punct', c); i++; continue; }
      plain += c; i++;
    }
    flush();
    return [out, { d: depth }];
  }

  function json(line) {
    return [line.replace(/("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|-?\d+\.?\d*(?:e[+-]?\d+)?|([{}[\],:])|([^"\w{}[\],:-]+|[\w-]+)/gi, (m, s, colon, lit, p, other) => {
      if (s) return colon ? span('prop', s) + esc(colon) : span('str', s);
      if (lit) return span('lit', m);
      if (p) return span('punct', m);
      if (other !== undefined) return esc(m);
      return span('num', m);
    }), {}];
  }

  function yaml(line) {
    if (/^\s*#/.test(line)) return [span('com', line), {}];
    if (/^(---|\.\.\.)\s*$/.test(line)) return [span('op', line), {}];
    const m = line.match(/^(\s*)(- )?([\w.\-"' ]+?)(:)(\s|$)(.*)$/);
    const val = (v) => {
      const c = v.match(/^(.*?)(\s+#.*)?$/);
      let body = c[1], com = c[2] || '';
      let h;
      if (/^["'].*["']$/.test(body.trim())) h = span('str', body);
      else if (/^-?\d+(\.\d+)?$/.test(body.trim())) h = span('num', body);
      else if (/^(true|false|null|yes|no|~)$/i.test(body.trim())) h = span('lit', body);
      else if (/^[&*!]/.test(body.trim())) h = span('type', body);
      else h = esc(body);
      return h + span('com', com);
    };
    if (m) return [esc(m[1]) + (m[2] ? span('op', m[2]) : '') + span('prop', m[3]) + span('punct', m[4]) + m[5] + val(m[6]), {}];
    const li = line.match(/^(\s*)(- )(.*)$/);
    if (li) return [esc(li[1]) + span('op', li[2]) + val(li[3]), {}];
    return [val(line), {}];
  }

  function markdown(line) {
    if (/^#{1,6}\s/.test(line)) return [span('kw', line), {}];
    if (/^\s*>/.test(line)) return [span('com', line), {}];
    let h = esc(line)
      .replace(/^(\s*)([-*+]|\d+\.)(\s)/, '$1<span class="t-op">$2</span>$3')
      .replace(/(\*\*|__)(.+?)\1/g, '<span class="t-type">$&</span>')
      .replace(/`[^`]+`/g, '<span class="t-str">$&</span>')
      .replace(/\[[^\]]+\]\([^)]+\)/g, '<span class="t-fn">$&</span>');
    return [h, {}];
  }

  const HL = (window.HL = {});
  HL.norm = norm;
  HL.supported = (lang) => {
    const l = norm(lang);
    return !!(L[l] || ['html', 'css', 'json', 'yaml', 'markdown'].includes(l));
  };
  HL.line = (lang, line, st) => {
    const l = norm(lang);
    st = st || {};
    if (L[l]) return generic(L[l], line, st);
    if (l === 'html') return html(line, st);
    if (l === 'css') return css(line, st);
    if (l === 'json') return json(line);
    if (l === 'yaml') return yaml(line);
    if (l === 'markdown') return markdown(line);
    return [esc(line), {}];
  };
  HL.block = (lang, code) => {
    let st = {};
    return code.split('\n').map((ln) => { const r = HL.line(lang, ln, st); st = r[1]; return r[0]; }).join('\n');
  };
})();
