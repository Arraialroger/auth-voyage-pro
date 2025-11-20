import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const saveTemplateSchema = z.object({
  template_name: z.string().min(1, 'Nome do template é obrigatório'),
  description: z.string().optional(),
  is_shared: z.boolean(),
});

type SaveTemplateFormData = z.infer<typeof saveTemplateSchema>;

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

interface SaveAsTemplateModalProps {
  open: boolean;
  onClose: () => void;
  prescriptionData: PrescriptionData | null;
  onSuccess?: () => void;
}

export const SaveAsTemplateModal = ({
  open,
  onClose,
  prescriptionData,
  onSuccess,
}: SaveAsTemplateModalProps) => {
  const { professionalId, type: userType } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<SaveTemplateFormData>({
    resolver: zodResolver(saveTemplateSchema),
    defaultValues: {
      template_name: '',
      description: '',
      is_shared: false,
    },
  });

  const isShared = watch('is_shared');

  const onSubmit = async (data: SaveTemplateFormData) => {
    if (!prescriptionData) {
      toast({
        title: 'Erro',
        description: 'Dados incompletos para salvar template',
        variant: 'destructive',
      });
      return;
    }

    // Recepcionistas criam templates genéricos (professional_id = null)
    // Profissionais criam templates pessoais (professional_id = seu ID)
    const templateProfessionalId = userType === 'receptionist' ? null : professionalId;

    setIsSubmitting(true);
    try {
      // Criar template
      const { data: template, error: templateError } = await supabase
        .from('prescription_templates')
        .insert({
          template_name: data.template_name,
          description: data.description || null,
          prescription_type: prescriptionData.prescription_type,
          is_shared: userType === 'receptionist' ? false : data.is_shared,
          professional_id: templateProfessionalId,
          general_instructions: prescriptionData.general_instructions || null,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Criar itens do template
      const itemsWithOrder = prescriptionData.items.map((item, index) => ({
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
        description: `Template "${data.template_name}" salvo com sucesso`,
      });

      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
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
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Salvar como Template</AlertDialogTitle>
          <AlertDialogDescription>
            Salve esta receita como template para reutilizar no futuro.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template_name">Nome do Template *</Label>
            <Input
              id="template_name"
              {...register('template_name')}
              placeholder="Ex: Pós-Extração Padrão"
              autoFocus
            />
            {errors.template_name && (
              <p className="text-sm text-destructive">{errors.template_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Ex: Receita padrão para recuperação pós-extração dentária"
              rows={2}
            />
          </div>

          {userType === 'professional' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_shared"
                checked={isShared}
                onCheckedChange={(checked) => setValue('is_shared', checked as boolean)}
              />
              <Label htmlFor="is_shared" className="cursor-pointer text-sm">
                Disponibilizar para outros profissionais da clínica
              </Label>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Template'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
