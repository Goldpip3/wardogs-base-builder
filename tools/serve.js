/* Serve docs/ so the built site can be looked at.
 *
 *   node tools/serve.js            http://localhost:4321
 *   node tools/serve.js 8080       somewhere else
 *
 * There is no build step to preview and no dependencies to install: docs/ is finished
 * files, and this only exists because opening them as file:// URLs breaks every absolute
 * path on the site. Nothing here ships. It sends no-store so a rebuild is one refresh
 * away rather than a puzzle about why the page did not change.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "docs");
const PORT = Number(process.argv[2]) || 4321;
const TYPES = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xml": "application/xml",
  ".txt": "text/plain",
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const full = path.join(ROOT, rel);
  /* A path that climbs out of docs/ is not a page on this site. */
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end("outside docs/"); }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found: " + rel); }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(full)] || "application/octet-stream",
      "cache-control": "no-store, must-revalidate",
    });
    res.end(buf);
  });
}).listen(PORT, () => console.log("docs/ on http://localhost:" + PORT));
