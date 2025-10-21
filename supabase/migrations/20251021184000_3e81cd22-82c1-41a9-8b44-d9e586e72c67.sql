-- Criar paciente especial para bloqueios de horário
-- Usando um UUID fixo e específico para fácil identificação
INSERT INTO public.patients (id, full_name, contact_phone, cpf, birth_date, medical_history_notes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🚫 BLOQUEIO DE HORÁRIO',
  '00000000000',
  '00000000000',
  '2000-01-01',
  'Paciente especial utilizado exclusivamente para bloqueio de horários na agenda. NÃO DELETAR.'
)
ON CONFLICT (id) DO NOTHING;

-- Criar tratamento especial para bloqueios
INSERT INTO public.treatments (id, treatment_name, description, default_duration_minutes, cost)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Bloqueio de Agenda',
  'Tratamento especial utilizado para bloquear horários na agenda (férias, reuniões, compromissos pessoais, etc). NÃO DELETAR.',
  30,
  0
)
ON CONFLICT (id) DO NOTHING;