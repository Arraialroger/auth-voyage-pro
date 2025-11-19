-- Add professional registry and clinic information fields to professionals table
ALTER TABLE public.professionals
ADD COLUMN professional_registry TEXT,
ADD COLUMN registry_uf TEXT,
ADD COLUMN clinic_name TEXT,
ADD COLUMN clinic_address TEXT,
ADD COLUMN clinic_phone TEXT,
ADD COLUMN clinic_cnpj TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.professionals.professional_registry IS 'Número do registro profissional (CRO, CRM, etc.)';
COMMENT ON COLUMN public.professionals.registry_uf IS 'UF do registro profissional';
COMMENT ON COLUMN public.professionals.clinic_name IS 'Nome da clínica onde o profissional atua';
COMMENT ON COLUMN public.professionals.clinic_address IS 'Endereço completo da clínica';
COMMENT ON COLUMN public.professionals.clinic_phone IS 'Telefone de contato da clínica';
COMMENT ON COLUMN public.professionals.clinic_cnpj IS 'CNPJ da clínica (opcional)';

-- Create index for registry lookup
CREATE INDEX idx_professionals_registry ON public.professionals(professional_registry) WHERE professional_registry IS NOT NULL;