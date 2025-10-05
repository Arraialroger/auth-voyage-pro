-- Adicionar novo status "Aguardando confirmação" ao enum
ALTER TYPE appointment_status_enum ADD VALUE IF NOT EXISTS 'Pending Confirmation';

-- Adicionar campo de confirmação na tabela appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;