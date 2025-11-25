import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarIcon, Clock, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { format, addDays, setHours, setMinutes, parseISO, isBefore, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { validateAppointment } from "@/lib/appointmentValidation";
import { TreatmentPlan, PendingScheduleItem } from "@/types/treatment-plan";

interface BulkScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatmentPlan: TreatmentPlan;
  onSuccess: () => void;
}

interface SelectedItem {
  id: string;
  procedure_description: string;
  priority: number;
  tooth_number: number | null;
  estimated_duration: number;
  treatment_id: string | null;
}

interface SuggestedSlot {
  itemId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  reason: string;
}

export const BulkScheduleModal = ({ isOpen, onClose, treatmentPlan, onSuccess }: BulkScheduleModalProps) => {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [professionalSchedules, setProfessionalSchedules] = useState<Array<{ day_of_week: number; start_time: string; end_time: string }>>([]);
  const [existingAppointments, setExistingAppointments] = useState<Array<{ appointment_start_time: string; appointment_end_time: string }>>([]);

  const pendingItems: PendingScheduleItem[] = (treatmentPlan.items?.filter(
    (item) => item.status === 'pending' && !item.appointment_id
  ) || []).map(item => ({ ...item, selected: false }));

  useEffect(() => {
    if (isOpen && treatmentPlan.professional_id) {
      fetchProfessionalData();
    }
  }, [isOpen, treatmentPlan.professional_id]);

  const fetchProfessionalData = async () => {
    try {
      // Fetch professional schedules
      const { data: schedules } = await supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', treatmentPlan.professional_id);

      setProfessionalSchedules(schedules || []);

      // Fetch existing appointments for the next 60 days
      const today = new Date();
      const futureDate = addDays(today, 60);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_start_time, appointment_end_time')
        .eq('professional_id', treatmentPlan.professional_id)
        .gte('appointment_start_time', today.toISOString())
        .lte('appointment_start_time', futureDate.toISOString())
        .neq('status', 'Cancelled');

      setExistingAppointments(appointments || []);
    } catch (error) {
      logger.error('Erro ao buscar dados do profissional:', error);
    }
  };

  const handleItemToggle = async (item: PendingScheduleItem, checked: boolean) => {
    if (checked) {
      // Fetch treatment duration if available
      let duration = 60; // default
      if (item.treatment_id) {
        const { data: treatment } = await supabase
          .from('treatments')
          .select('default_duration_minutes')
          .eq('id', item.treatment_id)
          .single();
        
        if (treatment) {
          duration = treatment.default_duration_minutes;
        }
      }

      setSelectedItems([...selectedItems, {
        id: item.id,
        procedure_description: item.procedure_description,
        priority: item.priority,
        tooth_number: item.tooth_number,
        estimated_duration: duration,
        treatment_id: item.treatment_id,
      }]);
    } else {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    }
  };

  const calculateSuggestedDates = async () => {
    if (selectedItems.length === 0 || professionalSchedules.length === 0) {
      toast({
        title: "Não é possível calcular",
        description: "Selecione procedimentos e certifique-se de que o profissional tem horários configurados.",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    const suggestions: SuggestedSlot[] = [];
    
    // Sort items by priority (higher priority first)
    const sortedItems = [...selectedItems].sort((a, b) => (b.priority || 1) - (a.priority || 1));
    
    let currentDate = addDays(new Date(), 1); // Start from tomorrow
    const maxDate = addDays(new Date(), 60); // Limit to 60 days

    for (const item of sortedItems) {
      let slotFound = false;
      let searchDate = new Date(currentDate);

      while (!slotFound && isBefore(searchDate, maxDate)) {
        const dayOfWeek = searchDate.getDay();
        const daySchedules = professionalSchedules.filter(s => s.day_of_week === dayOfWeek);

        for (const schedule of daySchedules) {
          const [startHour, startMin] = schedule.start_time.split(':').map(Number);
          const [endHour, endMin] = schedule.end_time.split(':').map(Number);
          
          let slotStart = setMinutes(setHours(searchDate, startHour), startMin);
          const scheduleEnd = setMinutes(setHours(searchDate, endHour), endMin);

          // Try to find available slot within this schedule
          while (isBefore(slotStart, scheduleEnd)) {
            const slotEnd = addDays(slotStart, 0);
            slotEnd.setMinutes(slotEnd.getMinutes() + item.estimated_duration);

            if (isAfter(slotEnd, scheduleEnd)) break;

            // Validate using centralized validation
            const validation = await validateAppointment({
              professionalId: treatmentPlan.professional_id,
              patientId: treatmentPlan.patient_id,
              startTime: slotStart,
              endTime: slotEnd,
            });

            if (validation.isValid) {
              const priorityLabel = item.priority === 3 ? 'Alta prioridade' : 
                                   item.priority === 2 ? 'Média prioridade' : 'Normal';
              
              suggestions.push({
                itemId: item.id,
                date: searchDate,
                startTime: slotStart,
                endTime: slotEnd,
                reason: `${priorityLabel} - Próximo horário disponível`,
              });
              
              slotFound = true;
              currentDate = addDays(searchDate, item.priority === 3 ? 3 : 7); // Space out appointments
              break;
            }

            // Move to next 30-minute slot
            slotStart = addDays(slotStart, 0);
            slotStart.setMinutes(slotStart.getMinutes() + 30);
          }

          if (slotFound) break;
        }

        if (!slotFound) {
          searchDate = addDays(searchDate, 1);
        }
      }

      if (!slotFound) {
        toast({
          title: "Não foi possível agendar todos",
          description: `Não há horários disponíveis suficientes para: ${item.procedure_description}`,
          variant: "destructive",
        });
      }
    }

    setSuggestedSlots(suggestions);
    setIsCalculating(false);

    if (suggestions.length > 0) {
      toast({
        title: "Datas sugeridas!",
        description: `${suggestions.length} horários encontrados baseados em prioridade e disponibilidade.`,
      });
    }
  };

  const handleConfirmSchedule = async () => {
    if (suggestedSlots.length === 0) return;

    setIsScheduling(true);
    let successCount = 0;

    try {
      for (const slot of suggestedSlots) {
        const item = selectedItems.find(i => i.id === slot.itemId);
        if (!item) continue;

        // Create appointment
        const { data: appointment, error: aptError } = await supabase
          .from('appointments')
          .insert({
            patient_id: treatmentPlan.patient_id,
            professional_id: treatmentPlan.professional_id,
            treatment_id: item.treatment_id,
            treatment_plan_item_id: slot.itemId,
            appointment_start_time: slot.startTime.toISOString(),
            appointment_end_time: slot.endTime.toISOString(),
            status: 'Scheduled',
            notes: `Agendado automaticamente - ${item.procedure_description}`,
          })
          .select()
          .single();

        if (aptError) throw aptError;

        // Update treatment plan item
        const { error: itemError } = await supabase
          .from('treatment_plan_items')
          .update({
            appointment_id: appointment.id,
            scheduled_date: slot.startTime.toISOString(),
            status: 'in_progress',
          })
          .eq('id', slot.itemId);

        if (itemError) throw itemError;

        successCount++;
      }

      toast({
        title: "Agendamentos criados!",
        description: `${successCount} procedimentos agendados com sucesso.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Erro ao criar agendamentos:', error);
      toast({
        title: "Erro ao agendar",
        description: `${successCount} agendamentos criados antes do erro.`,
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority === 3) return <Badge variant="destructive">Alta</Badge>;
    if (priority === 2) return <Badge className="bg-amber-500">Média</Badge>;
    return <Badge variant="secondary">Normal</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Agendamento em Lote - Sugestão Inteligente
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Left: Item Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Selecione os Procedimentos</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {pendingItems.length} procedimentos pendentes
              </p>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {pendingItems.map((item: PendingScheduleItem) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedItems.some(i => i.id === item.id)}
                      onCheckedChange={(checked) => handleItemToggle(item, checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getPriorityBadge(item.priority || 1)}
                        {item.tooth_number && (
                          <span className="text-xs text-muted-foreground">
                            Dente {item.tooth_number}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium">{item.procedure_description}</p>
                      {item.estimated_cost > 0 && (
                        <p className="text-xs text-muted-foreground">
                          R$ {Number(item.estimated_cost).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={calculateSuggestedDates}
              disabled={selectedItems.length === 0 || isCalculating}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isCalculating ? 'Calculando...' : 'Sugerir Datas'}
            </Button>
          </div>

          {/* Right: Suggested Dates */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Datas Sugeridas</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {suggestedSlots.length > 0 
                  ? `${suggestedSlots.length} agendamentos prontos`
                  : 'Nenhuma sugestão ainda'
                }
              </p>
            </div>

            {professionalSchedules.length === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  O profissional não possui horários configurados. Configure antes de agendar.
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[400px] pr-4">
              {suggestedSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mb-3 opacity-50" />
                  <p>Selecione procedimentos e clique em "Sugerir Datas"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedSlots.map((slot, index) => {
                    const item = selectedItems.find(i => i.id === slot.itemId);
                    return (
                      <div
                        key={slot.itemId}
                        className="p-3 border rounded-lg bg-primary/5 border-primary/20"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">#{index + 1}</span>
                          </div>
                          {item && getPriorityBadge(item.priority)}
                        </div>
                        
                        <p className="text-sm font-medium mb-1">
                          {item?.procedure_description}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(slot.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Clock className="h-3 w-3" />
                          {format(slot.startTime, 'HH:mm')} - {format(slot.endTime, 'HH:mm')}
                          <span className="text-primary">({item?.estimated_duration}min)</span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground italic">{slot.reason}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {suggestedSlots.length > 0 && (
              <Button
                onClick={handleConfirmSchedule}
                disabled={isScheduling}
                className="w-full"
              >
                {isScheduling ? 'Agendando...' : `Confirmar ${suggestedSlots.length} Agendamentos`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
