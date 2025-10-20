-- Adicionar campos para controle de recebimento e taxas de transação
ALTER TABLE financial_transactions
ADD COLUMN expected_receipt_date date,
ADD COLUMN transaction_fee_percentage numeric(5,2) DEFAULT 0,
ADD COLUMN transaction_fee_amount numeric(10,2) DEFAULT 0,
ADD COLUMN net_amount numeric(10,2);

-- Atualizar registros existentes com valores padrão calculados
UPDATE financial_transactions
SET 
  expected_receipt_date = payment_date::date,
  transaction_fee_percentage = 0,
  transaction_fee_amount = 0,
  net_amount = final_amount
WHERE net_amount IS NULL;