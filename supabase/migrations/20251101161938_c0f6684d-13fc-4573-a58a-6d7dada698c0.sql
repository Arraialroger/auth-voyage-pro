-- Adicionar coluna de telefone de contato aos profissionais
ALTER TABLE public.professionals 
ADD COLUMN contact_phone TEXT;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.professionals.contact_phone IS 'Telefone de contato do profissional';