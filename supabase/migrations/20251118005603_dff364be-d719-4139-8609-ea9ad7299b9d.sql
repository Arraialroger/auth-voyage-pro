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

-- 2.1 Índices para performance
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_professional ON public.prescriptions(professional_id);
CREATE INDEX idx_prescriptions_appointment ON public.prescriptions(appointment_id);
CREATE INDEX idx_prescriptions_created_at ON public.prescriptions(created_at DESC);

COMMENT ON TABLE public.prescriptions IS 'Receitas médicas/odontológicas emitidas pelos profissionais';

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

-- 3.1 Índices
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

-- 4.1 Índices
CREATE INDEX idx_certificates_patient ON public.medical_certificates(patient_id);
CREATE INDEX idx_certificates_professional ON public.medical_certificates(professional_id);
CREATE INDEX idx_certificates_appointment ON public.medical_certificates(appointment_id);
CREATE INDEX idx_certificates_start_date ON public.medical_certificates(start_date DESC);

COMMENT ON TABLE public.medical_certificates IS 'Atestados médicos/odontológicos emitidos';

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

-- 5.1 Índices
CREATE INDEX idx_templates_professional ON public.prescription_templates(professional_id);

COMMENT ON TABLE public.prescription_templates IS 'Templates de receitas salvas pelos profissionais para reutilização';

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

-- 6.1 Índices
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

-- Profissionais podem atualizar suas próprias receitas
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

-- Profissionais veem seus próprios templates + templates compartilhados
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

-- Profissionais veem itens de templates acessíveis
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