import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createLocalDateTime } from '@/lib/dateUtils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type BlockType = Database['public']['Enums']['block_type_enum'];

interface BlockTimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionals: Array<{ id: string; full_name: string }>;
  onSuccess: () => void;
  initialData?: {
    professional_id?: string;
    date?: Date;
    editingBlockId?: string;
  };
}

export function BlockTimeModal({ open, onOpenChange, professionals, onSuccess, initialData }: BlockTimeModalProps) {
  const { toast } = useToast();
  const [professionalId, setProfessionalId] = useState(initialData?.professional_id || '');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialData?.date || new Date());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData?.editingBlockId;

  // Determine block type based on times
  const getBlockType = (start: string, end: string): BlockType => {
    if (start === '08:00' && end === '18:00') return 'full_day';
    if (start === '08:00' && end === '12:00') return 'morning';
    if (start === '13:00' && end === '18:00') return 'afternoon';
    return 'custom';
  };

  // Load block data when editing
  useEffect(() => {
    if (initialData?.editingBlockId && open) {
      const loadBlockData = async () => {
        const { data, error } = await supabase
          .from('time_blocks')
          .select('*')
          .eq('id', initialData.editingBlockId)
          .single();
        
        if (data && !error) {
          // Parse UTC times directly without timezone conversion
          const startDate = new Date(data.start_time);
          const endDate = new Date(data.end_time);
          
          setStartTime(
            `${startDate.getUTCHours().toString().padStart(2, '0')}:${startDate.getUTCMinutes().toString().padStart(2, '0')}`
          );
          setEndTime(
            `${endDate.getUTCHours().toString().padStart(2, '0')}:${endDate.getUTCMinutes().toString().padStart(2, '0')}`
          );
          setReason(data.reason || '');
          setProfessionalId(data.professional_id);
          setSelectedDate(new Date(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate()
          ));
        }
      };
      loadBlockData();
    } else if (!open) {
      // Reset form when closing
      setProfessionalId(initialData?.professional_id || '');
      setSelectedDate(initialData?.date || new Date());
      setStartTime('08:00');
      setEndTime('09:00');
      setReason('');
    }
  }, [open, initialData?.editingBlockId, initialData?.professional_id, initialData?.date]);

  const handleQuickBlock = (type: 'full' | 'morning' | 'afternoon') => {
    if (type === 'full') {
      setStartTime('08:00');
      setEndTime('18:00');
    } else if (type === 'morning') {
      setStartTime('08:00');
      setEndTime('12:00');
    } else if (type === 'afternoon') {
      setStartTime('13:00');
      setEndTime('18:00');
    }
  };

  const handleSubmit = async () => {
    if (!professionalId || !selectedDate || !startTime || !endTime) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = createLocalDateTime(selectedDate, startTime);
      const endDateTime = createLocalDateTime(selectedDate, endTime);

      if (endDateTime <= startDateTime) {
        toast({
          title: 'Horário inválido',
          description: 'O horário final deve ser posterior ao horário inicial.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const blockType = getBlockType(startTime, endTime);

      if (isEditing && initialData?.editingBlockId) {
        // Update existing block in time_blocks table
        const { error } = await supabase
          .from('time_blocks')
          .update({
            professional_id: professionalId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            reason: reason || 'Horário bloqueado',
            block_type: blockType,
          })
          .eq('id', initialData.editingBlockId);

        if (error) throw error;

        toast({
          title: 'Bloqueio atualizado',
          description: 'O bloqueio foi atualizado com sucesso.',
        });
      } else {
        // Create new block in time_blocks table
        const { error } = await supabase.from('time_blocks').insert({
          professional_id: professionalId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          reason: reason || 'Horário bloqueado',
          block_type: blockType,
        });

        if (error) throw error;

        toast({
          title: 'Horário bloqueado',
          description: 'O horário foi bloqueado com sucesso.',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      logger.error('Erro ao bloquear horário:', error);
      toast({
        title: isEditing ? 'Erro ao atualizar' : 'Erro ao bloquear',
        description: isEditing 
          ? 'Erro ao atualizar o bloqueio. Tente novamente.' 
          : 'Erro ao bloquear horário. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gerar opções de horário (08:00 - 20:00, a cada 30 minutos)
  const timeOptions = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Bloqueio de Horário' : 'Bloquear Horário'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edite os detalhes do bloqueio de horário.' 
              : 'Bloqueie horários na agenda para férias, reuniões, compromissos pessoais, etc.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Profissional */}
          <div className="space-y-2">
            <Label htmlFor="professional">Profissional *</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger id="professional">
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label>Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Botões rápidos */}
          <div className="space-y-2">
            <Label>Bloqueios rápidos</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickBlock('full')} className="flex-1">
                Dia todo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickBlock('morning')} className="flex-1">
                Manhã
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickBlock('afternoon')} className="flex-1">
                Tarde
              </Button>
            </div>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Hora inicial *</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger id="start-time">
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">Hora final *</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger id="end-time">
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Férias, reunião, compromisso pessoal..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting 
              ? (isEditing ? 'Atualizando...' : 'Bloqueando...') 
              : (isEditing ? 'Atualizar Bloqueio' : 'Bloquear Horário')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
