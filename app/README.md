# artie desktop app

Tauri v2 desktop launcher for artie. Drop a `.jsx`/`.tsx` artifact, run it, remember it.

```
npm install
npm run tauri dev      # run in development
npm run tauri build    # package (WIP)
```

## Layout

- `index.html`, `src/main.js`, `src/styles.css` — the launcher frontend (vanilla JS + Vite, plain CSS). Imports the shared engine from `../engine/`.
- `src-tauri/src/lib.rs` — Rust backend: the `artie://` URI scheme that serves staged applet HTML, the library (`library.json`), and per-applet disk state (`state/<id>.json`).
- `src-tauri/tauri.conf.json` — window + build config.

See the repo root `README.md` for the bigger picture and the CLI.
