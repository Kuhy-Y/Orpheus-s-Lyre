const http = require("http");
const fs = require("fs");
const path = require("path");

const host = "127.0.0.1";
const port = 8000;
const root = __dirname;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg"
};

function resolveFilePath(requestUrl) {
  const pathname = requestUrl === "/" ? "/index.html" : requestUrl.split("?")[0];
  const safePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.resolve(root, safePath);

  if (!filePath.startsWith(root)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = resolveFilePath(req.url || "/");

  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[ext] || "application/octet-stream"
    });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Server ready at http://${host}:${port}`);
});
