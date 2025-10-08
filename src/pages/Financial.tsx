import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Calendar,
  AlertCircle,
  Wallet,
  Target,
  ArrowLeft,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { RegisterPaymentModal } from '@/components/RegisterPaymentModal';

const COLORS = ['hsl(282 100% 35%)', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(199 89% 48%)'];

export default function Financial() {
  const navigate = useNavigate();
  const [selectedMonth] = useState(new Date());
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Buscar estatísticas financeiras
  const { data: stats, isLoading } = useQuery({
    queryKey: ['financial-stats', selectedMonth],
    queryFn: async () => {
      const startDate = startOfMonth(selectedMonth).toISOString();
      const endDate = endOfMonth(selectedMonth).toISOString();

      // Receitas do mês
      const { data: revenues } = await supabase
        .from('financial_transactions')
        .select('final_amount, status')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .eq('transaction_type', 'payment');

      // Despesas do mês
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, status')
        .gte('expense_date', startDate.split('T')[0])
        .lte('expense_date', endDate.split('T')[0]);

      // Parcelas pendentes
      const { data: pendingInstallments } = await supabase
        .from('installment_payments')
        .select('amount, status, due_date')
        .in('status', ['pending', 'overdue']);

      // Calcular totais
      const totalRevenue = revenues?.reduce((sum, r) => sum + (r.status === 'completed' ? Number(r.final_amount) : 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.status === 'paid' ? Number(e.amount) : 0), 0) || 0;
      const totalPending = pendingInstallments?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const overdueCount = pendingInstallments?.filter(i => i.status === 'overdue').length || 0;

      return {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalPending,
        overdueCount,
        revenues: revenues || [],
        expenses: expenses || []
      };
    }
  });

  // Buscar transações
  const { data: transactions = [] } = useQuery({
    queryKey: ['financial-transactions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          patients (full_name),
          appointments (appointment_start_time)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      return data || [];
    }
  });

  // Filtrar transações
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesType = typeFilter === "all" || t.transaction_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Dados para gráficos
  const revenueVsExpensesData = [
    { name: 'Receitas', value: stats?.totalRevenue || 0 },
    { name: 'Despesas', value: stats?.totalExpenses || 0 }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      cancelled: "destructive",
      refunded: "outline",
    };
    const labels: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
      cancelled: "Cancelado",
      refunded: "Reembolsado",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Dinheiro",
      credit_card: "Cartão de Crédito",
      debit_card: "Cartão de Débito",
      pix: "PIX",
      bank_transfer: "Transferência",
    };
    return labels[method] || method;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment: "Pagamento",
      refund: "Reembolso",
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DollarSign className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Módulo Financeiro
            </h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-success border-none text-success-foreground animate-scale-in">
              <CardHeader className="pb-3">
                <CardDescription className="text-success-foreground/80 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Receitas do Mês
                </CardDescription>
                <CardTitle className="text-3xl">
                  {isLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-warning border-none text-warning-foreground animate-scale-in">
              <CardHeader className="pb-3">
                <CardDescription className="text-warning-foreground/80 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Despesas do Mês
                </CardDescription>
                <CardTitle className="text-3xl">
                  {isLoading ? '...' : formatCurrency(stats?.totalExpenses || 0)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-info border-none text-info-foreground animate-scale-in">
              <CardHeader className="pb-3">
                <CardDescription className="text-info-foreground/80 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Lucro Líquido
                </CardDescription>
                <CardTitle className="text-3xl">
                  {isLoading ? '...' : formatCurrency(stats?.netProfit || 0)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-primary border-none text-primary-foreground animate-scale-in">
              <CardHeader className="pb-3">
                <CardDescription className="text-primary-foreground/80 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Contas a Receber
                </CardDescription>
                <CardTitle className="text-3xl">
                  {isLoading ? '...' : formatCurrency(stats?.totalPending || 0)}
                </CardTitle>
                {stats && stats.overdueCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-primary-foreground/90 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {stats.overdueCount} vencidas
                  </div>
                )}
              </CardHeader>
            </Card>
          </div>

          {/* Gráficos e Tabelas */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="receivables">A Receber</TabsTrigger>
              <TabsTrigger value="expenses">Despesas</TabsTrigger>
            </TabsList>

            {/* Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfico de Pizza - Receitas vs Despesas */}
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Receitas vs Despesas</CardTitle>
                    <CardDescription>Distribuição financeira do mês</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueVsExpensesData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {revenueVsExpensesData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Ações Rápidas */}
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                    <CardDescription>Acesso rápido às funções principais</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      className="w-full justify-start" 
                      variant="outline" 
                      onClick={() => setPaymentModalOpen(true)}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Registrar Pagamento
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => {}}>
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Cadastrar Despesa
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => {}}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Gerar Parcelamento
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => {}}>
                      <FileText className="mr-2 h-4 w-4" />
                      Relatórios
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => {}}>
                      <Target className="mr-2 h-4 w-4" />
                      Metas Financeiras
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Transações Recentes */}
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Últimas Transações</CardTitle>
                  <CardDescription>Histórico recente de movimentações financeiras</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma transação registrada ainda</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setPaymentModalOpen(true)}
                      >
                        Registrar Primeira Transação
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.slice(0, 5).map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {format(new Date(transaction.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{transaction.patients?.full_name || "N/A"}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(Number(transaction.final_amount))}
                            </TableCell>
                            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transações */}
            <TabsContent value="transactions">
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Transações Financeiras</CardTitle>
                  <CardDescription>Histórico completo de pagamentos e recebimentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por paciente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="payment">Pagamento</SelectItem>
                        <SelectItem value="refund">Reembolso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Desconto</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Forma Pagto.</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              Nenhuma transação encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {format(new Date(transaction.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell>{transaction.patients?.full_name || "N/A"}</TableCell>
                              <TableCell>{getTransactionTypeLabel(transaction.transaction_type)}</TableCell>
                              <TableCell>{formatCurrency(Number(transaction.amount))}</TableCell>
                              <TableCell>{formatCurrency(Number(transaction.discount_amount || 0))}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(Number(transaction.final_amount))}
                              </TableCell>
                              <TableCell>{getPaymentMethodLabel(transaction.payment_method)}</TableCell>
                              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="receivables">
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Contas a Receber</CardTitle>
                  <CardDescription>Parcelas pendentes e vencidas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    Em desenvolvimento...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses">
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Despesas</CardTitle>
                  <CardDescription>Gerenciamento de despesas da clínica</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    Em desenvolvimento...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <RegisterPaymentModal open={paymentModalOpen} onOpenChange={setPaymentModalOpen} />
    </div>
  );
}
