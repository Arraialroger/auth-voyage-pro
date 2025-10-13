-- Criar tabela de parcelas de despesas
CREATE TABLE public.expense_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  payment_method TEXT CHECK (payment_method IN ('Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Transferência Bancária', 'Boleto', 'Cheque')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_expense_installments_expense_id ON public.expense_installments(expense_id);
CREATE INDEX idx_expense_installments_status ON public.expense_installments(status);
CREATE INDEX idx_expense_installments_due_date ON public.expense_installments(due_date);

-- Habilitar RLS
ALTER TABLE public.expense_installments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (mesmas permissões que expenses)
CREATE POLICY "Recepcionistas podem gerenciar parcelas de despesas"
  ON public.expense_installments
  FOR ALL
  USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver parcelas de despesas"
  ON public.expense_installments
  FOR SELECT
  USING (is_professional(auth.uid()));

-- Adicionar campo is_installment na tabela expenses
ALTER TABLE public.expenses 
ADD COLUMN is_installment BOOLEAN NOT NULL DEFAULT false;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_expense_installments_updated_at
  BEFORE UPDATE ON public.expense_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();