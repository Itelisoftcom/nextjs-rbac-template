import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getRequestContext(): RequestContext {
  const context = storage.getStore();
  if (!context) {
    throw new Error(
      "No hay request context activo. Envuelve esta llamada con runWithRequestContext().",
    );
  }
  return context;
}
