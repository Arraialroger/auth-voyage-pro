import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Search, Clock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Paciente é obrigatório'),
  treatment_id: z.string().min(1, 'Tratamento é obrigatório'),
  professional_id: z.string().min(1, 'Profissional é obrigatório'),
  appointment_date: z.date({
    required_error: 'Data é obrigatória',
  }),
  start_time: z.string().min(1, 'Horário de início é obrigatório'),
  end_time: z.string().min(1, 'Horário de fim é obrigatório'),
  notes: z.string().optional(),
});

const waitingListSchema = z.object({
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;
type WaitingListFormData = z.infer<typeof waitingListSchema>;

interface NewAppointmentModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialValues?: {
    professional_id?: string;
    appointment_date?: Date;
    start_time?: string;
  };
}


const supabaseClient = createClient(
  "https://bacwlstdjceottxccrap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3dsc3RkamNlb3R0eGNjcmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTA2MDQsImV4cCI6MjA3NDEyNjYwNH0.VMkRLrcwxEnUm1q5jaSbuUJgsh2Ym7pv6Ay2muNYso8"
);

export function NewAppointmentModal({ trigger, onSuccess, open: externalOpen, onOpenChange: externalOnOpenChange, initialValues }: NewAppointmentModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showWaitingListForm, setShowWaitingListForm] = useState(false);
  const queryClient = useQueryClient();

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      notes: '',
      patient_id: '',
      treatment_id: '',
      professional_id: '',
      appointment_date: undefined,
      start_time: '',
      end_time: '',
    },
  });

  const waitingListForm = useForm<WaitingListFormData>({
    resolver: zodResolver(waitingListSchema),
    defaultValues: {
      notes: '',
    },
  });

  // Update form values when initialValues change
  React.useEffect(() => {
    if (initialValues) {
      if (initialValues.professional_id) {
        form.setValue('professional_id', initialValues.professional_id);
      }
      if (initialValues.appointment_date) {
        form.setValue('appointment_date', initialValues.appointment_date);
      }
      if (initialValues.start_time) {
        form.setValue('start_time', initialValues.start_time);
      }
    }
  }, [initialValues, form]);

  // Watch for changes in treatment and start time to auto-calculate end time
  const watchTreatmentId = form.watch('treatment_id');
  const watchStartTime = form.watch('start_time');

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, contact_phone')
        .order('full_name');
      
      if (error) throw error;
      return data as Array<{
        id: string;
        full_name: string;
        contact_phone: string;
      }>;
    },
  });

  // Fetch treatments
  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatments')
        .select('id, treatment_name, default_duration_minutes')
        .order('treatment_name');
      
      if (error) throw error;
      return data as Array<{
        id: string;
        treatment_name: string;
        default_duration_minutes: number;
      }>;
    },
  });

  // Fetch professionals
  const { data: professionals = [] } = useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, full_name, specialization')
        .order('full_name');
      
      if (error) throw error;
      return data as Array<{
        id: string;
        full_name: string;
        specialization: string;
      }>;
    },
  });

  // Auto-calculate end time when treatment and start time are available
  React.useEffect(() => {
    if (watchTreatmentId && watchStartTime) {
      const selectedTreatment = treatments.find(t => t.id === watchTreatmentId);
      if (selectedTreatment) {
        const [hours, minutes] = watchStartTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(startDate.getTime() + (selectedTreatment.default_duration_minutes * 60000));
        const endTime = endDate.toTimeString().slice(0, 5);
        
        form.setValue('end_time', endTime);
      }
    }
  }, [watchTreatmentId, watchStartTime, treatments, form]);

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      // Combine date and time for start and end timestamps
      const startDateTime = new Date(data.appointment_date);
      const [startHour, startMinute] = data.start_time.split(':');
      startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

      const endDateTime = new Date(data.appointment_date);
      const [endHour, endMinute] = data.end_time.split(':');
      endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

      // Check for conflicting appointments
      const { data: conflictingAppointments, error: conflictError } = await supabase
        .from('appointments')
        .select('id')
        .eq('professional_id', data.professional_id)
        .lt('appointment_start_time', endDateTime.toISOString())
        .gt('appointment_end_time', startDateTime.toISOString());

      if (conflictError) throw conflictError;

      if (conflictingAppointments && conflictingAppointments.length > 0) {
        toast({
          title: 'Conflito de horário',
          description: 'Este horário já está ocupado.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('appointments')
        .insert([
          {
            patient_id: data.patient_id,
            treatment_id: data.treatment_id,
            professional_id: data.professional_id,
            appointment_start_time: startDateTime.toISOString(),
            appointment_end_time: endDateTime.toISOString(),
            notes: data.notes || null,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Agendamento criado',
        description: 'O novo agendamento foi criado com sucesso.',
      });

      // Invalidate and refetch appointments
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar agendamento. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const onAddToWaitingList = async (data: WaitingListFormData) => {
    try {
      const patientId = form.getValues('patient_id');
      const professionalId = form.getValues('professional_id');

      if (!patientId || !professionalId) {
        toast({
          title: 'Erro',
          description: 'Selecione um paciente e um profissional primeiro.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabaseClient
        .from('waiting_list')
        .insert([
          {
            patient_id: patientId,
            professional_id: professionalId,
            notes: data.notes || null,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Adicionado à lista de espera',
        description: 'Paciente adicionado à lista de espera com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
      waitingListForm.reset();
      setShowWaitingListForm(false);
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding to waiting list:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar à lista de espera. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Patient Search Field */}
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Paciente</FormLabel>
                  <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? patients.find((patient) => patient.id === field.value)?.full_name
                            : "Selecione um paciente"}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar paciente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {patients.map((patient) => (
                              <CommandItem
                                key={patient.id}
                                value={patient.full_name}
                                onSelect={() => {
                                  field.onChange(patient.id);
                                  setPatientSearchOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span>{patient.full_name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {patient.contact_phone}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Treatment Select */}
            <FormField
              control={form.control}
              name="treatment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tratamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tratamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {treatments.map((treatment) => (
                        <SelectItem key={treatment.id} value={treatment.id}>
                          <div className="flex flex-col">
                            <span>{treatment.treatment_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {treatment.default_duration_minutes} min
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Professional Select */}
            <FormField
              control={form.control}
              name="professional_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um profissional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {professionals.map((professional) => (
                        <SelectItem key={professional.id} value={professional.id}>
                          <div className="flex flex-col">
                            <span>{professional.full_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {professional.specialization}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Picker */}
            <FormField
              control={form.control}
              name="appointment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Fim</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o agendamento..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Waiting List Section */}
            {showWaitingListForm && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Adicionar à Lista de Espera
                </h4>
                <Form {...waitingListForm}>
                  <form onSubmit={waitingListForm.handleSubmit(onAddToWaitingList)} className="space-y-3">
                    <FormField
                      control={waitingListForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações (opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Motivo ou observações sobre a lista de espera..."
                              className="resize-none"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowWaitingListForm(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm">
                        Adicionar à Lista
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWaitingListForm(!showWaitingListForm)}
                className="gap-2"
                disabled={!form.getValues('patient_id') || !form.getValues('professional_id')}
              >
                <Clock className="h-4 w-4" />
                {showWaitingListForm ? 'Ocultar Lista de Espera' : 'Adicionar à Lista de Espera'}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Agendamento
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}