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
  ".txt": "text/plain", ".jpg": "image/jpeg", ".webm": "video/webm", ".mp4": "video/mp4",
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const full = path.join(ROOT, rel);
  /* A path that climbs out of docs/ is not a page on this site. */
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end("outside docs/"); }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("not found: " + rel); }
    const head = {
      "content-type": TYPES[path.extname(full)] || "application/octet-stream",
      "cache-control": "no-store, must-revalidate",
      /* Video needs this. Without range support a browser cannot seek the hero loop, and
         Safari refuses to play media at all. GitHub Pages does ranges, so a local preview
         that did not was lying about the one thing you preview a video for. */
      "accept-ranges": "bytes",
    };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : st.size - Number(m[2]);
      let end = m[1] && m[2] ? Number(m[2]) : st.size - 1;
      start = Math.max(0, start); end = Math.min(st.size - 1, end);
      if (start > end) {
        res.writeHead(416, { "content-range": `bytes */${st.size}` });
        return res.end();
      }
      res.writeHead(206, { ...head, "content-range": `bytes ${start}-${end}/${st.size}`,
        "content-length": end - start + 1 });
      return fs.createReadStream(full, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...head, "content-length": st.size });
    fs.createReadStream(full).pipe(res);
  });
}).listen(PORT, () => console.log("docs/ on http://localhost:" + PORT));
