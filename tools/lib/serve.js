/* The repository served over HTTP for the browser checks (W26).

   Seven checks each carried their own copy of this server, and the copies
   drifted: two served an SVG as text/html. One server, one content-type
   list, the same 404 rule for everyone.

     var serve = require("./lib/serve");
     var server = serve(root, { onRequest: fn(pathname), onMissing: fn(pathname) });
     // root may be a function, read on every request (a check that switches
     // between two checkouts, as stresscheck does)

   Never caches (no-store), never serves outside root, never lists a
   directory. */
"use strict";
var fs = require("fs"), http = require("http"), path = require("path");

var TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
              ".json": "application/json", ".webmanifest": "application/manifest+json",
              ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
              ".woff2": "font/woff2", ".txt": "text/plain" };
function mime(file) { return TYPES[path.extname(file).toLowerCase()] || "application/octet-stream"; }

function serve(root, opts) {
  opts = opts || {};
  return http.createServer(function (req, res) {
    var base = typeof root === "function" ? root() : root;
    var p = new URL(req.url, "http://localhost").pathname, rel;
    try { rel = decodeURIComponent(p.slice(1)); } catch (e) { rel = p.slice(1); }
    if (opts.onRequest) opts.onRequest(p);
    var file = path.join(base, p === "/" ? "index.html" : rel);
    if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (opts.onMissing) opts.onMissing(p);
      res.writeHead(404); res.end("not found"); return;
    }
    res.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
}

module.exports = serve;
module.exports.mime = mime;
