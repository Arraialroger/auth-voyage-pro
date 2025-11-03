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

function isChunkLoadError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  const chunkPatterns = [
    'ChunkLoadError',
    'Loading chunk',
    'CSS chunk load failed',
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'Failed to fetch'
  ];
  return chunkPatterns.some(pattern => errorMsg.includes(pattern));
}

async function clearCachesAndReload() {
  const reloadFlag = 'lazy-hard-reloaded';
  
  if (safeGet(reloadFlag) === 'true') {
    console.info('Já recarregou, evitando loop');
    return;
  }

  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    console.info('Caches limpos, recarregando...');
  } catch (e) {
    console.info('Não foi possível limpar caches:', e);
  }

  safeSet(reloadFlag, 'true');
  location.reload();
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
      console.error('Erro ao carregar componente:', error);

      if (isChunkLoadError(error)) {
        console.info('ChunkLoadError detectado, limpando caches...');
        await clearCachesAndReload();
        throw error;
      }

      if (retryCount < MAX_RETRIES) {
        const next = retryCount + 1;
        safeSet('lazy-retry-count', String(next));
        memoryRetryCount = next;
        console.info(`Tentativa ${next}/${MAX_RETRIES} após delay...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return componentImport();
      }

      console.info('Max tentativas atingido, limpando caches...');
      await clearCachesAndReload();
      throw error;
    }
  });
}
