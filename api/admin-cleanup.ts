type RelayRequest = {
  headers: Record<string, string | string[] | undefined>;
};

type RelayResponse = {
  status: (code: number) => RelayResponse;
  json: (value: unknown) => void;
  setHeader: (name: string, value: string) => void;
  send: (value: string) => void;
};

export const config = { maxDuration: 300 };

function authorizationHeader(request: RelayRequest): string | undefined {
  const value = request.headers["authorization"];
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(
  request: RelayRequest,
  response: RelayResponse,
): Promise<void> {
  const secret = process.env["CRON_SECRET"];
  const renderBaseUrl = process.env["RENDER_API_BASE_URL"]?.replace(/\/$/, "");
  if (!secret || authorizationHeader(request) !== `Bearer ${secret}`) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!renderBaseUrl) {
    response.status(503).json({ error: "Cleanup relay is unavailable" });
    return;
  }

  try {
    const upstream = await fetch(`${renderBaseUrl}/api/admin-cleanup`, {
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(290_000),
    });
    response.status(upstream.status);
    response.setHeader("content-type", upstream.headers.get("content-type") ?? "application/json");
    response.send(await upstream.text());
  } catch (error) {
    console.error("[cleanup-relay] failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    response.status(502).json({ error: "Cleanup relay failed" });
  }
}
