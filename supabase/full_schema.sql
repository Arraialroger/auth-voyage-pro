-- Allow users to update and delete patients
CREATE POLICY "Equipe autenticada pode editar pacientes" 
ON public.patients 
FOR UPDATE 
USING ((EXISTS ( SELECT 1
   FROM staff_profiles
  WHERE ((staff_profiles.user_id = auth.uid()) AND (staff_profiles.role = 'receptionist'::text)))) OR (EXISTS ( SELECT 1
   FROM professionals
  WHERE (professionals.user_id = auth.uid()))));

CREATE POLICY "Equipe autenticada pode deletar pacientes" 
ON public.patients 
FOR DELETE 
USING ((EXISTS ( SELECT 1
   FROM staff_profiles
  WHERE ((staff_profiles.user_id = auth.uid()) AND (staff_profiles.role = 'receptionist'::text)))) OR (EXISTS ( SELECT 1
   FROM professionals
  WHERE (professionals.user_id = auth.uid()))));
-- Enable RLS on tables that are missing it
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for communication_logs
CREATE POLICY "Equipe autenticada pode ver logs de comunicaÃ§Ã£o" 
ON public.communication_logs 
FOR SELECT 
USING ((EXISTS ( SELECT 1
   FROM staff_profiles
  WHERE ((staff_profiles.user_id = auth.uid()) AND (staff_profiles.role = 'receptionist'::text)))) OR (EXISTS ( SELECT 1
   FROM professionals
  WHERE (professionals.user_id = auth.uid()))));

CREATE POLICY "Equipe autenticada pode criar logs de comunicaÃ§Ã£o" 
ON public.communication_logs 
FOR INSERT 
WITH CHECK ((EXISTS ( SELECT 1
   FROM staff_profiles
  WHERE ((staff_profiles.user_id = auth.uid()) AND (staff_profiles.role = 'receptionist'::text)))) OR (EXISTS ( SELECT 1
   FROM professionals
  WHERE (professionals.user_id = auth.uid()))));

-- Add basic RLS policies for professional_schedules
CREATE POLICY "UsuÃ¡rios autenticados podem ver horÃ¡rios profissionais" 
ON public.professional_schedules 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add basic RLS policies for staff_profiles
CREATE POLICY "UsuÃ¡rios podem ver seus prÃ³prios perfis de staff" 
ON public.staff_profiles 
FOR SELECT 
USING (user_id = auth.uid());
-- Update RLS policies for professionals table to allow CRUD operations

-- Allow authenticated users to insert professionals
CREATE POLICY "UsuÃ¡rios autenticados podem criar profissionais" 
ON public.professionals 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update professionals
CREATE POLICY "UsuÃ¡rios autenticados podem editar profissionais" 
ON public.professionals 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete professionals
CREATE POLICY "UsuÃ¡rios autenticados podem deletar profissionais" 
ON public.professionals 
FOR DELETE 
USING (auth.role() = 'authenticated');
-- Enable RLS on tables that don't have it enabled yet
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Add basic policies for professional_schedules
CREATE POLICY "UsuÃ¡rios autenticados podem ver horÃ¡rios dos profissionais" 
ON public.professional_schedules 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "UsuÃ¡rios autenticados podem criar horÃ¡rios dos profissionais" 
ON public.professional_schedules 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "UsuÃ¡rios autenticados podem editar horÃ¡rios dos profissionais" 
ON public.professional_schedules 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "UsuÃ¡rios autenticados podem deletar horÃ¡rios dos profissionais" 
ON public.professional_schedules 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Add basic policies for communication_logs
CREATE POLICY "UsuÃ¡rios autenticados podem ver logs de comunicaÃ§Ã£o" 
ON public.communication_logs 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "UsuÃ¡rios autenticados podem criar logs de comunicaÃ§Ã£o" 
ON public.communication_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Add basic policies for staff_profiles
CREATE POLICY "UsuÃ¡rios autenticados podem ver perfis da equipe" 
ON public.staff_profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "UsuÃ¡rios autenticados podem criar perfis da equipe" 
ON public.staff_profiles 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "UsuÃ¡rios autenticados podem editar perfis da equipe" 
ON public.staff_profiles 
FOR UPDATE 
USING (auth.role() = 'authenticated');
-- Add RLS policies for treatments table to allow CRUD operations
CREATE POLICY "Recepcionistas podem criar tratamentos" 
ON public.treatments 
FOR INSERT 
WITH CHECK (
  (SELECT staff_profiles.role FROM staff_profiles WHERE staff_profiles.user_id = auth.uid()) = 'receptionist'
);

CREATE POLICY "Recepcionistas podem editar tratamentos" 
ON public.treatments 
FOR UPDATE 
USING (
  (SELECT staff_profiles.role FROM staff_profiles WHERE staff_profiles.user_id = auth.uid()) = 'receptionist'
);

CREATE POLICY "Recepcionistas podem deletar tratamentos" 
ON public.treatments 
FOR DELETE 
USING (
  (SELECT staff_profiles.role FROM staff_profiles WHERE staff_profiles.user_id = auth.uid()) = 'receptionist'
);
-- Habilitar RLS em tabelas que precisam
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Criar polÃ­ticas bÃ¡sicas para staff_profiles
CREATE POLICY "UsuÃ¡rios autenticados podem ver perfis de staff" 
ON public.staff_profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Criar polÃ­ticas bÃ¡sicas para professional_schedules
CREATE POLICY "UsuÃ¡rios autenticados podem ver horÃ¡rios" 
ON public.professional_schedules 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Recepcionistas podem gerenciar horÃ¡rios
CREATE POLICY "Recepcionistas podem gerenciar horÃ¡rios" 
ON public.professional_schedules 
FOR ALL 
USING ((SELECT staff_profiles.role FROM staff_profiles WHERE staff_profiles.user_id = auth.uid()) = 'receptionist');

-- Profissionais podem gerenciar seus prÃ³prios horÃ¡rios
CREATE POLICY "Profissionais podem gerenciar seus horÃ¡rios" 
ON public.professional_schedules 
FOR ALL 
USING ((SELECT professionals.id FROM professionals WHERE professionals.user_id = auth.uid()) = professional_id);

-- Criar polÃ­ticas bÃ¡sicas para communication_logs
CREATE POLICY "UsuÃ¡rios autenticados podem ver logs" 
ON public.communication_logs 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "UsuÃ¡rios autenticados podem criar logs" 
ON public.communication_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
-- Create storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-documents', 'medical-documents', false);

-- Create table for patient documents
CREATE TABLE public.patient_documents (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  patient_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RLS policies for patient_documents table
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view documents
CREATE POLICY "Equipe autenticada pode ver documentos de pacientes" 
ON public.patient_documents 
FOR SELECT 
USING (
  (EXISTS (
    SELECT 1 FROM staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() AND staff_profiles.role = 'receptionist'
  )) OR 
  (EXISTS (
    SELECT 1 FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ))
);

-- Allow authenticated staff to insert documents
CREATE POLICY "Equipe autenticada pode inserir documentos" 
ON public.patient_documents 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated staff to delete documents
CREATE POLICY "Equipe autenticada pode deletar documentos" 
ON public.patient_documents 
FOR DELETE 
USING (
  (EXISTS (
    SELECT 1 FROM staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() AND staff_profiles.role = 'receptionist'
  )) OR 
  (EXISTS (
    SELECT 1 FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ))
);

-- Create storage policies for medical-documents bucket
-- Allow authenticated users to view files
CREATE POLICY "Equipe autenticada pode ver documentos mÃ©dicos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'medical-documents' AND 
  (
    (EXISTS (
      SELECT 1 FROM staff_profiles 
      WHERE staff_profiles.user_id = auth.uid() AND staff_profiles.role = 'receptionist'
    )) OR 
    (EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.user_id = auth.uid()
    ))
  )
);

-- Allow authenticated users to upload files
CREATE POLICY "Equipe autenticada pode fazer upload de documentos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'medical-documents' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete files
CREATE POLICY "Equipe autenticada pode deletar documentos mÃ©dicos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'medical-documents' AND 
  (
    (EXISTS (
      SELECT 1 FROM staff_profiles 
      WHERE staff_profiles.user_id = auth.uid() AND staff_profiles.role = 'receptionist'
    )) OR 
    (EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.user_id = auth.uid()
    ))
  )
);
-- Adicionar coluna CPF Ã  tabela de pacientes
ALTER TABLE public.patients 
ADD COLUMN cpf TEXT;
-- Adicionar novo status "Aguardando confirmaÃ§Ã£o" ao enum
ALTER TYPE appointment_status_enum ADD VALUE IF NOT EXISTS 'Pending Confirmation';

-- Adicionar campo de confirmaÃ§Ã£o na tabela appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;
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

-- 2.1. Security Definer Functions para evitar recursÃ£o
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

-- 2.3. PolÃ­ticas para financial_transactions
CREATE POLICY "Recepcionistas podem ver todas as transaÃ§Ãµes"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver transaÃ§Ãµes de seus agendamentos"
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

CREATE POLICY "Recepcionistas podem criar transaÃ§Ãµes"
  ON public.financial_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar transaÃ§Ãµes"
  ON public.financial_transactions
  FOR UPDATE
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar transaÃ§Ãµes"
  ON public.financial_transactions
  FOR DELETE
  TO authenticated
  USING (public.is_receptionist(auth.uid()));

-- 2.4. PolÃ­ticas para installment_plans
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

-- 2.5. PolÃ­ticas para installment_payments
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

-- 2.6. PolÃ­ticas para expenses
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

-- 2.7. PolÃ­ticas para financial_goals
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
-- Corrigir security warnings das funÃ§Ãµes

