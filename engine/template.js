// Build the standalone HTML shell that renders a transformed artifact:
//   import map -> esm.sh   +   Tailwind CDN   +   Babel standalone
// The artifact is transpiled in the browser; no local build step.

const REACT = "18";
const BABEL = "https://unpkg.com/@babel/standalone@7/babel.min.js";
const TAILWIND = "https://cdn.tailwindcss.com";

function buildImportMap(imports) {
  const map = {
    react: `https://esm.sh/react@${REACT}`,
    "react-dom": `https://esm.sh/react-dom@${REACT}`,
    "react-dom/client": `https://esm.sh/react-dom@${REACT}/client`,
    "react/jsx-runtime": `https://esm.sh/react@${REACT}/jsx-runtime`,
  };
  for (const spec of imports) {
    if (map[spec]) continue; // never override the pinned React entries
    // external=react,react-dom -> the lib shares the app's single React copy.
    map[spec] = `https://esm.sh/${spec}?external=react,react-dom&deps=react@${REACT},react-dom@${REACT}`;
  }
  return map;
}

// Per-applet runtime shims, injected as head scripts before Babel transpiles.
//
// State is owned by artie, not the webview: WKWebView does NOT persist
// localStorage across app restarts under a custom scheme. So we seed the
// applet's saved state (from disk, via the host) into an in-memory store, serve
// synchronous `localStorage` and async `window.storage` reads from it, and post
// every mutation up to the parent frame — which writes it back to disk. This
// survives restarts because the source of truth is a file, not webview storage.
//
// `seed` is a JSON string ({} when empty); `<` is escaped to avoid a </script>
// breakout when embedded.
function runtimeShim(appletId, seed) {
  const safeSeed = (typeof seed === "string" && seed ? seed : "{}").replace(/</g, "\\u003c");
  return `
<script>
window.__ARTIE_ID__ = ${JSON.stringify(appletId)};
window.__ARTIE_SEED__ = ${safeSeed};
(function () {
  var store = window.__ARTIE_SEED__;
  if (typeof store !== 'object' || store === null) store = {};
  var id = window.__ARTIE_ID__;
  function persist() {
    try { parent.postMessage({ source: 'artie', id: id, state: store }, '*'); } catch (e) {}
  }
  var has = function (k) { return Object.prototype.hasOwnProperty.call(store, k); };

  // Synchronous localStorage, served from the seed, persisted async on change.
  var ls = {
    getItem: function (k) { return has(k) ? String(store[k]) : null; },
    setItem: function (k, v) { store[k] = String(v); persist(); },
    removeItem: function (k) { delete store[k]; persist(); },
    clear: function () { Object.keys(store).forEach(function (k) { delete store[k]; }); persist(); },
    key: function (i) { var ks = Object.keys(store); return i < ks.length ? ks[i] : null; },
    get length() { return Object.keys(store).length; }
  };
  try { Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { return ls; } }); } catch (e) {}

  // claude.ai async window.storage over the same store.
  if (!window.storage) {
    window.storage = {
      get: function (k) { return Promise.resolve(has(k) ? { value: String(store[k]) } : null); },
      set: function (k, v) { store[k] = String(v); persist(); return Promise.resolve(); },
      delete: function (k) { delete store[k]; persist(); return Promise.resolve(); }
    };
  }
})();
</script>`;
}

// Poll the server for the source mtime; reload when it changes (--watch).
const WATCH_SCRIPT = `
<script>
(async () => {
  let last = null;
  for (;;) {
    try {
      const r = await fetch('/__mtime', { cache: 'no-store' });
      const m = await r.text();
      if (last !== null && m !== last) location.reload();
      last = m;
    } catch (_) {}
    await new Promise((res) => setTimeout(res, 500));
  }
})();
</script>`;

export function buildHtml({ code, imports, needsReactShim = true, title = "artie", watch = false, appletId = null, seed = "{}" }) {
  const importMap = JSON.stringify({ imports: buildImportMap(imports) }, null, 2);
  const state = appletId ? runtimeShim(appletId, seed) : "";

  // Classic JSX transpiles to `React.createElement`, so `React` must be in
  // scope where the artifact's JSX lives. Only add the import when the artifact
  // doesn't already declare `React` itself — a second `import React` in the
  // same module is a "React has already been declared" SyntaxError.
  const reactShim = needsReactShim ? "import React from 'react';" : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
${state}
<script type="importmap">
${importMap}
</script>
<script src="${TAILWIND}"></script>
<script src="${BABEL}"></script>
<style>html,body,#root{height:100%;margin:0}</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-type="module" data-presets="react,typescript">
// Bootstrap imports use private aliases so they never collide with whatever the
// artifact imports under the same names (React, createRoot, ...).
import * as __artieReact from 'react';
import { createRoot as __artieCreateRoot } from 'react-dom/client';
${reactShim}

${code}

const __Artifact = globalThis.__ARTIE_DEFAULT__;
const __root = __artieCreateRoot(document.getElementById('root'));
if (__Artifact) {
  __root.render(__artieReact.createElement(__artieReact.StrictMode, null, __artieReact.createElement(__Artifact)));
} else {
  __root.render(__artieReact.createElement('pre', { style: { padding: 16, color: 'crimson' } },
    'artie: no default export found in the artifact.'));
}
</script>
${watch ? WATCH_SCRIPT : ""}
</body>
</html>
`;
}
