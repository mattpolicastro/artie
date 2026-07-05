# artie — Worklog

## 2026-07-03

**What:** Built the initial CLI (v0.1.0): point at a local `.jsx`/`.tsx` claude.ai artifact and it wraps it in an HTML shell, serves it from an ephemeral localhost server, and opens it in a frameless Chrome `--app` window. Verified end-to-end in a real browser (counter renders + increments, Tailwind styling applies, lucide-react resolves via the auto import-map, close → CLI exits → temp profile cleaned up).

**Decisions:** Node plain-JS ESM, zero npm dependencies (built-ins only). In-browser Babel + esm.sh CDN (no build step) over an esbuild bundle. Chrome `--app` mode over an embedded webview. Import map auto-generated from scanned bare imports → any lib (not just Tailwind) resolves opportunistically. HTML regenerated per request so `--watch` reflects live edits. Exposed as an installed `bin` via `npm link` (diverges from the repo's usual npm-scripts convention because this is a genuine command).

**Next:** `--watch` reload is implemented but not yet manually exercised. Not solved: claude.ai-only runtime APIs (`window.fs`, `window.claude.complete`) and shadcn/ui (`@/components/ui/*`) — both would need the deferred esbuild-bundle path. No git repo initialized yet.

---

## 2026-07-03 (later)

**What:** Renamed the project `jsxwrap` → **artie** (from "artifact"), swept all identifiers (bin, log prefixes, `__ARTIE_DEFAULT__` global, temp-profile prefix), rewrote the README as the public face, added LICENSE (MIT) + `.gitignore`, and published to a public GitHub repo.

**Decisions:** Picked `artie` after checking collisions — `summon`/`conjure`/`sidecar` all cluster in the CyberArk secrets ecosystem; `artie` is the cleanest (only collision is an unrelated DB-replication startup). Kept it a `git clone` + `npm link` install rather than publishing to npm.

**Next:** Manually exercise `--watch` live-edit reload. Consider npm publish later if it proves useful.

---

## 2026-07-03 (bugfix)

**What:** Fixed blank-window rendering for any artifact that imports the `React` default (e.g. `import React, { useState } from "react"`) — the common claude.ai shape. The template was unconditionally injecting its own `import React from 'react'`, producing a second `React` declaration → `SyntaxError: Identifier 'React' has already been declared` → Babel aborts → blank. Diagnosed live on `ep40-riddim-trainer.jsx`, which now renders and is interactive.

**Decisions:** Template bootstrap now imports React/createRoot under private aliases (`__artieReact`, `__artieCreateRoot`) so it never collides with the artifact's bindings. The `import React` shim (needed for classic-JSX-runtime artifacts that only do named imports, like the counter fixture) is added only when `transform` reports the artifact doesn't already import React (`needsReactShim`). Added `test/fixtures/react-default-import.jsx` as a regression case.

**Next:** Same as above (`--watch` manual test). The regex `transform` still won't handle exotic module shapes, but the two common import styles are now both covered.

---

## 2026-07-05

**What:** Built the first "platform" slice — a Tauri v2 desktop app (`app/`) with the `drop > runs > remembers` loop and a sidebar shell (applet list + settings). Extracted the shared engine to `engine/`, added disk-backed per-applet state, and polyfilled claude.ai's `window.storage`. Verified the full loop (including quit/relaunch persistence) on `ep40-riddim-trainer.jsx`.

**Decisions & gotchas:**
- **Positioning as a razor:** basic users run applets in Claude, experts roll their own stack — artie is the intermediate tier. Every feature must remove a papercut for that user without becoming expert tooling. Drove the "drop anywhere + sidebar" UI and keeping a native title bar over a custom frame.
- **WKWebView does not persist localStorage across app restarts under a custom URL scheme** (`artie://`). First attempt (namespaced localStorage) survived reloads but not quits. Fix: artie owns state on disk (`state/<id>.json`); the engine seeds it into the applet on launch and the shim posts mutations up to the host via `postMessage`, which writes to disk. Origin/scheme-independent.
- **Many artifacts persist via `window.storage`, not `localStorage`** (async KV, `get()→{value}`). ep-40 used it, so it "never persisted" until polyfilled. This is the first runtime-API shim; `window.fs` / `window.claude`→Ollama are the planned next ones.
- Engine (`transform`/`template`) is pure string work with zero Node deps, so the Tauri frontend imports it directly (Vite `fs.allow: ['..']`); the CLI stays build-free.

**Next:** Custom app icon; packaged build + release bundling via GitHub Actions. Then the platform modules: offline vendored frameworks, `window.claude`→Ollama shim, `window.fs`.

---
