// Locate a Chromium-family browser and launch it in --app mode (frameless, no
// tabs/URL bar) against a scoped temp profile so the window is isolated and
// closing it exits the spawned process.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// macOS install locations, keyed by the --browser value.
const BROWSERS = {
  chrome: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  chromium: ["/Applications/Chromium.app/Contents/MacOS/Chromium"],
  brave: ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
  edge: ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
};

function resolveBinary(preferred) {
  const order = preferred
    ? [preferred]
    : ["chrome", "chromium", "brave", "edge"];
  for (const key of order) {
    for (const path of BROWSERS[key] ?? []) {
      if (existsSync(path)) return path;
    }
  }
  return null;
}

// Launch and resolve when the window/process closes. Cleans up the temp profile.
export function launchApp({ url, browser } = {}) {
  const binary = resolveBinary(browser);
  if (!binary) {
    const hint = browser ? `'${browser}'` : "Chrome/Chromium/Brave/Edge";
    throw new Error(`no ${hint} browser found on this machine`);
  }

  const profileDir = mkdtempSync(join(tmpdir(), "artie-"));
  const child = spawn(
    binary,
    [
      `--app=${url}`,
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--new-window",
    ],
    { stdio: "ignore" }
  );

  const cleanup = () => {
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  };

  return new Promise((resolve, reject) => {
    child.on("error", (err) => {
      cleanup();
      reject(err);
    });
    child.on("exit", () => {
      cleanup();
      resolve();
    });
  });
}
