import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, Clock, TrendingUp, CheckCircle, AlertCircle, DollarSign, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, addWeeks, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Stats {
  totalPatients: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  appointmentsNextWeek: number;
  waitingList: number;
  completedRate: number;
  monthlyRevenue: number;
  accountsReceivable: number;
  monthlyExpenses: number;
  netProfit: number;
  pendingExpenses: number;
}

interface CashFlowData {
  month: string;
  receitas: number;
  despesas: number;
}

interface TreatmentStat {
  name: string;
  count: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topTreatments, setTopTreatments] = useState<TreatmentStat[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now, { locale: ptBR });
      const weekEnd = endOfWeek(now, { locale: ptBR });
      const nextWeekStart = startOfWeek(addWeeks(now, 1), { locale: ptBR });
      const nextWeekEnd = endOfWeek(addWeeks(now, 1), { locale: ptBR });

      // Total de pacientes
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Agendamentos hoje
      const { count: appointmentsToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_start_time', todayStart.toISOString())
        .lte('appointment_start_time', todayEnd.toISOString());

      // Agendamentos esta semana
      const { count: appointmentsThisWeek } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_start_time', weekStart.toISOString())
        .lte('appointment_start_time', weekEnd.toISOString());

      // Agendamentos próxima semana
      const { count: appointmentsNextWeek } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_start_time', nextWeekStart.toISOString())
        .lte('appointment_start_time', nextWeekEnd.toISOString());

      // Lista de espera
      const { count: waitingList } = await supabase
        .from('waiting_list')
        .select('*', { count: 'exact', head: true });

      // Taxa de comparecimento (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: totalAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_start_time', thirtyDaysAgo.toISOString())
        .lte('appointment_start_time', now.toISOString());

      const { count: completedAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Completed')
        .gte('appointment_start_time', thirtyDaysAgo.toISOString())
        .lte('appointment_start_time', now.toISOString());

      const completedRate = totalAppointments && completedAppointments
        ? Math.round((completedAppointments / totalAppointments) * 100)
        : 0;

      // Tratamentos mais realizados (últimos 30 dias)
      const { data: treatmentData } = await supabase
        .from('appointments')
        .select('treatment_id, treatments(treatment_name)')
        .eq('status', 'Completed')
        .gte('appointment_start_time', thirtyDaysAgo.toISOString())
        .not('treatment_id', 'is', null);

      const treatmentCounts: Record<string, number> = {};
      treatmentData?.forEach((item: any) => {
        const name = item.treatments?.treatment_name;
        if (name) {
          treatmentCounts[name] = (treatmentCounts[name] || 0) + 1;
        }
      });

      const topTreatmentsData = Object.entries(treatmentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // **NOVAS MÉTRICAS FINANCEIRAS**
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Receita do Mês (pagamentos completados no mês atual)
      const { data: monthlyPayments } = await supabase
        .from('financial_transactions')
        .select('final_amount')
        .eq('status', 'completed')
        .gte('payment_date', monthStart.toISOString())
        .lte('payment_date', monthEnd.toISOString());

      const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => 
        sum + (Number(payment.final_amount) || 0), 0) || 0;

      // Contas a Receber (parcelas pendentes + transações pendentes)
      const { data: pendingInstallments } = await supabase
        .from('installment_payments')
        .select('amount')
        .eq('status', 'pending');

      const { data: pendingTransactions } = await supabase
        .from('financial_transactions')
        .select(`
          final_amount,
          installment_plans!left(id)
        `)
        .eq('status', 'pending');

      const accountsReceivableTransactions = pendingTransactions
        ?.filter((t: any) => !t.installment_plans || t.installment_plans.length === 0)
        .reduce((sum, trans: any) => sum + (Number(trans.final_amount) || 0), 0) || 0;

      const accountsReceivable = 
        (pendingInstallments?.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0) || 0) +
        accountsReceivableTransactions;

      // Despesas do Mês (despesas pagas no mês atual)
      const { data: monthlyExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('status', 'paid')
        .gte('expense_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(monthEnd, 'yyyy-MM-dd'));

      const monthlyExpenses = monthlyExpensesData?.reduce((sum, expense) => 
        sum + (Number(expense.amount) || 0), 0) || 0;

      // Despesas Pendentes (todas despesas com status 'pending')
      const { data: pendingExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('status', 'pending');

      const pendingExpenses = pendingExpensesData?.reduce((sum, expense) => 
        sum + (Number(expense.amount) || 0), 0) || 0;

      // Lucro Líquido (Receitas - Despesas)
      const netProfit = monthlyRevenue - monthlyExpenses;

      // **FLUXO DE CAIXA MENSAL (últimos 6 meses)**
      const cashFlow: CashFlowData[] = [];
      for (let i = 5; i >= 0; i--) {
        const targetMonth = subMonths(now, i);
        const monthStartDate = startOfMonth(targetMonth);
        const monthEndDate = endOfMonth(targetMonth);
        const monthLabel = format(targetMonth, 'MMM/yy', { locale: ptBR });

        // Receitas do mês
        const { data: revenueData } = await supabase
          .from('financial_transactions')
          .select('final_amount')
          .eq('status', 'completed')
          .gte('payment_date', monthStartDate.toISOString())
          .lte('payment_date', monthEndDate.toISOString());

        const revenue = revenueData?.reduce((sum, payment) => 
          sum + (Number(payment.final_amount) || 0), 0) || 0;

        // Despesas do mês
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount')
          .eq('status', 'paid')
          .gte('expense_date', format(monthStartDate, 'yyyy-MM-dd'))
          .lte('expense_date', format(monthEndDate, 'yyyy-MM-dd'));

        const expenses = expensesData?.reduce((sum, expense) => 
          sum + (Number(expense.amount) || 0), 0) || 0;

        cashFlow.push({
          month: monthLabel,
          receitas: revenue,
          despesas: expenses,
        });
      }

      setStats({
        totalPatients: totalPatients || 0,
        appointmentsToday: appointmentsToday || 0,
        appointmentsThisWeek: appointmentsThisWeek || 0,
        appointmentsNextWeek: appointmentsNextWeek || 0,
        waitingList: waitingList || 0,
        completedRate,
        monthlyRevenue,
        accountsReceivable,
        monthlyExpenses,
        netProfit,
        pendingExpenses,
      });

      setTopTreatments(topTreatmentsData);
      setCashFlowData(cashFlow);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Pacientes',
      value: stats?.totalPatients || 0,
      icon: Users,
      description: 'Pacientes cadastrados',
      gradient: 'from-primary/10 to-primary/5',
      iconColor: 'text-primary',
    },
    {
      title: 'Agendamentos Hoje',
      value: stats?.appointmentsToday || 0,
      icon: Calendar,
      description: format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR }),
      gradient: 'from-info/10 to-info/5',
      iconColor: 'text-info',
    },
    {
      title: 'Esta Semana',
      value: stats?.appointmentsThisWeek || 0,
      icon: TrendingUp,
      description: 'Agendamentos na semana',
      gradient: 'from-success/10 to-success/5',
      iconColor: 'text-success',
    },
    {
      title: 'Próxima Semana',
      value: stats?.appointmentsNextWeek || 0,
      icon: Clock,
      description: 'Agendamentos futuros',
      gradient: 'from-warning/10 to-warning/5',
      iconColor: 'text-warning',
    },
    {
      title: 'Lista de Espera',
      value: stats?.waitingList || 0,
      icon: AlertCircle,
      description: 'Pacientes aguardando',
      gradient: 'from-destructive/10 to-destructive/5',
      iconColor: 'text-destructive',
    },
    {
      title: 'Taxa de Comparecimento',
      value: `${stats?.completedRate || 0}%`,
      icon: CheckCircle,
      description: 'Últimos 30 dias',
      gradient: 'from-success/10 to-success/5',
      iconColor: 'text-success',
    },
    {
      title: 'Receita do Mês',
      value: `R$ ${(stats?.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }),
      gradient: 'from-success/10 to-success/5',
      iconColor: 'text-success',
    },
    {
      title: 'Contas a Receber',
      value: `R$ ${(stats?.accountsReceivable || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      description: 'Pagamentos pendentes',
      gradient: 'from-warning/10 to-warning/5',
      iconColor: 'text-warning',
    },
    {
      title: 'Despesas do Mês',
      value: `R$ ${(stats?.monthlyExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingDown,
      description: format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }),
      gradient: 'from-destructive/10 to-destructive/5',
      iconColor: 'text-destructive',
    },
    {
      title: 'Lucro Líquido',
      value: `R$ ${(stats?.netProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: PiggyBank,
      description: 'Receitas - Despesas',
      gradient: stats && stats.netProfit >= 0 ? 'from-success/10 to-success/5' : 'from-destructive/10 to-destructive/5',
      iconColor: stats && stats.netProfit >= 0 ? 'text-success' : 'text-destructive',
    },
    {
      title: 'Despesas Pendentes',
      value: `R$ ${(stats?.pendingExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: AlertCircle,
      description: 'Aguardando aprovação',
      gradient: 'from-warning/10 to-warning/5',
      iconColor: 'text-warning',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Card 
              key={card.title}
              className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/20 hover:shadow-elegant transition-all duration-300 animate-scale-in"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                  <IconComponent className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`${typeof card.value === 'string' && card.value.startsWith('R$') ? 'text-2xl' : 'text-3xl'} font-bold text-foreground break-words`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      {cashFlowData.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Caixa Mensal</CardTitle>
            <p className="text-sm text-muted-foreground">Receitas vs Despesas (últimos 6 meses)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                />
                <Line 
                  type="monotone" 
                  dataKey="receitas" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))' }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tratamentos mais realizados */}
      {topTreatments.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Tratamentos Mais Realizados</CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topTreatments.map((treatment, index) => {
                const maxCount = topTreatments[0]?.count || 1;
                const percentage = (treatment.count / maxCount) * 100;
                
                return (
                  <div key={treatment.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {index + 1}. {treatment.name}
                      </span>
                      <span className="text-muted-foreground">{treatment.count} consultas</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-primary transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
