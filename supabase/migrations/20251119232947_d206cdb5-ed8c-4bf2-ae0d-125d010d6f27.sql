-- Permitir que prescription_templates tenha professional_id NULL (templates genéricos da clínica)
ALTER TABLE prescription_templates 
ALTER COLUMN professional_id DROP NOT NULL;

-- Remover policies antigas
DROP POLICY IF EXISTS "Profissionais podem criar templates" ON prescription_templates;
DROP POLICY IF EXISTS "Profissionais podem atualizar templates" ON prescription_templates;
DROP POLICY IF EXISTS "Profissionais podem deletar templates" ON prescription_templates;
DROP POLICY IF EXISTS "Profissionais veem templates" ON prescription_templates;
DROP POLICY IF EXISTS "Recepcionistas podem ver templates" ON prescription_templates;

-- Nova policy para INSERT: profissionais criam com seu ID, recepcionistas criam genéricos (NULL)
CREATE POLICY "Usuários autenticados podem criar templates" 
ON prescription_templates FOR INSERT
TO authenticated
WITH CHECK (
  -- Profissionais criam com seu professional_id
  (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()))
  OR
  -- Recepcionistas criam templates genéricos (professional_id = NULL)
  (is_receptionist(auth.uid()) AND professional_id IS NULL)
);

-- Nova policy para SELECT: todos veem templates genéricos + compartilhados + próprios
CREATE POLICY "Usuários veem templates disponíveis"
ON prescription_templates FOR SELECT
TO authenticated
USING (
  -- Templates genéricos da clínica (criados por recepcionistas)
  professional_id IS NULL
  OR
  -- Templates compartilhados por outros profissionais
  is_shared = TRUE
  OR
  -- Templates pessoais do próprio profissional
  (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()))
);

-- Nova policy para UPDATE: recepcionistas podem editar qualquer template, profissionais apenas os próprios
CREATE POLICY "Donos e recepcionistas podem atualizar templates"
ON prescription_templates FOR UPDATE
TO authenticated
USING (
  -- Recepcionistas podem editar qualquer template
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem editar apenas seus próprios templates
  (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()))
);

-- Nova policy para DELETE: recepcionistas podem deletar qualquer template, profissionais apenas os próprios
CREATE POLICY "Donos e recepcionistas podem deletar templates"
ON prescription_templates FOR DELETE
TO authenticated
USING (
  -- Recepcionistas podem deletar qualquer template
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem deletar apenas seus próprios templates
  (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()))
);