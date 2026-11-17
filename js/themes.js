/* Themes: each has dark + light palettes. A palette feeds both the editor (--e-*, --n-*, --t-*) and the
   preview (--p-*, --pt-*), so editor and preview themes can be mixed freely. */
(function () {
  const KEYS = 'bg panel fg muted faint border accent sel h1 h2 h3 bold italic link code codebg quote list hl hlbg math kw str com num fn type op'.split(' ');
  const P = (s) => { const v = s.trim().split(/\s+/), o = {}; KEYS.forEach((k, i) => (o[k] = v[i])); return o; };
  const THEMES = {
    oled: {
      name: 'OLED Neon',
      dark: Object.assign(P('#000000 #0a0a0d #e6e6ee #8a8a9a #4a4a58 #1a1a21 #ff2bd6 #ff2bd638 #ffd23f #ffc53d #f5c96a #ff9233 #7dffb3 #2ee6ff #ff5fd2 #0d0d12 #9d8cff #ff2bd6 #fff3a0 #ffe6002e #5effd5 #ff4fd8 #b8ff5e #5c5c6e #ffb86b #49d6ff #c792ea #ff7a90'),
        { mk: '#686878', pbg: '#0e0e12', pcodebg: '#17171d', ppanel: '#141419', sw: ['#ff2bd6', '#2ee6ff', '#ffd23f', '#ff9233'] }),
      light: Object.assign(P('#ffffff #f6f6f8 #15151c #6a6a78 #b4b4c0 #e6e6ec #d4009e #d4009e26 #a87800 #a87800 #8a6a1f #c25400 #00875a #0088b3 #c8008f #f3f3f6 #6b5bd6 #d4009e #3d3300 #ffe60066 #00866b #c8008f #4f8a00 #9a9aa8 #c25400 #0077c2 #7c3fc2 #d10045'),
        { mk: '#9a9aa8', pbg: '#f6f6f8', pcodebg: '#ebebf0', ppanel: '#efeff3', sw: ['#d4009e', '#0088b3', '#a87800', '#c25400'] }),
    },
    soft: {
      name: 'Soft Dark',
      dark: P('#1c1e24 #22252c #d6d8de #8b909c #555a66 #2c3038 #f78c6c #f78c6c33 #f78c6c #82aaff #c3a6ff #ffcb6b #c3e88d #89ddff #f07178 #262a32 #a6accd #f78c6c #fff0b3 #ffcb6b2e #89ddff #c792ea #c3e88d #676e7d #f78c6c #82aaff #ffcb6b #89ddff'),
      light: P('#f5f5f3 #ececea #2b2d33 #73767f #b8bac0 #e0e0dc #d9603b #d9603b26 #c94f2b #3d6fd9 #7d55c7 #a86b00 #4b8a2a #1f8ab0 #c43c4c #ebebe7 #6b6f86 #d9603b #3a3000 #ffd86b66 #1f8ab0 #8a45c7 #4b8a2a #9a9ca3 #c94f2b #3d6fd9 #a86b00 #1f8ab0'),
    },
    paper: {
      name: 'Paper',
      light: P('#f7f1e3 #efe7d4 #3b3226 #857a68 #c4b9a2 #e4d9c2 #b5502d #b5502d24 #a3401f #8a5a1f #5f6e2b #6b3a12 #6b5a2b #2f6b8a #9e3b4a #efe6d1 #7a6a50 #b5502d #3b2f00 #f2d06b80 #2f6b8a #9e3b4a #5f6e2b #a89d86 #b5502d #2f6b8a #8a5a1f #7a6a50'),
      dark: P('#1f1a14 #26201a #e6dcc8 #a39780 #5f5546 #332b22 #e08a5a #e08a5a30 #f0a070 #e0b870 #b8c27a #f2d29a #cdbf8e #8ab8cf #e88a96 #29221b #b09d80 #e08a5a #fff2c9 #e0b8702e #8ab8cf #e88a96 #b8c27a #6f6555 #f0a070 #8ab8cf #e0b870 #b09d80'),
    },
    solarized: {
      name: 'Solarized',
      dark: P('#002b36 #073642 #93a1a1 #839496 #586e75 #0b4250 #cb4b16 #268bd240 #cb4b16 #b58900 #6c71c4 #d33682 #2aa198 #268bd2 #dc322f #073642 #6c71c4 #cb4b16 #fdf6e3 #b5890040 #2aa198 #859900 #2aa198 #586e75 #d33682 #268bd2 #b58900 #cb4b16'),
      light: P('#fdf6e3 #eee8d5 #586e75 #657b83 #93a1a1 #e6dfc8 #cb4b16 #268bd230 #cb4b16 #b58900 #6c71c4 #d33682 #2aa198 #268bd2 #dc322f #eee8d5 #6c71c4 #cb4b16 #002b36 #b5890040 #2aa198 #859900 #2aa198 #93a1a1 #d33682 #268bd2 #b58900 #cb4b16'),
    },
    nord: {
      name: 'Nord',
      dark: P('#2e3440 #3b4252 #d8dee9 #a0a8b7 #616e88 #434c5e #88c0d0 #88c0d033 #88c0d0 #81a1c1 #b48ead #ebcb8b #a3be8c #8fbcbb #d08770 #3b4252 #b48ead #88c0d0 #eceff4 #ebcb8b33 #8fbcbb #81a1c1 #a3be8c #616e88 #b48ead #88c0d0 #8fbcbb #81a1c1'),
      light: P('#eceff4 #e5e9f0 #2e3440 #4c566a #9aa3b5 #d8dee9 #5e81ac #5e81ac30 #5e81ac #3b6e8f #8a5f89 #9a6b0f #4f7a3a #3b7d8a #b0573a #e5e9f0 #8a5f89 #5e81ac #2e3440 #ebcb8b80 #3b7d8a #5e81ac #4f7a3a #8892a6 #8a5f89 #3b6e8f #3b7d8a #5e81ac'),
    },
    dracula: {
      name: 'Dracula',
      dark: P('#282a36 #21222c #f8f8f2 #a4a8c4 #6272a4 #343746 #ff79c6 #bd93f940 #ff79c6 #bd93f9 #8be9fd #ffb86c #50fa7b #8be9fd #f1fa8c #21222c #6272a4 #ff79c6 #282a36 #f1fa8ccc #50fa7b #ff79c6 #f1fa8c #6272a4 #bd93f9 #50fa7b #8be9fd #ff79c6'),
      light: P('#fffbeb #f5f0dc #1f1f1f #6c664b #b0aa90 #ebe5cc #a3144d #644ac940 #a3144d #644ac9 #036a96 #a34d14 #14710a #036a96 #846e15 #f5f0dc #635d97 #a3144d #1f1f1f #e8d86b99 #14710a #a3144d #846e15 #8a8566 #644ac9 #14710a #036a96 #a3144d'),
    },
    calm: {
      name: 'Calm White',
      light: P('#ffffff #f7f7f7 #333333 #888888 #c8c8c8 #ececec #3f8fd8 #3f8fd826 #222222 #333333 #444444 #111111 #444444 #3f8fd8 #c7254e #f6f6f6 #777777 #3f8fd8 #333333 #fff3a3 #3f6fb0 #a626a4 #50a14f #a0a1a7 #986801 #4078f2 #c18401 #0184bc'),
      dark: P('#1e1e1e #252525 #d4d4d4 #8a8a8a #555555 #2e2e2e #5aa7f0 #5aa7f033 #f0f0f0 #e6e6e6 #dddddd #ffffff #cfcfcf #5aa7f0 #f07a9a #262626 #9a9a9a #5aa7f0 #f0f0f0 #fff3a333 #7ab0f0 #c678dd #98c379 #6a6a6a #d19a66 #61afef #e5c07b #56b6c2'),
    },
  };

  /* Markon presets, recreated from its variable set: bg, bg-light, text, brand, accent, primary, secondary,
     comment, meta, operator, keyword, regex, property, string, literal, hint, success, warning, info, error. */
  const MK = 'bg bgl text brand accent primary secondary comment meta operator keyword regex property string literal hint success warning info error'.split(' ');
  const MARKON = {
    panda: ['Panda',
      '#1a0f1f #2d1a2d #f0f0e8 #ff1100 #8866ff #bb66ff #22aa88 #bbbbbb #ff1100 #bb88ee #ff88bb #ff99cc #4488ff #22aa88 #ffbb66 #8866dd #22bb11 #ffaa00 #1199cc #ff1100',
      '#f5f5f0 #ffffff #1a1a1a #d73a49 #0366d6 #8b5cf6 #28a745 #6a737d #6f42c1 #0366d6 #d73a49 #e36209 #0366d6 #032f62 #6f42c1 #28a745 #22bb11 #ffaa00 #1199cc #cc6600'],
    muted: ['Muted',
      '#1a1a1a #2a2a2a #e0e0e0 #b3667a #7a7ab3 #a855f7 #66a3a3 #888888 #9a7ab3 #66a3a3 #b3667a #b37a9a #7a9ab3 #7ab37a #b3a366 #9a7ab3 #66a366 #b3a366 #669ab3 #b3667a',
      '#f5f5f5 #ffffff #333333 #8c4a5a #5a5a8c #9333ea #5a8c5a #666666 #7a4a8c #5a7a8c #8c4a5a #8c4a7a #5a7a8c #5a8c5a #8c7a4a #7a4a8c #5a8c5a #8c7a4a #5a7a8c #8c4a5a'],
    nord: ['Nord Frost',
      '#2e3440 #3b4252 #d8dee9 #88c0d0 #5e81ac #c084fc #a3be8c #6c7a8a #88c0d0 #d08770 #b48ead #bf616a #81a1c1 #a3be8c #ebcb8b #88c0d0 #a3be8c #ebcb8b #88c0d0 #bf616a',
      '#eceff4 #ffffff #2e3440 #5e81ac #88c0d0 #a855f7 #a3be8c #4c566a #5e81ac #d08770 #b48ead #bf616a #5e81ac #a3be8c #d08770 #88c0d0 #a3be8c #d08770 #5e81ac #bf616a'],
    monokai: ['Monokai',
      '#272822 #3e3d32 #f8f8f2 #f92672 #66d9ef #d8b4fe #a6e22e #75715e #fd971f #66d9ef #f92672 #fd971f #66d9ef #e6db74 #ae81ff #a6e22e #a6e22e #e6db74 #66d9ef #f92672',
      '#fbf8f2 #ffffff #2b2a28 #c6286b #006b8f #6f42c1 #2d8f3a #6a737d #a66bff #006b8f #c6286b #d65a07 #006b8f #8a5b00 #a66bff #2d8f3a #2d8f3a #d65a07 #006b8f #c6286b'],
    dracula: ['Dracula Night',
      '#282a36 #44475a #f8f8f2 #ff79c6 #8be9fd #e879f9 #50fa7b #6272a4 #ffb86c #bd93f9 #ff79c6 #ffb86c #8be9fd #f1fa8c #bd93f9 #50fa7b #50fa7b #ffb86c #8be9fd #ff5555',
      '#f4f7fb #ffffff #26272b #b0476a #0366d6 #8b5cf6 #238a4b #6a737d #e36209 #6f42c1 #b0476a #e36209 #0366d6 #0b3a62 #6f42c1 #238a4b #238a4b #e36209 #0366d6 #b0476a'],
    solarized: ['Solarized Classic',
      '#002b36 #073642 #839496 #d33682 #268bd2 #c084fc #859900 #586e75 #2aa198 #cb4b16 #6c71c4 #dc322f #268bd2 #859900 #b58900 #2aa198 #859900 #b58900 #268bd2 #dc322f',
      '#fdf6e3 #eee8d5 #657b83 #d33682 #268bd2 #c084fc #859900 #93a1a1 #2aa198 #cb4b16 #6c71c4 #dc322f #268bd2 #859900 #b58900 #2aa198 #859900 #b58900 #268bd2 #dc322f'],
    github: ['GitHub',
      '#0d1117 #161b22 #e6edf3 #f85149 #58a6ff #d8b4fe #7ee787 #7d8590 #ffa657 #f85149 #ff7b72 #ffa657 #79c0ff #a5d6ff #d2a8ff #7ee787 #7ee787 #ffa657 #58a6ff #f85149',
      '#ffffff #f6f8fa #24292f #d73a49 #0969da #8b5cf6 #28a745 #6a737d #e36209 #0969da #d73a49 #e36209 #0969da #032f62 #6f42c1 #28a745 #28a745 #e36209 #0969da #d73a49'],
    onedark: ['One Dark',
      '#282c34 #21252b #abb2bf #e06c75 #61afef #c084fc #98c379 #5c6370 #d19a66 #56b6c2 #c678dd #d19a66 #61afef #98c379 #e5c07b #56b6c2 #98c379 #e5c07b #61afef #e06c75',
      '#fafafa #ffffff #383a42 #e45649 #0184bc #a855f7 #50a14f #a0a1a7 #986801 #0997b3 #a626a4 #986801 #0184bc #50a14f #c18401 #0997b3 #50a14f #c18401 #0184bc #e45649'],
    gruvbox: ['Gruvbox',
      '#282828 #3c3836 #ebdbb2 #fb4934 #83a598 #e879f9 #b8bb26 #928374 #fe8019 #83a598 #fb4934 #fe8019 #83a598 #b8bb26 #fabd2f #8ec07c #b8bb26 #fabd2f #83a598 #fb4934',
      '#fbf1c7 #f2e5bc #3c3836 #cc241d #458588 #c084fc #98971a #928374 #b16286 #83a598 #cc241d #d65d0e #458588 #98971a #d79921 #689d6a #98971a #d79921 #458588 #cc241d'],
    tokyo: ['Tokyo Night',
      '#1a1b26 #24283b #a9b1d6 #f7768e #7aa2f7 #d8b4fe #9ece6a #565f89 #73daca #f7768e #bb9af7 #ff9e64 #7aa2f7 #9ece6a #e0af68 #73daca #9ece6a #e0af68 #7aa2f7 #f7768e',
      '#e8e9ed #ffffff #2d3748 #e53e3e #3182ce #a855f7 #38a169 #718096 #319795 #e53e3e #805ad5 #dd6b20 #3182ce #38a169 #d69e2e #319795 #38a169 #d69e2e #3182ce #e53e3e'],
    ayu: ['Ayu',
      '#1f2430 #232834 #cbccc6 #ffcc66 #73d0ff #d4bfff #bae67e #5c6773 #5ccfe6 #73d0ff #ffa759 #95e6cb #5ccfe6 #bae67e #d4bfff #73d0ff #bae67e #ffa759 #73d0ff #ff3333',
      '#fafafa #ffffff #5c6773 #ff9940 #399ee6 #a37acc #86b300 #abb0b6 #55b4d4 #399ee6 #fa8d3e #4cbf99 #55b4d4 #86b300 #a37acc #399ee6 #86b300 #fa8d3e #399ee6 #f51818'],
    catppuccin: ['Catppuccin',
      '#1e1e2e #313244 #cdd6f4 #f38ba8 #89b4fa #cba6f7 #a6e3a1 #6c7086 #fab387 #94e2d5 #f38ba8 #fab387 #89b4fa #a6e3a1 #f9e2af #89dceb #a6e3a1 #f9e2af #89b4fa #f38ba8',
      '#eff1f5 #ccd0da #4c4f69 #d20f39 #1e66f5 #8839ef #40a02b #9ca0b0 #fe640b #179299 #d20f39 #fe640b #1e66f5 #40a02b #df8e1d #04a5e5 #40a02b #df8e1d #1e66f5 #d20f39'],
    tomorrow: ['Tomorrow',
      '#1d1f21 #282a2e #c5c8c6 #cc6666 #8abeb7 #c5c8c6 #b5bd68 #b4b7b4 #c5c8c6 #c5c8c6 #b294bb #8abeb7 #c5c8c6 #b5bd68 #de935f #f0c674 #b5bd68 #de935f #8abeb7 #cc6666',
      '#ffffff #e0e0e0 #373b41 #c82829 #3e999f #373b41 #718c00 #969896 #373b41 #373b41 #8959a8 #3e999f #373b41 #718c00 #f5871f #eab700 #718c00 #f5871f #3e999f #c82829'],
  };
  const mix = (a, pct, b) => 'color-mix(in srgb, ' + a + ' ' + pct + '%, ' + b + ')';
  // Markdown mapping follows Markon's gruvbox feel: headings take the literal colour (yellow), bold the meta
  // colour (orange), links the accent, and syntax markers the comment grey.
  function fromMarkon(str) {
    const v = str.split(' '), m = {};
    MK.forEach((k, i) => (m[k] = v[i]));
    return {
      bg: m.bg, panel: m.bgl, fg: m.text, muted: mix(m.text, 62, m.bg), faint: mix(m.comment, 70, m.bg), border: mix(m.text, 12, m.bg),
      accent: m.brand, sel: m.accent + '40',
      h1: m.literal, h2: m.warning, h3: m.hint, bold: m.meta, italic: m.string, link: m.accent, code: m.regex,
      codebg: mix(m.text, 6, m.bg), quote: m.comment, list: m.brand, hl: m.text, hlbg: mix(m.warning, 28, 'transparent'), math: m.hint,
      kw: m.keyword, str: m.string, com: m.comment, num: m.literal, fn: m.property, type: m.primary, op: m.operator,
      mk: m.comment, pbg: m.bgl, pcodebg: mix(m.text, 8, m.bgl), ppanel: mix(m.text, 5, m.bgl),
      sw: [m.brand, m.accent, m.primary, m.secondary],
      status: { success: m.success, warning: m.warning, info: m.info, error: m.error },
    };
  }
  for (const [id, [name, dark, light]] of Object.entries(MARKON)) {
    THEMES['mk-' + id] = { name, group: 'markon', dark: fromMarkon(dark), light: fromMarkon(light) };
  }

  // Every palette gets status colours (callouts, danger buttons), so nothing falls back to fixed hues.
  const DEF_STATUS = { dark: { success: '#3ddc84', warning: '#ffa94d', info: '#2fd5e6', error: '#ff5d73' }, light: { success: '#2f9e5b', warning: '#d9770b', info: '#1592a8', error: '#d6334f' } };
  const status = (p) => p.status || (p.bg && /^#[0-7]/.test(p.bg) ? DEF_STATUS.dark : DEF_STATUS.light);
  function editorVars(p) {
    const st = status(p);
    return {
      '--e-bg': p.bg, '--e-panel': p.panel, '--e-fg': p.fg, '--e-muted': p.muted, '--e-faint': p.faint, '--e-border': p.border,
      '--e-accent': p.accent, '--e-sel': p.sel,
      '--n-h1': p.h1, '--n-h2': p.h2, '--n-h3': p.h3, '--n-bold': p.bold, '--n-italic': p.italic, '--n-link': p.link,
      '--n-code': p.code, '--n-codebg': p.codebg, '--n-quote': p.quote, '--n-list': p.list, '--n-hl': p.hl, '--n-hlbg': p.hlbg,
      '--n-math': p.math, '--n-mk': p.mk || p.faint,
      '--t-kw': p.kw, '--t-str': p.str, '--t-com': p.com, '--t-num': p.num, '--t-fn': p.fn, '--t-type': p.type, '--t-op': p.op,
      '--s-success': st.success, '--s-warning': st.warning, '--s-info': st.info, '--s-error': st.error, '--s-note': p.link,
    };
  }
  // Preview sits on a slightly lighter surface than the editor in dark mode, like Markon's charcoal pane.
  function previewVars(p, dark) {
    const pbg = p.pbg || (dark ? mix(p.fg, 4, p.bg) : p.bg);
    const v = {
      '--p-bg': pbg, '--p-panel': p.ppanel || p.panel, '--p-fg': p.fg, '--p-muted': p.muted, '--p-faint': p.faint, '--p-border': p.border,
      '--p-accent': p.accent, '--p-h': p.h1, '--p-h2': p.h2, '--p-link': p.link, '--p-code': p.code, '--p-codebg': p.pcodebg || p.codebg,
      '--p-quote': p.quote, '--p-hl': p.hl, '--p-hlbg': p.hlbg, '--p-math': p.math,
      '--pt-kw': p.kw, '--pt-str': p.str, '--pt-com': p.com, '--pt-num': p.num, '--pt-fn': p.fn, '--pt-type': p.type, '--pt-op': p.op,
    };
    const st = status(p);
    Object.assign(v, { '--ps-success': st.success, '--ps-warning': st.warning, '--ps-info': st.info, '--ps-error': st.error, '--ps-note': p.link });
    return v;
  }
  const block = (vars) => Object.entries(vars).map(([k, v]) => '  ' + k + ': ' + v + ';').join('\n');

  window.Themes = {
    list: THEMES,
    palette(id, dark) { const t = THEMES[id] || THEMES.oled; return dark ? t.dark : t.light; },
    swatches(id, dark) { const p = this.palette(id, dark); return p.sw || [p.accent, p.link, p.h1, p.bold]; },
    previewBg(id, dark) { const p = this.palette(id, dark); return p.pbg || (dark ? mix(p.fg, 4, p.bg) : p.bg); },
    /* One app theme colours everything (chrome, editor, preview). Optional per-pane overrides are scoped to
       their pane, so the sidebar, bars, palette and dialogs always follow the app theme. */
    css(appId, dark, editorId, previewId) {
      const a = this.palette(appId, dark);
      let out = ':root {\n' + block(editorVars(a)) + '\n' + block(previewVars(a, dark)) + '\n  color-scheme: ' + (dark ? 'dark' : 'light') + ';\n}';
      if (editorId && editorId !== appId) out += '\n#edPane {\n' + block(editorVars(this.palette(editorId, dark))) + '\n}';
      if (previewId && previewId !== appId) out += '\n#pvPane {\n' + block(previewVars(this.palette(previewId, dark), dark)) + '\n}';
      return out;
    },
    previewCss(previewId, dark) { return ':root {\n' + block(previewVars(this.palette(previewId, dark), dark)) + '\n}'; },
    starter(editorId, dark) { return ':root {\n' + block(editorVars(this.palette(editorId, dark))) + '\n}'; },
  };
})();
