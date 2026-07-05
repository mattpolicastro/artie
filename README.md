# artie

**artie** runs a local [claude.ai](https://claude.ai) JSX/TSX artifact on your machine. Claude generates a single default-exported React component; artie gives it somewhere to actually live and run — no build step, no `node_modules`, no project scaffolding.

> _artie ← **arti**fact._

There are two ways to use it, aimed at two kinds of user:

- **Desktop app** — drop a `.jsx` on a window, it runs, and it's remembered. For when you just want to *use* the applets Claude made you.
- **CLI** — `artie ./thing.jsx` opens it in a minimal Chrome window. For when you live in a terminal.

Both share the same engine (`engine/`): rewrite the artifact's `export default`, build an HTML shell with an [import map](https://developer.mozilla.org/docs/Web/HTML/Element/script/type/importmap) → [esm.sh](https://esm.sh), the [Tailwind](https://tailwindcss.com) CDN, and [Babel standalone](https://babeljs.io) that transpiles the JSX in the browser.

## Desktop app

A native ([Tauri](https://tauri.app)) launcher: **drop → runs → remembers**.

- Drop a `.jsx`/`.tsx` anywhere on the window and it runs immediately.
- A sidebar lists everything you've dropped — click to relaunch, hover to forget.
- **State persists across restarts.** artie owns each applet's state on disk (`state/<id>.json`) and seeds it back in on launch, so progress/settings survive quitting the app. This includes artifacts that persist via claude.ai's `window.storage` API, which artie polyfills.

Run it (dev):

```
cd app
npm install
npm run tauri dev
```

A packaged build is in progress; until then, run from source as above. Requires the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Rust + platform toolchain).

## CLI

Requires **Node ≥ 18** and a Chromium-family browser (Chrome, Chromium, Brave, or Edge).

```
npm link          # from the repo root — exposes the `artie` command
artie ./my-artifact.jsx                 # open it in a minimal-chrome window
artie ./my-artifact.jsx --watch         # reload the window on save
artie ./my-artifact.jsx --browser brave # pick the browser
artie ./my-artifact.jsx --no-launch     # serve only, print the URL
```

| Option | Description |
| --- | --- |
| `--watch` | Reload the window when the source file changes. |
| `--port <n>` | Serve on a specific port (default: ephemeral). |
| `--browser <name>` | `chrome` \| `chromium` \| `brave` \| `edge` (default: first found). |
| `--no-launch` | Serve only; print the URL instead of opening a window. |

## Notes & limitations

- **Needs internet** — React, libraries, and Tailwind load from CDNs at runtime. (Vendoring them for offline use is a planned module.)
- **Tailwind** is the guaranteed styling path. Other bare imports (`lucide-react`, `recharts`, `d3`, …) resolve opportunistically through the esm.sh import map and generally just work.
- **`window.storage`** (claude.ai's persistence API) is supported in the desktop app. **`window.fs`** and **`window.claude.complete`** are not yet — artifacts relying on them won't fully run. (Planned shims; `window.claude` is intended to route to a local model.)
- **shadcn/ui** (`@/components/ui/*`) doesn't resolve via CDN and is out of scope.
- The source transform is regex-based and tuned for single-component artifacts; unusual module shapes may need a manual tweak.

## License

MIT © Matt Policastro
