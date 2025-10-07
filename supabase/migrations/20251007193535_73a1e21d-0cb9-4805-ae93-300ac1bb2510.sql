-- ============================================
-- FASE 1: ESTRUTURA DE BANCO DE DADOS
-- ============================================

-- 1.1. Criar ENUMS
CREATE TYPE public.transaction_type_enum AS ENUM ('payment', 'refund', 'discount');
CREATE TYPE public.payment_method_enum AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'insurance');
CREATE TYPE public.payment_status_enum AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE public.installment_status_enum AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.installment_plan_status_enum AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE public.expense_category_enum AS ENUM ('rent', 'utilities', 'supplies', 'equipment', 'salary', 'marketing', 'maintenance', 'other');
CREATE TYPE public.expense_status_enum AS ENUM ('pending', 'paid');
CREATE TYPE public.goal_status_enum AS ENUM ('active', 'completed', 'cancelled');

-- 1.2. Criar Tabela: financial_transactions
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  transaction_type public.transaction_type_enum NOT NULL DEFAULT 'payment',
  payment_method public.payment_method_enum NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  discount_amount numeric(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  final_amount numeric(10, 2) NOT NULL CHECK (final_amount >= 0),
  status public.payment_status_enum NOT NULL DEFAULT 'pending',
  payment_date timestamp with time zone,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 1.3. Criar Tabela: installment_plans
CREATE TABLE public.installment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE CASCADE NOT NULL,
  total_installments integer NOT NULL CHECK (total_installments > 0),
  installment_value numeric(10, 2) NOT NULL CHECK (installment_value >= 0),
  first_due_date date NOT NULL,
  status public.installment_plan_status_enum NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 1.4. Criar Tabela: installment_payments
CREATE TABLE public.installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_plan_id uuid REFERENCES public.installment_plans(id) ON DELETE CASCADE NOT NULL,
  installment_number integer NOT NULL CHECK (installment_number > 0),
  due_date date NOT NULL,
  payment_date timestamp with time zone,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  status public.installment_status_enum NOT NULL DEFAULT 'pending',
  payment_method public.payment_method_enum,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(installment_plan_id, installment_number)
);

-- 1.5. Criar Tabela: expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.expense_category_enum NOT NULL,
  description text NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  expense_date date NOT NULL,
  payment_method public.payment_method_enum NOT NULL,
  status public.expense_status_enum NOT NULL DEFAULT 'pending',
  receipt_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 1.6. Criar Tabela: financial_goals
CREATE TABLE public.financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_name text NOT NULL,
  target_amount numeric(10, 2) NOT NULL CHECK (target_amount > 0),
  current_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.goal_status_enum NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 1.7. Criar Indexes para Performance
CREATE INDEX idx_financial_transactions_patient_id ON public.financial_transactions(patient_id);
CREATE INDEX idx_financial_transactions_appointment_id ON public.financial_transactions(appointment_id);
CREATE INDEX idx_financial_transactions_status ON public.financial_transactions(status);
CREATE INDEX idx_financial_transactions_payment_date ON public.financial_transactions(payment_date);
CREATE INDEX idx_installment_payments_status ON public.installment_payments(status);
CREATE INDEX idx_installment_payments_due_date ON public.installment_payments(due_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);

-- 1.8. Criar Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_financial_transactions
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_expenses
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_financial_goals
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- FASE 2: RLS POLICIES
-- ============================================

-- 2.1. Security Definer Functions para evitar recursão
CREATE OR REPLACE FUNCTION public.is_receptionist(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE user_id = _user_id
      AND role = 'receptionist'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_professional(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.professionals
    WHERE user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_professional_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.professionals
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- 2.2. Habilitar RLS em todas as tabelas financeiras
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- 2.3. Políticas para financial_transactions
CREATE POLICY "Recepcionistas podem ver todas as transações"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver transações de seus agendamentos"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.is_professional(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = financial_transactions.appointment_id
        AND appointments.professional_id = public.get_professional_id(auth.uid())
    )
  );

CREATE POLICY "Recepcionistas podem criar transações"
  ON public.financial_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar transações"
  ON public.financial_transactions
  FOR UPDATE
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar transações"
  ON public.financial_transactions
  FOR DELETE
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

-- 2.4. Políticas para installment_plans
CREATE POLICY "Recepcionistas podem ver todos os planos"
  ON public.installment_plans
  FOR SELECT
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver planos de seus agendamentos"
  ON public.installment_plans
  FOR SELECT
  TO authenticated
  USING (
    public.is_professional(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.financial_transactions ft
      JOIN public.appointments a ON a.id = ft.appointment_id
      WHERE ft.id = installment_plans.transaction_id
        AND a.professional_id = public.get_professional_id(auth.uid())
    )
  );

CREATE POLICY "Recepcionistas podem gerenciar planos"
  ON public.installment_plans
  FOR ALL
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

-- 2.5. Políticas para installment_payments
CREATE POLICY "Recepcionistas podem ver todos os pagamentos de parcelas"
  ON public.installment_payments
  FOR SELECT
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver pagamentos de seus agendamentos"
  ON public.installment_payments
  FOR SELECT
  TO authenticated
  USING (
    public.is_professional(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.installment_plans ip
      JOIN public.financial_transactions ft ON ft.id = ip.transaction_id
      JOIN public.appointments a ON a.id = ft.appointment_id
      WHERE ip.id = installment_payments.installment_plan_id
        AND a.professional_id = public.get_professional_id(auth.uid())
    )
  );

CREATE POLICY "Recepcionistas podem gerenciar pagamentos de parcelas"
  ON public.installment_payments
  FOR ALL
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

-- 2.6. Políticas para expenses
CREATE POLICY "Recepcionistas podem gerenciar despesas"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver despesas"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (public.is_professional(auth.uid()));

-- 2.7. Políticas para financial_goals
CREATE POLICY "Recepcionistas podem gerenciar metas financeiras"
  ON public.financial_goals
  FOR ALL
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver metas financeiras"
  ON public.financial_goals
  FOR SELECT
  TO authenticated
  USING (public.is_professional(auth.uid()));