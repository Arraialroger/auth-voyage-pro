-- Remover tabelas financeiras (em ordem devido a foreign keys)
DROP TABLE IF EXISTS payment_splits CASCADE;
DROP TABLE IF EXISTS installment_payments CASCADE;
DROP TABLE IF EXISTS installment_plans CASCADE;
DROP TABLE IF EXISTS expense_installments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS financial_goals CASCADE;

-- Comentário para histórico
COMMENT ON SCHEMA public IS 'Módulo financeiro removido - aguardando reconstrução simplificada';