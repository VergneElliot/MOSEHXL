import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantRequestContext {
  establishmentId: string | null;
}

const storage = new AsyncLocalStorage<TenantRequestContext>();

export function runWithTenantContext<T>(
  context: TenantRequestContext,
  callback: () => T
): T {
  return storage.run(context, callback);
}

export function getCurrentEstablishmentId(): string | null {
  return storage.getStore()?.establishmentId ?? null;
}
