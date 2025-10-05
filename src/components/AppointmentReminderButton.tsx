import React, { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentReminderButtonProps {
  appointmentId: string;
  patientPhone: string;
  patientName: string;
  appointmentDate: string;
  treatmentName: string;
  lastReminderSent?: string | null;
}

export function AppointmentReminderButton({
  appointmentId,
  patientPhone,
  patientName,
  appointmentDate,
  treatmentName,
  lastReminderSent,
}: AppointmentReminderButtonProps) {
  const [sending, setSending] = useState(false);

  const formatWhatsAppLink = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleSendReminder = async () => {
    setSending(true);
    try {
      const appointmentDateTime = new Date(appointmentDate);
      const message = `Olá ${patientName}! 

Lembramos que você tem uma consulta agendada:

📅 ${appointmentDateTime.toLocaleDateString('pt-BR', { 
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })}
⏰ ${appointmentDateTime.toLocaleTimeString('pt-BR', { 
        hour: '2-digit',
        minute: '2-digit'
      })}
🦷 ${treatmentName}

Por favor, confirme sua presença respondendo esta mensagem.

Caso precise remarcar, entre em contato o quanto antes.

Obrigado!`;

      // Log communication
      const { error: logError } = await supabase
        .from('communication_logs')
        .insert({
          appointment_id: appointmentId,
          patient_id: null, // Will be set by RLS or trigger
          communication_content: message,
          direction: 'outbound',
        });

      if (logError) throw logError;

      // Update last reminder sent timestamp
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          last_reminder_sent_at: new Date().toISOString(),
          status: 'Pending Confirmation' 
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Open WhatsApp
      window.open(formatWhatsAppLink(patientPhone, message), '_blank');

      toast({
        title: 'Lembrete enviado',
        description: 'O lembrete foi registrado e o WhatsApp foi aberto.',
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar lembrete. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSendReminder}
        disabled={sending}
        className="w-full sm:w-auto"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Bell className="h-4 w-4 mr-2" />
        )}
        Enviar Lembrete
      </Button>
      {lastReminderSent && (
        <span className="text-xs text-muted-foreground">
          Último lembrete: {formatDistanceToNow(new Date(lastReminderSent), { 
            addSuffix: true,
            locale: ptBR 
          })}
        </span>
      )}
    </div>
  );
}