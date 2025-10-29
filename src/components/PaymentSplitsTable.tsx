import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaymentSplitsTableProps {
  transactionId: string;
}

export function PaymentSplitsTable({ transactionId }: PaymentSplitsTableProps) {
  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['payment-splits', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_splits')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at');
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (splits.length === 0) return null;

  const paymentMethodLabels: Record<string, string> = {
    cash: "Dinheiro",
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    debit_card: "Cartão de Débito",
    bank_transfer: "Transferência",
    insurance: "Convênio",
    boleto: "Boleto",
  };

  return (
    <div className="space-y-2 mt-4">
      <h4 className="text-sm font-medium">Pagamento Dividido:</h4>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">Líquido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recebimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {splits.map((split) => (
              <TableRow key={split.id}>
                <TableCell className="font-medium">{paymentMethodLabels[split.payment_method] || split.payment_method}</TableCell>
                <TableCell className="text-right">R$ {split.amount.toFixed(2)}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {split.transaction_fee_percentage}% (R$ {(split.transaction_fee_amount || 0).toFixed(2)})
                </TableCell>
                <TableCell className="text-right font-medium">
                  R$ {(split.net_amount || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant={split.status === 'completed' ? 'default' : 'secondary'}>
                    {split.status === 'completed' ? 'Recebido' : 'Pendente'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {split.payment_date 
                    ? format(new Date(split.payment_date), "dd/MM/yy", { locale: ptBR })
                    : split.expected_receipt_date
                    ? `Previsto: ${format(new Date(split.expected_receipt_date), "dd/MM/yy", { locale: ptBR })}`
                    : "-"
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
