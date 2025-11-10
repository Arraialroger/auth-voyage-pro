import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { toast } from './use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

export const useAppointmentNotifications = () => {
  const userProfile = useUserProfile();
  const queryClient = useQueryClient();
  
  // Detectar se é mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Função para tocar som de notificação usando Web Speech API
  const playNotificationSound = useCallback(() => {
    try {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
        logger.info('ℹ️ speechSynthesis não disponível neste navegador');
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance('Paciente chegou');
      utterance.lang = 'pt-BR';
      utterance.rate = 1.3;
      utterance.volume = 0.7;
      
      utterance.onstart = () => logger.info('🔊 Som iniciado');
      utterance.onerror = (e) => logger.error('❌ Erro no som:', e);
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      logger.error('❌ Erro ao tocar som:', error);
    }
  }, []);

  // Função para solicitar permissão de notificação push
  const requestNotificationPermission = useCallback(async () => {
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          let permission: NotificationPermission = 'default';
          try {
            permission = await Notification.requestPermission();
          } catch (e) {
            logger.error('❌ Erro ao solicitar permissão de notificação:', e);
            return;
          }
          logger.info('🔔 Permissão de notificação:', permission);
          
          if (permission === 'granted') {
            toast({
              title: '✅ Notificações ativadas',
              description: 'Você receberá alertas quando pacientes chegarem.',
            });
          } else {
            toast({
              title: '⚠️ Notificações bloqueadas',
              description: 'Habilite nas configurações do navegador para receber alertas.',
              variant: 'destructive',
            });
          }
        } else if (Notification.permission === 'denied') {
          logger.warn('⚠️ Notificações negadas pelo usuário');
        }
      } else {
        logger.warn('⚠️ Navegador não suporta notificações');
      }
    } catch (e) {
      logger.error('❌ Erro inesperado em requestNotificationPermission:', e);
    }
  }, [toast]);

  // Função para enviar notificação push
  const sendPushNotification = useCallback((patientName: string, time: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Paciente Chegou! 🟢', {
        body: `${patientName} chegou para consulta às ${time}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'patient-arrival',
        requireInteraction: true,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  // SOLUÇÃO 1: Refresh ao voltar ao foco da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userProfile.type === 'professional') {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userProfile.type, queryClient]);

  // SOLUÇÃO 2: Polling no mobile como backup
  useEffect(() => {
    if (isMobile && userProfile.type === 'professional') {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }, 10000); // 10 segundos (reduzido de 30)

      return () => clearInterval(interval);
    }
  }, [isMobile, userProfile.type, queryClient]);

  useEffect(() => {
    // Só configurar para profissionais
    if (userProfile.type !== 'professional' || !userProfile.professionalId) {
      return;
    }

    // Solicitar permissão na primeira vez
    requestNotificationPermission();

    // Configurar listener do Realtime
    const channel = supabase
      .channel('appointment-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `professional_id=eq.${userProfile.professionalId}`,
        },
        (payload: any) => {
          logger.info('📡 Realtime payload recebido:', payload);
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;

          // Só notificar quando status mudar para "Patient Arrived"
          if (newStatus === 'Patient Arrived' && oldStatus !== 'Patient Arrived') {
            const startTime = new Date(payload.new.appointment_start_time);
            const timeStr = startTime.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });

            // Buscar nome do paciente
            supabase
              .from('appointments')
              .select('patient:patients(full_name)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                const patientName = (data?.patient as any)?.full_name || 'Paciente';

                // 1. Notificação in-app (toast)
                toast({
                  title: '🟢 Paciente Chegou!',
                  description: `${patientName} chegou para consulta às ${timeStr}`,
                  duration: 10000,
                });

                // 2. Som de notificação
                playNotificationSound();

                // 3. Notificação push (se permitido)
                sendPushNotification(patientName, timeStr);

                // Se notificações push não estiverem disponíveis, garantir pelo menos o toast
                if (!('Notification' in window) || Notification.permission !== 'granted') {
                  logger.info('ℹ️ Usando apenas toast (notificações push indisponíveis)');
                }

                // 4. Atualizar lista de appointments
                queryClient.invalidateQueries({ queryKey: ['appointments'] });
              });
          }
        }
      )
      .subscribe((status) => {
        logger.info('📡 Realtime status:', status);
        if (status === 'SUBSCRIBED') {
          logger.info('✅ Realtime conectado com sucesso');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.error('❌ Realtime falhou:', status);
        }
      });

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.type, userProfile.professionalId, playNotificationSound, sendPushNotification, requestNotificationPermission, queryClient, toast]);
};
