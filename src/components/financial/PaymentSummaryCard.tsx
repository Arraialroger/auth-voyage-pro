import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface PaymentSummaryCardProps {
  patientId: string;
}

export const PaymentSummaryCard = ({ patientId }: PaymentSummaryCardProps) => {
  // Fetch total budgeted from treatment plans
  const { data: budgetData, isLoading: loadingBudget } = useQuery({
    queryKey: ['patient-budget', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select('total_cost')
        .eq('patient_id', patientId)
        .neq('status', 'cancelled');
      
      if (error) throw error;
      
      const total = data.reduce((sum, plan) => sum + (plan.total_cost || 0), 0);
      return total;
    },
    enabled: !!patientId,
  });

  // Fetch total paid
  const { data: paidData, isLoading: loadingPaid } = useQuery({
    queryKey: ['patient-payments-total', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('total_amount')
        .eq('patient_id', patientId);
      
      if (error) throw error;
      
      const total = data.reduce((sum, payment) => sum + (payment.total_amount || 0), 0);
      return total;
    },
    enabled: !!patientId,
  });

  const isLoading = loadingBudget || loadingPaid;
  const totalBudget = budgetData || 0;
  const totalPaid = paidData || 0;
  const balance = totalBudget - totalPaid;
  const isPaidInFull = balance <= 0 && totalBudget > 0;
  const hasDebt = balance > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Resumo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Budgeted */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              R$ {totalBudget.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Orçado</p>
          </div>

          {/* Paid */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-success">
              R$ {totalPaid.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Pago</p>
          </div>

          {/* Balance */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className={`h-4 w-4 ${isPaidInFull ? 'text-success' : hasDebt ? 'text-warning' : 'text-muted-foreground'}`} />
            </div>
            <p className={`text-2xl font-bold ${isPaidInFull ? 'text-success' : hasDebt ? 'text-warning' : ''}`}>
              R$ {Math.abs(balance).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPaidInFull ? 'Quitado' : hasDebt ? 'Saldo' : 'Saldo'}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        {totalBudget > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso:</span>
              <span className={isPaidInFull ? 'text-success font-medium' : 'text-muted-foreground'}>
                {Math.min(100, Math.round((totalPaid / totalBudget) * 100))}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${isPaidInFull ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, (totalPaid / totalBudget) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