-- 1. Recriar handle_updated_at com search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Recriar update_updated_at_column (se existir) com search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Criar tabela de parcelas de despesas
CREATE TABLE public.expense_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  payment_method TEXT CHECK (payment_method IN ('Dinheiro', 'CartÃ£o de CrÃ©dito', 'CartÃ£o de DÃ©bito', 'PIX', 'TransferÃªncia BancÃ¡ria', 'Boleto', 'Cheque')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar Ã­ndices para melhor performance
CREATE INDEX idx_expense_installments_expense_id ON public.expense_installments(expense_id);
CREATE INDEX idx_expense_installments_status ON public.expense_installments(status);
CREATE INDEX idx_expense_installments_due_date ON public.expense_installments(due_date);

-- Habilitar RLS
ALTER TABLE public.expense_installments ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas RLS (mesmas permissÃµes que expenses)
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
-- Habilitar RLS na tabela n8n_chat_histories que estava sem proteÃ§Ã£o
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Como esta tabela Ã© do n8n (sistema externo), vou criar polÃ­ticas bÃ¡sicas
-- PolÃ­tica para permitir apenas usuÃ¡rios autenticados lerem suas prÃ³prias mensagens
CREATE POLICY "UsuÃ¡rios autenticados podem ver chat histories"
  ON public.n8n_chat_histories
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- PolÃ­tica para permitir inserÃ§Ã£o de mensagens
CREATE POLICY "UsuÃ¡rios autenticados podem criar chat histories"
  ON public.n8n_chat_histories
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
-- Adicionar coluna treatment_id Ã  tabela waiting_list
ALTER TABLE public.waiting_list 
ADD COLUMN treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL;

-- Adicionar Ã­ndice para melhor performance
CREATE INDEX idx_waiting_list_treatment_id ON public.waiting_list(treatment_id);

-- ComentÃ¡rio para documentaÃ§Ã£o
COMMENT ON COLUMN public.waiting_list.treatment_id IS 'Tratamento desejado pelo paciente';
-- Corrigir funÃ§Ã£o run_sql para incluir search_path
CREATE OR REPLACE FUNCTION public.run_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT to_json(t) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
END;
$function$;
-- Adicionar Ã­ndices para otimizaÃ§Ã£o de performance

-- Ãndice para consultas de agendamentos por paciente
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id 
ON appointments(patient_id);

-- Ãndice para consultas de agendamentos por profissional
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id 
ON appointments(professional_id);

-- Ãndice para consultas de agendamentos por horÃ¡rio de inÃ­cio
CREATE INDEX IF NOT EXISTS idx_appointments_start_time 
ON appointments(appointment_start_time);

-- Ãndice para consultas de transaÃ§Ãµes financeiras por agendamento
CREATE INDEX IF NOT EXISTS idx_financial_transactions_appointment_id 
ON financial_transactions(appointment_id);

-- Ãndice para consultas de planos de parcelamento por transaÃ§Ã£o
CREATE INDEX IF NOT EXISTS idx_installment_plans_transaction_id 
ON installment_plans(transaction_id);

-- Ãndice composto para queries comuns de agendamentos (profissional + data)
CREATE INDEX IF NOT EXISTS idx_appointments_prof_date 
ON appointments(professional_id, appointment_start_time);

-- Ãndice para busca de pacientes por telefone (usado na busca)
CREATE INDEX IF NOT EXISTS idx_patients_contact_phone 
ON patients(contact_phone);

-- ComentÃ¡rios explicativos
COMMENT ON INDEX idx_appointments_patient_id IS 'Acelera consultas de histÃ³rico de agendamentos por paciente';
COMMENT ON INDEX idx_appointments_professional_id IS 'Acelera consultas de agendamentos por profissional';
COMMENT ON INDEX idx_appointments_start_time IS 'Acelera consultas de agendamentos por perÃ­odo/data';
COMMENT ON INDEX idx_financial_transactions_appointment_id IS 'Acelera consultas de transaÃ§Ãµes vinculadas a agendamentos';
COMMENT ON INDEX idx_installment_plans_transaction_id IS 'Acelera consultas de planos de parcelamento';
COMMENT ON INDEX idx_appointments_prof_date IS 'Otimiza queries da agenda que filtram por profissional e data';
COMMENT ON INDEX idx_patients_contact_phone IS 'Acelera busca de pacientes por telefone';
-- Adicionar 'boleto' ao enum payment_method_enum
ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'boleto';
-- Adicionar campos para controle de recebimento e taxas de transaÃ§Ã£o
ALTER TABLE financial_transactions
ADD COLUMN expected_receipt_date date,
ADD COLUMN transaction_fee_percentage numeric(5,2) DEFAULT 0,
ADD COLUMN transaction_fee_amount numeric(10,2) DEFAULT 0,
ADD COLUMN net_amount numeric(10,2);

-- Atualizar registros existentes com valores padrÃ£o calculados
UPDATE financial_transactions
SET 
  expected_receipt_date = payment_date::date,
  transaction_fee_percentage = 0,
  transaction_fee_amount = 0,
  net_amount = final_amount
WHERE net_amount IS NULL;
-- Atualizar constraint da tabela expense_installments para usar valores em inglÃªs
-- Isso garante consistÃªncia com a tabela expenses

-- Remover constraint antigo
ALTER TABLE expense_installments 
DROP CONSTRAINT IF EXISTS expense_installments_payment_method_check;

-- Adicionar novo constraint com valores em inglÃªs (igual Ã  tabela expenses)
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

-- Remove a foreign key constraint problemÃ¡tica se existir
ALTER TABLE public.professionals 
DROP CONSTRAINT IF EXISTS professionals_user_id_fkey;

-- Adiciona a foreign key constraint correta referenciando auth.users
ALTER TABLE public.professionals
ADD CONSTRAINT professionals_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Adiciona Ã­ndice para melhor performance
CREATE INDEX IF NOT EXISTS idx_professionals_user_id 
ON public.professionals(user_id);
-- Criar paciente especial para bloqueios de horÃ¡rio
-- Usando um UUID fixo e especÃ­fico para fÃ¡cil identificaÃ§Ã£o
INSERT INTO public.patients (id, full_name, contact_phone, cpf, birth_date, medical_history_notes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ðŸš« BLOQUEIO DE HORÃRIO',
  '00000000000',
  '00000000000',
  '2000-01-01',
  'Paciente especial utilizado exclusivamente para bloqueio de horÃ¡rios na agenda. NÃƒO DELETAR.'
)
ON CONFLICT (id) DO NOTHING;

-- Criar tratamento especial para bloqueios
INSERT INTO public.treatments (id, treatment_name, description, default_duration_minutes, cost)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Bloqueio de Agenda',
  'Tratamento especial utilizado para bloquear horÃ¡rios na agenda (fÃ©rias, reuniÃµes, compromissos pessoais, etc). NÃƒO DELETAR.',
  30,
  0
)
ON CONFLICT (id) DO NOTHING;
-- Corrigir polÃ­ticas RLS da tabela professionals
-- Remover polÃ­ticas problemÃ¡ticas que usam subquery diretamente
DROP POLICY IF EXISTS "Recepcionistas podem criar profissionais" ON professionals;
DROP POLICY IF EXISTS "Recepcionistas podem editar profissionais" ON professionals;
DROP POLICY IF EXISTS "Recepcionistas podem deletar profissionais" ON professionals;

-- Recriar polÃ­ticas usando a funÃ§Ã£o is_receptionist() que Ã© SECURITY DEFINER
CREATE POLICY "Recepcionistas podem criar profissionais" 
ON professionals
FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar profissionais" 
ON professionals
FOR UPDATE
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar profissionais" 
ON professionals
FOR DELETE
TO authenticated
USING (is_receptionist(auth.uid()));
-- Remover polÃ­ticas antigas de pacientes
DROP POLICY IF EXISTS "Equipe autenticada pode ver pacientes" ON public.patients;
DROP POLICY IF EXISTS "Equipe autenticada pode criar pacientes" ON public.patients;
DROP POLICY IF EXISTS "Equipe autenticada pode editar pacientes" ON public.patients;
DROP POLICY IF EXISTS "Equipe autenticada pode deletar pacientes" ON public.patients;

-- Remover polÃ­ticas antigas de documentos
DROP POLICY IF EXISTS "Equipe autenticada pode ver documentos de pacientes" ON public.patient_documents;
DROP POLICY IF EXISTS "Equipe autenticada pode inserir documentos" ON public.patient_documents;
DROP POLICY IF EXISTS "Equipe autenticada pode deletar documentos" ON public.patient_documents;

-- ========================================
-- NOVAS POLÃTICAS PARA PACIENTES
-- ========================================

-- SELECT: Recepcionistas veem todos, profissionais veem apenas seus pacientes
CREATE POLICY "Recepcionistas podem ver todos os pacientes"
ON public.patients
FOR SELECT
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver seus prÃ³prios pacientes"
ON public.patients
FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid()) 
  AND EXISTS (
    SELECT 1 
    FROM public.appointments a 
    WHERE a.patient_id = patients.id 
      AND a.professional_id = get_professional_id(auth.uid())
  )
);

-- INSERT: Qualquer usuÃ¡rio autenticado pode criar pacientes
CREATE POLICY "UsuÃ¡rios autenticados podem criar pacientes"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Recepcionistas atualizam todos, profissionais apenas seus pacientes
CREATE POLICY "Recepcionistas podem editar todos os pacientes"
ON public.patients
FOR UPDATE
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem editar seus prÃ³prios pacientes"
ON public.patients
FOR UPDATE
TO authenticated
USING (
  is_professional(auth.uid()) 
  AND EXISTS (
    SELECT 1 
    FROM public.appointments a 
    WHERE a.patient_id = patients.id 
      AND a.professional_id = get_professional_id(auth.uid())
  )
);

-- DELETE: Apenas recepcionistas podem deletar
CREATE POLICY "Recepcionistas podem deletar pacientes"
ON public.patients
FOR DELETE
TO authenticated
USING (is_receptionist(auth.uid()));

-- ========================================
-- NOVAS POLÃTICAS PARA DOCUMENTOS
-- ========================================

