import { lazy, ComponentType } from 'react';

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const retryCount = Number(sessionStorage.getItem('lazy-retry-count') || '0');
    const MAX_RETRIES = 2;

    try {
      const component = await componentImport();
      sessionStorage.setItem('lazy-retry-count', '0');
      return component;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        sessionStorage.setItem('lazy-retry-count', String(retryCount + 1));
        await new Promise(resolve => setTimeout(resolve, 1000));
        return componentImport();
      }
      
      throw error;
    }
  });
}
