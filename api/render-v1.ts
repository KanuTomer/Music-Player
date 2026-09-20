import { proxyToRenderPath } from "./_render-proxy.js";

export const config = { api: { bodyParser: false } };

type RequestWithPath = Parameters<typeof proxyToRenderPath>[0] & {
  query?: Record<string, string | string[] | undefined>;
};

function requestPath(request: RequestWithPath): string | null {
  const value = request.query?.["path"];
  const path = Array.isArray(value) ? value.join("/") : value;
  if (!path || !/^[A-Za-z0-9_./-]+$/.test(path) || path.split("/").includes("..")) return null;
  return path;
}

export default (request: RequestWithPath, response: Parameters<typeof proxyToRenderPath>[1]) => {
  const path = requestPath(request);
  if (!path) return response.status(404).json({ error: "Not found" });
  return proxyToRenderPath(request, response, `/api/v1/${path}`);
};
