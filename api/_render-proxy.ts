type ProxyRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
} & AsyncIterable<Uint8Array>;
type ProxyResponse = {
  status: (code: number) => ProxyResponse;
  setHeader: (name: string, value: string | string[]) => void;
  send: (value: string | Buffer) => void;
  json: (value: unknown) => void;
};

const FORWARDED_HEADERS = [
  "accept",
  "content-type",
  "cookie",
  "origin",
  "user-agent",
  "x-request-id",
];

async function requestBody(
  request: ProxyRequest,
  method: string,
): Promise<Uint8Array | string | undefined> {
  if (method === "GET" || method === "HEAD") return undefined;
  if (typeof request.body === "string" || request.body instanceof Uint8Array) return request.body;
  const chunks: Uint8Array[] = [];
  try {
    for await (const chunk of request) chunks.push(chunk);
  } catch {
    return undefined;
  }
  if (chunks.length === 0) return undefined;
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function setCookies(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const values = getSetCookie?.call(headers) ?? [];
  if (values.length) return values;
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

export async function proxyToRender(
  request: ProxyRequest,
  response: ProxyResponse,
  prefix: "/api/auth" | "/api/v1",
) {
  const renderBase = process.env["RENDER_API_BASE_URL"]?.replace(/\/$/, "");
  if (!renderBase) return response.status(503).json({ error: "API proxy is unavailable" });
  const incoming = new URL(request.url ?? prefix, "https://proxy.invalid");
  const marker = incoming.pathname.indexOf(prefix);
  if (marker < 0) return response.status(404).json({ error: "Not found" });
  const path = incoming.pathname.slice(marker);
  if (!path.startsWith("/api/")) return response.status(404).json({ error: "Not found" });
  return proxyToRenderPath(request, response, path as `/api/${string}`);
}

export async function proxyToRenderPath(
  request: ProxyRequest,
  response: ProxyResponse,
  path: `/api/${string}`,
) {
  if (process.env["CUTOVER_MAINTENANCE"] === "true") {
    return response.status(503).json({ error: "Service is temporarily unavailable" });
  }
  const renderBase = process.env["RENDER_API_BASE_URL"]?.replace(/\/$/, "");
  if (!renderBase) return response.status(503).json({ error: "API proxy is unavailable" });
  const incoming = new URL(request.url ?? path, "https://proxy.invalid");
  incoming.searchParams.delete("path");
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers[name];
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(", "));
  }
  const method = request.method ?? "GET";
  const body = await requestBody(request, method);
  try {
    const init: RequestInit = { method, headers, redirect: "manual" };
    if (typeof body === "string") init.body = body;
    else if (body !== undefined) {
      const bytes = new Uint8Array(body.byteLength);
      bytes.set(body);
      init.body = bytes.buffer;
    }
    const upstream = await fetch(`${renderBase}${path}${incoming.search}`, init);
    response.status(upstream.status);
    for (const name of ["content-type", "location", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    const cookies = setCookies(upstream.headers);
    if (cookies.length) response.setHeader("set-cookie", cookies);
    response.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("[render-proxy] failed", {
      path,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    response.status(502).json({ error: "API proxy failed" });
  }
}
