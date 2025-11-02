import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const NotificationTestButton = () => {
  const testNotification = async () => {
    // Solicitar permissão
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        new Notification('Teste de Notificação', {
          body: 'As notificações estão funcionando!',
          icon: '/icons/icon-192x192.png',
        });
        
        toast({
          title: 'Notificações ativadas ✓',
          description: 'Você receberá alertas quando pacientes chegarem.',
        });
      } else {
        toast({
          title: 'Permissão negada',
          description: 'Habilite notificações nas configurações do navegador.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={testNotification}>
      <Bell className="h-4 w-4 mr-2" />
      Testar Notificações
    </Button>
  );
};