-- SELECT: Recepcionistas veem todos, profissionais veem apenas de seus pacientes
CREATE POLICY "Recepcionistas podem ver todos os documentos"
ON public.patient_documents
FOR SELECT
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver documentos de seus pacientes"
ON public.patient_documents
FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid()) 
  AND EXISTS (
    SELECT 1 
    FROM public.appointments a 
    WHERE a.patient_id = patient_documents.patient_id 
      AND a.professional_id = get_professional_id(auth.uid())
  )
);

-- INSERT: Qualquer usuÃ¡rio autenticado pode inserir documentos
CREATE POLICY "UsuÃ¡rios autenticados podem inserir documentos"
ON public.patient_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- DELETE: Recepcionistas deletam todos, profissionais apenas de seus pacientes
CREATE POLICY "Recepcionistas podem deletar todos os documentos"
ON public.patient_documents
FOR DELETE
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem deletar documentos de seus pacientes"
ON public.patient_documents
FOR DELETE
TO authenticated
USING (
  is_professional(auth.uid()) 
  AND EXISTS (
    SELECT 1 
    FROM public.appointments a 
    WHERE a.patient_id = patient_documents.patient_id 
      AND a.professional_id = get_professional_id(auth.uid())
  )
);
-- ========================================
-- FASE 1: Restringir CriaÃ§Ã£o de Pacientes e Documentos
-- ========================================

-- Pacientes: apenas recepcionistas podem criar
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem criar pacientes" ON public.patients;

CREATE POLICY "Recepcionistas podem criar pacientes"
ON public.patients 
FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

-- Documentos: apenas recepcionistas podem fazer upload
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem inserir documentos" ON public.patient_documents;

CREATE POLICY "Recepcionistas podem inserir documentos"
ON public.patient_documents 
FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

-- ========================================
-- FASE 2: Proteger Dados Financeiros
-- ========================================

-- Remover acesso de profissionais a transaÃ§Ãµes financeiras
DROP POLICY IF EXISTS "Profissionais podem ver transaÃ§Ãµes de seus agendamentos" ON public.financial_transactions;

-- Remover acesso de profissionais a pagamentos de parcelas
DROP POLICY IF EXISTS "Profissionais podem ver pagamentos de seus agendamentos" ON public.installment_payments;

-- Remover acesso de profissionais a planos de parcelamento
DROP POLICY IF EXISTS "Profissionais podem ver planos de seus agendamentos" ON public.installment_plans;

-- ========================================
-- FASE 3: Proteger DeleÃ§Ã£o de Documentos
-- ========================================

-- Remover permissÃ£o de profissionais deletarem documentos mÃ©dicos
DROP POLICY IF EXISTS "Profissionais podem deletar documentos de seus pacientes" ON public.patient_documents;
-- ========================================
-- CORREÃ‡Ã•ES DE SEGURANÃ‡A CRÃTICAS
-- ========================================

-- 1. REMOVER FUNÃ‡ÃƒO run_sql (CRÃTICO - SQL Injection Risk)
DROP FUNCTION IF EXISTS public.run_sql(text);

-- 2. PROTEGER BUCKET medical-documents
-- Remover polÃ­ticas permissivas existentes
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver arquivos" ON storage.objects;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem deletar arquivos" ON storage.objects;

-- Apenas recepcionistas podem fazer upload de documentos mÃ©dicos
CREATE POLICY "Recepcionistas podem fazer upload de documentos mÃ©dicos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-documents' 
  AND is_receptionist(auth.uid())
);

-- Recepcionistas podem ver todos os documentos mÃ©dicos
CREATE POLICY "Recepcionistas podem ver todos os documentos mÃ©dicos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-documents' 
  AND is_receptionist(auth.uid())
);

-- Profissionais podem ver apenas documentos de seus prÃ³prios pacientes
CREATE POLICY "Profissionais podem ver documentos de seus pacientes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-documents'
  AND is_professional(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.patient_documents pd
    JOIN public.appointments a ON a.patient_id = pd.patient_id
    WHERE pd.file_path = storage.objects.name
      AND a.professional_id = get_professional_id(auth.uid())
  )
);

-- Apenas recepcionistas podem deletar documentos mÃ©dicos
CREATE POLICY "Recepcionistas podem deletar documentos mÃ©dicos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-documents' 
  AND is_receptionist(auth.uid())
);

-- 3. PROTEGER TABELA communication_logs
-- Remover polÃ­ticas permissivas existentes
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem criar logs" ON public.communication_logs;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver logs" ON public.communication_logs;

-- Apenas recepcionistas podem criar logs
CREATE POLICY "Recepcionistas podem criar logs"
ON public.communication_logs
FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

-- Recepcionistas podem ver todos os logs
CREATE POLICY "Recepcionistas podem ver todos os logs"
ON public.communication_logs
FOR SELECT
TO authenticated
USING (is_receptionist(auth.uid()));

-- Profissionais podem ver apenas logs de seus prÃ³prios pacientes
CREATE POLICY "Profissionais podem ver logs de seus pacientes"
ON public.communication_logs
FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = communication_logs.patient_id
      AND a.professional_id = get_professional_id(auth.uid())
  )
);
-- Adicionar coluna para identificar agendamentos de encaixe
ALTER TABLE appointments 
ADD COLUMN is_squeeze_in BOOLEAN DEFAULT false;

-- Adicionar comentÃ¡rio para documentaÃ§Ã£o
COMMENT ON COLUMN appointments.is_squeeze_in IS 
'Indica se o agendamento Ã© um encaixe (permite sobreposiÃ§Ã£o controlada de horÃ¡rios)';
-- Tabela para armazenar divisÃµes de pagamento
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

-- Ãndices para performance
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

-- ComentÃ¡rios
COMMENT ON TABLE payment_splits IS 'Armazena divisÃµes de pagamento quando um pagamento Ã© feito com mÃºltiplos mÃ©todos';
COMMENT ON COLUMN payment_splits.transaction_id IS 'ReferÃªncia Ã  transaÃ§Ã£o financeira principal';
COMMENT ON COLUMN payment_splits.amount IS 'Valor pago neste mÃ©todo especÃ­fico';
-- Adicionar novo status 'partial' ao enum payment_status_enum
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'partial';

-- Adicionar comentÃ¡rio explicativo
COMMENT ON TYPE payment_status_enum IS 'Status de pagamento: pending (pendente), completed (recebido), cancelled (cancelado), refunded (reembolsado), partial (parcialmente recebido)';
-- Remover tabelas financeiras (em ordem devido a foreign keys)
DROP TABLE IF EXISTS payment_splits CASCADE;
DROP TABLE IF EXISTS installment_payments CASCADE;
DROP TABLE IF EXISTS installment_plans CASCADE;
DROP TABLE IF EXISTS expense_installments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS financial_goals CASCADE;

-- ComentÃ¡rio para histÃ³rico
COMMENT ON SCHEMA public IS 'MÃ³dulo financeiro removido - aguardando reconstruÃ§Ã£o simplificada';
-- Adicionar coluna de telefone de contato aos profissionais
ALTER TABLE public.professionals 
ADD COLUMN contact_phone TEXT;

-- Adicionar comentÃ¡rio para documentaÃ§Ã£o
COMMENT ON COLUMN public.professionals.contact_phone IS 'Telefone de contato do profissional';
-- Fase 1: Adicionar novo status "Patient Arrived" ao enum
ALTER TYPE appointment_status_enum ADD VALUE IF NOT EXISTS 'Patient Arrived';

-- Fase 2: Configurar Supabase Realtime na tabela appointments
ALTER TABLE appointments REPLICA IDENTITY FULL;

-- Adicionar tabela Ã  publicaÃ§Ã£o realtime
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
-- FASE 1: CORREÃ‡ÃƒO DE SEGURANÃ‡A - RLS POLICIES
-- Corrige polÃ­ticas de acesso para proteger dados sensÃ­veis (LGPD)

-- =============================================
-- 1. TABELA PATIENTS - DADOS MÃ‰DICOS SENSÃVEIS
-- =============================================
-- Problema: Qualquer usuÃ¡rio autenticado pode ver todos os pacientes
-- SoluÃ§Ã£o: Profissionais veem apenas pacientes com agendamentos atribuÃ­dos

DROP POLICY IF EXISTS "Profissionais podem ver seus prÃ³prios pacientes" ON patients;
DROP POLICY IF EXISTS "Profissionais podem editar seus prÃ³prios pacientes" ON patients;
DROP POLICY IF EXISTS "Recepcionistas podem criar pacientes" ON patients;
DROP POLICY IF EXISTS "Recepcionistas podem deletar pacientes" ON patients;
DROP POLICY IF EXISTS "Recepcionistas podem editar todos os pacientes" ON patients;
DROP POLICY IF EXISTS "Recepcionistas podem ver todos os pacientes" ON patients;

-- Recepcionistas: acesso total
CREATE POLICY "Recepcionistas podem ver todos os pacientes"
ON patients FOR SELECT
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem criar pacientes"
ON patients FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar pacientes"
ON patients FOR UPDATE
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar pacientes"
ON patients FOR DELETE
TO authenticated
USING (is_receptionist(auth.uid()));

-- Profissionais: apenas pacientes com agendamentos atribuÃ­dos
CREATE POLICY "Profissionais veem apenas pacientes com agendamentos"
ON patients FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid()) AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.patient_id = patients.id
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

CREATE POLICY "Profissionais podem editar pacientes com agendamentos"
ON patients FOR UPDATE
TO authenticated
USING (
  is_professional(auth.uid()) AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.patient_id = patients.id
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

-- =============================================
-- 2. TABELA COMMUNICATION_LOGS - HISTÃ“RICO DE COMUNICAÃ‡ÃƒO
-- =============================================

DROP POLICY IF EXISTS "Profissionais podem ver logs de seus pacientes" ON communication_logs;
DROP POLICY IF EXISTS "Recepcionistas podem criar logs" ON communication_logs;
DROP POLICY IF EXISTS "Recepcionistas podem ver todos os logs" ON communication_logs;

CREATE POLICY "Recepcionistas podem ver todos os logs"
ON communication_logs FOR SELECT
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem criar logs"
ON communication_logs FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais veem logs de pacientes com agendamentos"
ON communication_logs FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid()) AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.patient_id = communication_logs.patient_id
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

