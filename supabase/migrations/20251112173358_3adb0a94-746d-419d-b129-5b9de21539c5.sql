-- Função que atualiza automaticamente o status do plano de tratamento
CREATE OR REPLACE FUNCTION public.update_treatment_plan_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_id uuid;
  total_items integer;
  completed_items integer;
  pending_items integer;
  new_status treatment_plan_status_enum;
BEGIN
  -- Determina qual plano foi afetado
  IF TG_OP = 'DELETE' THEN
    plan_id := OLD.treatment_plan_id;
  ELSE
    plan_id := NEW.treatment_plan_id;
  END IF;

  -- Conta o total de itens e quantos estão concluídos
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress'))
  INTO total_items, completed_items, pending_items
  FROM public.treatment_plan_items
  WHERE treatment_plan_id = plan_id;

  -- Determina o novo status do plano
  IF total_items = 0 THEN
    -- Se não há itens, mantém como draft ou status atual
    new_status := (SELECT status FROM public.treatment_plans WHERE id = plan_id);
  ELSIF completed_items = total_items THEN
    -- Se todos os itens estão concluídos, marca plano como completed
    new_status := 'completed';
  ELSIF pending_items > 0 OR completed_items > 0 THEN
    -- Se há itens pendentes ou em progresso, marca como in_progress
    new_status := 'in_progress';
  ELSE
    -- Fallback: mantém status atual
    new_status := (SELECT status FROM public.treatment_plans WHERE id = plan_id);
  END IF;

  -- Atualiza o status do plano
  UPDATE public.treatment_plans
  SET status = new_status
  WHERE id = plan_id;

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger que executa após mudanças nos itens do plano
CREATE TRIGGER trigger_update_treatment_plan_status
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.treatment_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_treatment_plan_status();