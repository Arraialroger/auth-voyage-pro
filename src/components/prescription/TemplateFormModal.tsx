import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const templateItemSchema = z.object({
  medication_name: z.string().min(1, 'Nome do medicamento é obrigatório'),
  dosage: z.string().min(1, 'Dosagem é obrigatória'),
  frequency: z.string().min(1, 'Frequência é obrigatória'),
  duration: z.string().min(1, 'Duração é obrigatória'),
  instructions: z.string().optional(),
});

const templateSchema = z.object({
  template_name: z.string().min(1, 'Nome do template é obrigatório'),
  description: z.string().optional(),
  prescription_type: z.enum(['simple', 'controlled', 'special']),
  general_instructions: z.string().optional(),
  items: z.array(templateItemSchema).min(1, 'Adicione pelo menos um medicamento'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface PrescriptionData {
  prescription_type: 'simple' | 'controlled' | 'special';
  general_instructions: string;
  items: Array<{
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
}

interface Template {
  id: string;
  template_name: string;
  description: string | null;
  prescription_type: 'simple' | 'controlled' | 'special';
  professional_id: string | null;
  general_instructions: string | null;
  prescription_template_items: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
    item_order: number;
  }>;
}

interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: 'create' | 'edit' | 'save-from-prescription';
  initialData?: Template | PrescriptionData | null;
}

export const TemplateFormModal = ({
  open,
  onClose,
  onSuccess,
  mode,
  initialData,
}: TemplateFormModalProps) => {
  const { professionalId, type: userType } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      template_name: '',
      description: '',
      prescription_type: 'simple',
      general_instructions: '',
      items: [{ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    },
  });

  const items = watch('items') || [];

  // Preencher formulário quando modal abrir com dados
  useEffect(() => {
    if (open && initialData) {
      if (mode === 'edit' && 'id' in initialData) {
        // Modo edição - Template completo
        const template = initialData as Template;
        reset({
          template_name: template.template_name,
          description: template.description || '',
          prescription_type: template.prescription_type,
          general_instructions: template.general_instructions || '',
          items: template.prescription_template_items
            .sort((a, b) => a.item_order - b.item_order)
            .map(item => ({
              medication_name: item.medication_name,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions || '',
            })),
        });
        setShowDescription(!!template.description);
      } else if (mode === 'save-from-prescription') {
        // Modo salvar da receita - PrescriptionData
        const prescriptionData = initialData as PrescriptionData;
        reset({
          template_name: '',
          description: '',
          prescription_type: prescriptionData.prescription_type,
          general_instructions: prescriptionData.general_instructions || '',
          items: prescriptionData.items || [{ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        });
      }
    } else if (open && !initialData) {
      // Modo criar novo
      reset({
        template_name: '',
        description: '',
        prescription_type: 'simple',
        general_instructions: '',
        items: [{ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
      });
      setShowDescription(false);
    }
  }, [open, initialData, mode, reset]);

  const addMedication = () => {
    const currentItems = watch('items') || [];
    setValue('items', [
      ...currentItems,
      { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ]);
  };

  const removeMedication = (index: number) => {
    const currentItems = watch('items') || [];
    if (currentItems.length > 1) {
      setValue('items', currentItems.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: TemplateFormData) => {
    // Determinar professional_id: null para recepcionistas (genérico), professionalId para profissionais
    const templateProfessionalId = userType === 'receptionist' ? null : professionalId;

    setIsSubmitting(true);
    try {
      if (mode === 'edit' && initialData && 'id' in initialData) {
        // Atualizar template existente
        const template = initialData as Template;
        
        const { error: templateError } = await supabase
          .from('prescription_templates')
          .update({
            template_name: data.template_name,
            description: data.description || null,
            prescription_type: data.prescription_type,
            general_instructions: data.general_instructions || null,
          })
          .eq('id', template.id);

        if (templateError) throw templateError;

        // Deletar itens antigos
        const { error: deleteError } = await supabase
          .from('prescription_template_items')
          .delete()
          .eq('template_id', template.id);

        if (deleteError) throw deleteError;

        // Inserir novos itens
        const itemsWithOrder = data.items.map((item, index) => ({
          template_id: template.id,
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || null,
          item_order: index + 1,
        }));

        const { error: itemsError } = await supabase
          .from('prescription_template_items')
          .insert(itemsWithOrder);

        if (itemsError) throw itemsError;

        toast({
          title: 'Sucesso',
          description: `Template "${data.template_name}" atualizado com sucesso`,
        });
      } else {
        // Criar novo template
        const { data: template, error: templateError } = await supabase
          .from('prescription_templates')
          .insert({
            template_name: data.template_name,
            description: data.description || null,
            prescription_type: data.prescription_type,
            is_shared: false,
            professional_id: templateProfessionalId,
            general_instructions: data.general_instructions || null,
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Criar itens do template
        const itemsWithOrder = data.items.map((item, index) => ({
          template_id: template.id,
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || null,
          item_order: index + 1,
        }));

        const { error: itemsError } = await supabase
          .from('prescription_template_items')
          .insert(itemsWithOrder);

        if (itemsError) throw itemsError;

        toast({
          title: 'Sucesso',
          description: `Template "${data.template_name}" criado com sucesso`,
        });
      }

      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      logger.error('Erro ao salvar template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o template',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setShowDescription(false);
    onClose();
  };

  const getTitle = () => {
    switch (mode) {
      case 'edit':
        return 'Editar Template';
      case 'save-from-prescription':
        return 'Salvar como Template';
      default:
        return 'Novo Template';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto pr-4 min-h-0 space-y-4">
            {/* Nome do Template */}
            <div className="space-y-2">
              <Label htmlFor="template_name">Nome do Template *</Label>
              <Input
                id="template_name"
                {...register('template_name')}
                placeholder="Ex: Antibiótico Pós-Extração"
                autoFocus
              />
              {errors.template_name && (
                <p className="text-sm text-destructive">{errors.template_name.message}</p>
              )}
            </div>

            {/* Descrição (Opcional e Colapsável) */}
            <div className="space-y-2">
              {!showDescription ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDescription(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar descrição (opcional)
                </Button>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Descrição (Opcional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowDescription(false);
                        setValue('description', '');
                      }}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Ex: Receita padrão para recuperação pós-cirúrgica"
                    rows={2}
                  />
                </>
              )}
            </div>

            {/* Tipo de Receita */}
            <div className="space-y-2">
              <Label htmlFor="prescription_type">Tipo de Receita *</Label>
              <Select
                value={watch('prescription_type')}
                onValueChange={(value: 'simple' | 'controlled' | 'special') =>
                  setValue('prescription_type', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Receita Simples</SelectItem>
                  <SelectItem value="controlled">Receita de Controle Especial</SelectItem>
                  <SelectItem value="special">Medicamento Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Medicamentos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Medicamentos *</Label>
                <Button type="button" onClick={addMedication} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Medicamento
                </Button>
              </div>

              {items.map((_, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Medicamento {index + 1}</span>
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
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`items.${index}.medication_name`}>Nome *</Label>
                      <Input
                        {...register(`items.${index}.medication_name`)}
                        placeholder="Ex: Amoxicilina"
                      />
                      {errors.items?.[index]?.medication_name && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.medication_name?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`items.${index}.dosage`}>Dosagem *</Label>
                      <Input
                        {...register(`items.${index}.dosage`)}
                        placeholder="Ex: 500mg"
                      />
                      {errors.items?.[index]?.dosage && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.dosage?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`items.${index}.frequency`}>Frequência *</Label>
                      <Input
                        {...register(`items.${index}.frequency`)}
                        placeholder="Ex: 8/8h"
                      />
                      {errors.items?.[index]?.frequency && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.frequency?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`items.${index}.duration`}>Duração *</Label>
                      <Input
                        {...register(`items.${index}.duration`)}
                        placeholder="Ex: 7 dias"
                      />
                      {errors.items?.[index]?.duration && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.duration?.message}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`items.${index}.instructions`}>Instruções</Label>
                      <Textarea
                        {...register(`items.${index}.instructions`)}
                        placeholder="Ex: Tomar com água, após as refeições"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {errors.items && typeof errors.items.message === 'string' && (
                <p className="text-sm text-destructive">{errors.items.message}</p>
              )}
            </div>

            {/* Instruções Gerais */}
            <div className="space-y-2">
              <Label htmlFor="general_instructions">Instruções Gerais</Label>
              <Textarea
                id="general_instructions"
                {...register('general_instructions')}
                placeholder="Ex: Não ingerir bebidas alcoólicas durante o tratamento"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : mode === 'edit' ? 'Salvar Alterações' : 'Salvar Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
