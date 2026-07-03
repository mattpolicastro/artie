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
