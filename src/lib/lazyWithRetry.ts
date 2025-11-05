import { lazy, ComponentType } from 'react';
import { logger } from '@/lib/logger';

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

function getBustedUrlOnce(): string | null {
  const url = new URL(location.href);
  const tries = parseInt(url.searchParams.get('cb') || '0', 10);
  if (tries >= 1) {
    logger.info('Já tentou recarregar com cache-busting, evitando loop');
    return null;
  }
  url.searchParams.set('cb', String(tries + 1));
  return url.toString();
}

async function reloadWithBuster() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    logger.info('Caches limpos, recarregando com cache-busting...');
  } catch (e) {
    logger.info('Não foi possível limpar caches:', e);
  }

  const bustedUrl = getBustedUrlOnce();
  if (bustedUrl) {
    location.replace(bustedUrl);
  } else {
    logger.info('Tentativas esgotadas, não recarregando');
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
      logger.error('Erro ao carregar componente:', error);

      if (isChunkLoadError(error)) {
        logger.info('ChunkLoadError detectado, limpando caches...');
        await reloadWithBuster();
        throw error;
      }

      if (retryCount < MAX_RETRIES) {
        const next = retryCount + 1;
        safeSet('lazy-retry-count', String(next));
        memoryRetryCount = next;
        logger.info(`Tentativa ${next}/${MAX_RETRIES} após delay...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return componentImport();
      }

      logger.info('Max tentativas atingido, limpando caches...');
      await reloadWithBuster();
      throw error;
    }
  });
}
