import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const paymentSchema = z.object({
  patient_id: z.string().uuid("Selecione um paciente válido"),
  appointment_id: z.string().uuid().optional(),
  amount: z.string().min(1, "Informe o valor"),
  payment_method: z.enum(["cash", "credit_card", "debit_card", "pix", "bank_transfer"]),
  discount_amount: z.string().optional(),
  notes: z.string().optional(),
  is_installment: z.boolean().default(false),
  installments: z.string().optional(),
  first_due_date: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPatientId?: string;
  defaultAppointmentId?: string;
}

export function RegisterPaymentModal({
  open,
  onOpenChange,
  defaultPatientId,
  defaultAppointmentId,
}: RegisterPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [appointmentSearchOpen, setAppointmentSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch patients for select
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

  // Fetch recent appointments without payment
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-for-payment'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_start_time,
          patient_id,
          patients(full_name),
          treatments(treatment_name)
        `)
        .gte('appointment_start_time', thirtyDaysAgo.toISOString())
        .order('appointment_start_time', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Array<{
        id: string;
        appointment_start_time: string;
        patient_id: string;
        patients: { full_name: string } | null;
        treatments: { treatment_name: string } | null;
      }>;
    },
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      patient_id: defaultPatientId || "",
      appointment_id: defaultAppointmentId || "",
      amount: "",
      payment_method: "pix",
      discount_amount: "0",
      notes: "",
      is_installment: false,
      installments: "1",
      first_due_date: new Date().toISOString().split("T")[0],
    },
  });

  const isInstallment = form.watch("is_installment");

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    try {
      const amount = parseFloat(data.amount);
      const discountAmount = parseFloat(data.discount_amount || "0");
      const finalAmount = amount - discountAmount;

      // Create transaction
      const insertData: any = {
        patient_id: data.patient_id,
        amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        payment_method: data.payment_method,
        transaction_type: "payment",
        status: data.is_installment ? "pending" : "paid",
      };

      if (data.appointment_id) {
        insertData.appointment_id = data.appointment_id;
      }

      if (!data.is_installment) {
        insertData.payment_date = new Date().toISOString();
      }

      if (data.notes) {
        insertData.notes = data.notes;
      }

      const { data: transaction, error: transactionError } = await supabase
        .from("financial_transactions")
        .insert(insertData)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create installment plan if needed
      if (data.is_installment && transaction) {
        const totalInstallments = parseInt(data.installments || "1");
        const installmentValue = finalAmount / totalInstallments;

        const { data: plan, error: planError } = await supabase
          .from("installment_plans")
          .insert({
            transaction_id: transaction.id,
            total_installments: totalInstallments,
            installment_value: installmentValue,
            first_due_date: data.first_due_date,
            status: "active",
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
            due_date: dueDate.toISOString().split("T")[0],
            status: "pending" as const,
          };
        });

        const { error: installmentsError } = await supabase
          .from("installment_payments")
          .insert(installments);

        if (installmentsError) throw installmentsError;

        toast.success(`Pagamento parcelado em ${totalInstallments}x criado com sucesso!`);
      } else {
        toast.success("Pagamento registrado com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-stats"] });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Error registering payment:", error);
      toast.error("Erro ao registrar pagamento: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Paciente *</FormLabel>
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

            <FormField
              control={form.control}
              name="appointment_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Agendamento (Opcional)</FormLabel>
                  <Popover open={appointmentSearchOpen} onOpenChange={setAppointmentSearchOpen}>
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
                            ? (() => {
                                const apt = appointments.find((a) => a.id === field.value);
                                return apt ? `${format(new Date(apt.appointment_start_time), "dd/MM/yy HH:mm", { locale: ptBR })} - ${apt.patients?.full_name}` : "Selecione um agendamento";
                              })()
                            : "Selecione um agendamento"}
                          <Calendar className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar agendamento..." />
                        <CommandList>
                          <CommandEmpty>Nenhum agendamento encontrado.</CommandEmpty>
                          <CommandGroup>
                            {appointments.map((appointment) => (
                              <CommandItem
                                key={appointment.id}
                                value={`${appointment.patients?.full_name} ${format(new Date(appointment.appointment_start_time), "dd/MM/yy", { locale: ptBR })}`}
                                onSelect={() => {
                                  field.onChange(appointment.id);
                                  setAppointmentSearchOpen(false);
                                }}
                              >
                                <div className="flex flex-col w-full">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{appointment.patients?.full_name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {format(new Date(appointment.appointment_start_time), "dd/MM/yy HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {appointment.treatments?.treatment_name}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
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

            {isInstallment && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Informações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Registrar Pagamento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
