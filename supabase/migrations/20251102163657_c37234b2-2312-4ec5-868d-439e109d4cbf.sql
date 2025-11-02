-- Fase 1: Adicionar novo status "Patient Arrived" ao enum
ALTER TYPE appointment_status_enum ADD VALUE IF NOT EXISTS 'Patient Arrived';

-- Fase 2: Configurar Supabase Realtime na tabela appointments
ALTER TABLE appointments REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;