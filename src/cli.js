#!/usr/bin/env node
// artie <file.jsx> [--port N] [--watch] [--browser chrome|chromium|brave|edge] [--no-launch]
// Wrap a local JSX/TSX artifact in an HTML shell, serve it, and open it in a
// minimal-chrome browser window.
import { readFileSync, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { transform } from "./transform.js";
import { buildHtml } from "./template.js";
import { startServer } from "./server.js";
import { launchApp } from "./browser.js";

function parseArgs(argv) {
  const opts = { file: null, port: 0, watch: false, browser: null, launch: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--watch":
        opts.watch = true;
        break;
      case "--no-launch":
        opts.launch = false;
        break;
      case "--port":
        opts.port = Number(argv[++i]);
        break;
      case "--browser":
        opts.browser = argv[++i];
        break;
      case "-h":
      case "--help":
        opts.help = true;
        break;
      default:
        if (arg.startsWith("-")) throw new Error(`unknown option: ${arg}`);
        if (opts.file) throw new Error(`unexpected argument: ${arg}`);
        opts.file = arg;
    }
  }
  return opts;
}

const HELP = `artie — launch a local JSX artifact in a minimal-chrome window

Usage:
  artie <file.jsx> [options]

Options:
  --watch            Reload the window when the source file changes
  --port <n>         Serve on a specific port (default: ephemeral)
  --browser <name>   chrome | chromium | brave | edge (default: first found)
  --no-launch        Serve only; print the URL instead of opening a window
  -h, --help         Show this help
`;

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`artie: ${err.message}\n`);
    process.exit(2);
  }

  if (opts.help || !opts.file) {
    process.stdout.write(HELP);
    process.exit(opts.file ? 0 : 1);
  }

  const sourcePath = resolve(opts.file);
  if (!existsSync(sourcePath)) {
    process.stderr.write(`artie: file not found: ${opts.file}\n`);
    process.exit(1);
  }

  // Re-read + re-transform on every request so --watch reflects live edits.
  const render = () => {
    const source = readFileSync(sourcePath, "utf8");
    const { code, imports } = transform(source);
    return buildHtml({
      code,
      imports,
      title: basename(sourcePath),
      watch: opts.watch,
    });
  };

  let server;
  try {
    server = await startServer({ render, sourcePath, port: opts.port });
  } catch (err) {
    process.stderr.write(`artie: could not start server: ${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(`artie: serving ${basename(sourcePath)} at ${server.url}\n`);

  // Ctrl-C shuts the server down cleanly.
  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (!opts.launch) {
    process.stdout.write("artie: --no-launch set; press Ctrl-C to stop.\n");
    return;
  }

  try {
    await launchApp({ url: server.url, browser: opts.browser });
  } catch (err) {
    process.stderr.write(`artie: ${err.message}\n`);
    await server.close();
    process.exit(1);
  }

  // Window closed -> stop serving.
  await server.close();
  process.exit(0);
}

main();
