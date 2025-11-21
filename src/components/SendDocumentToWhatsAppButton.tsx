import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface PrescriptionDetails {
  type: string;
  itemsCount: number;
  professionalName: string;
}

interface CertificateDetails {
  certificateType: string;
  startDate: string;
  endDate: string | null;
  professionalName: string;
}

interface SendDocumentToWhatsAppButtonProps {
  patientPhone: string;
  patientName: string;
  documentType: 'prescription' | 'certificate';
  documentId: string;
  documentDetails: PrescriptionDetails | CertificateDetails;
}

export const SendDocumentToWhatsAppButton = ({
  patientPhone,
  patientName,
  documentType,
  documentId,
  documentDetails,
}: SendDocumentToWhatsAppButtonProps) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const formatPrescriptionMessage = (details: PrescriptionDetails) => {
    const typeLabel = 
      details.type === 'simple' ? 'Simples' :
      details.type === 'controlled' ? 'Controlada' :
      details.type === 'special' ? 'Especial' :
      details.type;

    return `Olá ${patientName}!

Segue sua receita médica emitida hoje.

📄 Tipo: ${typeLabel}
📋 Medicamentos: ${details.itemsCount} item(s)
👨‍⚕️ Dr(a). ${details.professionalName}

⚠️ IMPORTANTE: Guarde este documento em local seguro.

O PDF foi gerado e está sendo enviado em anexo.`;
  };

  const formatCertificateMessage = (details: CertificateDetails) => {
    const typeLabel = 
      details.certificateType === 'attendance' ? 'Comparecimento' :
      details.certificateType === 'medical_leave' ? 'Afastamento Médico' :
      details.certificateType === 'fitness' ? 'Aptidão Física' :
      details.certificateType;

    const periodText = details.endDate 
      ? `${new Date(details.startDate).toLocaleDateString('pt-BR')} - ${new Date(details.endDate).toLocaleDateString('pt-BR')}`
      : new Date(details.startDate).toLocaleDateString('pt-BR');

    return `Olá ${patientName}!

Segue seu atestado médico emitido hoje.

📄 Tipo: ${typeLabel}
📅 Período: ${periodText}
👨‍⚕️ Dr(a). ${details.professionalName}

O PDF foi gerado e está sendo enviado em anexo.`;
  };

  const handleSendWhatsApp = async () => {
    try {
      setSending(true);

      // Validate phone
      const cleanPhone = patientPhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        toast({
          title: 'Telefone inválido',
          description: 'O telefone do paciente precisa estar cadastrado e ser válido.',
          variant: 'destructive',
        });
        return;
      }

      // Format message
      const message = documentType === 'prescription'
        ? formatPrescriptionMessage(documentDetails as PrescriptionDetails)
        : formatCertificateMessage(documentDetails as CertificateDetails);

      // Log communication
      await supabase.from('communication_logs').insert({
        patient_id: null, // Will be linked by appointment if needed
        appointment_id: null,
        direction: 'outbound',
        communication_content: `WhatsApp: ${documentType === 'prescription' ? 'Receita' : 'Atestado'} enviado - ${message.substring(0, 100)}...`,
      });

      // Open WhatsApp
      const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');

      toast({
        title: 'WhatsApp aberto!',
        description: 'Anexe o PDF manualmente e envie a mensagem.',
      });

    } catch (error) {
      logger.error('Erro ao enviar WhatsApp:', error);
      toast({
        title: 'Erro ao abrir WhatsApp',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Button 
      variant="secondary" 
      size="sm"
      onClick={handleSendWhatsApp}
      disabled={sending}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {sending ? 'Enviando...' : 'Enviar WhatsApp'}
    </Button>
  );
};