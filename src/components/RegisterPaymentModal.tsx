import { useState, useEffect } from "react";
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
import { Search, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/lib/logger";

const paymentSchema = z.object({
  patient_id: z.string().uuid("Selecione um paciente válido"),
  appointment_id: z.string().uuid().optional(),
  amount: z.string().min(1, "Informe o valor"),
  is_split_payment: z.boolean().default(false),
  payment_method: z.enum(["cash", "credit_card", "debit_card", "pix", "bank_transfer"]).optional(),
  discount_amount: z.string().optional(),
  transaction_fee_percentage: z.string().optional(),
  expected_receipt_date: z.string().optional(),
  payment_splits: z.array(z.object({
    payment_method: z.enum(["cash", "credit_card", "debit_card", "pix", "bank_transfer"]),
    amount: z.string().min(1, "Informe o valor"),
    transaction_fee_percentage: z.string().default("0"),
    expected_receipt_date: z.string(),
    notes: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
  is_installment: z.boolean().default(false),
  installments: z.string().optional(),
  first_due_date: z.string().optional(),
}).refine((data) => {
  if (data.is_split_payment && (!data.payment_splits || data.payment_splits.length < 2)) {
    return false;
  }
  if (data.is_split_payment && data.payment_splits) {
    const totalAmount = parseFloat(data.amount);
    const discount = parseFloat(data.discount_amount || "0");
    const finalAmount = totalAmount - discount;
    const splitsTotal = data.payment_splits.reduce((sum, split) => sum + parseFloat(split.amount || "0"), 0);
    return Math.abs(splitsTotal - finalAmount) < 0.01;
  }
  if (!data.is_split_payment && !data.payment_method) {
    return false;
  }
  return true;
}, (data) => {
  if (data.is_split_payment && (!data.payment_splits || data.payment_splits.length < 2)) {
    return {
      message: "Adicione pelo menos 2 formas de pagamento para dividir o pagamento",
      path: ["is_split_payment"],
    };
  }
  if (data.is_split_payment && data.payment_splits) {
    const totalAmount = parseFloat(data.amount);
    const discount = parseFloat(data.discount_amount || "0");
    const finalAmount = totalAmount - discount;
    const splitsTotal = data.payment_splits.reduce((sum, split) => sum + parseFloat(split.amount || "0"), 0);
    
    if (Math.abs(splitsTotal - finalAmount) >= 0.01) {
      return {
        message: `A soma dos valores (R$ ${splitsTotal.toFixed(2)}) deve ser igual ao valor esperado (R$ ${finalAmount.toFixed(2)})`,
        path: ["payment_splits"],
      };
    }
  }
  if (!data.is_split_payment && !data.payment_method) {
    return {
      message: "Selecione uma forma de pagamento",
      path: ["payment_method"],
    };
  }
  return { message: "", path: [] };
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPatientId?: string;
  defaultAppointmentId?: string;
  prefilledPatientId?: string;
  prefilledAppointmentId?: string;
}

export function RegisterPaymentModal({
  open,
  onOpenChange,
  defaultPatientId,
  defaultAppointmentId,
  prefilledPatientId,
  prefilledAppointmentId
}: RegisterPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [appointmentSearchOpen, setAppointmentSearchOpen] = useState(false);
  const [calculatedNetAmount, setCalculatedNetAmount] = useState(0);
  const queryClient = useQueryClient();
  
  const [paymentSplits, setPaymentSplits] = useState<Array<{
    id: string;
    payment_method: string;
    amount: string;
    transaction_fee_percentage: string;
    expected_receipt_date: string;
    notes?: string;
  }>>([
    {
      id: crypto.randomUUID(),
      payment_method: "pix",
      amount: "",
      transaction_fee_percentage: "0",
      expected_receipt_date: new Date().toISOString().split("T")[0],
    },
    {
      id: crypto.randomUUID(),
      payment_method: "cash",
      amount: "",
      transaction_fee_percentage: "0",
      expected_receipt_date: new Date().toISOString().split("T")[0],
    },
  ]);

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
          treatments(treatment_name, cost)
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
        treatments: { treatment_name: string; cost: number | null } | null;
      }>;
    },
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      patient_id: defaultPatientId || "",
      appointment_id: defaultAppointmentId || "",
      amount: "",
      is_split_payment: false,
      payment_method: "pix",
      discount_amount: "0",
      transaction_fee_percentage: "0",
      expected_receipt_date: new Date().toISOString().split("T")[0],
      notes: "",
      is_installment: false,
      installments: "1",
      first_due_date: new Date().toISOString().split("T")[0],
    },
  });

  const isInstallment = form.watch("is_installment");
  const isSplitPayment = form.watch("is_split_payment");
  const paymentMethod = form.watch("payment_method");
  const amount = form.watch("amount");
  const discountAmount = form.watch("discount_amount");
  const feePercentage = form.watch("transaction_fee_percentage");

  // Sugerir taxa e data de recebimento baseado no método
  useEffect(() => {
    if (paymentMethod === "credit_card") {
      form.setValue("transaction_fee_percentage", "2.5");
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      form.setValue("expected_receipt_date", futureDate.toISOString().split("T")[0]);
    } else if (paymentMethod === "debit_card") {
      form.setValue("transaction_fee_percentage", "1.5");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      form.setValue("expected_receipt_date", tomorrow.toISOString().split("T")[0]);
    } else {
      form.setValue("transaction_fee_percentage", "0");
      form.setValue("expected_receipt_date", new Date().toISOString().split("T")[0]);
    }
  }, [paymentMethod, form]);

  // Calcular valor líquido
  useEffect(() => {
    const amt = parseFloat(amount || "0");
    const disc = parseFloat(discountAmount || "0");
    const fee = parseFloat(feePercentage || "0");
    
    const finalAmt = amt - disc;
    const feeAmount = (finalAmt * fee) / 100;
    const netAmt = finalAmt - feeAmount;
    
    setCalculatedNetAmount(netAmt);
  }, [amount, discountAmount, feePercentage]);

  // Pre-fill form when modal opens with prefilled values
  useEffect(() => {
    if (open && prefilledPatientId) {
      form.setValue('patient_id', prefilledPatientId);
    }
    if (open && prefilledAppointmentId) {
      form.setValue('appointment_id', prefilledAppointmentId);
    }
  }, [open, prefilledPatientId, prefilledAppointmentId, form]);

  // Auto-fill amount when appointment is selected
  const selectedAppointmentId = form.watch("appointment_id");
  useEffect(() => {
    if (selectedAppointmentId) {
      const selectedAppointment = appointments.find(apt => apt.id === selectedAppointmentId);
      if (selectedAppointment?.treatments?.cost) {
        form.setValue('amount', selectedAppointment.treatments.cost.toString());
      }
    }
  }, [selectedAppointmentId, appointments, form]);

  // Sync payment splits with form data automatically
  useEffect(() => {
    if (isSplitPayment && paymentSplits.length > 0) {
      form.setValue('payment_splits', paymentSplits.map(s => ({
        payment_method: s.payment_method as "cash" | "credit_card" | "debit_card" | "pix" | "bank_transfer",
        amount: s.amount,
        transaction_fee_percentage: s.transaction_fee_percentage,
        expected_receipt_date: s.expected_receipt_date,
        notes: s.notes,
      })), { shouldValidate: true });
    }
  }, [paymentSplits, isSplitPayment, form]);

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    
    try {
      const amount = parseFloat(data.amount);
      const discountAmount = parseFloat(data.discount_amount || "0");
      const finalAmount = amount - discountAmount;

      const isSplitPayment = data.is_split_payment && data.payment_splits && data.payment_splits.length >= 2;

      // Create transaction
      const insertData: any = {
        patient_id: data.patient_id,
        amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        payment_method: isSplitPayment ? data.payment_splits![0].payment_method : data.payment_method!,
        transaction_type: "payment",
        transaction_fee_percentage: 0,
        transaction_fee_amount: 0,
        net_amount: 0,
        expected_receipt_date: isSplitPayment ? data.payment_splits![0].expected_receipt_date : data.expected_receipt_date,
        status: "pending",
      };

      if (data.appointment_id) {
        insertData.appointment_id = data.appointment_id;
      }

      if (data.notes) {
        insertData.notes = data.notes;
      }

      // Calculate values
      if (isSplitPayment) {
        let totalFeeAmount = 0;
        let totalNetAmount = 0;

        for (const split of data.payment_splits!) {
          const splitAmount = parseFloat(split.amount);
          const splitFeePercentage = parseFloat(split.transaction_fee_percentage || "0");
          const splitFeeAmount = (splitAmount * splitFeePercentage) / 100;
          const splitNetAmount = splitAmount - splitFeeAmount;

          totalFeeAmount += splitFeeAmount;
          totalNetAmount += splitNetAmount;
        }

        insertData.transaction_fee_amount = totalFeeAmount;
        insertData.net_amount = totalNetAmount;

        const today = new Date().toISOString().split("T")[0];
        
        // Contar quantos splits são recebidos hoje vs. no futuro
        const splitsReceivedToday = data.payment_splits!.filter(s => s.expected_receipt_date === today);
        const totalSplits = data.payment_splits!.length;

        if (splitsReceivedToday.length === totalSplits) {
          insertData.status = "completed"; // Todos recebidos hoje
          insertData.payment_date = new Date().toISOString();
        } else if (splitsReceivedToday.length > 0) {
          insertData.status = "partial" as any; // Alguns recebidos, outros pendentes
          insertData.payment_date = new Date().toISOString(); // Data do primeiro recebimento
        } else {
          insertData.status = "pending"; // Nenhum recebido ainda
        }
      } else {
        const feePercentage = parseFloat(data.transaction_fee_percentage || "0");
        const feeAmount = (finalAmount * feePercentage) / 100;
        const netAmount = finalAmount - feeAmount;

        insertData.transaction_fee_percentage = feePercentage;
        insertData.transaction_fee_amount = feeAmount;
        insertData.net_amount = netAmount;

        const today = new Date().toISOString().split("T")[0];
        const isReceiptToday = data.expected_receipt_date === today;
        insertData.status = data.is_installment || !isReceiptToday ? "pending" : "completed";
        
        if (insertData.status === "completed") {
          insertData.payment_date = new Date().toISOString();
        }
      }

      const { data: transaction, error: transactionError } = await supabase
        .from("financial_transactions")
        .insert(insertData)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Insert payment splits if split payment
      if (isSplitPayment && transaction) {
        const splitsToInsert = data.payment_splits!.map(split => {
          const splitAmount = parseFloat(split.amount);
          const splitFeePercentage = parseFloat(split.transaction_fee_percentage || "0");
          const splitFeeAmount = (splitAmount * splitFeePercentage) / 100;
          const splitNetAmount = splitAmount - splitFeeAmount;

          const today = new Date().toISOString().split("T")[0];
          const isReceiptToday = split.expected_receipt_date === today;

          return {
            transaction_id: transaction.id,
            payment_method: split.payment_method as "cash" | "credit_card" | "debit_card" | "pix" | "bank_transfer",
            amount: splitAmount,
            transaction_fee_percentage: splitFeePercentage,
            transaction_fee_amount: splitFeeAmount,
            net_amount: splitNetAmount,
            expected_receipt_date: split.expected_receipt_date,
            status: (isReceiptToday ? "completed" : "pending") as "pending" | "completed",
            payment_date: isReceiptToday ? new Date().toISOString() : undefined,
            notes: split.notes || undefined,
          };
        });

        const { error: splitsError } = await supabase
          .from("payment_splits")
          .insert(splitsToInsert);

        if (splitsError) throw splitsError;
      }

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
      } else if (isSplitPayment) {
        toast.success(`Pagamento dividido em ${data.payment_splits!.length} métodos registrado com sucesso!`);
      } else {
        toast.success("Pagamento registrado com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["payment-splits"] });
      queryClient.invalidateQueries({ queryKey: ["financial-stats"] });
      onOpenChange(false);
      form.reset();
      setPaymentSplits([
        {
          id: crypto.randomUUID(),
          payment_method: "pix",
          amount: "",
          transaction_fee_percentage: "0",
          expected_receipt_date: new Date().toISOString().split("T")[0],
        },
        {
          id: crypto.randomUUID(),
          payment_method: "cash",
          amount: "",
          transaction_fee_percentage: "0",
          expected_receipt_date: new Date().toISOString().split("T")[0],
        },
      ]);
    } catch (error: any) {
      logger.error("Erro ao registrar pagamento:", error);
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
                          disabled={!!prefilledPatientId}
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
                          disabled={!!prefilledAppointmentId}
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? (() => {
                                const apt = appointments.find((a) => a.id === field.value);
                                if (!apt) return "Selecione um agendamento";
                                const treatmentName = apt.treatments?.treatment_name || "Sem tratamento";
                                const cost = apt.treatments?.cost ? `R$ ${apt.treatments.cost.toFixed(2)}` : "";
                                return `${treatmentName}${cost ? ` (${cost})` : ""} - ${apt.patients?.full_name} - ${format(new Date(apt.appointment_start_time), "dd/MM/yy HH:mm", { locale: ptBR })}`;
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
                                <div className="flex flex-col w-full gap-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{appointment.patients?.full_name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {format(new Date(appointment.appointment_start_time), "dd/MM/yy HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">
                                      {appointment.treatments?.treatment_name || "Sem tratamento"}
                                    </span>
                                    {appointment.treatments?.cost && (
                                      <span className="text-sm font-medium text-green-600">
                                        R$ {appointment.treatments.cost.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
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
              name="is_split_payment"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          setPaymentSplits([
                            {
                              id: crypto.randomUUID(),
                              payment_method: "pix",
                              amount: "",
                              transaction_fee_percentage: "0",
                              expected_receipt_date: new Date().toISOString().split("T")[0],
                            },
                            {
                              id: crypto.randomUUID(),
                              payment_method: "cash",
                              amount: "",
                              transaction_fee_percentage: "0",
                              expected_receipt_date: new Date().toISOString().split("T")[0],
                            },
                          ]);
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Dividir pagamento em múltiplos métodos</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Permite registrar um pagamento feito com mais de uma forma de pagamento
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {isSplitPayment && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Formas de Pagamento</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPaymentSplits([...paymentSplits, {
                        id: crypto.randomUUID(),
                        payment_method: "cash",
                        amount: "",
                        transaction_fee_percentage: "0",
                        expected_receipt_date: new Date().toISOString().split("T")[0],
                      }]);
                    }}
                  >
                    + Adicionar Forma
                  </Button>
                </div>

                {paymentSplits.map((split, index) => (
                  <div key={split.id} className="grid grid-cols-12 gap-2 items-start p-3 rounded-md border bg-background">
                    <div className="col-span-12 md:col-span-3">
                      <Select
                        value={split.payment_method}
                        onValueChange={(value) => {
                          const updated = [...paymentSplits];
                          updated[index].payment_method = value;
                          
                          if (value === "credit_card") {
                            updated[index].transaction_fee_percentage = "2.5";
                            const futureDate = new Date();
                            futureDate.setDate(futureDate.getDate() + 30);
                            updated[index].expected_receipt_date = futureDate.toISOString().split("T")[0];
                          } else if (value === "debit_card") {
                            updated[index].transaction_fee_percentage = "1.5";
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            updated[index].expected_receipt_date = tomorrow.toISOString().split("T")[0];
                          } else {
                            updated[index].transaction_fee_percentage = "0";
                            updated[index].expected_receipt_date = new Date().toISOString().split("T")[0];
                          }
                          
                          setPaymentSplits(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                          <SelectItem value="bank_transfer">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                        value={split.amount}
                        onChange={(e) => {
                          const updated = [...paymentSplits];
                          updated[index].amount = e.target.value;
                          setPaymentSplits(updated);
                        }}
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Taxa %"
                        value={split.transaction_fee_percentage}
                        onChange={(e) => {
                          const updated = [...paymentSplits];
                          updated[index].transaction_fee_percentage = e.target.value;
                          setPaymentSplits(updated);
                        }}
                      />
                    </div>

                    <div className="col-span-11 md:col-span-3">
                      <Input
                        type="date"
                        value={split.expected_receipt_date}
                        onChange={(e) => {
                          const updated = [...paymentSplits];
                          updated[index].expected_receipt_date = e.target.value;
                          setPaymentSplits(updated);
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="col-span-1 flex justify-end items-center">
                      {paymentSplits.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPaymentSplits(paymentSplits.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Soma dos valores:</span>
                    <span className={cn(
                      "font-medium",
                      Math.abs(
                        paymentSplits.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0) -
                        (parseFloat(amount || "0") - parseFloat(discountAmount || "0"))
                      ) < 0.01 
                        ? "text-green-600" 
                        : "text-red-600"
                    )}>
                      R$ {paymentSplits.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor esperado:</span>
                    <span className="font-medium">
                      R$ {(parseFloat(amount || "0") - parseFloat(discountAmount || "0")).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!isSplitPayment && (
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
            )}

            {!isSplitPayment && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transaction_fee_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa da Operadora (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_receipt_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Recebimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            )}

            {!isSplitPayment && (
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Valor Total:</span>
                  <p className="font-semibold">
                    R$ {(parseFloat(amount || "0") - parseFloat(discountAmount || "0")).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Taxa:</span>
                  <p className="font-semibold text-red-600">
                    - R$ {((parseFloat(amount || "0") - parseFloat(discountAmount || "0")) * parseFloat(feePercentage || "0") / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Líquido:</span>
                  <p className="font-semibold text-green-600">
                    R$ {calculatedNetAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              </div>
            )}

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
