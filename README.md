# artie

**artie** launches a local [claude.ai](https://claude.ai) JSX/TSX artifact in a minimal-chrome browser window. Point it at a `.jsx` file and it opens a frameless, tabless window that just runs the component — no build step, no `node_modules`, no project scaffolding.

```
artie ./counter.jsx
```

> _artie ← **arti**fact._ Claude generates a single-file React component; artie gives it a window to live in.

## Why

Claude generates React artifacts as single default-exported components (JSX + Tailwind, sometimes a lib like `lucide-react` or `recharts`). Running one locally normally means hand-rolling an HTML shell or pasting it back into a sandbox. artie collapses that into one command.

## How it works

1. Reads your artifact and rewrites its `export default` so it can render inside an inline module.
2. Generates an HTML shell: an [import map](https://developer.mozilla.org/docs/Web/HTML/Element/script/type/importmap) pointing every bare import at [esm.sh](https://esm.sh), the [Tailwind](https://tailwindcss.com) Play CDN, and [Babel standalone](https://babeljs.io) — which transpiles the JSX in the browser.
3. Serves it from an ephemeral `localhost` server.
4. Launches your installed Chrome/Chromium in `--app` mode against a scoped temp profile, so you get a clean app window and closing it shuts everything down.

No bundler, no install step for the artifact's dependencies — they stream from the CDN at runtime.

## Install

Requires **Node ≥ 18** and a Chromium-family browser (Chrome, Chromium, Brave, or Edge).

```
git clone https://github.com/mattpolicastro/artie.git
cd artie
npm link          # exposes the `artie` command on your PATH
```

## Usage

```
artie ./my-artifact.jsx                 # open it in a window
artie ./my-artifact.jsx --watch         # reload the window on save
artie ./my-artifact.jsx --browser brave # pick the browser
artie ./my-artifact.jsx --no-launch     # serve only, print the URL
artie --help
```

Close the window to stop the server (or hit Ctrl-C).

| Option | Description |
| --- | --- |
| `--watch` | Reload the window when the source file changes. |
| `--port <n>` | Serve on a specific port (default: ephemeral). |
| `--browser <name>` | `chrome` \| `chromium` \| `brave` \| `edge` (default: first found). |
| `--no-launch` | Serve only; print the URL instead of opening a window. |

## Notes & limitations

- **Needs internet** — React, libraries, and Tailwind load from CDNs at runtime.
- **Tailwind** is the guaranteed styling path. Other bare imports (`lucide-react`, `recharts`, `d3`, …) resolve opportunistically through the esm.sh import map and generally just work.
- **claude.ai-only APIs** (`window.fs`, `window.claude.complete`) aren't available here — artifacts relying on them won't fully run.
- **shadcn/ui** (`@/components/ui/*`) doesn't resolve via CDN and is out of scope.
- The source transform is regex-based and tuned for single-component artifacts; unusual module shapes may need a manual tweak.

## License

MIT © Matt Policastro
