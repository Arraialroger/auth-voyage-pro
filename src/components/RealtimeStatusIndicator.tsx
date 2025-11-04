import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export const RealtimeStatusIndicator = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    const channel = supabase.channel('status-check');
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (status === 'connected') {
    return (
      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/20 bg-green-600/10">
        <Wifi className="h-3 w-3" />
        <span className="text-xs">Conectado</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-red-600 border-red-600/20 bg-red-600/10">
      <WifiOff className="h-3 w-3" />
      <span className="text-xs">Offline</span>
    </Badge>
  );
};
