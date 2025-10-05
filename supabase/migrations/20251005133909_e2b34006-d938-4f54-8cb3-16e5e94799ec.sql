-- Adicionar coluna CPF à tabela de pacientes
ALTER TABLE public.patients 
ADD COLUMN cpf TEXT;