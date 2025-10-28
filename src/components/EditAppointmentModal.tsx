import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { logger } from '@/lib/logger';

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

interface EditAppointmentModalProps {
  appointmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditAppointmentModal({ appointmentId, open, onOpenChange, onSuccess }: EditAppointmentModalProps) {
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [cancelAndAddDialogOpen, setCancelAndAddDialogOpen] = useState(false);
  const [waitingListNotes, setWaitingListNotes] = useState('');
  const queryClient = useQueryClient();

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

  // Fetch appointment data
  const { data: appointmentData, isLoading: loadingAppointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!appointmentId,
  });

  // Load appointment data into form
  useEffect(() => {
    if (appointmentData) {
      const startDate = new Date(appointmentData.appointment_start_time);
      const endDate = new Date(appointmentData.appointment_end_time);
      
      form.reset({
        patient_id: appointmentData.patient_id || '',
        treatment_id: appointmentData.treatment_id || '',
        professional_id: appointmentData.professional_id || '',
        appointment_date: startDate,
        start_time: format(startDate, 'HH:mm'),
        end_time: format(endDate, 'HH:mm'),
        notes: appointmentData.notes || '',
        is_squeeze_in: appointmentData.is_squeeze_in || false,
      });
    }
  }, [appointmentData, form]);

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
      return data;
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
      return data;
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
      return data;
    },
  });


  const handleCancelAndAddToWaitingList = async () => {
    try {
      const formValues = form.getValues();
      
      // Update appointment status to Cancelled
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'Cancelled' })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Add to waiting list
      const { error: insertError } = await supabase
        .from('waiting_list')
        .insert({
          patient_id: formValues.patient_id,
          professional_id: formValues.professional_id,
          notes: waitingListNotes || 'Cancelado e adicionado à lista de espera',
        });

      if (insertError) throw insertError;

      toast({
        title: 'Sucesso',
        description: 'Agendamento cancelado e paciente adicionado à lista de espera.',
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['waiting_list'] });
      
      setCancelAndAddDialogOpen(false);
      setWaitingListNotes('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('Erro ao cancelar e adicionar à lista de espera:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar solicitação. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      // Combine date and time for start and end timestamps
      const startDateTime = new Date(data.appointment_date);
      const [startHour, startMinute] = data.start_time.split(':');
      startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

      const endDateTime = new Date(data.appointment_date);
      const [endHour, endMinute] = data.end_time.split(':');
      endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

      // Check for conflicting appointments (excluding current one)
      const { data: conflictingAppointments, error: conflictError } = await supabase
        .from('appointments')
        .select('id')
        .eq('professional_id', data.professional_id)
        .neq('id', appointmentId)
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
            description: 'Este horário já está ocupado. Marque como "Encaixe" se desejar salvar mesmo assim.',
            variant: 'destructive',
          });
          return;
        } else {
          // Se FOR encaixe, apenas avisar mas permitir
          toast({
            title: 'Encaixe atualizado',
            description: 'Este agendamento está marcado como encaixe devido ao conflito de horário.',
          });
        }
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          patient_id: data.patient_id,
          treatment_id: data.treatment_id,
          professional_id: data.professional_id,
          appointment_start_time: startDateTime.toISOString(),
          appointment_end_time: endDateTime.toISOString(),
          notes: data.notes || null,
          is_squeeze_in: data.is_squeeze_in || false,
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Agendamento atualizado',
        description: 'O agendamento foi atualizado com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('Erro ao atualizar agendamento:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar agendamento. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Editar Agendamento</DialogTitle>
        </DialogHeader>
        
        {loadingAppointment ? (
          <div className="py-8 text-center">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="edit-appointment-form">
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
                          <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[400px] max-w-[450px] p-0">
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

                  <FormField
                    control={form.control}
                    name="treatment_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tratamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um tratamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-w-[450px]">
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

                  <FormField
                    control={form.control}
                    name="professional_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profissional</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um profissional" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-w-[450px]">
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
                          <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
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
                            Permite salvar o agendamento mesmo que haja conflito de horário com outro agendamento.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>

            <div className="flex-shrink-0 pt-4 border-t mt-4">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setCancelAndAddDialogOpen(true)}
                  className="sm:mr-auto"
                >
                  Cancelar e Add. à Lista de Espera
                </Button>
                <div className="flex gap-2 sm:ml-auto">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" form="edit-appointment-form">
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>

      <AlertDialog open={cancelAndAddDialogOpen} onOpenChange={setCancelAndAddDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar e Adicionar à Lista de Espera</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação cancelará o agendamento e adicionará o paciente à lista de espera do profissional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Observações (opcional)
            </label>
            <Textarea
              value={waitingListNotes}
              onChange={(e) => setWaitingListNotes(e.target.value)}
              placeholder="Motivo do cancelamento ou observações..."
              className="resize-none"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWaitingListNotes('')}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAndAddToWaitingList}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
