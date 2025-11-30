import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CreditCard, Banknote, Landmark, Smartphone, ArrowRightLeft, FileText, Shield, Download, MessageCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Payment, PaymentEntry, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types/payment';
import { generateReceiptPDF } from '@/lib/receiptPdf';
import { toast } from 'sonner';

interface PaymentHistoryProps {
  patientId: string;
  patientName?: string;
  patientCpf?: string | null;
  patientPhone?: string;
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

// Default clinic info - ideally fetched from settings
const CLINIC_INFO = {
  name: "Arraial D'ajuda Odontologia",
  address: "Arraial D'ajuda, Porto Seguro - BA",
  phone: "(73) 99999-9999",
  cnpj: "00.000.000/0001-00"
};

export const PaymentHistory = ({ patientId, patientName, patientCpf, patientPhone }: PaymentHistoryProps) => {
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  
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

  const handleDownloadReceipt = async (payment: Payment) => {
    if (!patientName || !patientPhone) {
      toast.error('Dados do paciente incompletos');
      return;
    }
    
    setGeneratingPdf(payment.id);
    try {
      await generateReceiptPDF({
        payment,
        patient: {
          full_name: patientName,
          cpf: patientCpf || null,
          contact_phone: patientPhone,
        },
        clinic: CLINIC_INFO,
      });
      toast.success('Recibo gerado com sucesso!');
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Erro ao gerar recibo');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleSendWhatsApp = (payment: Payment) => {
    if (!patientPhone) {
      toast.error('Telefone do paciente não cadastrado');
      return;
    }

    const cleanPhone = patientPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const message = `Olá ${patientName || 'paciente'}! 🦷\n\n` +
      `Segue o comprovante do seu pagamento:\n\n` +
      `💰 *Valor:* R$ ${payment.total_amount.toFixed(2)}\n` +
      `📅 *Data:* ${format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })}\n` +
      (payment.total_installments > 1 ? `📋 *Parcela:* ${payment.installment_number}/${payment.total_installments}\n` : '') +
      (payment.treatment_plan?.title ? `🦷 *Tratamento:* ${payment.treatment_plan.title}\n` : '') +
      `\n*Formas de pagamento:*\n` +
      (payment.entries?.map(e => `• ${PAYMENT_METHOD_LABELS[e.payment_method]}: R$ ${e.amount.toFixed(2)}`).join('\n') || '') +
      `\n\nAgradecemos a preferência! ✨\n` +
      `Arraial D'ajuda Odontologia`;

    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp...');
  };

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

            {/* Action buttons */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadReceipt(payment)}
                disabled={generatingPdf === payment.id}
                className="flex-1"
              >
                {generatingPdf === payment.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Baixar Recibo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendWhatsApp(payment)}
                className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar WhatsApp
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
