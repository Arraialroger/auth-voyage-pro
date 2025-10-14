-- Adicionar coluna treatment_id à tabela waiting_list
ALTER TABLE public.waiting_list 
ADD COLUMN treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL;

-- Adicionar índice para melhor performance
CREATE INDEX idx_waiting_list_treatment_id ON public.waiting_list(treatment_id);

-- Comentário para documentação
COMMENT ON COLUMN public.waiting_list.treatment_id IS 'Tratamento desejado pelo paciente';