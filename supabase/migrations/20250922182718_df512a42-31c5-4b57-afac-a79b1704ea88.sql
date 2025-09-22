-- Enable RLS on tables that don't have it enabled yet
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Add basic policies for professional_schedules
CREATE POLICY "Usuários autenticados podem ver horários dos profissionais" 
ON public.professional_schedules 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem criar horários dos profissionais" 
ON public.professional_schedules 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem editar horários dos profissionais" 
ON public.professional_schedules 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem deletar horários dos profissionais" 
ON public.professional_schedules 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Add basic policies for communication_logs
CREATE POLICY "Usuários autenticados podem ver logs de comunicação" 
ON public.communication_logs 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem criar logs de comunicação" 
ON public.communication_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Add basic policies for staff_profiles
CREATE POLICY "Usuários autenticados podem ver perfis da equipe" 
ON public.staff_profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem criar perfis da equipe" 
ON public.staff_profiles 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem editar perfis da equipe" 
ON public.staff_profiles 
FOR UPDATE 
USING (auth.role() = 'authenticated');