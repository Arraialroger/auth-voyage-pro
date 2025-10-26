-- Remover políticas antigas de pacientes
DROP POLICY IF EXISTS "Equipe autenticada pode ver pacientes" ON public.patients;
DROP POLICY IF EXISTS "Equipe autenticada pode criar pacientes" ON public.patients;
DROP POLICY IF EXISTS "Equipe autenticada pode editar pacientes" ON public.patients;
DROP POLICY IF EXISTS "Equipe autenticada pode deletar pacientes" ON public.patients;

-- Remover políticas antigas de documentos
DROP POLICY IF EXISTS "Equipe autenticada pode ver documentos de pacientes" ON public.patient_documents;
DROP POLICY IF EXISTS "Equipe autenticada pode inserir documentos" ON public.patient_documents;
DROP POLICY IF EXISTS "Equipe autenticada pode deletar documentos" ON public.patient_documents;

-- ========================================
-- NOVAS POLÍTICAS PARA PACIENTES
-- ========================================

-- SELECT: Recepcionistas veem todos, profissionais veem apenas seus pacientes
CREATE POLICY "Recepcionistas podem ver todos os pacientes"
ON public.patients
FOR SELECT
TO authenticated
USING (is_receptionist(auth.uid()));

CREATE POLICY "Profissionais podem ver seus próprios pacientes"
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

-- INSERT: Qualquer usuário autenticado pode criar pacientes
CREATE POLICY "Usuários autenticados podem criar pacientes"
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

CREATE POLICY "Profissionais podem editar seus próprios pacientes"
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
-- NOVAS POLÍTICAS PARA DOCUMENTOS
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

-- INSERT: Qualquer usuário autenticado pode inserir documentos
CREATE POLICY "Usuários autenticados podem inserir documentos"
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