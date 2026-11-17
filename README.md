# Inkwyrm

A fast, local-first markdown editor that runs entirely in the browser. Live preview, split view, neon syntax highlighting, focus mode, vim mode, typewriter sounds, and share links that carry the whole note inside the URL.

- No accounts, no server, no outside libraries, fonts, or CDNs. Every file is in this folder.
- Notes are saved in your browser (IndexedDB). They stay on the device you wrote them on.
- Every path is relative, so the folder works from any web address or subfolder.

## What's in the folder

```
index.html              the app
manifest.webmanifest    lets you install it as an app
sw.js                   service worker for offline use and instant loading
icons/                  app icons (SVG)
css/                    styles
js/                     the editor, markdown parser, highlighter, and so on
```

Keep the folder structure exactly as it is when you upload.

---

## Publish on GitHub Pages (free)

1. Sign in at github.com and click **New repository** (the **+** in the top right).
2. Give it a name, for example `inkwyrm`. Leave it **Public** and click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Open the `neon_editor` folder on your Mac, select **everything inside it** (not the folder itself), and drag it all into the browser window. Wait until every file is listed, then click **Commit changes**.
5. Go to **Settings → Pages** (in the left sidebar).
6. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose the **main** branch and the **/ (root)** folder, then click **Save**.
7. Wait a minute or two and refresh the page. Your address appears at the top, something like `https://your-name.github.io/inkwyrm/`.

**Publishing an update:** open `sw.js`, change the version line (for example `inkwyrm-v1.2.0` to `inkwyrm-v1.2.1`), then upload the changed files the same way. Anyone who has the app open sees a small "A new version is ready" banner with a Reload button.

## Publish on Netlify (free)

1. Go to app.netlify.com and sign up (you can use your GitHub account).
2. Open **Sites** and find the box that says *drag and drop your site output folder here* (Netlify Drop).
3. Drag the whole `neon_editor` folder onto it. That's it. Netlify gives you an address like `https://cheerful-name-123.netlify.app`.
4. Optional: **Site configuration → Change site name** for a nicer address.

**Publishing an update:** bump the version in `sw.js`, open your site in Netlify, go to **Deploys**, and drag the folder onto the deploy area again.

If you'd rather connect GitHub: **Add new site → Import an existing project → GitHub**, pick the repository, leave the build command empty, set the publish directory to `/`, and click **Deploy**. Every change you upload to GitHub then publishes on its own.

---

## Install it as an app

Once it's hosted (it needs an `https://` address):

- **Mac (Chrome, Dia, Edge, Arc):** open the site, then use the install icon at the right of the address bar, or the menu item *Install Inkwyrm*.
- **Mac (Safari):** **File → Add to Dock**.
- **iPhone / iPad (Safari):** tap **Share → Add to Home Screen**.
- **Android (Chrome):** tap the menu, then **Install app**.

After the first visit the app works offline and opens instantly.

## Good to know

- **Opening `index.html` straight from your Mac works too.** The editor, saving, and sharing all work. The offline service worker stays off in that case, which is expected: browsers only allow service workers on real web addresses.
- **Notes belong to each address.** Notes written at `file://…`, at your GitHub Pages address, and at your Netlify address live in three separate places. Use **Settings → Download backup** and **Restore backup** to move them.
- **Share links** look like `https://your-site/#share=…`. Everything after `#` stays in the browser and is never sent to GitHub or Netlify, so the note is never uploaded anywhere. Very long notes make very long links; most browsers handle them fine, but some chat apps cut long links off.
- **Icons:** the app uses SVG icons, which Chrome, Edge, and Dia accept. On iPhone the app draws a PNG version of the icon at runtime. If an older device shows a blank icon, export `icons/icon.svg` to `icon-192.png` and `icon-512.png`, put them in `icons/`, and add them to the `icons` list in `manifest.webmanifest`.
- **Clearing your browser's site data deletes your notes.** Download a backup now and then.
