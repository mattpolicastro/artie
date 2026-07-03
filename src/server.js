// Tiny localhost server: serves the generated HTML at `/`, and (watch mode)
// exposes the source file's mtime at `/__mtime` for the reload poll.
import { createServer } from "node:http";
import { statSync } from "node:fs";

// Regenerate HTML per request so --watch always serves the current source.
export function startServer({ render, sourcePath, port = 0 }) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === "/__mtime") {
        try {
          res.writeHead(200, { "content-type": "text/plain" });
          res.end(String(statSync(sourcePath).mtimeMs));
        } catch {
          res.writeHead(404).end();
        }
        return;
      }
      if (req.url === "/" || req.url === "/index.html") {
        try {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(render());
        } catch (err) {
          res.writeHead(500, { "content-type": "text/plain" });
          res.end(`artie: ${err.message}`);
        }
        return;
      }
      res.writeHead(404).end();
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const { port: actual } = server.address();
      resolve({
        url: `http://127.0.0.1:${actual}`,
        port: actual,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
