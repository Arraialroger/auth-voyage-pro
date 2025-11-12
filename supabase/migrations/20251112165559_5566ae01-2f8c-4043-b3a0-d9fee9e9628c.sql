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