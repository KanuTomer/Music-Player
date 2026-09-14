import { describe, expect, test } from "bun:test";
import { app, classifyApiError } from "./server";

describe("Render API boundary", () => {
  test("reports liveness without touching external services", async () => {
    const response = await app.request("http://localhost/healthz");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("rejects unknown operations with a safe envelope", async () => {
    const response = await app.request("http://localhost/api/v1/functions/not-real", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:5173" },
      body: JSON.stringify({ data: {} }),
    });
    const payload = (await response.json()) as { error: { code: string; requestId: string } };
    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("NOT_FOUND");
    expect(payload.error.requestId).toBeTruthy();
  });

  test("rejects an untrusted browser origin before an operation runs", async () => {
    const response = await app.request("http://localhost/api/v1/functions/list-scenes", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://attacker.invalid" },
      body: JSON.stringify({ data: {} }),
    });
    expect(response.status).toBe(403);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      "ORIGIN_DENIED",
    );
  });

  test("protects the cleanup endpoint", async () => {
    const response = await app.request("http://localhost/api/admin-cleanup");
    expect(response.status).toBe(401);
  });

  test("does not expose database query details", () => {
    expect(classifyApiError(new Error("Failed query: select secret from private.table"))).toEqual({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Request failed",
    });
  });
});
