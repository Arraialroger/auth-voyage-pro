-- Create enum for block types
CREATE TYPE public.block_type_enum AS ENUM (
  'full_day',
  'morning', 
  'afternoon',
  'custom'
);

-- Create time_blocks table
CREATE TABLE public.time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  block_type block_type_enum NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Receptionists can view all time blocks
CREATE POLICY "Recepcionistas podem ver todos os bloqueios"
  ON public.time_blocks
  FOR SELECT
  TO authenticated
  USING (is_receptionist(auth.uid()));

-- RLS Policy: Receptionists can create time blocks
CREATE POLICY "Recepcionistas podem criar bloqueios"
  ON public.time_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (is_receptionist(auth.uid()));

-- RLS Policy: Receptionists can update time blocks
CREATE POLICY "Recepcionistas podem editar bloqueios"
  ON public.time_blocks
  FOR UPDATE
  TO authenticated
  USING (is_receptionist(auth.uid()));

-- RLS Policy: Receptionists can delete time blocks
CREATE POLICY "Recepcionistas podem deletar bloqueios"
  ON public.time_blocks
  FOR DELETE
  TO authenticated
  USING (is_receptionist(auth.uid()));

-- RLS Policy: Professionals can view their own time blocks
CREATE POLICY "Profissionais podem ver seus bloqueios"
  ON public.time_blocks
  FOR SELECT
  TO authenticated
  USING (
    is_professional(auth.uid()) AND 
    professional_id = get_professional_id(auth.uid())
  );

-- RLS Policy: Professionals can create their own time blocks
CREATE POLICY "Profissionais podem criar seus bloqueios"
  ON public.time_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_professional(auth.uid()) AND 
    professional_id = get_professional_id(auth.uid())
  );

-- RLS Policy: Professionals can update their own time blocks
CREATE POLICY "Profissionais podem editar seus bloqueios"
  ON public.time_blocks
  FOR UPDATE
  TO authenticated
  USING (
    is_professional(auth.uid()) AND 
    professional_id = get_professional_id(auth.uid())
  );

-- RLS Policy: Professionals can delete their own time blocks
CREATE POLICY "Profissionais podem deletar seus bloqueios"
  ON public.time_blocks
  FOR DELETE
  TO authenticated
  USING (
    is_professional(auth.uid()) AND 
    professional_id = get_professional_id(auth.uid())
  );

-- Create indexes for performance
CREATE INDEX idx_time_blocks_professional_id ON public.time_blocks(professional_id);
CREATE INDEX idx_time_blocks_start_time ON public.time_blocks(start_time);
CREATE INDEX idx_time_blocks_end_time ON public.time_blocks(end_time);
CREATE INDEX idx_time_blocks_time_range ON public.time_blocks(professional_id, start_time, end_time);

-- Add trigger for updated_at
CREATE TRIGGER update_time_blocks_updated_at
  BEFORE UPDATE ON public.time_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for time_blocks
ALTER TABLE public.time_blocks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_blocks;