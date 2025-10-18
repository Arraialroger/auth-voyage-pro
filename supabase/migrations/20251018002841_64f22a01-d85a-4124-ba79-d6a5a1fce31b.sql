-- Adicionar índices para otimização de performance

-- Índice para consultas de agendamentos por paciente
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id 
ON appointments(patient_id);

-- Índice para consultas de agendamentos por profissional
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id 
ON appointments(professional_id);

-- Índice para consultas de agendamentos por horário de início
CREATE INDEX IF NOT EXISTS idx_appointments_start_time 
ON appointments(appointment_start_time);

-- Índice para consultas de transações financeiras por agendamento
CREATE INDEX IF NOT EXISTS idx_financial_transactions_appointment_id 
ON financial_transactions(appointment_id);

-- Índice para consultas de planos de parcelamento por transação
CREATE INDEX IF NOT EXISTS idx_installment_plans_transaction_id 
ON installment_plans(transaction_id);

-- Índice composto para queries comuns de agendamentos (profissional + data)
CREATE INDEX IF NOT EXISTS idx_appointments_prof_date 
ON appointments(professional_id, appointment_start_time);

-- Índice para busca de pacientes por telefone (usado na busca)
CREATE INDEX IF NOT EXISTS idx_patients_contact_phone 
ON patients(contact_phone);

-- Comentários explicativos
COMMENT ON INDEX idx_appointments_patient_id IS 'Acelera consultas de histórico de agendamentos por paciente';
COMMENT ON INDEX idx_appointments_professional_id IS 'Acelera consultas de agendamentos por profissional';
COMMENT ON INDEX idx_appointments_start_time IS 'Acelera consultas de agendamentos por período/data';
COMMENT ON INDEX idx_financial_transactions_appointment_id IS 'Acelera consultas de transações vinculadas a agendamentos';
COMMENT ON INDEX idx_installment_plans_transaction_id IS 'Acelera consultas de planos de parcelamento';
COMMENT ON INDEX idx_appointments_prof_date IS 'Otimiza queries da agenda que filtram por profissional e data';
COMMENT ON INDEX idx_patients_contact_phone IS 'Acelera busca de pacientes por telefone';