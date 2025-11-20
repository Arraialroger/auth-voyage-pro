import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { Prescription, PrescriptionItem } from '@/types/prescription';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Calendar, User, Pill, Download, Eye, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreatePrescriptionModal } from './CreatePrescriptionModal';
import { generatePrescriptionPDF } from '@/lib/prescriptionPdf';
import { useToast } from '@/hooks/use-toast';

interface PrescriptionViewProps {
  patientId: string;
}

export const PrescriptionView = ({ patientId }: PrescriptionViewProps) => {
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const { data: prescriptions, isLoading, refetch } = useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          professional:professionals(
            full_name,
            specialization,
            contact_phone,
            professional_registry,
            registry_uf,
            clinic_name,
            clinic_address,
            clinic_phone,
            clinic_cnpj
          ),
          prescription_items(*)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleGeneratePDF = async (prescriptionId: string) => {
    try {
      setGeneratingPdf(prescriptionId);
      toast({
        title: 'Gerando PDF...',
        description: 'Por favor, aguarde.',
      });

      // Find prescription data
      const prescription = prescriptions?.find(p => p.id === prescriptionId);
      if (!prescription) throw new Error('Receita não encontrada');

      // Fetch patient data
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('full_name, birth_date, contact_phone')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;

      // Generate PDF
      const signatureHash = await generatePrescriptionPDF({
        ...prescription,
        patient: patientData,
      });

      // Update prescription with signature hash
      const { error: updateError } = await supabase
        .from('prescriptions')
        .update({ signature_hash: signatureHash })
        .eq('id', prescriptionId);

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

  const getPrescriptionTypeLabel = (type: string) => {
    switch (type) {
      case 'simple':
        return 'Simples';
      case 'controlled':
        return 'Controlada';
      case 'special':
        return 'Especial';
      default:
        return type;
    }
  };

  const getPrescriptionTypeBadge = (type: string) => {
    switch (type) {
      case 'simple':
        return 'default';
      case 'controlled':
        return 'destructive';
      case 'special':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando receitas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Receitas</h3>
          <p className="text-sm text-muted-foreground">
            {prescriptions?.length || 0} receita(s) emitida(s)
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Receita
        </Button>
      </div>

      {!prescriptions || prescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma receita encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Este paciente ainda não possui receitas cadastradas
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Receita
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription) => (
            <Card key={prescription.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        Receita #{prescription.id.slice(0, 8)}
                      </CardTitle>
                      <Badge variant={getPrescriptionTypeBadge(prescription.prescription_type) as any}>
                        {getPrescriptionTypeLabel(prescription.prescription_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(prescription.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {prescription.professional?.full_name || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleGeneratePDF(prescription.id)}
                      disabled={generatingPdf === prescription.id}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {generatingPdf === prescription.id ? 'Gerando...' : 'Gerar PDF'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Medicamentos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Pill className="h-4 w-4" />
                    Medicamentos ({prescription.prescription_items?.length || 0})
                  </div>
                  <div className="space-y-3 pl-6">
                    {prescription.prescription_items?.map((item: PrescriptionItem, index: number) => (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="font-medium">{item.medication_name}</p>
                            <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mt-1">
                              <span>Dosagem: {item.dosage}</span>
                              <span>Frequência: {item.frequency}</span>
                              <span>Duração: {item.duration}</span>
                            </div>
                            {item.instructions && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                        {index < (prescription.prescription_items?.length || 0) - 1 && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instruções Gerais */}
                {prescription.general_instructions && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Instruções Gerais</p>
                      <p className="text-sm text-muted-foreground">
                        {prescription.general_instructions}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreatePrescriptionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        patientId={patientId}
        onSuccess={refetch}
      />
    </div>
  );
};
