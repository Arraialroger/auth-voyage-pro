-- Add UPDATE and DELETE RLS policies for tooth_procedures table
-- Professionals can update/delete procedures of their patients
CREATE POLICY "Profissionais podem atualizar procedimentos de seus pacientes"
ON public.tooth_procedures
FOR UPDATE
USING (
  is_professional(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_id = tooth_procedures.patient_id
      AND appointments.professional_id = get_professional_id(auth.uid())
    )
  )
);

CREATE POLICY "Profissionais podem deletar procedimentos de seus pacientes"
ON public.tooth_procedures
FOR DELETE
USING (
  is_professional(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_id = tooth_procedures.patient_id
      AND appointments.professional_id = get_professional_id(auth.uid())
    )
  )
);

-- Receptionists can update/delete any procedure
CREATE POLICY "Recepcionistas podem atualizar procedimentos"
ON public.tooth_procedures
FOR UPDATE
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar procedimentos"
ON public.tooth_procedures
FOR DELETE
USING (is_receptionist(auth.uid()));