
-- Remove a foreign key constraint problemática se existir
ALTER TABLE public.professionals 
DROP CONSTRAINT IF EXISTS professionals_user_id_fkey;

-- Adiciona a foreign key constraint correta referenciando auth.users
ALTER TABLE public.professionals
ADD CONSTRAINT professionals_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Adiciona índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_professionals_user_id 
ON public.professionals(user_id);
