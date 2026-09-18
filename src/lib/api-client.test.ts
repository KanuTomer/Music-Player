import { afterEach, describe, expect, test } from "bun:test";
import { callApi } from "./api-client";

const originalFetch = globalThis.fetch;
const originalUrl = process.env["VITE_API_BASE_URL"];

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env["VITE_API_BASE_URL"];
  else process.env["VITE_API_BASE_URL"] = originalUrl;
});

describe("Render API client", () => {
  test("preserves operation data and response payloads", async () => {
    process.env["VITE_API_BASE_URL"] = "https://api.example.test/";
    let request: Request | undefined;
    globalThis.fetch = (async (input, init) => {
      request = new Request(input, init);
      return Response.json({ data: { ok: true } });
    }) as typeof fetch;

    await expect(callApi<{ ok: boolean }>("example", { value: 1 })).resolves.toEqual({ ok: true });
    expect(request?.url).toBe("https://api.example.test/api/v1/functions/example");
    expect(await request?.json()).toEqual({ data: { value: 1 } });
    expect(request?.headers.has("authorization")).toBe(false);
  });

  test("retries a safe read once after a network failure", async () => {
    process.env["VITE_API_BASE_URL"] = "https://api.example.test";
    let attempts = 0;
    globalThis.fetch = (async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("network unavailable");
      return Response.json({ data: "ready" });
    }) as typeof fetch;

    await expect(callApi<string>("read", null, { safeRead: true })).resolves.toBe("ready");
    expect(attempts).toBe(2);
  });

  test("retries a safe read once while the free backend wakes", async () => {
    process.env["VITE_API_BASE_URL"] = "https://api.example.test";
    let attempts = 0;
    globalThis.fetch = (async () => {
      attempts += 1;
      if (attempts === 1) {
        return Response.json({ error: { message: "Unavailable" } }, { status: 503 });
      }
      return Response.json({ data: "awake" });
    }) as typeof fetch;

    await expect(callApi<string>("read", null, { safeRead: true })).resolves.toBe("awake");
    expect(attempts).toBe(2);
  });

  test("does not retry mutations and exposes only the safe API error", async () => {
    process.env["VITE_API_BASE_URL"] = "https://api.example.test";
    let attempts = 0;
    globalThis.fetch = (async () => {
      attempts += 1;
      return Response.json(
        { error: { code: "INVALID_REQUEST", message: "Invalid input", requestId: "request-2" } },
        { status: 400 },
      );
    }) as typeof fetch;

    let caught: (Error & { code?: string; requestId?: string }) | undefined;
    try {
      await callApi<void>("write", {});
    } catch (error) {
      caught = error as Error & { code?: string; requestId?: string };
    }
    expect(caught?.message).toBe("Invalid input");
    expect(caught?.code).toBe("INVALID_REQUEST");
    expect(caught?.requestId).toBe("request-2");
    expect(attempts).toBe(1);
  });
});
