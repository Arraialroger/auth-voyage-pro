-- Adicionar 'boleto' ao enum payment_method_enum
ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'boleto';