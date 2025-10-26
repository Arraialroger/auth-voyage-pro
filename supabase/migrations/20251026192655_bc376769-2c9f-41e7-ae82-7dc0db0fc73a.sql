-- ========================================
-- FASE 1: Restringir Criação de Pacientes e Documentos
-- ========================================

-- Pacientes: apenas recepcionistas podem criar
DROP POLICY IF EXISTS "Usuários autenticados podem criar pacientes" ON public.patients;

CREATE POLICY "Recepcionistas podem criar pacientes"
ON public.patients 
FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

-- Documentos: apenas recepcionistas podem fazer upload
DROP POLICY IF EXISTS "Usuários autenticados podem inserir documentos" ON public.patient_documents;

CREATE POLICY "Recepcionistas podem inserir documentos"
ON public.patient_documents 
FOR INSERT
TO authenticated
WITH CHECK (is_receptionist(auth.uid()));

-- ========================================
-- FASE 2: Proteger Dados Financeiros
-- ========================================

-- Remover acesso de profissionais a transações financeiras
DROP POLICY IF EXISTS "Profissionais podem ver transações de seus agendamentos" ON public.financial_transactions;

-- Remover acesso de profissionais a pagamentos de parcelas
DROP POLICY IF EXISTS "Profissionais podem ver pagamentos de seus agendamentos" ON public.installment_payments;

-- Remover acesso de profissionais a planos de parcelamento
DROP POLICY IF EXISTS "Profissionais podem ver planos de seus agendamentos" ON public.installment_plans;

-- ========================================
-- FASE 3: Proteger Deleção de Documentos
-- ========================================

-- Remover permissão de profissionais deletarem documentos médicos
DROP POLICY IF EXISTS "Profissionais podem deletar documentos de seus pacientes" ON public.patient_documents;