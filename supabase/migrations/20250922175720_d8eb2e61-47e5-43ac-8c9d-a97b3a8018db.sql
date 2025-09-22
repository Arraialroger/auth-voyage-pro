-- Allow users to update and delete patients
CREATE POLICY "Equipe autenticada pode editar pacientes" 
ON public.patients 
FOR UPDATE 
USING ((EXISTS ( SELECT 1
   FROM staff_profiles
  WHERE ((staff_profiles.user_id = auth.uid()) AND (staff_profiles.role = 'receptionist'::text)))) OR (EXISTS ( SELECT 1
   FROM professionals
  WHERE (professionals.user_id = auth.uid()))));

CREATE POLICY "Equipe autenticada pode deletar pacientes" 
ON public.patients 
FOR DELETE 
USING ((EXISTS ( SELECT 1
   FROM staff_profiles
  WHERE ((staff_profiles.user_id = auth.uid()) AND (staff_profiles.role = 'receptionist'::text)))) OR (EXISTS ( SELECT 1
   FROM professionals
  WHERE (professionals.user_id = auth.uid()))));