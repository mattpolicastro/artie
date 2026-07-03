// Turn a claude.ai single-file artifact into source that runs inside an inline
// Babel module: capture its default export and neutralize other module syntax.
// Regex-based on purpose — tuned for single-component artifacts, not a general
// bundler.

const BARE_IMPORT = /import\s+(?:[\s\S]+?\s+from\s+)?["']([^"']+)["'];?/g;
const CSS_IMPORT = /^\s*import\s+["'][^"']+\.css["'];?\s*$/gm;
const NAMED_EXPORT = /^(\s*)export\s+(?=(?:const|let|var|function|class|async)\b)/gm;
const DEFAULT_EXPORT = /export\s+default\s+/;

// Collect the bare (non-relative) module specifiers the artifact imports, so the
// template can map each one to esm.sh via an import map.
function collectImports(source) {
  const specs = new Set();
  for (const match of source.matchAll(BARE_IMPORT)) {
    const spec = match[1];
    if (spec.startsWith(".") || spec.startsWith("/")) continue;
    specs.add(spec);
  }
  return specs;
}

export function transform(source) {
  const imports = collectImports(source);

  let code = source
    // Drop relative CSS side-effect imports (nothing to resolve them to).
    .replace(CSS_IMPORT, "")
    // `export const Foo = ...` / `export function Bar()` -> strip the keyword so
    // the declaration still runs but isn't module-level export syntax.
    .replace(NAMED_EXPORT, "$1");

  if (DEFAULT_EXPORT.test(code)) {
    // `export default <expr>` -> assign to a global the bootstrap can render.
    // Works for function/class/arrow/identifier forms, which are all valid as
    // the right-hand side of an assignment.
    code = code.replace(DEFAULT_EXPORT, "globalThis.__ARTIE_DEFAULT__ = ");
  }

  return { code, imports, hasDefault: DEFAULT_EXPORT.test(source) };
}
