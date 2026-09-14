import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  headers: Headers;
  requestId: string;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(context: RequestContext, run: () => T): T {
  return requestContext.run(context, run);
}

export function getRequestHeader(name: string): string | null {
  return requestContext.getStore()?.headers.get(name) ?? null;
}

export function getRequestId(): string | null {
  return requestContext.getStore()?.requestId ?? null;
}
