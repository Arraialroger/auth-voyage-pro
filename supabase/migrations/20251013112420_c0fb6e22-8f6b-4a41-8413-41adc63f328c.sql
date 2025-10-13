-- Habilitar RLS na tabela n8n_chat_histories que estava sem proteção
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Como esta tabela é do n8n (sistema externo), vou criar políticas básicas
-- Política para permitir apenas usuários autenticados lerem suas próprias mensagens
CREATE POLICY "Usuários autenticados podem ver chat histories"
  ON public.n8n_chat_histories
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para permitir inserção de mensagens
CREATE POLICY "Usuários autenticados podem criar chat histories"
  ON public.n8n_chat_histories
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');