-- ========================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS
-- ========================================

-- 1. REMOVER FUNÇÃO run_sql (CRÍTICO - SQL Injection Risk)
DROP FUNCTION IF EXISTS public.run_sql(text);

-- 2. PROTEGER BUCKET medical-documents
-- Remover políticas permissivas existentes
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar arquivos" ON storage.objects;

-- Apenas recepcionistas podem fazer upload de documentos médicos
CREATE POLICY "Recepcionistas podem fazer upload de documentos médicos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-documents' 
  AND is_receptionist(auth.uid())
);

-- Recepcionistas podem ver todos os documentos médicos
CREATE POLICY "Recepcionistas podem ver todos os documentos médicos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-documents' 
  AND is_receptionist(auth.uid())
);

-- Profissionais podem ver apenas documentos de seus próprios pacientes
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

-- Apenas recepcionistas podem deletar documentos médicos
CREATE POLICY "Recepcionistas podem deletar documentos médicos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-documents' 
  AND is_receptionist(auth.uid())
);

-- 3. PROTEGER TABELA communication_logs
-- Remover políticas permissivas existentes
DROP POLICY IF EXISTS "Usuários autenticados podem criar logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Usuários autenticados podem ver logs" ON public.communication_logs;

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

-- Profissionais podem ver apenas logs de seus próprios pacientes
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