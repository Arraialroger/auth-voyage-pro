-- Adicionar coluna para identificar agendamentos de encaixe
ALTER TABLE appointments 
ADD COLUMN is_squeeze_in BOOLEAN DEFAULT false;

-- Adicionar comentário para documentação
COMMENT ON COLUMN appointments.is_squeeze_in IS 
'Indica se o agendamento é um encaixe (permite sobreposição controlada de horários)';