-- FASE 1: CORREÇÃO DE SEGURANÇA - RLS POLICIES
-- Corrige políticas de acesso para proteger dados sensíveis (LGPD)

-- =============================================
-- 1. TABELA PATIENTS - DADOS MÉDICOS SENSÍVEIS
-- =============================================
-- Problema: Qualquer usuário autenticado pode ver todos os pacientes
-- Solução: Profissionais veem apenas pacientes com agendamentos atribuídos

DROP POLICY IF EXISTS "Profissionais podem ver seus próprios pacientes" ON patients;
DROP POLICY IF EXISTS "Profissionais podem editar seus próprios pacientes" ON patients;
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

-- Profissionais: apenas pacientes com agendamentos atribuídos
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
-- 2. TABELA COMMUNICATION_LOGS - HISTÓRICO DE COMUNICAÇÃO
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
-- 3. TABELA PATIENT_DOCUMENTS - DOCUMENTOS MÉDICOS CONFIDENCIAIS
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
-- 4. TABELA APPOINTMENTS - JÁ ESTAVA BOA, MANTENDO
-- =============================================
-- As policies de appointments já estão corretas e restritivas

-- =============================================
-- 5. TABELA PROFESSIONALS - PROTEGER DADOS DE CONTATO
-- =============================================

DROP POLICY IF EXISTS "Recepcionistas podem criar profissionais" ON professionals;
DROP POLICY IF EXISTS "Recepcionistas podem deletar profissionais" ON professionals;
DROP POLICY IF EXISTS "Recepcionistas podem editar profissionais" ON professionals;
DROP POLICY IF EXISTS "Usuários autenticados podem ver os profissionais" ON professionals;

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

-- Profissionais: veem apenas dados próprios completos
CREATE POLICY "Profissionais veem apenas seus próprios dados"
ON professionals FOR SELECT
TO authenticated
USING (
  is_professional(auth.uid()) AND
  professionals.user_id = auth.uid()
);

-- Outros profissionais veem nome e especialização (sem contato)
-- Para isso, criar view pública se necessário no futuro

-- =============================================
-- 6. TABELA N8N_CHAT_HISTORIES - ISOLAR CONVERSAS
-- =============================================

DROP POLICY IF EXISTS "Usuários autenticados podem criar chat histories" ON n8n_chat_histories;
DROP POLICY IF EXISTS "Usuários autenticados podem ver chat histories" ON n8n_chat_histories;

-- Nota: session_id precisa conter o user_id para isolar corretamente
-- Assumindo formato: session_id contém o UUID do usuário

CREATE POLICY "Usuários veem apenas suas próprias conversas"
ON n8n_chat_histories FOR SELECT
TO authenticated
USING (
  session_id LIKE '%' || auth.uid()::text || '%'
);

CREATE POLICY "Usuários podem criar suas conversas"
ON n8n_chat_histories FOR INSERT
TO authenticated
WITH CHECK (
  session_id LIKE '%' || auth.uid()::text || '%'
);

-- =============================================
-- 7. TABELA WAITING_LIST - REVISAR ACESSO
-- =============================================
-- As policies já estão corretas, mas vamos garantir consistência

DROP POLICY IF EXISTS "Profissionais podem ver sua própria lista de espera" ON waiting_list;
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