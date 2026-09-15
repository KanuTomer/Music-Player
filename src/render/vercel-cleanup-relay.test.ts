import { afterEach, describe, expect, test } from "bun:test";
import handler from "../../api/admin-cleanup";

const originalFetch = globalThis.fetch;
const originalSecret = process.env["CRON_SECRET"];
const originalRenderUrl = process.env["RENDER_API_BASE_URL"];

function responseFixture() {
  const state = { status: 200, body: "", headers: {} as Record<string, string> };
  const response = {
    status(code: number) {
      state.status = code;
      return response;
    },
    json(value: unknown) {
      state.body = JSON.stringify(value);
    },
    setHeader(name: string, value: string) {
      state.headers[name] = value;
    },
    send(value: string) {
      state.body = value;
    },
  };
  return { response, state };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env["CRON_SECRET"];
  else process.env["CRON_SECRET"] = originalSecret;
  if (originalRenderUrl === undefined) delete process.env["RENDER_API_BASE_URL"];
  else process.env["RENDER_API_BASE_URL"] = originalRenderUrl;
});

describe("Vercel cleanup relay", () => {
  test("rejects requests without the cron bearer secret", async () => {
    process.env["CRON_SECRET"] = "test-secret";
    const fixture = responseFixture();
    await handler({ headers: {} }, fixture.response);
    expect(fixture.state.status).toBe(401);
  });

  test("forwards an authorized request to Render", async () => {
    process.env["CRON_SECRET"] = "test-secret";
    process.env["RENDER_API_BASE_URL"] = "https://api.example.test/";
    let forwarded: Request | undefined;
    globalThis.fetch = (async (input, init) => {
      forwarded = new Request(input, init);
      return Response.json({ backend: "neon", claimed: 0 });
    }) as typeof fetch;

    const fixture = responseFixture();
    await handler({ headers: { authorization: "Bearer test-secret" } }, fixture.response);
    expect(fixture.state.status).toBe(200);
    expect(forwarded?.url).toBe("https://api.example.test/api/admin-cleanup");
    expect(forwarded?.headers.get("authorization")).toBe("Bearer test-secret");
  });
});
