/* First-run notes. (§ stands in for a backtick so the text can live in a template string.) */
(function () {
  const welcome = `# Welcome to Inkwyrm

A quiet place to write, with a little glow. Everything stays in this browser, saved as you type. Press **⌘K** any time to find every action. The top bar stays out of the way: move the mouse to the top edge to bring it down, or press **⌘.** to pin it.

> [!tip] Three ways to write
> Press **⌘/** to cycle **Live** (syntax fades away like Calmly Writer), **Split** (raw editor next to the preview, scrolling in sync, like Markon), and **Read** (just the document). In Live mode, click into any line to see its markdown marks again.

## Smart editing

- Lists continue when you press Enter
  - Tab and Shift+Tab indent and outdent
  - Press Enter on an empty bullet to end the list
1. Numbered lists count up for you
2. Brackets, quotes, §backticks§ and **double asterisks** close themselves
- Select some text, then paste a URL to turn it into a link
- **⌘B** for bold, **⌘I** for italic, ⌘⇧E for §code§, ⌘⇧H to ==highlight==

### A checklist

- [x] Open Inkwyrm
- [ ] Click a box to tick it off (in Live mode or in the preview)
- [ ] Try focus mode with ⌘⇧F, then move the mouse to bring the controls back
- [ ] Turn on typewriter sounds in Settings

## Rich markdown

Text can be *italic*, **bold**, ***both***, ~~struck through~~, or ==highlighted==. Links look like [this one](https://example.com), and #tags show up in the sidebar so you can filter by them.

Notes link to each other with wikilinks: open the [[Shortcuts cheat sheet]], or click [[A note that does not exist yet]] in the preview to create it. In the editor, hold ⌘ and click a link to follow it.

| Feature | Where | Shortcut |
| :--- | :---: | ---: |
| Command palette | Everywhere | ⌘K |
| Switch modes | Top bar | ⌘/ |
| Sidebar | Left | ⌘\\ |

> Plain blockquotes are still here for when a callout is too loud.

> [!note] Callouts come in many flavours
> Note, tip, info, warning, danger and question, plus Obsidian aliases like success and example.

> [!warning]- Foldable callouts start closed with a minus
> And open with a plus. This one was hiding until you clicked.

> [!question]+ Does it do math?
> It does, with no outside libraries. Inline like $E = mc^2$ or $\\alpha + \\beta \\leq \\gamma_1$, and as blocks:

$$
\\int_0^\\infty e^{-x^2} \\, dx = \\frac{\\sqrt{\\pi}}{2}
$$

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

## Code that glows

§§§js
// Syntax highlighting works in the editor and the preview
async function greet(name = "world") {
  const msg = §Hello, \${name}!§;
  return msg.length > 10 ? msg : null;
}
§§§

§§§python
@dataclass
class Note:
    title: str
    words: int = 0  # 15 languages are supported

def longest(notes):
    return max(notes, key=lambda n: n.words)
§§§

§§§rust
fn main() {
    let count: u32 = 42;
    println!("{} notes, zero servers", count);
}
§§§

Also JavaScript, TypeScript, HTML, CSS, JSON, Bash, Go, SQL, Markdown, YAML, C, Java, and Lua.

## Sharing

Click the link icon in the top bar to copy a **share link**. The whole note is compressed into the link itself, so nothing is uploaded. Whoever opens it sees a clean read-only page with a *Duplicate to my notes* button. You can also copy as Markdown, HTML or rich text, download .md or .html, or print to PDF from the palette.

---

Drag a .md or .txt file onto the window to import it. Make it yours in **Settings**: themes for the editor and preview, any font installed on your Mac, size, line height, column width, vim mode, a daily writing goal, and more.[^1]

[^1]: Footnotes work too. Delete this note whenever you like; its friends will not mind.
`;

  const cheat = `# Shortcuts cheat sheet

Back to [[Welcome to Inkwyrm]].

## Everywhere

| Keys | Action |
| --- | --- |
| ⌘K | Command palette |
| ⌘/ | Cycle Live, Split, Read |
| ⌘S | Save now (it autosaves anyway) |
| ⌘\\ | Show or hide the sidebar |
| ⌘⇧F | Focus mode |
| ⌘⌥N | New note |
| ⌘P | Print or save as PDF |
| ⌘, | Settings |
| ⌘. | Pin or auto-hide the top bar |
| Esc | Leave focus mode, close panels |

## While writing

| Keys | Action |
| --- | --- |
| ⌘B / ⌘I | Bold / italic |
| ⌘⇧E | Inline code |
| ⌘⇧H | Highlight |
| Tab / ⇧Tab | Indent / outdent |
| ⌘Z / ⌘⇧Z | Undo / redo |
| ⌘ + click | Follow a link or wikilink |

## Vim mode

Turn it on in Settings. The mode shows at the bottom right.

- **Move:** h j k l, w b e, 0 ^ $, gg G (counts work, like 3j)
- **Edit:** x, dd, yy, p / P, u, Ctrl+R, o / O, ciw, diw, dw, cw, D, C, J, r, ~
- **Insert:** i a I A, Esc to return
- **Visual:** v or V, then move and press d, y, c, > or <

#reference
`;
  window.WELCOME = [welcome, cheat].map((s) => s.replace(/§/g, '`'));
})();
