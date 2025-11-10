import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    logger.error('ErrorBoundary capturou um erro:', error, info);
    
    // Auto-recovery para erros de chunk/cache
    const errorMsg = error?.message || String(error);
    const chunkPatterns = [
      'ChunkLoadError',
      'Loading chunk',
      'CSS chunk load failed',
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
      'Failed to fetch'
    ];
    
    const isChunkError = chunkPatterns.some(pattern => errorMsg.includes(pattern));
    
    if (isChunkError) {
      // Helpers para sessionStorage com fallback silencioso
      const safeGet = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
      const safeSet = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch {} };

      const autoReloaded = safeGet('eb_auto_reload');
      
      if (!autoReloaded) {
        logger.info('ErrorBoundary detectou ChunkError, iniciando auto-recovery...');
        safeSet('eb_auto_reload', '1');
        
        const now = Date.now();
        const url = new URL(location.href);
        url.searchParams.set('cb', String(now));
        
        const doReload = () => {
          logger.info('Auto-recovery: recarregando com cache-busting...');
          location.replace(url.toString());
        };

        try {
          if ('caches' in window) {
            caches.keys()
              .then(keys => Promise.all(keys.map(k => caches.delete(k))))
              .catch(() => logger.info('Erro ao limpar caches'))
              .finally(doReload);
          } else {
            doReload();
          }
        } catch {
          doReload();
        }
      } else {
        logger.info('Auto-recovery já tentado, exibindo erro ao usuário');
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Erro ao carregar página</CardTitle>
              </div>
              <CardDescription>
                Ocorreu um erro ao carregar esta página. Tente recarregar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={async () => {
                  // Limpa flags e caches
                  try {
                    sessionStorage.removeItem('eb_auto_reload');
                    sessionStorage.removeItem('lazy-hard-reloaded');
                    sessionStorage.removeItem('global-chunk-reloaded');
                    sessionStorage.removeItem('lazy-retry-count');
                  } catch {}
                  
                  try {
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      await Promise.all(keys.map(k => caches.delete(k)));
                    }
                  } catch {}
                  
                  // Recarrega com cache-busting
                  const url = new URL(location.href);
                  url.searchParams.set('cb', String(Date.now()));
                  // Aciona kill switch para este reload manual
                  url.searchParams.set('no-sw', '1');
                  location.replace(url.toString());
                }} 
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar Página
              </Button>
              
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <span>Detalhes técnicos</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-muted/50 rounded-md text-xs space-y-2">
                  <div>
                    <strong>Erro:</strong>
                    <p className="mt-1 text-muted-foreground break-words">
                      {this.state.error?.message || 'Erro desconhecido'}
                    </p>
                  </div>
                  <div>
                    <strong>Navegador:</strong>
                    <p className="mt-1 text-muted-foreground break-all">
                      {navigator.userAgent}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
