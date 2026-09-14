import { describe, expect, test } from "bun:test";
import { getRequestHeader, getRequestId, withRequestContext } from "./request-context.server";

describe("Node request context", () => {
  test("scopes headers and request IDs across async work", async () => {
    expect(getRequestId()).toBeNull();
    await withRequestContext(
      { headers: new Headers({ authorization: "Bearer example" }), requestId: "request-1" },
      async () => {
        await Promise.resolve();
        expect(getRequestHeader("authorization")).toBe("Bearer example");
        expect(getRequestId()).toBe("request-1");
      },
    );
    expect(getRequestId()).toBeNull();
  });
});
