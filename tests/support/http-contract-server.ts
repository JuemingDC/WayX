// Modified: 2026-11-02 (chance). Isolated local HTTP evidence fixture; this
// test-only server never participates in source acquisition or production output.
import http from "node:http";
import { pathToFileURL } from "node:url";
export function createContractServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://fixture");
    if (url.pathname === "/drop") {
      req.socket.destroy();
      return;
    }
    if (url.pathname === "/delay")
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.min(
            2000,
            Math.max(0, Number(url.searchParams.get("ms")) || 100),
          ),
        ),
      );
    if (req.destroyed) return;
    if (url.pathname === "/redirect") {
      res.writeHead(302, { Location: "/echo" });
      res.end();
      return;
    }
    if (url.pathname === "/cookies")
      res.setHeader("Set-Cookie", ["one=1; Path=/", "two=2; Path=/"]);
    if (url.pathname === "/duplicates") {
      res.setHeader("X-Test", ["one", "two"]);
      res.setHeader("Set-Cookie", ["one=1", "two=2"]);
    }
    if (url.pathname === "/bytes") {
      res.writeHead(200, { "Content-Type": "application/octet-stream" });
      res.end(Buffer.from([0, 1, 127, 128, 255]));
      return;
    }
    if (url.pathname === "/failure") res.statusCode = 503;
    const parts: Buffer[] = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > 65536) {
        res.writeHead(413);
        res.end();
        return;
      }
      parts.push(part);
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        method: req.method,
        url: req.url,
        headers: req.headers,
        rawHeaders: req.rawHeaders,
        body: Buffer.concat(parts).toString("utf8"),
      }),
    );
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = createContractServer(),
    host = process.argv[3] ?? "127.0.0.1",
    port = Number(process.argv[2] ?? 0);
  server.listen(port, host, () =>
    console.log(JSON.stringify({ host, address: server.address() })),
  );
}
