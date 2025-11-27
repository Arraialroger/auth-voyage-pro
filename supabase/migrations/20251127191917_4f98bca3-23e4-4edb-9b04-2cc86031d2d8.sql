-- Índices compostos para consultas frequentes de agendamentos
CREATE INDEX IF NOT EXISTS idx_appointments_professional_start 
ON public.appointments (professional_id, appointment_start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_professional_status 
ON public.appointments (professional_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_start 
ON public.appointments (patient_id, appointment_start_time DESC);

-- Índice para busca de pacientes por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_patients_full_name_lower 
ON public.patients (LOWER(full_name));

-- Índice para busca de pacientes por telefone
CREATE INDEX IF NOT EXISTS idx_patients_contact_phone 
ON public.patients (contact_phone);

-- Índice para treatment_plan_items por plano e status
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan_status 
ON public.treatment_plan_items (treatment_plan_id, status);