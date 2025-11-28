-- =====================================================
-- MÓDULO FINANCEIRO - FASE 1: Tabelas, RLS e Índices
-- (ENUM payment_method_enum já existe)
-- =====================================================

-- 1. Criar tabela principal de pagamentos
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  treatment_plan_id uuid REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  registered_by uuid NOT NULL,
  
  -- Controle de parcelamento
  installment_number integer NOT NULL DEFAULT 1,
  total_installments integer NOT NULL DEFAULT 1,
  
  -- Desconto
  discount_type text CHECK (discount_type IN ('percentage', 'fixed', NULL)),
  discount_value numeric DEFAULT 0 CHECK (discount_value >= 0),
  
  -- Valores
  subtotal numeric NOT NULL CHECK (subtotal > 0),
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  
  -- Metadados
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Validações
  CONSTRAINT valid_installment CHECK (installment_number <= total_installments),
  CONSTRAINT valid_discount CHECK (discount_amount <= subtotal)
);

-- 2. Criar tabela de entradas de pagamento (múltiplas formas)
CREATE TABLE public.payment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  payment_method public.payment_method_enum NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS em ambas as tabelas
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_entries ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies para payments
CREATE POLICY "Profissionais veem pagamentos de seus pacientes"
ON public.payments FOR SELECT
USING (
  is_professional(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.patient_id = payments.patient_id
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

CREATE POLICY "Recepcionistas podem ver todos os pagamentos"
ON public.payments FOR SELECT
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem criar pagamentos"
ON public.payments FOR INSERT
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar pagamentos"
ON public.payments FOR UPDATE
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar pagamentos"
ON public.payments FOR DELETE
USING (is_receptionist(auth.uid()));

-- 5. RLS Policies para payment_entries
CREATE POLICY "Usuários autenticados podem ver entradas de pagamento"
ON public.payment_entries FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Recepcionistas podem criar entradas de pagamento"
ON public.payment_entries FOR INSERT
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar entradas de pagamento"
ON public.payment_entries FOR UPDATE
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar entradas de pagamento"
ON public.payment_entries FOR DELETE
USING (is_receptionist(auth.uid()));

-- 6. Índices para performance
CREATE INDEX idx_payments_patient ON public.payments(patient_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);
CREATE INDEX idx_payments_plan ON public.payments(treatment_plan_id);
CREATE INDEX idx_payments_created ON public.payments(created_at DESC);
CREATE INDEX idx_payment_entries_payment ON public.payment_entries(payment_id);