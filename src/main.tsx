import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

// Registra Service Worker do PWA para atualizações automáticas
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        logger.info('Nova versão disponível, recarregando...');
        location.reload();
      },
      onOfflineReady() {
        logger.info('App pronto para uso offline');
      }
    });
  }).catch(() => {
    logger.info('PWA não disponível');
  });
}

// Padrões de erro de chunk/cache para detectar problemas
const chunkPatterns = [
  'ChunkLoadError',
  'Loading chunk',
  'CSS chunk load failed',
  'Failed to fetch dynamically imported module',
  'Importing a module script failed'
];

const handleChunkError = (errorMsg: string, source: string) => {
  const isChunkError = chunkPatterns.some(pattern => errorMsg.includes(pattern));
  
  if (isChunkError) {
    logger.error(`ChunkLoadError detectado (${source}):`, errorMsg);
    
    const url = new URL(location.href);
    const cbParam = url.searchParams.get('cb');
    const lastReload = parseInt(cbParam || '0', 10);
    const now = Date.now();
    
    // Se cb já existe e foi há menos de 10 segundos, evita loop
    if (cbParam && (now - lastReload) < 10000) {
      logger.info('Já tentou recarregar recentemente, evitando loop');
      return true;
    }
    
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .catch(() => logger.info('Erro ao limpar caches'))
      .finally(() => {
        url.searchParams.set('cb', String(now));
        logger.info(`Caches limpos (${source}), recarregando...`);
        location.replace(url.toString());
      });
    
    return true;
  }
  
  return false;
};

// Listener para erros síncronos (ex.: import('./Component'))
window.addEventListener('error', (event) => {
  const errorMsg = event.message || event.error?.message || String(event.error);
  if (handleChunkError(errorMsg, 'error')) {
    event.preventDefault();
  }
});

// Listener para promises rejeitadas (ex.: import() dinâmico)
window.addEventListener('unhandledrejection', (event) => {
  const errorMsg = event.reason?.message || String(event.reason);
  if (handleChunkError(errorMsg, 'unhandledrejection')) {
    event.preventDefault();
  }
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
