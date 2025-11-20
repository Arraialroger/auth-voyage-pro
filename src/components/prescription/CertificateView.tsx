import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, Clock, Download, Eye, Plus } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateCertificateModal } from './CreateCertificateModal';
import { generateCertificatePDF } from '@/lib/certificatePdf';
import { useToast } from '@/hooks/use-toast';

interface CertificateViewProps {
  patientId: string;
}

export const CertificateView = ({ patientId }: CertificateViewProps) => {
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const { data: certificates, isLoading, refetch } = useQuery({
    queryKey: ['medical_certificates', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_certificates')
        .select(`
          *,
          professional:professionals(
            full_name,
            specialization,
            professional_registry,
            registry_uf,
            clinic_name,
            clinic_address,
            clinic_phone,
            clinic_cnpj
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleGeneratePDF = async (certificateId: string) => {
    try {
      setGeneratingPdf(certificateId);
      toast({
        title: 'Gerando PDF...',
        description: 'Por favor, aguarde.',
      });

      // Find certificate data
      const certificate = certificates?.find(c => c.id === certificateId);
      if (!certificate) throw new Error('Atestado não encontrado');

      // Fetch patient data
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('full_name, cpf')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;

      // Generate PDF
      const signatureHash = await generateCertificatePDF({
        ...certificate,
        patient: patientData,
      });

      // Update certificate with signature hash
      const { error: updateError } = await supabase
        .from('medical_certificates')
        .update({ signature_hash: signatureHash })
        .eq('id', certificateId);

      if (updateError) throw updateError;

      toast({
        title: 'PDF gerado com sucesso!',
        description: 'O download iniciará automaticamente.',
      });

      refetch();
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const getCertificateTypeLabel = (type: string) => {
    switch (type) {
      case 'attendance':
        return 'Comparecimento';
      case 'medical_leave':
        return 'Afastamento Médico';
      case 'fitness':
        return 'Aptidão Física';
      default:
        return type;
    }
  };

  const getCertificateTypeBadge = (type: string) => {
    switch (type) {
      case 'attendance':
        return 'secondary';
      case 'medical_leave':
        return 'destructive';
      case 'fitness':
        return 'default';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando atestados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Atestados Médicos</h3>
          <p className="text-sm text-muted-foreground">
            {certificates?.length || 0} atestado(s) emitido(s)
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Atestado
        </Button>
      </div>

      {!certificates || certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum atestado encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Este paciente ainda não possui atestados cadastrados
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Atestado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        Atestado #{certificate.id.slice(0, 8)}
                      </CardTitle>
                      <Badge variant={getCertificateTypeBadge(certificate.certificate_type) as any}>
                        {getCertificateTypeLabel(certificate.certificate_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(certificate.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {certificate.professional?.full_name || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleGeneratePDF(certificate.id)}
                      disabled={generatingPdf === certificate.id}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {generatingPdf === certificate.id ? 'Gerando...' : 'Gerar PDF'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Motivo */}
                <div>
                  <p className="text-sm font-medium mb-1">Motivo</p>
                  <p className="text-sm text-muted-foreground">{certificate.reason}</p>
                </div>

                {/* Período */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Início:</span>
                    <span className="text-muted-foreground">
                      {format(new Date(certificate.start_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                  {certificate.end_date && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Fim:</span>
                        <span className="text-muted-foreground">
                          {format(new Date(certificate.end_date), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{certificate.days_count} dia(s)</span>
                      </div>
                    </>
                  )}
                </div>

                {/* CID-10 */}
                {certificate.cid_10_code && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">CID-10:</span>
                    <Badge variant="outline">{certificate.cid_10_code}</Badge>
                  </div>
                )}

                {/* Observações */}
                {certificate.additional_notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Observações</p>
                    <p className="text-sm text-muted-foreground">{certificate.additional_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateCertificateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        patientId={patientId}
        onSuccess={refetch}
      />
    </div>
  );
};
