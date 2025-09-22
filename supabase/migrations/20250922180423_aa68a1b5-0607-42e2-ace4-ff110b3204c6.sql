-- Enable RLS on tables that are missing it
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for communication_logs
CREATE POLICY "Equipe autenticada pode ver logs de comunicação" 
ON public.communication_logs 
FOR SELECT 
USING ((EXISTS ( SELECT 1
   FROM staff_profiles
  WHERE ((staff_profiles.user_id = auth.uid()) AND (staff_profiles.role = 'receptionist'::text)))) OR (EXISTS ( SELECT 1
   FROM professionals
  WHERE (professionals.user_id = auth.uid()))));

CREATE POLICY "Equipe autenticada pode criar logs de comunicação" 
ON public.communication_logs 
FOR INSERT 
WITH CHECK ((EXISTS ( SELECT 1
   FROM staff_profiles
  WHERE ((staff_profiles.user_id = auth.uid()) AND (staff_profiles.role = 'receptionist'::text)))) OR (EXISTS ( SELECT 1
   FROM professionals
  WHERE (professionals.user_id = auth.uid()))));

-- Add basic RLS policies for professional_schedules
CREATE POLICY "Usuários autenticados podem ver horários profissionais" 
ON public.professional_schedules 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add basic RLS policies for staff_profiles
CREATE POLICY "Usuários podem ver seus próprios perfis de staff" 
ON public.staff_profiles 
FOR SELECT 
USING (user_id = auth.uid());