-- =============================================
-- 3. TABELA PATIENT_DOCUMENTS - DOCUMENTOS MÃ‰DICOS CONFIDENCIAIS
-- =============================================

DROP POLICY IF EXISTS "Profissionais podem ver documentos de seus pacientes" ON patient_documents;
DROP POLICY IF EXISTS "Recepcionistas podem deletar todos os documentos" ON patient_documents;
DROP POLICY IF EXISTS "Recepcionistas podem inserir documentos" ON patient_documents;
DROP POLICY IF EXISTS "Recepcionistas podem ver todos os documentos" ON patient_documents;

CREATE POLICY "Recepcionistas podem ver todos os documentos"
ON patient_documents FOR SELECT
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem inserir documentos"
ON patient_documents FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar documentos"
ON patient_documents FOR DELETE
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais veem documentos de pacientes com agendamentos"
ON patient_documents FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid()) AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.patient_id = patient_documents.patient_id
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

CREATE POLICY "Profissionais podem inserir documentos de seus pacientes"
ON patient_documents FOR INSERT
TO authenticated
WITH CHECK (
  is_professional(auth.uid()) AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.patient_id = patient_documents.patient_id
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

-- =============================================
-- 4. TABELA APPOINTMENTS - JÃ ESTAVA BOA, MANTENDO
-- =============================================
-- As policies de appointments jÃ¡ estÃ£o corretas e restritivas

-- =============================================
-- 5. TABELA PROFESSIONALS - PROTEGER DADOS DE CONTATO
-- =============================================

DROP POLICY IF EXISTS "Recepcionistas podem criar profissionais" ON professionals;
DROP POLICY IF EXISTS "Recepcionistas podem deletar profissionais" ON professionals;
DROP POLICY IF EXISTS "Recepcionistas podem editar profissionais" ON professionals;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver os profissionais" ON professionals;

-- Recepcionistas: acesso total
CREATE POLICY "Recepcionistas podem ver todos os profissionais"
ON professionals FOR SELECT
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem criar profissionais"
ON professionals FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar profissionais"
ON professionals FOR UPDATE
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar profissionais"
ON professionals FOR DELETE
TO authenticated
USING (is_receptionist(auth.uid()));

-- Profissionais: veem apenas dados prÃ³prios completos
CREATE POLICY "Profissionais veem apenas seus prÃ³prios dados"
ON professionals FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid()) AND
  professionals.user_id = auth.uid()
);

-- Outros profissionais veem nome e especializaÃ§Ã£o (sem contato)
-- Para isso, criar view pÃºblica se necessÃ¡rio no futuro

-- =============================================
-- 6. TABELA N8N_CHAT_HISTORIES - ISOLAR CONVERSAS
-- =============================================

DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem criar chat histories" ON n8n_chat_histories;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver chat histories" ON n8n_chat_histories;

-- Nota: session_id precisa conter o user_id para isolar corretamente
-- Assumindo formato: session_id contÃ©m o UUID do usuÃ¡rio

CREATE POLICY "UsuÃ¡rios veem apenas suas prÃ³prias conversas"
ON n8n_chat_histories FOR SELECT
TO authenticated
USING (
  session_id LIKE '%' || auth.uid()::text || '%'
);

CREATE POLICY "UsuÃ¡rios podem criar suas conversas"
ON n8n_chat_histories FOR INSERT
TO authenticated
WITH CHECK (
  session_id LIKE '%' || auth.uid()::text || '%'
);

-- =============================================
-- 7. TABELA WAITING_LIST - REVISAR ACESSO
-- =============================================
-- As policies jÃ¡ estÃ£o corretas, mas vamos garantir consistÃªncia

DROP POLICY IF EXISTS "Profissionais podem ver sua prÃ³pria lista de espera" ON waiting_list;
DROP POLICY IF EXISTS "Recepcionistas podem gerenciar a lista de espera" ON waiting_list;

CREATE POLICY "Recepcionistas podem gerenciar lista de espera"
ON waiting_list FOR ALL
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais veem apenas sua lista de espera"
ON waiting_list FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid()) AND
  waiting_list.professional_id = get_professional_id(auth.uid())
);
-- Criar enum para status dos dentes
CREATE TYPE tooth_status_enum AS ENUM (
  'higido',
  'cariado', 
  'obturado',
  'extraido',
  'tratamento_canal',
  'coroa',
  'implante',
  'ausente',
  'fratura'
);

-- Criar enum para faces dos dentes
CREATE TYPE tooth_face_enum AS ENUM (
  'oclusal',
  'mesial',
  'distal',
  'vestibular',
  'lingual',
  'incisal'
);

-- Tabela para registros do odontograma
CREATE TABLE public.odontogram_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL CHECK (tooth_number >= 11 AND tooth_number <= 48),
  status tooth_status_enum NOT NULL DEFAULT 'higido',
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(patient_id, tooth_number)
);

-- Tabela para procedimentos por dente
CREATE TABLE public.tooth_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL CHECK (tooth_number >= 11 AND tooth_number <= 48),
  procedure_type TEXT NOT NULL,
  procedure_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  professional_id UUID REFERENCES public.professionals(id),
  notes TEXT,
  faces tooth_face_enum[] DEFAULT '{}',
  material_used TEXT,
  status_before tooth_status_enum,
  status_after tooth_status_enum NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ãndices para performance
CREATE INDEX idx_odontogram_records_patient ON public.odontogram_records(patient_id);
CREATE INDEX idx_tooth_procedures_patient ON public.tooth_procedures(patient_id);
CREATE INDEX idx_tooth_procedures_tooth ON public.tooth_procedures(patient_id, tooth_number);

-- Enable RLS
ALTER TABLE public.odontogram_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooth_procedures ENABLE ROW LEVEL SECURITY;

