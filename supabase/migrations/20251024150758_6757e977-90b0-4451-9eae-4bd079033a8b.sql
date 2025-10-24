-- Corrigir políticas RLS da tabela professionals
-- Remover políticas problemáticas que usam subquery diretamente
DROP POLICY IF EXISTS "Recepcionistas podem criar profissionais" ON professionals;
DROP POLICY IF EXISTS "Recepcionistas podem editar profissionais" ON professionals;
DROP POLICY IF EXISTS "Recepcionistas podem deletar profissionais" ON professionals;

-- Recriar políticas usando a função is_receptionist() que é SECURITY DEFINER
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