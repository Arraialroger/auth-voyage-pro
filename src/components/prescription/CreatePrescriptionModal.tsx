import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const prescriptionItemSchema = z.object({
  medication_name: z.string().min(1, 'Nome do medicamento é obrigatório'),
  dosage: z.string().min(1, 'Dosagem é obrigatória'),
  frequency: z.string().min(1, 'Frequência é obrigatória'),
  duration: z.string().min(1, 'Duração é obrigatória'),
  instructions: z.string().optional(),
});

const prescriptionSchema = z.object({
  prescription_type: z.enum(['simple', 'controlled', 'special']),
  general_instructions: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'Adicione pelo menos um medicamento'),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

interface CreatePrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId?: string;
  onSuccess?: () => void;
}

export const CreatePrescriptionModal = ({
  open,
  onClose,
  patientId,
  appointmentId,
  onSuccess,
}: CreatePrescriptionModalProps) => {
  const { user } = useAuth();
  const { professionalId } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      prescription_type: 'simple',
      general_instructions: '',
      items: [{ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    },
  });

  const items = watch('items') || [];
  const prescriptionType = watch('prescription_type');

  // Carregar templates quando o tipo de receita mudar
  useEffect(() => {
    if (!professionalId || !open) return;

    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('prescription_templates')
          .select(`
            *,
            prescription_template_items (*)
          `)
          .or(`professional_id.eq.${professionalId},is_shared.eq.true`)
          .eq('prescription_type', prescriptionType)
          .order('template_name');

        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error('Erro ao carregar templates:', error);
      }
    };

    fetchTemplates();
  }, [professionalId, prescriptionType, open]);

  // Função para aplicar template selecionado
  const applyTemplate = (templateId: string) => {
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    try {
      // Pré-preencher instruções gerais
      setValue('general_instructions', template.general_instructions || '');

      // Pré-preencher medicamentos
      const medications = template.prescription_template_items
        .sort((a: any, b: any) => a.item_order - b.item_order)
        .map((item: any) => ({
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || '',
        }));

      setValue('items', medications);

      toast({
        title: 'Template aplicado',
        description: `Template "${template.template_name}" carregado com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao aplicar template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aplicar o template',
        variant: 'destructive',
      });
    }
  };

  const addMedication = () => {
    setValue('items', [...items, { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedication = (index: number) => {
    if (items.length > 1) {
      setValue('items', items.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: PrescriptionFormData) => {
    if (!professionalId) {
      toast({
        title: 'Erro',
        description: 'Profissional não identificado',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Criar receita
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: patientId,
          professional_id: professionalId,
          appointment_id: appointmentId || null,
          prescription_type: data.prescription_type,
          general_instructions: data.general_instructions || null,
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      // Criar itens da receita
      const itemsWithOrder = data.items.map((item, index) => ({
        prescription_id: prescription.id,
        medication_name: item.medication_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions || null,
        item_order: index + 1,
      }));

      const { error: itemsError } = await supabase
        .from('prescription_items')
        .insert(itemsWithOrder);

      if (itemsError) throw itemsError;

      toast({
        title: 'Sucesso',
        description: 'Receita criada com sucesso',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao criar receita:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a receita',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nova Receita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
            <div className="space-y-6">
              {/* Tipo de Receita */}
              <div className="space-y-2">
                <Label htmlFor="prescription_type">Tipo de Receita *</Label>
                <Select
                  value={prescriptionType}
                  onValueChange={(value) => setValue('prescription_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simples</SelectItem>
                    <SelectItem value="controlled">Controlada</SelectItem>
                    <SelectItem value="special">Especial</SelectItem>
                  </SelectContent>
                </Select>
                {errors.prescription_type && (
                  <p className="text-sm text-destructive">{errors.prescription_type.message}</p>
                )}
              </div>

              {/* Usar Template */}
              {templates.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="template_select">Usar Template (Opcional)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedTemplate}
                      onValueChange={(value) => {
                        setSelectedTemplate(value);
                        applyTemplate(value);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um template para pré-preencher..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>{template.template_name}</span>
                              {template.is_shared && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Compartilhado
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate('');
                          setValue('general_instructions', '');
                          setValue('items', [{ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
                        }}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Selecione um template para pré-preencher os campos automaticamente. Você pode editá-los após aplicar.
                  </p>
                </div>
              )}

              {/* Medicamentos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Medicamentos *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Medicamento
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Medicamento {index + 1}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedication(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label htmlFor={`items.${index}.medication_name`}>Nome do Medicamento *</Label>
                        <Input
                          {...register(`items.${index}.medication_name`)}
                          placeholder="Ex: Ibuprofeno"
                        />
                        {errors.items?.[index]?.medication_name && (
                          <p className="text-sm text-destructive">{errors.items[index]?.medication_name?.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.dosage`}>Dosagem *</Label>
                        <Input
                          {...register(`items.${index}.dosage`)}
                          placeholder="Ex: 600mg"
                        />
                        {errors.items?.[index]?.dosage && (
                          <p className="text-sm text-destructive">{errors.items[index]?.dosage?.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.frequency`}>Frequência *</Label>
                        <Input
                          {...register(`items.${index}.frequency`)}
                          placeholder="Ex: 8 em 8 horas"
                        />
                        {errors.items?.[index]?.frequency && (
                          <p className="text-sm text-destructive">{errors.items[index]?.frequency?.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.duration`}>Duração *</Label>
                        <Input
                          {...register(`items.${index}.duration`)}
                          placeholder="Ex: 5 dias"
                        />
                        {errors.items?.[index]?.duration && (
                          <p className="text-sm text-destructive">{errors.items[index]?.duration?.message}</p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <Label htmlFor={`items.${index}.instructions`}>Instruções Específicas</Label>
                        <Textarea
                          {...register(`items.${index}.instructions`)}
                          placeholder="Ex: Tomar com alimentos"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {errors.items && !Array.isArray(errors.items) && (
                  <p className="text-sm text-destructive">{errors.items.message}</p>
                )}
              </div>

              {/* Instruções Gerais */}
              <div className="space-y-2">
                <Label htmlFor="general_instructions">Instruções Gerais</Label>
                <Textarea
                  {...register('general_instructions')}
                  placeholder="Instruções adicionais para o paciente..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Receita'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
