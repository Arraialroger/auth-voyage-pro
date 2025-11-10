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

-- Índices para performance
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