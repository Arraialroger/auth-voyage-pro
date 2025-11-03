import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Registra Service Worker do PWA para atualizações automáticas
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.info('Nova versão disponível, recarregando...');
        location.reload();
      },
      onOfflineReady() {
        console.info('App pronto para uso offline');
      }
    });
  }).catch(() => {
    console.info('PWA não disponível');
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
    console.error('ChunkLoadError global detectado:', event.reason);
    
    const reloadFlag = 'global-chunk-reloaded';
    try {
      if (sessionStorage.getItem(reloadFlag) === 'true') {
        console.info('Já recarregou globalmente, evitando loop');
        return;
      }

      sessionStorage.setItem(reloadFlag, 'true');
      
      caches.keys().then(keys => {
        return Promise.all(keys.map(k => caches.delete(k)));
      }).then(() => {
        console.info('Caches limpos globalmente, recarregando...');
        location.reload();
      }).catch(() => {
        console.info('Erro ao limpar caches, recarregando mesmo assim...');
        location.reload();
      });
    } catch {
      location.reload();
    }
    
    event.preventDefault();
  }
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
