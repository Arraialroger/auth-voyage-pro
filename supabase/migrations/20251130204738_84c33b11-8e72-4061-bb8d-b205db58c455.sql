-- Create block_type enum if not exists
DO $$ BEGIN
  CREATE TYPE block_type_enum AS ENUM ('full_day', 'morning', 'afternoon', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create time_blocks table
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  reason text,
  block_type block_type_enum NOT NULL DEFAULT 'custom',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_professional_id ON public.time_blocks(professional_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_start_time ON public.time_blocks(start_time);
CREATE INDEX IF NOT EXISTS idx_time_blocks_end_time ON public.time_blocks(end_time);

-- Enable RLS
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Receptionists can manage all blocks
CREATE POLICY "Recepcionistas podem ver todos os bloqueios"
ON public.time_blocks FOR SELECT
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem criar bloqueios"
ON public.time_blocks FOR INSERT
WITH CHECK (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem editar bloqueios"
ON public.time_blocks FOR UPDATE
USING (is_receptionist(auth.uid()));

CREATE POLICY "Recepcionistas podem deletar bloqueios"
ON public.time_blocks FOR DELETE
USING (is_receptionist(auth.uid()));

-- RLS Policies: Professionals can manage their own blocks
CREATE POLICY "Profissionais podem ver seus bloqueios"
ON public.time_blocks FOR SELECT
USING (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()));

CREATE POLICY "Profissionais podem criar seus bloqueios"
ON public.time_blocks FOR INSERT
WITH CHECK (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()));

CREATE POLICY "Profissionais podem editar seus bloqueios"
ON public.time_blocks FOR UPDATE
USING (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()));

CREATE POLICY "Profissionais podem deletar seus bloqueios"
ON public.time_blocks FOR DELETE
USING (is_professional(auth.uid()) AND professional_id = get_professional_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_time_blocks_updated_at
  BEFORE UPDATE ON public.time_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();