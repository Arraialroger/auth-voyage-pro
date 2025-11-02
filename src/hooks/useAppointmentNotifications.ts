import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { toast } from './use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useAppointmentNotifications = () => {
  const userProfile = useUserProfile();
  const queryClient = useQueryClient();

  // Função para tocar som de notificação usando Web Speech API
  const playNotificationSound = useCallback(() => {
    try {
      const utterance = new SpeechSynthesisUtterance('Paciente chegou');
      utterance.lang = 'pt-BR';
      utterance.rate = 1.3;
      utterance.volume = 0.7;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.log('Erro ao tocar som:', error);
    }
  }, []);

  // Função para solicitar permissão de notificação push
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

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

                // 4. Atualizar lista de appointments
                queryClient.invalidateQueries({ queryKey: ['appointments'] });
              });
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.type, userProfile.professionalId, playNotificationSound, sendPushNotification, requestNotificationPermission, queryClient, toast]);
};
