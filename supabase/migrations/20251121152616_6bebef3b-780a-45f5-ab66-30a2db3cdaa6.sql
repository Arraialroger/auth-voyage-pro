-- Inserir registro especial para funcionalidade "Bloquear Horário"
-- Este registro é referenciado pela constante BLOCK_TREATMENT_ID em src/lib/constants.ts

INSERT INTO treatments (id, treatment_name, description, default_duration_minutes, cost)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '🚫 BLOQUEIO DE HORÁRIO',
  'Registro especial usado pelo sistema para bloquear horários na agenda (férias, reuniões, compromissos pessoais)',
  30,
  0
)
ON CONFLICT (id) DO NOTHING;