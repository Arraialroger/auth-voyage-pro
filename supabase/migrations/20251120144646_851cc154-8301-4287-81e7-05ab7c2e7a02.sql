-- Remove unused n8n_chat_histories table and its policies
-- This table was not being used in the application and can be recreated
-- in the future when AI features are implemented

-- Drop RLS policies first
DROP POLICY IF EXISTS "Usuários podem criar suas conversas" ON public.n8n_chat_histories;
DROP POLICY IF EXISTS "Usuários veem apenas suas próprias conversas" ON public.n8n_chat_histories;

-- Drop the sequence if exists
DROP SEQUENCE IF EXISTS public.n8n_chat_histories_id_seq CASCADE;

-- Drop the table
DROP TABLE IF EXISTS public.n8n_chat_histories;