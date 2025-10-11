import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Search, Clock, DollarSign } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  register_payment: z.boolean().default(false),
  payment_amount: z.string().optional(),
  payment_method: z.enum(["cash", "credit_card", "debit_card", "pix", "bank_transfer"]).optional(),
  discount_amount: z.string().optional(),
  is_installment: z.boolean().default(false),
  installments: z.string().optional(),
  first_due_date: z.string().optional(),
  payment_notes: z.string().optional(),
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
  };
}

export function NewAppointmentModal({ trigger, onSuccess, open: externalOpen, onOpenChange: externalOnOpenChange, initialValues }: NewAppointmentModalProps) {
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
      register_payment: false,
      payment_amount: '',
      payment_method: 'pix',
      discount_amount: '0',
      is_installment: false,
      installments: '1',
      first_due_date: new Date().toISOString().split('T')[0],
      payment_notes: '',
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
    }
  }, [initialValues, form]);

  // Watch for changes in treatment and start time to auto-calculate end time
  const watchTreatmentId = form.watch('treatment_id');
  const watchStartTime = form.watch('start_time');
  const watchRegisterPayment = form.watch('register_payment');
  const watchIsInstallment = form.watch('is_installment');

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
    setIsSubmitting(true);
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
        setIsSubmitting(false);
        return;
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
          },
        ])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // If payment registration is requested, create the transaction
      if (data.register_payment && data.payment_amount) {
        try {
          const amount = parseFloat(data.payment_amount);
          const discountAmount = parseFloat(data.discount_amount || '0');
          const finalAmount = amount - discountAmount;

          const transactionData: any = {
            patient_id: data.patient_id,
            appointment_id: newAppointment.id,
            amount,
            discount_amount: discountAmount,
            final_amount: finalAmount,
            payment_method: data.payment_method || 'pix',
            transaction_type: 'payment',
            status: data.is_installment ? 'pending' : 'paid',
          };

          if (!data.is_installment) {
            transactionData.payment_date = new Date().toISOString();
          }

          if (data.payment_notes) {
            transactionData.notes = data.payment_notes;
          }

          const { data: transaction, error: transactionError } = await supabase
            .from('financial_transactions')
            .insert(transactionData)
            .select()
            .single();

          if (transactionError) throw transactionError;

          // Create installment plan if needed
          if (data.is_installment && transaction) {
            const totalInstallments = parseInt(data.installments || '1');
            const installmentValue = finalAmount / totalInstallments;

            const { data: plan, error: planError } = await supabase
              .from('installment_plans')
              .insert({
                transaction_id: transaction.id,
                total_installments: totalInstallments,
                installment_value: installmentValue,
                first_due_date: data.first_due_date,
                status: 'active',
              })
              .select()
              .single();

            if (planError) throw planError;

            // Create individual installments
            const installments = Array.from({ length: totalInstallments }, (_, i) => {
              const dueDate = new Date(data.first_due_date!);
              dueDate.setMonth(dueDate.getMonth() + i);

              return {
                installment_plan_id: plan.id,
                installment_number: i + 1,
                amount: installmentValue,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending' as const,
              };
            });

            const { error: installmentsError } = await supabase
              .from('installment_payments')
              .insert(installments);

            if (installmentsError) throw installmentsError;
          }

          toast({
            title: 'Sucesso!',
            description: data.is_installment 
              ? `Agendamento criado e pagamento parcelado em ${data.installments}x registrado!`
              : 'Agendamento criado e pagamento registrado com sucesso!',
          });
        } catch (paymentError) {
          // Rollback: delete the appointment if payment fails
          await supabase.from('appointments').delete().eq('id', newAppointment.id);
          throw new Error('Erro ao processar pagamento. Agendamento cancelado.');
        }
      } else {
        toast({
          title: 'Agendamento criado',
          description: 'O novo agendamento foi criado com sucesso.',
        });
      }

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating appointment:', error);
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

            {/* Register Payment Checkbox */}
            <FormField
              control={form.control}
              name="register_payment"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 border-t pt-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 flex items-center gap-2 cursor-pointer">
                    <DollarSign className="h-4 w-4" />
                    Registrar Pagamento Agora
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Payment Fields - Show when register_payment is true */}
            {watchRegisterPayment && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Detalhes do Pagamento
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="payment_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discount_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desconto</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_installment"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Parcelar pagamento</FormLabel>
                    </FormItem>
                  )}
                />

                {watchIsInstallment && (
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-background">
                    <FormField
                      control={form.control}
                      name="installments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Parcelas</FormLabel>
                          <FormControl>
                            <Input type="number" min="2" max="24" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="first_due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data do 1º Vencimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="payment_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações do Pagamento</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Informações adicionais sobre o pagamento..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : watchRegisterPayment ? 'Criar Agendamento e Registrar Pagamento' : 'Criar Agendamento'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}