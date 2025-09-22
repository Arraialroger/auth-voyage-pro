-- Add RLS policies for treatments table to allow CRUD operations
CREATE POLICY "Recepcionistas podem criar tratamentos" 
ON public.treatments 
FOR INSERT 
WITH CHECK (
  (SELECT staff_profiles.role FROM staff_profiles WHERE staff_profiles.user_id = auth.uid()) = 'receptionist'
);

CREATE POLICY "Recepcionistas podem editar tratamentos" 
ON public.treatments 
FOR UPDATE 
USING (
  (SELECT staff_profiles.role FROM staff_profiles WHERE staff_profiles.user_id = auth.uid()) = 'receptionist'
);

CREATE POLICY "Recepcionistas podem deletar tratamentos" 
ON public.treatments 
FOR DELETE 
USING (
  (SELECT staff_profiles.role FROM staff_profiles WHERE staff_profiles.user_id = auth.uid()) = 'receptionist'
);