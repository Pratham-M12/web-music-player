const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5500;
const FRONTEND_DIR = path.join(__dirname, "frontend");

const MIME_TYPES = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".mp4":  "video/mp4",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0]; // strip query strings
  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath.startsWith("/frontend/")) {
    urlPath = urlPath.replace(/^\/frontend/, "");
  }

  const filePath = path.join(FRONTEND_DIR, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (ext && ext !== ".html") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }

      // Fallback to index.html for SPA routing
      fs.readFile(path.join(FRONTEND_DIR, "index.html"), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end("404 Not Found");
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data2);
        }
      });
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("✅ SONIX Frontend Server running!");
  console.log(`   Site:     http://127.0.0.1:${PORT}`);
  console.log(`   Callback: http://127.0.0.1:${PORT}/callback.html`);
});
