import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreatmentPlan } from "@/types/treatment-plan";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  XCircle, 
  TrendingUp,
  DollarSign,
  Activity
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  LineChart,
  Line
} from "recharts";
import { format, parseISO, startOfMonth, eachMonthOfInterval, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TreatmentPlanProgressDashboardProps {
  plans: TreatmentPlan[];
}

const STATUS_COLORS = {
  pending: '#94a3b8',
  in_progress: '#3b82f6',
  awaiting_payment: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  awaiting_payment: 'Aguardando Aprovação',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const TreatmentPlanProgressDashboard = ({ plans }: TreatmentPlanProgressDashboardProps) => {
  // Aggregate all items from all plans
  const allItems = plans.flatMap(plan => plan.items || []);
  
  // Status distribution
  const statusData = [
    { name: STATUS_LABELS.pending, value: allItems.filter(i => i.status === 'pending').length, color: STATUS_COLORS.pending },
    { name: STATUS_LABELS.in_progress, value: allItems.filter(i => i.status === 'in_progress').length, color: STATUS_COLORS.in_progress },
    { name: STATUS_LABELS.awaiting_payment, value: allItems.filter(i => i.status === 'awaiting_payment').length, color: STATUS_COLORS.awaiting_payment },
    { name: STATUS_LABELS.completed, value: allItems.filter(i => i.status === 'completed').length, color: STATUS_COLORS.completed },
    { name: STATUS_LABELS.cancelled, value: allItems.filter(i => i.status === 'cancelled').length, color: STATUS_COLORS.cancelled },
  ].filter(d => d.value > 0);

  // Calculate statistics
  const totalItems = allItems.length;
  const completedItems = allItems.filter(i => i.status === 'completed').length;
  const scheduledItems = allItems.filter(i => i.scheduled_date).length;
  const totalCost = allItems.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
  const completedCost = allItems
    .filter(i => i.status === 'completed')
    .reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Monthly completion data (last 6 months)
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  const monthlyData = months.map(month => {
    const completed = allItems.filter(item => 
      item.completed_at && isSameMonth(parseISO(item.completed_at), month)
    ).length;
    
    const scheduled = allItems.filter(item => 
      item.scheduled_date && isSameMonth(parseISO(item.scheduled_date), month)
    ).length;

    return {
      month: format(month, 'MMM/yy', { locale: ptBR }),
      completed,
      scheduled,
    };
  });

  // Priority distribution
  const priorityData = [
    { name: 'Alta', value: allItems.filter(i => i.priority === 3).length, color: '#ef4444' },
    { name: 'Média', value: allItems.filter(i => i.priority === 2).length, color: '#f59e0b' },
    { name: 'Normal', value: allItems.filter(i => i.priority === 1 || !i.priority).length, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // Upcoming appointments (next 7 days with scheduled_date)
  const upcomingProcedures = allItems
    .filter(item => item.scheduled_date && new Date(item.scheduled_date) >= new Date())
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.toFixed(0)}%</div>
            <Progress value={progress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedItems} de {totalItems} procedimentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledItems}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Procedimentos com data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Investimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalCost.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              R$ {completedCost.toFixed(0)} realizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Taxa de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Últimos 6 meses
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Nenhum procedimento encontrado</p>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Sem dados de prioridade</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Mensal - Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Concluídos"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="scheduled" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Agendados"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Upcoming Procedures Timeline */}
      {upcomingProcedures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos Procedimentos Agendados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingProcedures.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {format(parseISO(item.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {item.priority === 3 && <Badge variant="destructive" className="text-xs">Alta</Badge>}
                      {item.priority === 2 && <Badge className="bg-amber-500 text-xs">Média</Badge>}
                    </div>
                    <p className="text-sm text-foreground">{item.procedure_description}</p>
                    {item.tooth_number && (
                      <p className="text-xs text-muted-foreground mt-1">Dente {item.tooth_number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {item.estimated_cost > 0 && (
                      <p className="text-sm font-medium">R$ {Number(item.estimated_cost).toFixed(2)}</p>
                    )}
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
