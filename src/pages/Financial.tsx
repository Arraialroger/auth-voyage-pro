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
  Filter,
  CheckCircle2,
  Download,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { RegisterExpenseModal } from '@/components/RegisterExpenseModal';
import { toast } from 'sonner';

const COLORS = ['hsl(282 100% 35%)', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(199 89% 48%)'];

export default function Financial() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMonth] = useState(new Date());
  
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [receivablesSearchTerm, setReceivablesSearchTerm] = useState("");
  const [receivablesStatusFilter, setReceivablesStatusFilter] = useState<string>("all");
  const [expensesSearchTerm, setExpensesSearchTerm] = useState("");
  const [expensesCategoryFilter, setExpensesCategoryFilter] = useState<string>("all");
  const [expensesStatusFilter, setExpensesStatusFilter] = useState<string>("all");

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

  // Buscar parcelas a receber
  const { data: installments = [], isLoading: installmentsLoading } = useQuery({
    queryKey: ['installment-payments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('installment_payments')
        .select(`
          *,
          installment_plans (
            transaction_id,
            financial_transactions (
              patient_id,
              patients (full_name)
            )
          )
        `)
        .order('due_date', { ascending: true });
      
      return data || [];
    }
  });

  // Mutation para marcar parcela como paga
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ installmentId, paymentMethod }: { 
      installmentId: string, 
      paymentMethod: "cash" | "credit_card" | "debit_card" | "pix" | "bank_transfer" 
    }) => {
      const { error } = await supabase
        .from('installment_payments')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
          payment_method: paymentMethod
        })
        .eq('id', installmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-payments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      toast.success('Parcela marcada como paga com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao marcar parcela como paga: ' + error.message);
    }
  });

  // Filtrar transações
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesType = typeFilter === "all" || t.transaction_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Buscar despesas
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      
      return data || [];
    }
  });

  // Filtrar parcelas a receber
  const filteredInstallments = installments.filter((i) => {
    const patientName = i.installment_plans?.financial_transactions?.patients?.full_name || "";
    const matchesSearch = patientName.toLowerCase().includes(receivablesSearchTerm.toLowerCase());
    
    if (receivablesStatusFilter === "all") return matchesSearch;
    
    // Verificar se está vencida
    const isOverdue = isPast(new Date(i.due_date)) && i.status === 'pending';
    
    if (receivablesStatusFilter === "overdue") {
      return matchesSearch && isOverdue;
    }
    
    return matchesSearch && i.status === receivablesStatusFilter;
  });

  // Filtrar despesas
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(expensesSearchTerm.toLowerCase());
    const matchesCategory = expensesCategoryFilter === "all" || e.category === expensesCategoryFilter;
    const matchesStatus = expensesStatusFilter === "all" || e.status === expensesStatusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Helper functions - must be declared before use
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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      supplies: "Material/Suprimentos",
      rent: "Aluguel",
      utilities: "Utilidades",
      equipment: "Equipamentos",
      maintenance: "Manutenção",
      salary: "Salários",
      marketing: "Marketing",
      other: "Outros"
    };
    return labels[category] || category;
  };

  // Dados para gráficos
  const revenueVsExpensesData = [
    { name: 'Receitas', value: stats?.totalRevenue || 0 },
    { name: 'Despesas', value: stats?.totalExpenses || 0 }
  ];

  // Dados para gráfico de categorias de despesas
  const expensesByCategoryData = expenses.reduce((acc: any[], expense) => {
    const category = expense.category;
    const existing = acc.find(item => item.name === category);
    
    if (existing) {
      existing.value += Number(expense.amount);
    } else {
      acc.push({
        name: getCategoryLabel(category),
        value: Number(expense.amount),
        category: category
      });
    }
    
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  const getExpenseStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      paid: "default",
      pending: "secondary",
    };
    const labels: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const downloadReceipt = async (receiptUrl: string, description: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-documents')
        .download(receiptUrl);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovante-${description.substring(0, 20)}.${receiptUrl.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Comprovante baixado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao baixar comprovante: ' + error.message);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment: "Pagamento",
      refund: "Reembolso",
    };
    return labels[type] || type;
  };

  const getInstallmentStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = isPast(new Date(dueDate)) && status === 'pending';
    
    if (isOverdue) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      paid: "default",
      pending: "secondary",
      cancelled: "outline",
    };
    const labels: Record<string, string> = {
      paid: "Paga",
      pending: "Pendente",
      cancelled: "Cancelada",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const handleMarkAsPaid = async (installmentId: string) => {
    const paymentMethod = prompt("Qual foi a forma de pagamento?\n\n1 - Dinheiro\n2 - Cartão de Crédito\n3 - Cartão de Débito\n4 - PIX\n5 - Transferência");
    
    const methodMap: Record<string, "cash" | "credit_card" | "debit_card" | "pix" | "bank_transfer"> = {
      "1": "cash",
      "2": "credit_card",
      "3": "debit_card",
      "4": "pix",
      "5": "bank_transfer"
    };

    const selectedMethod = methodMap[paymentMethod || ""];
    
    if (!selectedMethod) {
      toast.error("Forma de pagamento inválida");
      return;
    }

    markAsPaidMutation.mutate({ installmentId, paymentMethod: selectedMethod });
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
            <TabsList className="grid w-full grid-cols-5 lg:w-[750px]">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="receivables">A Receber</TabsTrigger>
              <TabsTrigger value="payables">A Pagar</TabsTrigger>
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
                      onClick={() => setExpenseModalOpen(true)}
                    >
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
                  <CardDescription>Parcelas pendentes e vencidas - Gerenciamento de cobranças</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por paciente..."
                          value={receivablesSearchTerm}
                          onChange={(e) => setReceivablesSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Select value={receivablesStatusFilter} onValueChange={setReceivablesStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="overdue">Vencida</SelectItem>
                        <SelectItem value="paid">Paga</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installmentsLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Carregando...
                            </TableCell>
                          </TableRow>
                        ) : filteredInstallments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Nenhuma parcela encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredInstallments.map((installment) => {
                            const isOverdue = isPast(new Date(installment.due_date)) && installment.status === 'pending';
                            return (
                              <TableRow key={installment.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                                <TableCell className={isOverdue ? 'font-medium text-destructive' : ''}>
                                  {format(new Date(installment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  {installment.installment_plans?.financial_transactions?.patients?.full_name || "N/A"}
                                </TableCell>
                                <TableCell>{installment.installment_number}</TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(Number(installment.amount))}
                                </TableCell>
                                <TableCell>
                                  {getInstallmentStatusBadge(installment.status, installment.due_date)}
                                </TableCell>
                                <TableCell>
                                  {installment.payment_date ? (
                                    <div className="text-sm">
                                      <div>{format(new Date(installment.payment_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                                      {installment.payment_method && (
                                        <div className="text-muted-foreground">
                                          {getPaymentMethodLabel(installment.payment_method)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {installment.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleMarkAsPaid(installment.id)}
                                      disabled={markAsPaidMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Marcar como Paga
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {filteredInstallments.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Total de parcelas: {filteredInstallments.length} | 
                      Pendentes: {filteredInstallments.filter(i => i.status === 'pending').length} | 
                      Vencidas: {filteredInstallments.filter(i => isPast(new Date(i.due_date)) && i.status === 'pending').length}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contas a Pagar */}
            <TabsContent value="payables">
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Contas a Pagar</CardTitle>
                  <CardDescription>Parcelas de despesas pendentes e próximos vencimentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Despesa</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Funcionalidade de contas a pagar disponível em breve</p>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Gráfico de Categorias */}
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Despesas por Categoria</CardTitle>
                    <CardDescription>Distribuição dos gastos por categoria</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {expensesByCategoryData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Nenhuma despesa registrada
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesByCategoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expensesByCategoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Resumo das Despesas */}
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Resumo</CardTitle>
                    <CardDescription>Estatísticas das despesas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Despesas</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Despesas Pagas</p>
                        <p className="text-2xl font-bold text-success">
                          {formatCurrency(expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0))}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Despesas Pendentes</p>
                        <p className="text-2xl font-bold text-warning">
                          {formatCurrency(expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0))}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total de Itens</p>
                        <p className="text-2xl font-bold">{expenses.length}</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => setExpenseModalOpen(true)}
                    >
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Cadastrar Nova Despesa
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Despesas</CardTitle>
                  <CardDescription>Gerenciamento de despesas da clínica</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por descrição..."
                          value={expensesSearchTerm}
                          onChange={(e) => setExpensesSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Select value={expensesCategoryFilter} onValueChange={setExpensesCategoryFilter}>
                      <SelectTrigger className="w-[200px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        <SelectItem value="supplies">Material/Suprimentos</SelectItem>
                        <SelectItem value="rent">Aluguel</SelectItem>
                        <SelectItem value="utilities">Utilidades</SelectItem>
                        <SelectItem value="equipment">Equipamentos</SelectItem>
                        <SelectItem value="maintenance">Manutenção</SelectItem>
                        <SelectItem value="salary">Salários</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="other">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={expensesStatusFilter} onValueChange={setExpensesStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Forma Pagto.</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Comprovante</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expensesLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Carregando...
                            </TableCell>
                          </TableRow>
                        ) : filteredExpenses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Nenhuma despesa encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>
                                {format(new Date(expense.expense_date), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="max-w-[300px]">
                                <div className="truncate" title={expense.description}>
                                  {expense.description}
                                </div>
                              </TableCell>
                              <TableCell>{getCategoryLabel(expense.category)}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(Number(expense.amount))}
                              </TableCell>
                              <TableCell>{getPaymentMethodLabel(expense.payment_method)}</TableCell>
                              <TableCell>{getExpenseStatusBadge(expense.status)}</TableCell>
                              <TableCell className="text-right">
                                {expense.receipt_url ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadReceipt(expense.receipt_url!, expense.description)}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Baixar
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Sem comprovante</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {filteredExpenses.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Total: {filteredExpenses.length} despesa(s) | 
                      Valor total: {formatCurrency(filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <RegisterExpenseModal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} />
    </div>
  );
}