-- RLS Policies para odontogram_records
CREATE POLICY "Recepcionistas podem ver todos os odontogramas"
ON public.odontogram_records FOR SELECT
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem inserir odontogramas"
ON public.odontogram_records FOR INSERT
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem atualizar odontogramas"
ON public.odontogram_records FOR UPDATE
USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais veem odontogramas de seus pacientes"
ON public.odontogram_records FOR SELECT
USING (
  is_professional(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.patient_id = odontogram_records.patient_id 
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

CREATE POLICY "Profissionais podem atualizar odontogramas de seus pacientes"
ON public.odontogram_records FOR INSERT
WITH CHECK (
  is_professional(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.patient_id = odontogram_records.patient_id 
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

CREATE POLICY "Profissionais podem editar odontogramas de seus pacientes"
ON public.odontogram_records FOR UPDATE
USING (
  is_professional(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.patient_id = odontogram_records.patient_id 
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

-- RLS Policies para tooth_procedures
CREATE POLICY "Recepcionistas podem ver todos os procedimentos"
ON public.tooth_procedures FOR SELECT
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem inserir procedimentos"
ON public.tooth_procedures FOR INSERT
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais veem procedimentos de seus pacientes"
ON public.tooth_procedures FOR SELECT
USING (
  is_professional(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.patient_id = tooth_procedures.patient_id 
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);

CREATE POLICY "Profissionais podem inserir procedimentos em seus pacientes"
ON public.tooth_procedures FOR INSERT
WITH CHECK (
  is_professional(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.patient_id = tooth_procedures.patient_id 
    AND appointments.professional_id = get_professional_id(auth.uid())
  )
);
-- Create enum for treatment plan status
CREATE TYPE public.treatment_plan_status_enum AS ENUM (
  'draft',
  'approved',
  'in_progress',
  'completed',
  'cancelled'
);

-- Create enum for treatment plan item status
CREATE TYPE public.treatment_plan_item_status_enum AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

-- Create treatment_plans table
CREATE TABLE public.treatment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  status treatment_plan_status_enum NOT NULL DEFAULT 'draft',
  total_cost NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatment_plan_items table
CREATE TABLE public.treatment_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  tooth_number INTEGER CHECK (tooth_number BETWEEN 11 AND 85 OR tooth_number IS NULL),
  procedure_description TEXT NOT NULL,
  treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL,
  estimated_cost NUMERIC(10, 2) DEFAULT 0,
  status treatment_plan_item_status_enum NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for treatment_plans

-- Recepcionistas podem gerenciar todos os planos
CREATE POLICY "Recepcionistas podem ver todos os planos"
  ON public.treatment_plans
  FOR SELECT
  USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem criar planos"
  ON public.treatment_plans
  FOR INSERT
  WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar planos"
  ON public.treatment_plans
  FOR UPDATE
  USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar planos"
  ON public.treatment_plans
  FOR DELETE
  USING (is_receptionist(auth.uid()));

-- Profissionais podem gerenciar planos de seus pacientes
CREATE POLICY "Profissionais veem planos de seus pacientes"
  ON public.treatment_plans
  FOR SELECT
  USING (
    is_professional(auth.uid()) 
    AND (
      professional_id = get_professional_id(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM appointments
        WHERE appointments.patient_id = treatment_plans.patient_id
          AND appointments.professional_id = get_professional_id(auth.uid())
      )
    )
  );

CREATE POLICY "Profissionais podem criar planos para seus pacientes"
  ON public.treatment_plans
  FOR INSERT
  WITH CHECK (
    is_professional(auth.uid()) 
    AND professional_id = get_professional_id(auth.uid())
  );

CREATE POLICY "Profissionais podem editar seus planos"
  ON public.treatment_plans
  FOR UPDATE
  USING (
    is_professional(auth.uid()) 
    AND professional_id = get_professional_id(auth.uid())
  );

CREATE POLICY "Profissionais podem deletar seus planos"
  ON public.treatment_plans
  FOR DELETE
  USING (
    is_professional(auth.uid()) 
    AND professional_id = get_professional_id(auth.uid())
  );

-- RLS Policies for treatment_plan_items

-- Recepcionistas podem gerenciar todos os itens
CREATE POLICY "Recepcionistas podem ver todos os itens"
  ON public.treatment_plan_items
  FOR SELECT
  USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem criar itens"
  ON public.treatment_plan_items
  FOR INSERT
  WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar itens"
  ON public.treatment_plan_items
  FOR UPDATE
  USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar itens"
  ON public.treatment_plan_items
  FOR DELETE
  USING (is_receptionist(auth.uid()));

-- Profissionais podem gerenciar itens de seus planos
CREATE POLICY "Profissionais veem itens de seus planos"
  ON public.treatment_plan_items
  FOR SELECT
  USING (
    is_professional(auth.uid()) 
    AND EXISTS (
      SELECT 1
      FROM treatment_plans
      WHERE treatment_plans.id = treatment_plan_items.treatment_plan_id
        AND treatment_plans.professional_id = get_professional_id(auth.uid())
    )
  );

CREATE POLICY "Profissionais podem criar itens em seus planos"
  ON public.treatment_plan_items
  FOR INSERT
  WITH CHECK (
    is_professional(auth.uid()) 
    AND EXISTS (
      SELECT 1
      FROM treatment_plans
      WHERE treatment_plans.id = treatment_plan_items.treatment_plan_id
        AND treatment_plans.professional_id = get_professional_id(auth.uid())
    )
  );

CREATE POLICY "Profissionais podem editar itens de seus planos"
  ON public.treatment_plan_items
  FOR UPDATE
  USING (
    is_professional(auth.uid()) 
    AND EXISTS (
      SELECT 1
      FROM treatment_plans
      WHERE treatment_plans.id = treatment_plan_items.treatment_plan_id
        AND treatment_plans.professional_id = get_professional_id(auth.uid())
    )
  );

CREATE POLICY "Profissionais podem deletar itens de seus planos"
  ON public.treatment_plan_items
  FOR DELETE
  USING (
    is_professional(auth.uid()) 
    AND EXISTS (
      SELECT 1
      FROM treatment_plans
      WHERE treatment_plans.id = treatment_plan_items.treatment_plan_id
        AND treatment_plans.professional_id = get_professional_id(auth.uid())
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_treatment_plans_updated_at
  BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_professional_id ON public.treatment_plans(professional_id);
CREATE INDEX idx_treatment_plans_status ON public.treatment_plans(status);
CREATE INDEX idx_treatment_plan_items_plan_id ON public.treatment_plan_items(treatment_plan_id);
CREATE INDEX idx_treatment_plan_items_tooth_number ON public.treatment_plan_items(tooth_number);
CREATE INDEX idx_treatment_plan_items_status ON public.treatment_plan_items(status);
-- FunÃ§Ã£o que recalcula o custo total do plano de tratamento
CREATE OR REPLACE FUNCTION public.update_treatment_plan_total_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_id uuid;
  new_total numeric;
BEGIN
  -- Determina qual plano foi afetado
  IF TG_OP = 'DELETE' THEN
    plan_id := OLD.treatment_plan_id;
  ELSE
    plan_id := NEW.treatment_plan_id;
  END IF;

  -- Calcula o novo total somando todos os itens do plano
  SELECT COALESCE(SUM(estimated_cost), 0)
  INTO new_total
  FROM public.treatment_plan_items
  WHERE treatment_plan_id = plan_id;

  -- Atualiza o custo total no plano de tratamento
  UPDATE public.treatment_plans
  SET total_cost = new_total
  WHERE id = plan_id;

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger que executa apÃ³s INSERT, UPDATE ou DELETE em treatment_plan_items
CREATE TRIGGER trigger_update_treatment_plan_total_cost
AFTER INSERT OR UPDATE OF estimated_cost OR DELETE
ON public.treatment_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_treatment_plan_total_cost();
-- FunÃ§Ã£o que atualiza automaticamente o status do plano de tratamento
CREATE OR REPLACE FUNCTION public.update_treatment_plan_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_id uuid;
  total_items integer;
  completed_items integer;
  pending_items integer;
  new_status treatment_plan_status_enum;
BEGIN
  -- Determina qual plano foi afetado
  IF TG_OP = 'DELETE' THEN
    plan_id := OLD.treatment_plan_id;
  ELSE
    plan_id := NEW.treatment_plan_id;
  END IF;

  -- Conta o total de itens e quantos estÃ£o concluÃ­dos
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress'))
  INTO total_items, completed_items, pending_items
  FROM public.treatment_plan_items
  WHERE treatment_plan_id = plan_id;

  -- Determina o novo status do plano
  IF total_items = 0 THEN
    -- Se nÃ£o hÃ¡ itens, mantÃ©m como draft ou status atual
    new_status := (SELECT status FROM public.treatment_plans WHERE id = plan_id);
  ELSIF completed_items = total_items THEN
    -- Se todos os itens estÃ£o concluÃ­dos, marca plano como completed
    new_status := 'completed';
  ELSIF pending_items > 0 OR completed_items > 0 THEN
    -- Se hÃ¡ itens pendentes ou em progresso, marca como in_progress
    new_status := 'in_progress';
  ELSE
    -- Fallback: mantÃ©m status atual
    new_status := (SELECT status FROM public.treatment_plans WHERE id = plan_id);
  END IF;

  -- Atualiza o status do plano
  UPDATE public.treatment_plans
  SET status = new_status
  WHERE id = plan_id;

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger que executa apÃ³s mudanÃ§as nos itens do plano
CREATE TRIGGER trigger_update_treatment_plan_status
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.treatment_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_treatment_plan_status();
-- =====================================================
-- FASE 1: IntegraÃ§Ã£o Plano de Tratamento â†” Agendamentos
-- Preparado para mÃ³dulo financeiro futuro
-- =====================================================

-- 1. Adicionar campo de vÃ­nculo em appointments
ALTER TABLE public.appointments
ADD COLUMN treatment_plan_item_id UUID REFERENCES public.treatment_plan_items(id) ON DELETE SET NULL;

-- 2. Adicionar campos de vÃ­nculo e agendamento em treatment_plan_items
ALTER TABLE public.treatment_plan_items
ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
ADD COLUMN scheduled_date TIMESTAMP WITH TIME ZONE;

-- 3. Criar Ã­ndices para performance
CREATE INDEX idx_appointments_treatment_plan_item ON public.appointments(treatment_plan_item_id);
CREATE INDEX idx_treatment_plan_items_appointment ON public.treatment_plan_items(appointment_id);
CREATE INDEX idx_treatment_plan_items_scheduled_date ON public.treatment_plan_items(scheduled_date);

-- 4. Criar funÃ§Ã£o para sincronizar status quando consulta for concluÃ­da
CREATE OR REPLACE FUNCTION public.sync_appointment_completion_to_plan_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um agendamento Ã© marcado como 'Completed' e estÃ¡ vinculado a um item do plano
  IF NEW.status = 'Completed' AND NEW.treatment_plan_item_id IS NOT NULL THEN
    -- Atualiza o item do plano para 'completed'
    UPDATE public.treatment_plan_items
    SET 
      status = 'completed',
      completed_at = NEW.appointment_end_time
    WHERE id = NEW.treatment_plan_item_id
      AND status != 'completed'; -- SÃ³ atualiza se ainda nÃ£o estiver concluÃ­do
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Criar trigger para executar a sincronizaÃ§Ã£o
CREATE TRIGGER trigger_sync_appointment_to_plan_item
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'Completed' AND NEW.treatment_plan_item_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_appointment_completion_to_plan_item();

-- 6. ComentÃ¡rios explicativos para campos futuros (mÃ³dulo financeiro)
COMMENT ON COLUMN public.treatment_plan_items.estimated_cost IS 'Custo estimado do procedimento. SerÃ¡ integrado com mÃ³dulo financeiro no futuro.';
COMMENT ON COLUMN public.treatment_plan_items.completed_at IS 'Data de conclusÃ£o. SerÃ¡ usado para calcular faturamento no mÃ³dulo financeiro.';
COMMENT ON COLUMN public.treatment_plan_items.appointment_id IS 'VÃ­nculo com agendamento. SerÃ¡ usado para rastreabilidade financeira.';

-- 7. Adicionar constraint para garantir consistÃªncia bidirecional (opcional, mas recomendado)
-- Nota: Isso garante que se um appointment tem treatment_plan_item_id, 
-- o item correspondente deve ter o appointment_id de volta
COMMENT ON COLUMN public.appointments.treatment_plan_item_id IS 'VÃ­nculo com item do plano de tratamento. Usado para rastreabilidade e sincronizaÃ§Ã£o de status.';

-- =====================================================
-- CAMPOS PREPARADOS PARA MÃ“DULO FINANCEIRO FUTURO
-- (comentados para referÃªncia, nÃ£o implementados ainda)
-- =====================================================
-- 
-- ALTER TABLE public.treatment_plan_items
-- ADD COLUMN paid_amount NUMERIC(10,2) DEFAULT 0,
-- ADD COLUMN payment_status payment_status_enum DEFAULT 'pending';
--
-- ALTER TABLE public.appointments  
-- ADD COLUMN payment_amount NUMERIC(10,2),
-- ADD COLUMN payment_method payment_method_enum,
-- ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;
--
-- =====================================================
-- Adicionar coluna title Ã  tabela treatment_plans
ALTER TABLE public.treatment_plans 
ADD COLUMN title TEXT;
-- =====================================================
-- FASE 1: RECEITAS E ATESTADOS - DATABASE SCHEMA
-- =====================================================

-- 1. CRIAR ENUMS
-- =====================================================

CREATE TYPE prescription_type_enum AS ENUM ('simple', 'controlled', 'special');
CREATE TYPE certificate_type_enum AS ENUM ('attendance', 'medical_leave', 'fitness');

-- 2. TABELA: prescriptions
-- =====================================================

CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  prescription_type prescription_type_enum NOT NULL DEFAULT 'simple',
  general_instructions TEXT,
  pdf_file_path TEXT,
  signature_hash TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  template_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.1 Ãndices para performance
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_professional ON public.prescriptions(professional_id);
CREATE INDEX idx_prescriptions_appointment ON public.prescriptions(appointment_id);
CREATE INDEX idx_prescriptions_created_at ON public.prescriptions(created_at DESC);

COMMENT ON TABLE public.prescriptions IS 'Receitas mÃ©dicas/odontolÃ³gicas emitidas pelos profissionais';

-- 3. TABELA: prescription_items
-- =====================================================

CREATE TABLE public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  item_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.1 Ãndices
CREATE INDEX idx_prescription_items_prescription ON public.prescription_items(prescription_id);

COMMENT ON TABLE public.prescription_items IS 'Itens individuais (medicamentos) de cada receita';

-- 4. TABELA: medical_certificates
-- =====================================================

CREATE TABLE public.medical_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  certificate_type certificate_type_enum NOT NULL DEFAULT 'attendance',
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  days_count INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN end_date IS NULL THEN 0
      ELSE (end_date - start_date) + 1
    END
  ) STORED,
  cid_10_code TEXT,
  additional_notes TEXT,
  pdf_file_path TEXT,
  signature_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.1 Ãndices
CREATE INDEX idx_certificates_patient ON public.medical_certificates(patient_id);
CREATE INDEX idx_certificates_professional ON public.medical_certificates(professional_id);
CREATE INDEX idx_certificates_appointment ON public.medical_certificates(appointment_id);
CREATE INDEX idx_certificates_start_date ON public.medical_certificates(start_date DESC);

COMMENT ON TABLE public.medical_certificates IS 'Atestados mÃ©dicos/odontolÃ³gicos emitidos';

-- 5. TABELA: prescription_templates
-- =====================================================

CREATE TABLE public.prescription_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  prescription_type prescription_type_enum NOT NULL DEFAULT 'simple',
  general_instructions TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(professional_id, template_name)
);

-- 5.1 Ãndices
CREATE INDEX idx_templates_professional ON public.prescription_templates(professional_id);

COMMENT ON TABLE public.prescription_templates IS 'Templates de receitas salvas pelos profissionais para reutilizaÃ§Ã£o';

-- 6. TABELA: prescription_template_items
-- =====================================================

CREATE TABLE public.prescription_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.prescription_templates(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  item_order INTEGER NOT NULL DEFAULT 1
);

-- 6.1 Ãndices
CREATE INDEX idx_template_items_template ON public.prescription_template_items(template_id);

-- 7. TRIGGERS PARA updated_at
-- =====================================================

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.medical_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. RLS POLICIES - PRESCRIPTIONS
-- =====================================================

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Recepcionistas podem ver todas as receitas
CREATE POLICY "Recepcionistas podem ver todas as receitas"
  ON public.prescriptions FOR SELECT
  USING (is_receptionist(auth.uid()));

-- Profissionais veem receitas de pacientes com agendamentos
CREATE POLICY "Profissionais veem receitas de seus pacientes"
  ON public.prescriptions FOR SELECT
  USING (
    is_professional(auth.uid()) AND (
      professional_id = get_professional_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.appointments
        WHERE appointments.patient_id = prescriptions.patient_id
          AND appointments.professional_id = get_professional_id(auth.uid())
      )
    )
  );

-- Recepcionistas podem criar receitas
CREATE POLICY "Recepcionistas podem criar receitas"
  ON public.prescriptions FOR INSERT
  WITH CHECK (is_receptionist(auth.uid()));

-- Profissionais podem criar receitas para seus pacientes
CREATE POLICY "Profissionais podem criar receitas"
  ON public.prescriptions FOR INSERT
  WITH CHECK (
    is_professional(auth.uid()) AND
    professional_id = get_professional_id(auth.uid())
  );

-- Recepcionistas podem atualizar receitas
CREATE POLICY "Recepcionistas podem atualizar receitas"
  ON public.prescriptions FOR UPDATE
  USING (is_receptionist(auth.uid()));

-- Profissionais podem atualizar suas prÃ³prias receitas
CREATE POLICY "Profissionais podem atualizar suas receitas"
  ON public.prescriptions FOR UPDATE
  USING (
    is_professional(auth.uid()) AND
    professional_id = get_professional_id(auth.uid())
  );

-- Recepcionistas podem deletar receitas
CREATE POLICY "Recepcionistas podem deletar receitas"
  ON public.prescriptions FOR DELETE
  USING (is_receptionist(auth.uid()));

-- 9. RLS POLICIES - PRESCRIPTION_ITEMS
-- =====================================================

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- Recepcionistas podem ver todos os itens
CREATE POLICY "Recepcionistas podem ver itens de receitas"
  ON public.prescription_items FOR SELECT
  USING (is_receptionist(auth.uid()));

-- Profissionais veem itens de suas receitas
CREATE POLICY "Profissionais veem itens de suas receitas"
  ON public.prescription_items FOR SELECT
  USING (
    is_professional(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = prescription_items.prescription_id
        AND prescriptions.professional_id = get_professional_id(auth.uid())
    )
  );

-- Recepcionistas podem criar itens
CREATE POLICY "Recepcionistas podem criar itens de receitas"
  ON public.prescription_items FOR INSERT
  WITH CHECK (is_receptionist(auth.uid()));

-- Profissionais podem criar itens em suas receitas
CREATE POLICY "Profissionais podem criar itens de receitas"
  ON public.prescription_items FOR INSERT
  WITH CHECK (
    is_professional(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = prescription_items.prescription_id
        AND prescriptions.professional_id = get_professional_id(auth.uid())
    )
  );

-- Recepcionistas podem atualizar itens
CREATE POLICY "Recepcionistas podem atualizar itens de receitas"
  ON public.prescription_items FOR UPDATE
  USING (is_receptionist(auth.uid()));

-- Profissionais podem atualizar itens de suas receitas
CREATE POLICY "Profissionais podem atualizar itens de receitas"
  ON public.prescription_items FOR UPDATE
  USING (
    is_professional(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = prescription_items.prescription_id
        AND prescriptions.professional_id = get_professional_id(auth.uid())
    )
  );

-- Recepcionistas podem deletar itens
CREATE POLICY "Recepcionistas podem deletar itens de receitas"
  ON public.prescription_items FOR DELETE
  USING (is_receptionist(auth.uid()));

-- Profissionais podem deletar itens de suas receitas
CREATE POLICY "Profissionais podem deletar itens de receitas"
  ON public.prescription_items FOR DELETE
  USING (
    is_professional(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = prescription_items.prescription_id
        AND prescriptions.professional_id = get_professional_id(auth.uid())
    )
  );

-- 10. RLS POLICIES - MEDICAL_CERTIFICATES
-- =====================================================

ALTER TABLE public.medical_certificates ENABLE ROW LEVEL SECURITY;

-- Recepcionistas podem ver todos os atestados
CREATE POLICY "Recepcionistas podem ver todos os atestados"
  ON public.medical_certificates FOR SELECT
  USING (is_receptionist(auth.uid()));

-- Profissionais veem atestados de seus pacientes
CREATE POLICY "Profissionais veem atestados de seus pacientes"
  ON public.medical_certificates FOR SELECT
  USING (
    is_professional(auth.uid()) AND (
      professional_id = get_professional_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.appointments
        WHERE appointments.patient_id = medical_certificates.patient_id
          AND appointments.professional_id = get_professional_id(auth.uid())
      )
    )
  );

-- Recepcionistas podem criar atestados
CREATE POLICY "Recepcionistas podem criar atestados"
  ON public.medical_certificates FOR INSERT
  WITH CHECK (is_receptionist(auth.uid()));

-- Profissionais podem criar atestados
CREATE POLICY "Profissionais podem criar atestados"
  ON public.medical_certificates FOR INSERT
  WITH CHECK (
    is_professional(auth.uid()) AND
    professional_id = get_professional_id(auth.uid())
  );

-- Recepcionistas podem atualizar atestados
CREATE POLICY "Recepcionistas podem atualizar atestados"
  ON public.medical_certificates FOR UPDATE
  USING (is_receptionist(auth.uid()));

-- Profissionais podem atualizar seus atestados
CREATE POLICY "Profissionais podem atualizar seus atestados"
  ON public.medical_certificates FOR UPDATE
  USING (
    is_professional(auth.uid()) AND
    professional_id = get_professional_id(auth.uid())
  );

-- Recepcionistas podem deletar atestados
CREATE POLICY "Recepcionistas podem deletar atestados"
  ON public.medical_certificates FOR DELETE
  USING (is_receptionist(auth.uid()));

-- 11. RLS POLICIES - PRESCRIPTION_TEMPLATES
-- =====================================================

ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

-- Recepcionistas podem ver todos os templates
CREATE POLICY "Recepcionistas podem ver templates"
  ON public.prescription_templates FOR SELECT
  USING (is_receptionist(auth.uid()));

-- Profissionais veem seus prÃ³prios templates + templates compartilhados
CREATE POLICY "Profissionais veem templates"
  ON public.prescription_templates FOR SELECT
  USING (
    is_professional(auth.uid()) AND (
      professional_id = get_professional_id(auth.uid())
      OR is_shared = TRUE
    )
  );

-- Profissionais podem criar templates
CREATE POLICY "Profissionais podem criar templates"
  ON public.prescription_templates FOR INSERT
  WITH CHECK (
    is_professional(auth.uid()) AND
    professional_id = get_professional_id(auth.uid())
  );

-- Profissionais podem atualizar seus templates
CREATE POLICY "Profissionais podem atualizar templates"
  ON public.prescription_templates FOR UPDATE
  USING (
    is_professional(auth.uid()) AND
    professional_id = get_professional_id(auth.uid())
  );

-- Profissionais podem deletar seus templates
CREATE POLICY "Profissionais podem deletar templates"
  ON public.prescription_templates FOR DELETE
  USING (
    is_professional(auth.uid()) AND
    professional_id = get_professional_id(auth.uid())
  );

-- 12. RLS POLICIES - PRESCRIPTION_TEMPLATE_ITEMS
-- =====================================================

ALTER TABLE public.prescription_template_items ENABLE ROW LEVEL SECURITY;

-- Recepcionistas podem ver itens de templates
CREATE POLICY "Recepcionistas podem ver itens de templates"
  ON public.prescription_template_items FOR SELECT
  USING (is_receptionist(auth.uid()));

-- Profissionais veem itens de templates acessÃ­veis
CREATE POLICY "Profissionais veem itens de templates"
  ON public.prescription_template_items FOR SELECT
  USING (
    is_professional(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND (
          prescription_templates.professional_id = get_professional_id(auth.uid())
          OR prescription_templates.is_shared = TRUE
        )
    )
  );

-- Profissionais podem criar itens em seus templates
CREATE POLICY "Profissionais podem criar itens de templates"
  ON public.prescription_template_items FOR INSERT
  WITH CHECK (
    is_professional(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND prescription_templates.professional_id = get_professional_id(auth.uid())
    )
  );

-- Profissionais podem atualizar itens de seus templates
CREATE POLICY "Profissionais podem atualizar itens de templates"
  ON public.prescription_template_items FOR UPDATE
  USING (
    is_professional(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND prescription_templates.professional_id = get_professional_id(auth.uid())
    )
  );

-- Profissionais podem deletar itens de seus templates
CREATE POLICY "Profissionais podem deletar itens de templates"
  ON public.prescription_template_items FOR DELETE
  USING (
    is_professional(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND prescription_templates.professional_id = get_professional_id(auth.uid())
    )
  );
-- Remove unique constraint on contact_phone to allow shared phone numbers
-- This is necessary for families sharing the same contact number
ALTER TABLE public.patients 
DROP CONSTRAINT IF EXISTS patients_contact_phone_key;

-- Create non-unique index for search performance
CREATE INDEX IF NOT EXISTS idx_patients_contact_phone 
ON public.patients(contact_phone);
-- Add professional registry and clinic information fields to professionals table
ALTER TABLE public.professionals
ADD COLUMN professional_registry TEXT,
ADD COLUMN registry_uf TEXT,
ADD COLUMN clinic_name TEXT,
ADD COLUMN clinic_address TEXT,
ADD COLUMN clinic_phone TEXT,
ADD COLUMN clinic_cnpj TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.professionals.professional_registry IS 'NÃºmero do registro profissional (CRO, CRM, etc.)';
COMMENT ON COLUMN public.professionals.registry_uf IS 'UF do registro profissional';
COMMENT ON COLUMN public.professionals.clinic_name IS 'Nome da clÃ­nica onde o profissional atua';
COMMENT ON COLUMN public.professionals.clinic_address IS 'EndereÃ§o completo da clÃ­nica';
COMMENT ON COLUMN public.professionals.clinic_phone IS 'Telefone de contato da clÃ­nica';
COMMENT ON COLUMN public.professionals.clinic_cnpj IS 'CNPJ da clÃ­nica (opcional)';

-- Create index for registry lookup
CREATE INDEX idx_professionals_registry ON public.professionals(professional_registry) WHERE professional_registry IS NOT NULL;
-- Permitir que prescription_templates tenha professional_id NULL (templates genÃ©ricos da clÃ­nica)
ALTER TABLE prescription_templates 
ALTER COLUMN professional_id DROP NOT NULL;

-- Remover policies antigas
DROP POLICY IF EXISTS "Profissionais podem criar templates" ON prescription_templates;
DROP POLICY IF EXISTS "Profissionais podem atualizar templates" ON prescription_templates;
DROP POLICY IF EXISTS "Profissionais podem deletar templates" ON prescription_templates;
DROP POLICY IF EXISTS "Profissionais veem templates" ON prescription_templates;
DROP POLICY IF EXISTS "Recepcionistas podem ver templates" ON prescription_templates;

-- Nova policy para INSERT: profissionais criam com seu ID, recepcionistas criam genÃ©ricos (NULL)
CREATE POLICY "UsuÃ¡rios autenticados podem criar templates" 
ON prescription_templates FOR INSERT
TO authenticated
WITH CHECK (
  -- Profissionais criam com seu professional_id
  (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()))
  OR
  -- Recepcionistas criam templates genÃ©ricos (professional_id = NULL)
  (is_receptionist(auth.uid()) AND professional_id IS NULL)
);

-- Nova policy para SELECT: todos veem templates genÃ©ricos + compartilhados + prÃ³prios
CREATE POLICY "UsuÃ¡rios veem templates disponÃ­veis"
ON prescription_templates FOR SELECT
TO authenticated
USING (
  -- Templates genÃ©ricos da clÃ­nica (criados por recepcionistas)
  professional_id IS NULL
  OR
  -- Templates compartilhados por outros profissionais
  is_shared = TRUE
  OR
  -- Templates pessoais do prÃ³prio profissional
  (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()))
);

-- Nova policy para UPDATE: recepcionistas podem editar qualquer template, profissionais apenas os prÃ³prios
CREATE POLICY "Donos e recepcionistas podem atualizar templates"
ON prescription_templates FOR UPDATE
TO authenticated
USING (
  -- Recepcionistas podem editar qualquer template
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem editar apenas seus prÃ³prios templates
  (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()))
);

-- Nova policy para DELETE: recepcionistas podem deletar qualquer template, profissionais apenas os prÃ³prios
CREATE POLICY "Donos e recepcionistas podem deletar templates"
ON prescription_templates FOR DELETE
TO authenticated
USING (
  -- Recepcionistas podem deletar qualquer template
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem deletar apenas seus prÃ³prios templates
  (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()))
);
-- Corrigir RLS policies para prescription_template_items
-- Permitir que recepcionistas criem itens e profissionais usem templates genÃ©ricos

-- Remover policies antigas problemÃ¡ticas
DROP POLICY IF EXISTS "Profissionais podem criar itens de templates" ON prescription_template_items;
DROP POLICY IF EXISTS "Profissionais podem atualizar itens de templates" ON prescription_template_items;
DROP POLICY IF EXISTS "Profissionais podem deletar itens de templates" ON prescription_template_items;
DROP POLICY IF EXISTS "Profissionais veem itens de templates" ON prescription_template_items;
DROP POLICY IF EXISTS "Recepcionistas podem ver itens de templates" ON prescription_template_items;

-- Nova policy de INSERT unificada
CREATE POLICY "UsuÃ¡rios podem criar itens de templates"
ON prescription_template_items FOR INSERT
TO authenticated
WITH CHECK (
  -- Recepcionistas podem criar itens de qualquer template
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem criar itens de templates genÃ©ricos ou prÃ³prios
  (
    is_professional(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND (
          prescription_templates.professional_id = get_professional_id(auth.uid())
          OR prescription_templates.professional_id IS NULL  -- Templates genÃ©ricos
        )
    )
  )
);

-- Nova policy de UPDATE unificada
CREATE POLICY "UsuÃ¡rios podem atualizar itens de templates"
ON prescription_template_items FOR UPDATE
TO authenticated
USING (
  -- Recepcionistas podem editar qualquer item
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem editar itens de templates genÃ©ricos ou prÃ³prios
  (
    is_professional(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND (
          prescription_templates.professional_id = get_professional_id(auth.uid())
          OR prescription_templates.professional_id IS NULL
        )
    )
  )
);

-- Nova policy de DELETE unificada
CREATE POLICY "UsuÃ¡rios podem deletar itens de templates"
ON prescription_template_items FOR DELETE
TO authenticated
USING (
  -- Recepcionistas podem deletar qualquer item
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem deletar itens de templates genÃ©ricos ou prÃ³prios
  (
    is_professional(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND (
          prescription_templates.professional_id = get_professional_id(auth.uid())
          OR prescription_templates.professional_id IS NULL
        )
    )
  )
);

-- Nova policy de SELECT unificada
CREATE POLICY "UsuÃ¡rios veem itens de templates disponÃ­veis"
ON prescription_template_items FOR SELECT
TO authenticated
USING (
  -- Recepcionistas veem todos os itens
  is_receptionist(auth.uid())
  OR
  -- Profissionais veem itens de templates disponÃ­veis
  (
    is_professional(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND (
          prescription_templates.professional_id = get_professional_id(auth.uid())
          OR prescription_templates.professional_id IS NULL  -- Templates genÃ©ricos
          OR prescription_templates.is_shared = TRUE  -- Templates compartilhados
        )
    )
  )
);
-- Remove unused n8n_chat_histories table and its policies
-- This table was not being used in the application and can be recreated
-- in the future when AI features are implemented

-- Drop RLS policies first
DROP POLICY IF EXISTS "UsuÃ¡rios podem criar suas conversas" ON public.n8n_chat_histories;
DROP POLICY IF EXISTS "UsuÃ¡rios veem apenas suas prÃ³prias conversas" ON public.n8n_chat_histories;

-- Drop the sequence if exists
DROP SEQUENCE IF EXISTS public.n8n_chat_histories_id_seq CASCADE;

-- Drop the table
DROP TABLE IF EXISTS public.n8n_chat_histories;
-- Remove registros Ã³rfÃ£os de staff_profiles onde user_id Ã© NULL
-- Esses registros causam erro na edge function list-receptionists
DELETE FROM staff_profiles 
WHERE role = 'receptionist' 
  AND user_id IS NULL;
-- Inserir registro especial para funcionalidade "Bloquear HorÃ¡rio"
-- Este registro Ã© referenciado pela constante BLOCK_TREATMENT_ID em src/lib/constants.ts

INSERT INTO treatments (id, treatment_name, description, default_duration_minutes, cost)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'ðŸš« BLOQUEIO DE HORÃRIO',
  'Registro especial usado pelo sistema para bloquear horÃ¡rios na agenda (fÃ©rias, reuniÃµes, compromissos pessoais)',
  30,
  0
)
ON CONFLICT (id) DO NOTHING;
-- Ãndices compostos para consultas frequentes de agendamentos
CREATE INDEX IF NOT EXISTS idx_appointments_professional_start 
ON public.appointments (professional_id, appointment_start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_professional_status 
ON public.appointments (professional_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_start 
ON public.appointments (patient_id, appointment_start_time DESC);

-- Ãndice para busca de pacientes por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_patients_full_name_lower 
ON public.patients (LOWER(full_name));

-- Ãndice para busca de pacientes por telefone
CREATE INDEX IF NOT EXISTS idx_patients_contact_phone 
ON public.patients (contact_phone);

-- Ãndice para treatment_plan_items por plano e status
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan_status 
ON public.treatment_plan_items (treatment_plan_id, status);
-- =====================================================
-- MÃ“DULO FINANCEIRO - FASE 1: Tabelas, RLS e Ãndices
-- (ENUM payment_method_enum jÃ¡ existe)
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
  
  -- ValidaÃ§Ãµes
  CONSTRAINT valid_installment CHECK (installment_number <= total_installments),
  CONSTRAINT valid_discount CHECK (discount_amount <= subtotal)
);

-- 2. Criar tabela de entradas de pagamento (mÃºltiplas formas)
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
CREATE POLICY "UsuÃ¡rios autenticados podem ver entradas de pagamento"
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

-- 6. Ãndices para performance
CREATE INDEX idx_payments_patient ON public.payments(patient_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);
CREATE INDEX idx_payments_plan ON public.payments(treatment_plan_id);
CREATE INDEX idx_payments_created ON public.payments(created_at DESC);
CREATE INDEX idx_payment_entries_payment ON public.payment_entries(payment_id);
-- Fase 1: SincronizaÃ§Ã£o Bidirecional do Odontograma
-- Risco: 2/10 | Reversibilidade: 100%

-- 1. Adicionar campo status Ã  tabela tooth_procedures
ALTER TABLE public.tooth_procedures 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Criar constraint para validar valores permitidos
ALTER TABLE public.tooth_procedures 
ADD CONSTRAINT tooth_procedures_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed'));

-- 3. Criar Ã­ndice para performance em buscas por status
CREATE INDEX IF NOT EXISTS idx_tooth_procedures_status 
ON public.tooth_procedures(status);

-- 4. Criar funÃ§Ã£o de sincronizaÃ§Ã£o bidirecional
-- Quando treatment_plan_item Ã© marcado como 'completed':
-- - Atualiza odontogram_records.status baseado no tipo de procedimento
-- - Marca tooth_procedures.status como 'completed'
CREATE OR REPLACE FUNCTION public.sync_plan_completion_to_odontogram()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_new_tooth_status tooth_status_enum;
BEGIN
  -- SÃ³ executa quando status muda para 'completed' e tem dente associado
  IF NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NEW.tooth_number IS NOT NULL THEN
    
    -- Buscar patient_id do plano de tratamento
    SELECT patient_id INTO v_patient_id
    FROM public.treatment_plans 
    WHERE id = NEW.treatment_plan_id;
    
    -- Se nÃ£o encontrou patient_id, nÃ£o faz nada
    IF v_patient_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Determinar novo status do dente baseado no procedimento
    v_new_tooth_status := CASE 
      WHEN LOWER(NEW.procedure_description) LIKE '%restaura%' THEN 'obturado'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%obtura%' THEN 'obturado'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%extra%' THEN 'extraido'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%canal%' THEN 'tratamento_canal'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%endodont%' THEN 'tratamento_canal'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%coroa%' THEN 'coroa'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%prÃ³tese%' THEN 'coroa'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%implante%' THEN 'implante'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%fratur%' THEN 'fratura'::tooth_status_enum
      ELSE NULL -- MantÃ©m status atual se nÃ£o reconhecer
    END;
    
    -- 1. Atualizar odontogram_records se tiver novo status vÃ¡lido
    IF v_new_tooth_status IS NOT NULL THEN
      -- Usar upsert para criar ou atualizar registro
      INSERT INTO public.odontogram_records (patient_id, tooth_number, status, last_updated_at)
      VALUES (v_patient_id, NEW.tooth_number, v_new_tooth_status, NOW())
      ON CONFLICT (patient_id, tooth_number) 
      DO UPDATE SET 
        status = v_new_tooth_status,
        last_updated_at = NOW();
    END IF;
    
    -- 2. Marcar procedimentos relacionados como completed
    UPDATE public.tooth_procedures
    SET status = 'completed'
    WHERE patient_id = v_patient_id
      AND tooth_number = NEW.tooth_number
      AND status != 'completed';
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Criar trigger que dispara apÃ³s UPDATE em treatment_plan_items
DROP TRIGGER IF EXISTS trigger_sync_plan_to_odontogram ON public.treatment_plan_items;

CREATE TRIGGER trigger_sync_plan_to_odontogram
AFTER UPDATE ON public.treatment_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_plan_completion_to_odontogram();
-- Add UPDATE and DELETE RLS policies for tooth_procedures table
-- Professionals can update/delete procedures of their patients
CREATE POLICY "Profissionais podem atualizar procedimentos de seus pacientes"
ON public.tooth_procedures
FOR UPDATE
USING (
  is_professional(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_id = tooth_procedures.patient_id
      AND appointments.professional_id = get_professional_id(auth.uid())
    )
  )
);

