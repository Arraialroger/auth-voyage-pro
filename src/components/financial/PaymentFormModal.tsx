import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle, DollarSign, Loader2 } from 'lucide-react';
import { PaymentMethodEntry } from './PaymentMethodEntry';
import { PaymentFormEntry, PaymentMethod } from '@/types/payment';
import { logger } from '@/lib/logger';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

export const PaymentFormModal = ({
  isOpen,
  onClose,
  patientId,
  onSuccess,
}: PaymentFormModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [subtotal, setSubtotal] = useState<string>('');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [installmentNumber, setInstallmentNumber] = useState<string>('1');
  const [totalInstallments, setTotalInstallments] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paymentEntries, setPaymentEntries] = useState<PaymentFormEntry[]>([
    { id: crypto.randomUUID(), payment_method: 'pix' as PaymentMethod, amount: '' },
  ]);

  // Fetch treatment plans for the patient
  const { data: treatmentPlans } = useQuery({
    queryKey: ['treatment-plans-select', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select('id, title, total_cost, status')
        .eq('patient_id', patientId)
        .in('status', ['draft', 'in_progress'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!patientId,
  });

  // Calculate discount amount
  const discountAmount = useMemo(() => {
    const sub = parseFloat(subtotal) || 0;
    const disc = parseFloat(discountValue) || 0;
    
    if (discountType === 'percentage') {
      return (sub * disc) / 100;
    } else if (discountType === 'fixed') {
      return Math.min(disc, sub);
    }
    return 0;
  }, [subtotal, discountType, discountValue]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    const sub = parseFloat(subtotal) || 0;
    return Math.max(0, sub - discountAmount);
  }, [subtotal, discountAmount]);

  // Calculate sum of payment entries
  const entriesSum = useMemo(() => {
    return paymentEntries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.amount) || 0);
    }, 0);
  }, [paymentEntries]);

  // Check if entries match total
  const entriesMatchTotal = Math.abs(entriesSum - totalAmount) < 0.01;

  const handleAddEntry = () => {
    setPaymentEntries([
      ...paymentEntries,
      { id: crypto.randomUUID(), payment_method: 'cash' as PaymentMethod, amount: '' },
    ]);
  };

  const handleUpdateEntry = (id: string, field: 'payment_method' | 'amount', value: string) => {
    setPaymentEntries(
      paymentEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleRemoveEntry = (id: string) => {
    if (paymentEntries.length > 1) {
      setPaymentEntries(paymentEntries.filter((entry) => entry.id !== id));
    }
  };

  const handleSubmit = async () => {
    // Validations
    const sub = parseFloat(subtotal);
    if (!sub || sub <= 0) {
      toast({
        title: 'Erro',
        description: 'Informe o valor do pagamento.',
        variant: 'destructive',
      });
      return;
    }

    if (!entriesMatchTotal) {
      toast({
        title: 'Erro',
        description: 'A soma das formas de pagamento deve ser igual ao total.',
        variant: 'destructive',
      });
      return;
    }

    const invalidEntries = paymentEntries.some(
      (entry) => !entry.amount || parseFloat(entry.amount) <= 0
    );
    if (invalidEntries) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os valores das formas de pagamento.',
        variant: 'destructive',
      });
      return;
    }

    const instNum = parseInt(installmentNumber) || 1;
    const instTotal = parseInt(totalInstallments) || 1;
    if (instNum > instTotal) {
      toast({
        title: 'Erro',
        description: 'Número da parcela não pode ser maior que o total de parcelas.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          patient_id: patientId,
          treatment_plan_id: selectedPlanId || null,
          registered_by: user?.id || '',
          subtotal: sub,
          discount_type: discountType === 'none' ? null : discountType,
          discount_value: discountType === 'none' ? 0 : (parseFloat(discountValue) || 0),
          discount_amount: discountAmount,
          total_amount: totalAmount,
          installment_number: instNum,
          total_installments: instTotal,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Insert payment entries
      const entries = paymentEntries.map((entry) => ({
        payment_id: payment.id,
        payment_method: entry.payment_method,
        amount: parseFloat(entry.amount),
      }));

      const { error: entriesError } = await supabase
        .from('payment_entries')
        .insert(entries);

      if (entriesError) throw entriesError;

      toast({
        title: 'Pagamento registrado',
        description: `Pagamento de R$ ${totalAmount.toFixed(2)} registrado com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ['payments', patientId] });
      onSuccess();
      handleClose();
    } catch (error) {
      logger.error('Erro ao registrar pagamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPlanId('');
    setSubtotal('');
    setDiscountType('none');
    setDiscountValue('');
    setInstallmentNumber('1');
    setTotalInstallments('1');
    setNotes('');
    setPaymentEntries([
      { id: crypto.randomUUID(), payment_method: 'pix' as PaymentMethod, amount: '' },
    ]);
    onClose();
  };

  // Auto-fill subtotal when selecting a plan
  useEffect(() => {
    if (selectedPlanId && treatmentPlans) {
      const plan = treatmentPlans.find((p) => p.id === selectedPlanId);
      if (plan?.total_cost) {
        setSubtotal(plan.total_cost.toString());
      }
    }
  }, [selectedPlanId, treatmentPlans]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {/* Treatment Plan Selection */}
          {treatmentPlans && treatmentPlans.length > 0 && (
            <div>
              <Label>Plano de Tratamento (opcional)</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a um plano..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {treatmentPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.title || 'Plano sem título'} - R$ {plan.total_cost?.toFixed(2) || '0,00'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subtotal */}
          <div>
            <Label>Valor do Pagamento *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                className="pl-10"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label>Desconto</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(v) => setDiscountType(v as 'none' | 'percentage' | 'fixed')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="discount-none" />
                <Label htmlFor="discount-none" className="font-normal">Sem desconto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="discount-percent" />
                <Label htmlFor="discount-percent" className="font-normal">%</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="discount-fixed" />
                <Label htmlFor="discount-fixed" className="font-normal">R$ fixo</Label>
              </div>
            </RadioGroup>
            {discountType !== 'none' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {discountType === 'percentage' ? '%' : 'R$'}
                </span>
                <Input
                  type="number"
                  step={discountType === 'percentage' ? '1' : '0.01'}
                  min="0"
                  max={discountType === 'percentage' ? '100' : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {/* Installments */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Parcela Nº</Label>
              <Input
                type="number"
                min="1"
                value={installmentNumber}
                onChange={(e) => setInstallmentNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>de (total)</Label>
              <Input
                type="number"
                min="1"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
              />
            </div>
          </div>

          {/* Total Display */}
          <div className="p-4 bg-primary/10 rounded-lg space-y-1">
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal:</span>
                <span>R$ {(parseFloat(subtotal) || 0).toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Desconto:</span>
                <span>- R$ {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-primary">R$ {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label>Formas de Pagamento *</Label>
            {paymentEntries.map((entry) => (
              <PaymentMethodEntry
                key={entry.id}
                entry={entry}
                onUpdate={handleUpdateEntry}
                onRemove={handleRemoveEntry}
                canRemove={paymentEntries.length > 1}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddEntry}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Forma de Pagamento
            </Button>

            {/* Entries Sum Validation */}
            {subtotal && !entriesMatchTotal && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Soma das formas: R$ {entriesSum.toFixed(2)} | 
                  Diferença: R$ {Math.abs(totalAmount - entriesSum).toFixed(2)}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o pagamento..."
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !entriesMatchTotal}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Registrar Pagamento'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
