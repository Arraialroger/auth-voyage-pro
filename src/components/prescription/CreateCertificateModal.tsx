import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const certificateSchema = z.object({
  certificate_type: z.enum(['attendance', 'medical_leave', 'fitness']),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  start_date: z.date({ required_error: 'Data inicial é obrigatória' }),
  end_date: z.date().optional(),
  cid_10_code: z.string().optional(),
  additional_notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.end_date && data.start_date) {
      return data.end_date >= data.start_date;
    }
    return true;
  },
  {
    message: 'Data final deve ser posterior à data inicial',
    path: ['end_date'],
  }
);

type CertificateFormData = z.infer<typeof certificateSchema>;

interface CreateCertificateModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId?: string;
  onSuccess?: () => void;
}

export const CreateCertificateModal = ({
  open,
  onClose,
  patientId,
  appointmentId,
  onSuccess,
}: CreateCertificateModalProps) => {
  const { user } = useAuth();
  const { professionalId } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CertificateFormData>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      certificate_type: 'attendance',
      reason: '',
      start_date: new Date(),
      additional_notes: '',
    },
  });

  const certificateType = watch('certificate_type');
  const startDate = watch('start_date');
  const endDate = watch('end_date');

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

  const getCertificateTypeDescription = (type: string) => {
    switch (type) {
      case 'attendance':
        return 'Atesta que o paciente compareceu à consulta';
      case 'medical_leave':
        return 'Atesta necessidade de afastamento das atividades';
      case 'fitness':
        return 'Atesta aptidão para atividades físicas';
      default:
        return '';
    }
  };

  const onSubmit = async (data: CertificateFormData) => {
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
      const { error } = await supabase
        .from('medical_certificates')
        .insert({
          patient_id: patientId,
          professional_id: professionalId,
          appointment_id: appointmentId || null,
          certificate_type: data.certificate_type,
          reason: data.reason,
          start_date: format(data.start_date, 'yyyy-MM-dd'),
          end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : null,
          cid_10_code: data.cid_10_code || null,
          additional_notes: data.additional_notes || null,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Atestado criado com sucesso',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Erro ao criar atestado:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o atestado',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Atestado Médico</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tipo de Atestado */}
          <div className="space-y-2">
            <Label htmlFor="certificate_type">Tipo de Atestado *</Label>
            <Select
              value={certificateType}
              onValueChange={(value) => setValue('certificate_type', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Comparecimento</span>
                    <span className="text-xs text-muted-foreground">Atesta presença na consulta</span>
                  </div>
                </SelectItem>
                <SelectItem value="medical_leave">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Afastamento Médico</span>
                    <span className="text-xs text-muted-foreground">Atesta necessidade de afastamento</span>
                  </div>
                </SelectItem>
                <SelectItem value="fitness">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Aptidão Física</span>
                    <span className="text-xs text-muted-foreground">Atesta aptidão para atividades</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getCertificateTypeDescription(certificateType)}
            </p>
            {errors.certificate_type && (
              <p className="text-sm text-destructive">{errors.certificate_type.message}</p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Textarea
              {...register('reason')}
              placeholder="Descreva o motivo do atestado..."
              rows={3}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => setValue('start_date', date as Date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            {certificateType === 'medical_leave' && (
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => setValue('end_date', date)}
                      locale={ptBR}
                      disabled={(date) => date < startDate}
                    />
                  </PopoverContent>
                </Popover>
                {errors.end_date && (
                  <p className="text-sm text-destructive">{errors.end_date.message}</p>
                )}
              </div>
            )}
          </div>

          {/* CID-10 (apenas para afastamento) */}
          {certificateType === 'medical_leave' && (
            <div className="space-y-2">
              <Label htmlFor="cid_10_code">CID-10 (Opcional)</Label>
              <Input
                {...register('cid_10_code')}
                placeholder="Ex: M79.1"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Código de classificação internacional de doenças
              </p>
            </div>
          )}

          {/* Observações Adicionais */}
          <div className="space-y-2">
            <Label htmlFor="additional_notes">Observações Adicionais</Label>
            <Textarea
              {...register('additional_notes')}
              placeholder="Informações complementares..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Atestado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
