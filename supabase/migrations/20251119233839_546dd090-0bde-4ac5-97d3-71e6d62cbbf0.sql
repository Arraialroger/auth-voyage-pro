-- Corrigir RLS policies para prescription_template_items
-- Permitir que recepcionistas criem itens e profissionais usem templates genéricos

-- Remover policies antigas problemáticas
DROP POLICY IF EXISTS "Profissionais podem criar itens de templates" ON prescription_template_items;
DROP POLICY IF EXISTS "Profissionais podem atualizar itens de templates" ON prescription_template_items;
DROP POLICY IF EXISTS "Profissionais podem deletar itens de templates" ON prescription_template_items;
DROP POLICY IF EXISTS "Profissionais veem itens de templates" ON prescription_template_items;
DROP POLICY IF EXISTS "Recepcionistas podem ver itens de templates" ON prescription_template_items;

-- Nova policy de INSERT unificada
CREATE POLICY "Usuários podem criar itens de templates"
ON prescription_template_items FOR INSERT
TO authenticated
WITH CHECK (
  -- Recepcionistas podem criar itens de qualquer template
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem criar itens de templates genéricos ou próprios
  (
    is_professional(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND (
          prescription_templates.professional_id = get_professional_id(auth.uid())
          OR prescription_templates.professional_id IS NULL  -- Templates genéricos
        )
    )
  )
);

-- Nova policy de UPDATE unificada
CREATE POLICY "Usuários podem atualizar itens de templates"
ON prescription_template_items FOR UPDATE
TO authenticated
USING (
  -- Recepcionistas podem editar qualquer item
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem editar itens de templates genéricos ou próprios
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
CREATE POLICY "Usuários podem deletar itens de templates"
ON prescription_template_items FOR DELETE
TO authenticated
USING (
  -- Recepcionistas podem deletar qualquer item
  is_receptionist(auth.uid())
  OR
  -- Profissionais podem deletar itens de templates genéricos ou próprios
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
CREATE POLICY "Usuários veem itens de templates disponíveis"
ON prescription_template_items FOR SELECT
TO authenticated
USING (
  -- Recepcionistas veem todos os itens
  is_receptionist(auth.uid())
  OR
  -- Profissionais veem itens de templates disponíveis
  (
    is_professional(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM prescription_templates
      WHERE prescription_templates.id = prescription_template_items.template_id
        AND (
          prescription_templates.professional_id = get_professional_id(auth.uid())
          OR prescription_templates.professional_id IS NULL  -- Templates genéricos
          OR prescription_templates.is_shared = TRUE  -- Templates compartilhados
        )
    )
  )
);