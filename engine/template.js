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

export function buildHtml({ code, imports, needsReactShim = true, title = "artie", watch = false }) {
  const importMap = JSON.stringify({ imports: buildImportMap(imports) }, null, 2);

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
