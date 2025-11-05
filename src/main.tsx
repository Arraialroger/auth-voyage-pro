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

// Listener global para erros de dynamic import/chunk
window.addEventListener('unhandledrejection', (event) => {
  const errorMsg = event.reason?.message || String(event.reason);
  const chunkPatterns = [
    'ChunkLoadError',
    'Loading chunk',
    'CSS chunk load failed',
    'Failed to fetch dynamically imported module',
    'Importing a module script failed'
  ];

  const isChunkError = chunkPatterns.some(pattern => errorMsg.includes(pattern));

  if (isChunkError) {
    logger.error('ChunkLoadError global detectado:', event.reason);
    
    const url = new URL(location.href);
    const tries = parseInt(url.searchParams.get('cb') || '0', 10);

    if (tries >= 1) {
      logger.info('Já tentou recarregar globalmente, evitando loop');
      return;
    }

    event.preventDefault();
    
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .catch(() => logger.info('Erro ao limpar caches'))
      .finally(() => {
        url.searchParams.set('cb', String(tries + 1));
        logger.info('Caches limpos globalmente, recarregando com cache-busting...');
        location.replace(url.toString());
      });
  }
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