CREATE POLICY "Profissionais podem deletar procedimentos de seus pacientes"
ON public.tooth_procedures
FOR DELETE
USING (
  is_professional(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_id = tooth_procedures.patient_id
      AND appointments.professional_id = get_professional_id(auth.uid())
    )
  )
);

-- Receptionists can update/delete any procedure
CREATE POLICY "Recepcionistas podem atualizar procedimentos"
ON public.tooth_procedures
FOR UPDATE
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar procedimentos"
ON public.tooth_procedures
FOR DELETE
USING (is_receptionist(auth.uid()));
-- Rename 'draft' to 'awaiting_payment' in treatment_plan_status_enum
ALTER TYPE treatment_plan_status_enum RENAME VALUE 'draft' TO 'awaiting_payment';
-- Add 'awaiting_payment' to treatment_plan_item_status_enum
ALTER TYPE treatment_plan_item_status_enum ADD VALUE 'awaiting_payment';
-- Corrigir trigger para respeitar status 'awaiting_payment' em orÃ§amentos
CREATE OR REPLACE FUNCTION public.update_treatment_plan_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  plan_id uuid;
  total_items integer;
  completed_items integer;
  pending_items integer;
  in_progress_items integer;
  current_status treatment_plan_status_enum;
  new_status treatment_plan_status_enum;
