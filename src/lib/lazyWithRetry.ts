import { lazy, ComponentType } from 'react';

let memoryRetryCount = 0;

function safeGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignora falhas do storage em ambientes restritos
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const stored = safeGet('lazy-retry-count');
    const retryCount = Number(stored ?? memoryRetryCount ?? 0);
    const MAX_RETRIES = 2;

    try {
      const component = await componentImport();
      safeSet('lazy-retry-count', '0');
      memoryRetryCount = 0;
      return component;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const next = retryCount + 1;
        safeSet('lazy-retry-count', String(next));
        memoryRetryCount = next;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return componentImport();
      }
      
      throw error;
    }
  });
}
