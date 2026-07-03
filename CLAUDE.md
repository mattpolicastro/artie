# artie

CLI that wraps a local claude.ai JSX/TSX artifact in an HTML shell and opens it in a minimal-chrome (Chrome `--app` mode) window. Zero npm dependencies — Node built-ins only.

## Structure

- `src/cli.js` — entrypoint: arg parsing + orchestration (`bin` → `artie`)
- `src/transform.js` — rewrites `export default`, strips named exports, collects bare imports
- `src/template.js` — builds the HTML shell (import map → esm.sh, Tailwind CDN, Babel standalone)
- `src/server.js` — localhost `http` server; serves HTML at `/`, mtime at `/__mtime` (watch)
- `src/browser.js` — locates a Chromium-family binary, launches `--app` with a temp profile
- `test/fixtures/` — sample artifacts for manual verification

## Key conventions

- Node, plain JS, ESM (`"type": "module"`). No build step, no dependencies.
- Rendering happens in the browser (Babel standalone); the CLI only templates + serves + launches.
- HTML is regenerated per request so `--watch` reflects live edits.

## Verify

`npm link` then `artie test/fixtures/counter.jsx` — a frameless Tailwind-styled counter window should open.