BEGIN
  -- Determina qual plano foi afetado
  IF TG_OP = 'DELETE' THEN
    plan_id := OLD.treatment_plan_id;
  ELSE
    plan_id := NEW.treatment_plan_id;
  END IF;

  -- Busca status atual do plano
  SELECT status INTO current_status
  FROM public.treatment_plans
  WHERE id = plan_id;

  -- Conta o total de itens e quantos estÃ£o em cada status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'in_progress')
  INTO total_items, completed_items, pending_items, in_progress_items
  FROM public.treatment_plan_items
  WHERE treatment_plan_id = plan_id;

  -- Determina o novo status do plano
  IF total_items = 0 THEN
    -- Se nÃ£o hÃ¡ itens, mantÃ©m status atual
    new_status := current_status;
  ELSIF completed_items = total_items THEN
    -- Se todos os itens estÃ£o concluÃ­dos, marca plano como completed
    new_status := 'completed';
  ELSIF in_progress_items > 0 THEN
    -- Se hÃ¡ itens em andamento, plano em andamento
    new_status := 'in_progress';
  ELSIF pending_items > 0 THEN
    -- Se hÃ¡ itens pendentes, verificar status atual
    -- Manter awaiting_payment se esse for o status atual (orÃ§amento nÃ£o aprovado)
    IF current_status = 'awaiting_payment' THEN
      new_status := 'awaiting_payment';
    ELSE
      new_status := 'in_progress';
    END IF;
  ELSE
    -- Fallback: mantÃ©m status atual
    new_status := current_status;
  END IF;

  -- Atualiza o status do plano
  UPDATE public.treatment_plans
  SET status = new_status
  WHERE id = plan_id;

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;
-- Create block_type enum if not exists
DO $$ BEGIN
  CREATE TYPE block_type_enum AS ENUM ('full_day', 'morning', 'afternoon', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create time_blocks table
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  reason text,
  block_type block_type_enum NOT NULL DEFAULT 'custom',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_professional_id ON public.time_blocks(professional_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_start_time ON public.time_blocks(start_time);
CREATE INDEX IF NOT EXISTS idx_time_blocks_end_time ON public.time_blocks(end_time);

-- Enable RLS
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Receptionists can manage all blocks
CREATE POLICY "Recepcionistas podem ver todos os bloqueios"
ON public.time_blocks FOR SELECT
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem criar bloqueios"
ON public.time_blocks FOR INSERT
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar bloqueios"
ON public.time_blocks FOR UPDATE
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar bloqueios"
ON public.time_blocks FOR DELETE
USING (is_receptionist(auth.uid()));

-- RLS Policies: Professionals can manage their own blocks
CREATE POLICY "Profissionais podem ver seus bloqueios"
ON public.time_blocks FOR SELECT
USING (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()));

CREATE POLICY "Profissionais podem criar seus bloqueios"
ON public.time_blocks FOR INSERT
WITH CHECK (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()));

CREATE POLICY "Profissionais podem editar seus bloqueios"
ON public.time_blocks FOR UPDATE
USING (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()));

CREATE POLICY "Profissionais podem deletar seus bloqueios"
ON public.time_blocks FOR DELETE
USING (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_time_blocks_updated_at
  BEFORE UPDATE ON public.time_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
-- Remover tabela time_blocks e enum block_type_enum
DROP TABLE IF EXISTS public.time_blocks;
DROP TYPE IF EXISTS public.block_type_enum;

-- Remover registros especiais de bloqueio (se existirem)
DELETE FROM public.treatments WHERE id = '00000000-0000-0000-0000-000000000002';
DELETE FROM public.patients WHERE id = '00000000-0000-0000-0000-000000000001';
