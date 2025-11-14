import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Search, Clock } from 'lucide-react';
import { createLocalDateTime } from '@/lib/dateUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

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
import { Checkbox } from '@/components/ui/checkbox';
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
  is_squeeze_in: z.boolean().default(false),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface NewAppointmentModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialValues?: {
    professional_id?: string;
    appointment_date?: Date;
    start_time?: string;
    patient_id?: string;
    treatment_id?: string;
  };
  treatmentPlanItemId?: string;
}

export function NewAppointmentModal({ trigger, onSuccess, open: externalOpen, onOpenChange: externalOnOpenChange, initialValues, treatmentPlanItemId }: NewAppointmentModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      is_squeeze_in: false,
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
      if (initialValues.patient_id) {
        form.setValue('patient_id', initialValues.patient_id);
      }
      if (initialValues.treatment_id) {
        form.setValue('treatment_id', initialValues.treatment_id);
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


  const onSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true);
    try {
      // Combine date and time for start and end timestamps
      const startDateTime = createLocalDateTime(data.appointment_date, data.start_time);
      const endDateTime = createLocalDateTime(data.appointment_date, data.end_time);

      // Check for conflicting appointments
      const { data: conflictingAppointments, error: conflictError } = await supabase
        .from('appointments')
        .select('id')
        .eq('professional_id', data.professional_id)
        .neq('status', 'Cancelled')
        .lt('appointment_start_time', endDateTime.toISOString())
        .gt('appointment_end_time', startDateTime.toISOString());

      if (conflictError) throw conflictError;

      const isSqueezeIn = data.is_squeeze_in;

      if (conflictingAppointments && conflictingAppointments.length > 0) {
        if (!isSqueezeIn) {
          // Se NÃO for encaixe, bloquear normalmente
          toast({
            title: 'Conflito de horário',
            description: 'Este horário já está ocupado. Marque como "Encaixe" se desejar criar mesmo assim.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        } else {
          // Se FOR encaixe, apenas avisar mas permitir
          toast({
            title: 'Encaixe criado',
            description: 'Este agendamento será marcado como encaixe devido ao conflito de horário.',
          });
        }
      }

      // Create appointment
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            patient_id: data.patient_id,
            treatment_id: data.treatment_id,
            professional_id: data.professional_id,
            appointment_start_time: startDateTime.toISOString(),
            appointment_end_time: endDateTime.toISOString(),
            notes: data.notes || null,
            is_squeeze_in: data.is_squeeze_in || false,
            treatment_plan_item_id: treatmentPlanItemId || null,
          },
        ])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Update treatment_plan_item if linked
      if (treatmentPlanItemId && newAppointment) {
        const { error: updateItemError } = await supabase
          .from('treatment_plan_items')
          .update({
            appointment_id: newAppointment.id,
            scheduled_date: startDateTime.toISOString(),
          })
          .eq('id', treatmentPlanItemId);

        if (updateItemError) {
          logger.error('Erro ao atualizar item do plano:', updateItemError);
          // Não bloqueia o fluxo, apenas loga o erro
        }
      }

      toast({
        title: 'Agendamento criado',
        description: 'O novo agendamento foi criado com sucesso.',
      });

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      // Error is already shown in toast, no need to log in production
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar agendamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
                          disabled={!!initialValues?.patient_id}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialValues?.treatment_id}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialValues?.professional_id}>
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

            {/* Checkbox de Encaixe */}
            <FormField
              control={form.control}
              name="is_squeeze_in"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 bg-muted/20">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Marcar como Encaixe
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Permite criar o agendamento mesmo que haja conflito de horário com outro agendamento.
                    </p>
                  </div>
                </FormItem>
              )}
            />


            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Criar Agendamento'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}