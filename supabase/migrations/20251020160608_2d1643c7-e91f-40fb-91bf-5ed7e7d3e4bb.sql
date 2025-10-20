-- Atualizar constraint da tabela expense_installments para usar valores em inglês
-- Isso garante consistência com a tabela expenses

-- Remover constraint antigo
ALTER TABLE expense_installments 
DROP CONSTRAINT IF EXISTS expense_installments_payment_method_check;

-- Adicionar novo constraint com valores em inglês (igual à tabela expenses)
ALTER TABLE expense_installments
ADD CONSTRAINT expense_installments_payment_method_check
CHECK (payment_method = ANY (ARRAY[
  'cash'::text,
  'credit_card'::text, 
  'debit_card'::text,
  'pix'::text,
  'bank_transfer'::text,
  'boleto'::text,
  'insurance'::text
]));