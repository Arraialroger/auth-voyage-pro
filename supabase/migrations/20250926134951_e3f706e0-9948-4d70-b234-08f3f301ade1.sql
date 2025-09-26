-- Habilitar RLS em tabelas que precisam
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas básicas para staff_profiles
CREATE POLICY "Usuários autenticados podem ver perfis de staff" 
ON public.staff_profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Criar políticas básicas para professional_schedules
CREATE POLICY "Usuários autenticados podem ver horários" 
ON public.professional_schedules 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Recepcionistas podem gerenciar horários
CREATE POLICY "Recepcionistas podem gerenciar horários" 
ON public.professional_schedules 
FOR ALL 
USING ((SELECT staff_profiles.role FROM staff_profiles WHERE staff_profiles.user_id = auth.uid()) = 'receptionist');

-- Profissionais podem gerenciar seus próprios horários
CREATE POLICY "Profissionais podem gerenciar seus horários" 
ON public.professional_schedules 
FOR ALL 
USING ((SELECT professionals.id FROM professionals WHERE professionals.user_id = auth.uid()) = professional_id);

-- Criar políticas básicas para communication_logs
CREATE POLICY "Usuários autenticados podem ver logs" 
ON public.communication_logs 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem criar logs" 
ON public.communication_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');