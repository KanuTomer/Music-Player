type ProxyRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
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
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers[name];
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(", "));
  }
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", "https");
  const method = request.method ?? "GET";
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : typeof request.body === "string" || request.body instanceof Buffer
        ? request.body
        : JSON.stringify(request.body ?? {});
  try {
    const init: RequestInit = { method, headers, redirect: "manual" };
    if (body !== undefined) init.body = body;
    const upstream = await fetch(`${renderBase}${path}${incoming.search}`, init);
    response.status(upstream.status);
    for (const name of ["content-type", "location", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie;
    const cookies = getSetCookie?.call(upstream.headers) ?? [];
    if (cookies.length) response.setHeader("set-cookie", cookies);
    response.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("[render-proxy] failed", {
      path: prefix,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    response.status(502).json({ error: "API proxy failed" });
  }
}
