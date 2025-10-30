import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, CreditCard, Calendar, DollarSign, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function FinancialHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guia do Módulo Financeiro</DialogTitle>
          <DialogDescription>
            Entenda como funciona o sistema de gestão financeira
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contas a Receber vs Operadoras */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Contas a Receber vs A Receber (Operadoras)</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2 pl-7">
              <p>
                <strong className="text-foreground">Contas a Receber:</strong> Inclui todos os valores pendentes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Parcelas de parcelamentos não pagas</li>
                <li>Pagamentos em PIX, dinheiro, transferência pendentes</li>
                <li>Pagamentos de cartão (crédito/débito) ainda não recebidos</li>
              </ul>
              <p className="mt-2">
                <strong className="text-foreground">A Receber (Operadoras):</strong> Mostra apenas valores pendentes de:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cartão de Crédito (recebimento em ~30 dias)</li>
                <li>Cartão de Débito (recebimento em 1 dia útil)</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Status de Pagamentos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Status de Pagamentos</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2 pl-7">
              <p>
                <strong className="text-foreground">Recebido (Completed):</strong> Pagamento já foi recebido na conta.
              </p>
              <p>
                <strong className="text-foreground">Parcial:</strong> Parte do pagamento foi recebida (em pagamentos divididos).
              </p>
              <p>
                <strong className="text-foreground">Pendente:</strong> Aguardando recebimento da operadora ou do cliente.
              </p>
            </div>
          </div>

          <Separator />

          {/* Pagamentos com Cartão */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Como Funciona o Pagamento com Cartão</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2 pl-7">
              <p>
                Quando um paciente paga com cartão, o sistema automaticamente:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Marca o pagamento como <strong className="text-foreground">Pendente</strong></li>
                <li>Define a data esperada de recebimento (1 dia para débito, 30 dias para crédito)</li>
                <li>Calcula a taxa da operadora (1,5% débito, 2,5% crédito)</li>
                <li>Mostra o valor líquido que você receberá (após descontar a taxa)</li>
              </ul>
              <p className="mt-2 text-warning font-medium">
                ⚠️ Você precisa marcar manualmente como "Recebido" quando a operadora repassar o valor!
              </p>
              <p className="mt-2">
                Para marcar como recebido, vá em <strong className="text-foreground">Transações</strong> → clique na linha do pagamento → aparecerá a tabela de divisão de pagamento → clique em <strong className="text-foreground">"Marcar como Recebido"</strong>.
              </p>
            </div>
          </div>

          <Separator />

          {/* Data da Despesa */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Data da Despesa vs Vencimento</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2 pl-7">
              <p>
                <strong className="text-foreground">Data da Despesa:</strong> É a data em que a despesa foi realizada ou quando o serviço/produto foi adquirido. Essa data é usada para calcular as despesas do mês nos relatórios.
              </p>
              <p className="mt-2">
                <strong className="text-foreground">Data de Vencimento:</strong> É a data limite para pagamento da despesa (usada no parcelamento).
              </p>
              <p className="mt-2">
                <em>Exemplo:</em> Você comprou material em 10/01 (Data da Despesa) mas tem até 30/01 para pagar (Vencimento).
              </p>
            </div>
          </div>

          <Separator />

          {/* Dicas */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-foreground">💡 Dicas Importantes</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Sempre marque os pagamentos de cartão como recebidos após o repasse da operadora</li>
              <li>Utilize filtros para facilitar a busca de pagamentos pendentes</li>
              <li>O módulo calcula automaticamente o lucro líquido (Receitas - Despesas)</li>
              <li>As taxas de cartão são sugeridas automaticamente mas podem ser editadas</li>
              <li>Pagamentos divididos (split) permitem combinar diferentes formas de pagamento</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
