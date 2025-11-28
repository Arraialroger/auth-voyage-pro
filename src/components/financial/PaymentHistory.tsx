import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CreditCard, Banknote, Landmark, Smartphone, ArrowRightLeft, FileText, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Payment, PaymentEntry, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types/payment';

interface PaymentHistoryProps {
  patientId: string;
}

const getPaymentMethodIcon = (method: PaymentMethod) => {
  switch (method) {
    case 'cash':
      return Banknote;
    case 'pix':
      return Smartphone;
    case 'debit_card':
    case 'credit_card':
      return CreditCard;
    case 'bank_transfer':
      return ArrowRightLeft;
    case 'boleto':
      return FileText;
    case 'insurance':
      return Shield;
    default:
      return Landmark;
  }
};

export const PaymentHistory = ({ patientId }: PaymentHistoryProps) => {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', patientId],
    queryFn: async () => {
      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          treatment_plan:treatment_plans(title, total_cost)
        `)
        .eq('patient_id', patientId)
        .order('payment_date', { ascending: false });
      
      if (paymentsError) throw paymentsError;

      // Fetch entries for each payment
      const paymentIds = paymentsData.map((p) => p.id);
      if (paymentIds.length === 0) return [];
      
      const { data: entriesData, error: entriesError } = await supabase
        .from('payment_entries')
        .select('*')
        .in('payment_id', paymentIds);
      
      if (entriesError) throw entriesError;

      // Combine payments with their entries
      return paymentsData.map((payment) => ({
        ...payment,
        entries: entriesData.filter((e) => e.payment_id === payment.id) as PaymentEntry[],
      })) as Payment[];
    },
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Histórico de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Histórico de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhum pagamento registrado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Histórico de Pagamentos
          <Badge variant="secondary" className="ml-auto">
            {payments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="p-4 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-lg text-primary">
                  R$ {payment.total_amount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              {payment.total_installments > 1 && (
                <Badge variant="outline">
                  Parcela {payment.installment_number}/{payment.total_installments}
                </Badge>
              )}
            </div>

            {/* Discount info */}
            {payment.discount_amount > 0 && (
              <p className="text-sm text-success mb-2">
                Desconto: R$ {payment.discount_amount.toFixed(2)}
                {payment.discount_type === 'percentage' && payment.discount_value && (
                  <span className="text-muted-foreground"> ({payment.discount_value}%)</span>
                )}
              </p>
            )}

            {/* Treatment plan */}
            {payment.treatment_plan && (
              <p className="text-sm text-muted-foreground mb-2">
                📋 {payment.treatment_plan.title || 'Plano de tratamento'}
              </p>
            )}

            {/* Payment methods */}
            <div className="flex flex-wrap gap-2 mt-3">
              {payment.entries?.map((entry) => {
                const Icon = getPaymentMethodIcon(entry.payment_method);
                return (
                  <Badge key={entry.id} variant="secondary" className="flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {PAYMENT_METHOD_LABELS[entry.payment_method]}: R$ {entry.amount.toFixed(2)}
                  </Badge>
                );
              })}
            </div>

            {/* Notes */}
            {payment.notes && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {payment.notes}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
