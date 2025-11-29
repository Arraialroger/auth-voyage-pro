-- Fase 1: Sincronização Bidirecional do Odontograma
-- Risco: 2/10 | Reversibilidade: 100%

-- 1. Adicionar campo status à tabela tooth_procedures
ALTER TABLE public.tooth_procedures 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Criar constraint para validar valores permitidos
ALTER TABLE public.tooth_procedures 
ADD CONSTRAINT tooth_procedures_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed'));

-- 3. Criar índice para performance em buscas por status
CREATE INDEX IF NOT EXISTS idx_tooth_procedures_status 
ON public.tooth_procedures(status);

-- 4. Criar função de sincronização bidirecional
-- Quando treatment_plan_item é marcado como 'completed':
-- - Atualiza odontogram_records.status baseado no tipo de procedimento
-- - Marca tooth_procedures.status como 'completed'
CREATE OR REPLACE FUNCTION public.sync_plan_completion_to_odontogram()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_new_tooth_status tooth_status_enum;
BEGIN
  -- Só executa quando status muda para 'completed' e tem dente associado
  IF NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NEW.tooth_number IS NOT NULL THEN
    
    -- Buscar patient_id do plano de tratamento
    SELECT patient_id INTO v_patient_id
    FROM public.treatment_plans 
    WHERE id = NEW.treatment_plan_id;
    
    -- Se não encontrou patient_id, não faz nada
    IF v_patient_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Determinar novo status do dente baseado no procedimento
    v_new_tooth_status := CASE 
      WHEN LOWER(NEW.procedure_description) LIKE '%restaura%' THEN 'obturado'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%obtura%' THEN 'obturado'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%extra%' THEN 'extraido'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%canal%' THEN 'tratamento_canal'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%endodont%' THEN 'tratamento_canal'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%coroa%' THEN 'coroa'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%prótese%' THEN 'coroa'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%implante%' THEN 'implante'::tooth_status_enum
      WHEN LOWER(NEW.procedure_description) LIKE '%fratur%' THEN 'fratura'::tooth_status_enum
      ELSE NULL -- Mantém status atual se não reconhecer
    END;
    
    -- 1. Atualizar odontogram_records se tiver novo status válido
    IF v_new_tooth_status IS NOT NULL THEN
      -- Usar upsert para criar ou atualizar registro
      INSERT INTO public.odontogram_records (patient_id, tooth_number, status, last_updated_at)
      VALUES (v_patient_id, NEW.tooth_number, v_new_tooth_status, NOW())
      ON CONFLICT (patient_id, tooth_number) 
      DO UPDATE SET 
        status = v_new_tooth_status,
        last_updated_at = NOW();
    END IF;
    
    -- 2. Marcar procedimentos relacionados como completed
    UPDATE public.tooth_procedures
    SET status = 'completed'
    WHERE patient_id = v_patient_id
      AND tooth_number = NEW.tooth_number
      AND status != 'completed';
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Criar trigger que dispara após UPDATE em treatment_plan_items
DROP TRIGGER IF EXISTS trigger_sync_plan_to_odontogram ON public.treatment_plan_items;

CREATE TRIGGER trigger_sync_plan_to_odontogram
AFTER UPDATE ON public.treatment_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_plan_completion_to_odontogram();