-- Adicionar novo status 'partial' ao enum payment_status_enum
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'partial';

-- Adicionar comentário explicativo
COMMENT ON TYPE payment_status_enum IS 'Status de pagamento: pending (pendente), completed (recebido), cancelled (cancelado), refunded (reembolsado), partial (parcialmente recebido)';
