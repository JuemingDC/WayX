// Modified: 2026-11-02 (chance). Run manually in an HTTP script on each real
// client against the controlled fixture. This is test tooling, never an adblock dependency.
(async function () {
  const raw = typeof $argument === "string" ? $argument : "";
  if (!/^http:\/\/[^/?#]+$/.test(raw))
    throw Error(
      "Supply the fixture origin as $argument, e.g. http://192.168.1.2:8080",
    );
  const target =
    typeof $loon === "string"
      ? "loon"
      : typeof $task !== "undefined"
        ? "qx"
        : "surge";
  const records = [];
  function request(method, route, timeout, body) {
    const headers = {
      "User-Agent": "WayX-contract-probe",
      Accept: "application/json",
      "Accept-Encoding": "identity",
    };
    if (body !== undefined) headers["Content-Type"] = "text/plain";
    const opts = {
      url: raw + route,
      method,
      headers,
      "auto-cookie": false,
      "auto-redirect": false,
    };
    if (body !== undefined) opts.body = body;
    const start = Date.now();
    const finish = (kind, response, data, error) => ({
      method,
      route,
      kind,
      elapsedMs: Date.now() - start,
      status: response && (response.statusCode || response.status),
      headers: response && response.headers,
      text: typeof data === "string" ? data : undefined,
      bytes:
        data instanceof Uint8Array
          ? Array.from(data)
          : data instanceof ArrayBuffer
            ? Array.from(new Uint8Array(data))
            : undefined,
      error: error == null ? error : String(error),
    });
    if (target === "qx") {
      opts.opts = { redirection: false, "auto-cookie": false };
      delete opts["auto-redirect"];
      delete opts["auto-cookie"];
      // No invented QX timeout. The delay sample records completion, not cancellation.
      return $task.fetch(opts).then(
        (r) => finish("success", r, r.bodyBytes || r.body),
        (e) => finish("error", null, null, (e && e.error) || e),
      );
    }
    opts.timeout = target === "surge" ? timeout / 1000 : timeout;
    return new Promise((resolve) =>
      $httpClient[method.toLowerCase()](opts, (e, r, d) =>
        resolve(finish(e ? "error" : "success", r, d, e)),
      ),
    );
  }
  for (const method of [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "PATCH",
  ])
    records.push(
      await request(
        method,
        "/echo",
        1000,
        ["POST", "PUT", "PATCH", "DELETE"].includes(method)
          ? "probe"
          : undefined,
      ),
    );
  for (const route of [
    "/redirect",
    "/cookies",
    "/echo",
    "/duplicates",
    "/bytes",
    "/failure",
    "/drop",
    "/delay?ms=500",
  ])
    records.push(await request("GET", route, 100));
  let wasm;
  try {
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    wasm = {
      available: typeof WebAssembly !== "undefined",
      emptyModuleCompiled: !!new WebAssembly.Module(bytes),
    };
  } catch (e) {
    wasm = { error: String(e) };
  }
  console.log(JSON.stringify({ target, wasm, records }, null, 2));
  $done({});
})().catch((error) => {
  console.log(String(error));
  $done({});
});
