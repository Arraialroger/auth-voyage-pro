import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus } from 'lucide-react';

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
  is_shared: z.boolean(),
  items: z.array(templateItemSchema).min(1, 'Adicione pelo menos um medicamento'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateTemplateModal = ({
  open,
  onClose,
  onSuccess,
}: CreateTemplateModalProps) => {
  const { professionalId } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      template_name: '',
      description: '',
      prescription_type: 'simple',
      general_instructions: '',
      is_shared: false,
      items: [{ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    },
  });

  const items = watch('items') || [];
  const isShared = watch('is_shared');

  const addMedication = () => {
    setValue('items', [...items, { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedication = (index: number) => {
    if (items.length > 1) {
      setValue('items', items.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: TemplateFormData) => {
    console.log('=== DEBUG onSubmit ===');
    console.log('Form data:', JSON.stringify(data, null, 2));
    console.log('professionalId:', professionalId);
    
    if (!professionalId) {
      console.error('Erro: professionalId não encontrado');
      toast({
        title: 'Erro',
        description: 'Profissional não identificado',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Tentando criar template...');
      // Criar template
      const { data: template, error: templateError } = await supabase
        .from('prescription_templates')
        .insert({
          template_name: data.template_name,
          description: data.description || null,
          prescription_type: data.prescription_type,
          is_shared: data.is_shared,
          professional_id: professionalId,
          general_instructions: data.general_instructions || null,
        })
        .select()
        .single();

      if (templateError) {
        console.error('Erro ao criar template:', templateError);
        throw templateError;
      }

      console.log('Template criado com sucesso:', template);

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

      console.log('Criando itens do template:', itemsWithOrder);

      const { error: itemsError } = await supabase
        .from('prescription_template_items')
        .insert(itemsWithOrder);

      if (itemsError) {
        console.error('Erro ao criar itens do template:', itemsError);
        throw itemsError;
      }

      console.log('Itens criados com sucesso');

      toast({
        title: 'Sucesso',
        description: 'Template criado com sucesso',
      });

      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('=== ERRO CAPTURADO ===');
      console.error('Tipo do erro:', typeof error);
      console.error('Erro completo:', error);
      console.error('Mensagem:', error instanceof Error ? error.message : 'Erro desconhecido');
      console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
      
      toast({
        title: 'Erro ao criar template',
        description: error instanceof Error ? error.message : 'Não foi possível criar o template',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Template de Receita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto pr-4 min-h-0">
            <div className="space-y-4 pb-4">
              {/* Nome do Template */}
              <div className="space-y-2">
                <Label htmlFor="template_name">Nome do Template *</Label>
                <Input
                  id="template_name"
                  {...register('template_name')}
                  placeholder="Ex: Dipirona Pós-Extração"
                />
                {errors.template_name && (
                  <p className="text-sm text-destructive">{errors.template_name.message}</p>
                )}
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Input
                  id="description"
                  {...register('description')}
                  placeholder="Ex: Receita padrão para dor pós-extração dentária"
                />
              </div>

              {/* Tipo de Receita */}
              <div className="space-y-2">
                <Label htmlFor="prescription_type">Tipo de Receita *</Label>
            <Select
              value={watch('prescription_type')}
              onValueChange={(value: 'simple' | 'controlled' | 'special') =>
                setValue('prescription_type', value)
              }
              defaultValue="simple"
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simples</SelectItem>
                    <SelectItem value="controlled">Controlada</SelectItem>
                    <SelectItem value="special">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compartilhar */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_shared"
                  checked={isShared}
                  onCheckedChange={(checked) => setValue('is_shared', checked as boolean)}
                />
                <Label htmlFor="is_shared" className="cursor-pointer">
                  Disponibilizar para outros profissionais da clínica
                </Label>
              </div>

              {/* Medicamentos */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Medicamentos *</Label>
                  <Button type="button" onClick={addMedication} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Medicamento
                  </Button>
                </div>

                {items.map((_, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
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
                        <Label htmlFor={`items.${index}.medication_name`}>Nome do Medicamento *</Label>
                        <Input
                          {...register(`items.${index}.medication_name` as const)}
                          placeholder="Ex: Dipirona Sódica 500mg"
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
                          {...register(`items.${index}.dosage` as const)}
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
                          {...register(`items.${index}.frequency` as const)}
                          placeholder="Ex: 6/6 horas"
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
                          {...register(`items.${index}.duration` as const)}
                          placeholder="Ex: 3 dias"
                        />
                        {errors.items?.[index]?.duration && (
                          <p className="text-sm text-destructive">
                            {errors.items[index]?.duration?.message}
                          </p>
                        )}
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label htmlFor={`items.${index}.instructions`}>Instruções Adicionais</Label>
                        <Input
                          {...register(`items.${index}.instructions` as const)}
                          placeholder="Ex: Tomar com alimento"
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
                  placeholder="Ex: Tomar os medicamentos conforme orientação..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
