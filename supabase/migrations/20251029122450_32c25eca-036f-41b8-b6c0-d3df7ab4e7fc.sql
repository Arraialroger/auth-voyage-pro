-- Tabela para armazenar divisões de pagamento
CREATE TABLE payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  payment_method payment_method_enum NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  transaction_fee_percentage NUMERIC DEFAULT 0,
  transaction_fee_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC,
  expected_receipt_date DATE,
  payment_date TIMESTAMPTZ,
  status payment_status_enum NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_amounts CHECK (
    transaction_fee_amount >= 0 AND
    transaction_fee_percentage >= 0 AND
    net_amount IS NULL OR net_amount >= 0
  )
);

-- Índices para performance
CREATE INDEX idx_payment_splits_transaction_id ON payment_splits(transaction_id);
CREATE INDEX idx_payment_splits_status ON payment_splits(status);
CREATE INDEX idx_payment_splits_payment_method ON payment_splits(payment_method);

-- RLS Policies
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recepcionistas podem gerenciar splits de pagamento"
  ON payment_splits
  FOR ALL
  USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem ver todos os splits"
  ON payment_splits
  FOR SELECT
  USING (is_receptionist(auth.uid()));

-- Comentários
COMMENT ON TABLE payment_splits IS 'Armazena divisões de pagamento quando um pagamento é feito com múltiplos métodos';
COMMENT ON COLUMN payment_splits.transaction_id IS 'Referência à transação financeira principal';
COMMENT ON COLUMN payment_splits.amount IS 'Valor pago neste método específico';