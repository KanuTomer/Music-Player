import { afterEach, describe, expect, test } from "bun:test";
import { proxyToRenderPath } from "./_render-proxy";

const originalFetch = globalThis.fetch;
const originalRenderUrl = process.env["RENDER_API_BASE_URL"];

function responseFixture() {
  const state = { status: 200, body: "", headers: {} as Record<string, string | string[]> };
  const response = {
    status(code: number) {
      state.status = code;
      return response;
    },
    setHeader(name: string, value: string | string[]) {
      state.headers[name] = value;
    },
    send(value: string | Buffer) {
      state.body = String(value);
    },
    json(value: unknown) {
      state.body = JSON.stringify(value);
    },
  };
  return { response, state };
}

function requestFixture(method: string, url: string, body?: string) {
  return {
    method,
    url,
    headers: { cookie: "session=test", origin: "https://www.sainikdhaba.in" },
    body,
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) yield Buffer.from(body);
    },
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalRenderUrl === undefined) delete process.env["RENDER_API_BASE_URL"];
  else process.env["RENDER_API_BASE_URL"] = originalRenderUrl;
});

describe("Render API proxy", () => {
  test("forwards only the requested API path, query, cookie, and raw body", async () => {
    process.env["RENDER_API_BASE_URL"] = "https://api.example.test/";
    let forwarded: Request | undefined;
    globalThis.fetch = (async (input, init) => {
      forwarded = new Request(input, init);
      return Response.json({ data: "ok" });
    }) as typeof fetch;

    const fixture = responseFixture();
    await proxyToRenderPath(
      requestFixture("POST", "/api/render-v1?path=functions/list-scenes&scope=live", '{"x":1}'),
      fixture.response,
      "/api/v1/functions/list-scenes",
    );

    expect(forwarded?.url).toBe("https://api.example.test/api/v1/functions/list-scenes?scope=live");
    expect(forwarded?.headers.get("cookie")).toBe("session=test");
    expect(await forwarded?.text()).toBe('{"x":1}');
    expect(fixture.state.status).toBe(200);
  });

  test("fails closed when the Render destination is unavailable", async () => {
    delete process.env["RENDER_API_BASE_URL"];
    const fixture = responseFixture();
    await proxyToRenderPath(
      requestFixture("GET", "/api/render-v1?path=functions/list-scenes"),
      fixture.response,
      "/api/v1/functions/list-scenes",
    );
    expect(fixture.state.status).toBe(503);
  });
});
