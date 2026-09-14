import { supabase } from "@/integrations/supabase/client";

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

type ApiCallOptions = {
  authenticated?: boolean;
  safeRead?: boolean;
};

type ApiRequestError = Error & {
  code?: string;
  requestId?: string;
  status?: number;
};

function apiBaseUrl(): string {
  const configured = import.meta.env["VITE_API_BASE_URL"]?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://127.0.0.1:8787";
  throw new Error("VITE_API_BASE_URL is required");
}

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(operation: string, data: unknown, options: ApiCallOptions): Promise<T> {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.authenticated) {
    const token = await accessToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl()}/api/v1/functions/${operation}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const message = payload.error?.message || `Request failed (${response.status})`;
    const error = new Error(message) as ApiRequestError;
    error.status = response.status;
    if (payload.error?.code) error.code = payload.error.code;
    if (payload.error?.requestId) error.requestId = payload.error.requestId;
    throw error;
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export async function callApi<T>(
  operation: string,
  data?: unknown,
  options: ApiCallOptions = {},
): Promise<T> {
  try {
    return await request<T>(operation, data ?? null, options);
  } catch (error) {
    const status = (error as ApiRequestError)?.status;
    const retryable =
      error instanceof TypeError || status === 502 || status === 503 || status === 504;
    if (!options.safeRead || !retryable) throw error;
    await new Promise((resolve) => setTimeout(resolve, 750));
    return request<T>(operation, data ?? null, options);
  }
}
