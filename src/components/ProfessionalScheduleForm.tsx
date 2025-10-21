import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface DaySchedule {
  day_of_week: number;
  is_working: boolean;
  time_slots: TimeSlot[];
}

interface ProfessionalScheduleFormProps {
  professionalId?: string | null;
  onScheduleChange?: (schedules: DaySchedule[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

export default function ProfessionalScheduleForm({ professionalId, onScheduleChange }: ProfessionalScheduleFormProps) {
  const [schedules, setSchedules] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map(day => ({
      day_of_week: day.value,
      is_working: false,
      time_slots: []
    }))
  );

  // Carrega horários existentes quando houver professionalId
  useEffect(() => {
    if (professionalId) {
      loadExistingSchedules();
    }
  }, [professionalId]);

  const loadExistingSchedules = async () => {
    if (!professionalId) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', professionalId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Agrupa os horários por dia da semana
        const groupedSchedules = DAYS_OF_WEEK.map(day => {
          const daySlots = data.filter(s => s.day_of_week === day.value);
          return {
            day_of_week: day.value,
            is_working: daySlots.length > 0,
            time_slots: daySlots.map(s => ({
              start_time: s.start_time,
              end_time: s.end_time
            }))
          };
        });
        setSchedules(groupedSchedules);
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
    }
  };

  // Notifica mudanças ao componente pai
  useEffect(() => {
    if (onScheduleChange) {
      onScheduleChange(schedules);
    }
  }, [schedules]);

  const toggleWorkingDay = (dayIndex: number) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      const isCurrentlyWorking = newSchedules[dayIndex].is_working;
      
      newSchedules[dayIndex] = {
        ...newSchedules[dayIndex],
        is_working: !isCurrentlyWorking,
        time_slots: !isCurrentlyWorking ? [{ start_time: '08:00', end_time: '18:00' }] : []
      };
      
      return newSchedules;
    });
  };

  const addTimeSlot = (dayIndex: number) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      const lastSlot = newSchedules[dayIndex].time_slots[newSchedules[dayIndex].time_slots.length - 1];
      
      newSchedules[dayIndex].time_slots.push({
        start_time: lastSlot?.end_time || '08:00',
        end_time: '18:00'
      });
      
      return newSchedules;
    });
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      newSchedules[dayIndex].time_slots.splice(slotIndex, 1);
      
      // Se não houver mais slots, marca como não trabalhando
      if (newSchedules[dayIndex].time_slots.length === 0) {
        newSchedules[dayIndex].is_working = false;
      }
      
      return newSchedules;
    });
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      newSchedules[dayIndex].time_slots[slotIndex][field] = value;
      return newSchedules;
    });
  };

  const validateTimeSlot = (dayIndex: number, slotIndex: number): boolean => {
    const slot = schedules[dayIndex].time_slots[slotIndex];
    
    if (!slot.start_time || !slot.end_time) {
      toast({
        title: 'Erro de validação',
        description: 'Todos os horários devem ser preenchidos.',
        variant: 'destructive'
      });
      return false;
    }

    if (slot.start_time >= slot.end_time) {
      toast({
        title: 'Erro de validação',
        description: 'O horário de início deve ser anterior ao horário de término.',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Configure os dias e horários de trabalho
        </h3>
      </div>

      {DAYS_OF_WEEK.map((day, dayIndex) => {
        const daySchedule = schedules[dayIndex];
        
        return (
          <Card key={day.value} className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={daySchedule.is_working}
                    onCheckedChange={() => toggleWorkingDay(dayIndex)}
                  />
                  <Label
                    htmlFor={`day-${day.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {day.label}
                  </Label>
                </div>
                
                {daySchedule.is_working && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(dayIndex)}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar Período
                  </Button>
                )}
              </div>
            </CardHeader>

            {daySchedule.is_working && daySchedule.time_slots.length > 0 && (
              <CardContent className="pt-0 space-y-3">
                {daySchedule.time_slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Início</Label>
                  <Input
                    type="time"
                    value={slot.start_time || ''}
                    onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'start_time', e.target.value)}
                    onBlur={() => validateTimeSlot(dayIndex, slotIndex)}
                    className="text-sm"
                  />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Término</Label>
                  <Input
                    type="time"
                    value={slot.end_time || ''}
                    onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'end_time', e.target.value)}
                    onBlur={() => validateTimeSlot(dayIndex, slotIndex)}
                    className="text-sm"
                  />
                      </div>
                    </div>
                    
                    {daySchedule.time_slots.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                        className="text-destructive hover:text-destructive mt-5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
