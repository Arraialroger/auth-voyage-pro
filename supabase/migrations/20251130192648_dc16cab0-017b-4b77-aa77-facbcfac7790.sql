-- Corrigir trigger para respeitar status 'awaiting_payment' em orçamentos
CREATE OR REPLACE FUNCTION public.update_treatment_plan_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  plan_id uuid;
  total_items integer;
  completed_items integer;
  pending_items integer;
  in_progress_items integer;
  current_status treatment_plan_status_enum;
  new_status treatment_plan_status_enum;
BEGIN
  -- Determina qual plano foi afetado
  IF TG_OP = 'DELETE' THEN
    plan_id := OLD.treatment_plan_id;
  ELSE
    plan_id := NEW.treatment_plan_id;
  END IF;

  -- Busca status atual do plano
  SELECT status INTO current_status
  FROM public.treatment_plans
  WHERE id = plan_id;

  -- Conta o total de itens e quantos estão em cada status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'in_progress')
  INTO total_items, completed_items, pending_items, in_progress_items
  FROM public.treatment_plan_items
  WHERE treatment_plan_id = plan_id;

  -- Determina o novo status do plano
  IF total_items = 0 THEN
    -- Se não há itens, mantém status atual
    new_status := current_status;
  ELSIF completed_items = total_items THEN
    -- Se todos os itens estão concluídos, marca plano como completed
    new_status := 'completed';
  ELSIF in_progress_items > 0 THEN
    -- Se há itens em andamento, plano em andamento
    new_status := 'in_progress';
  ELSIF pending_items > 0 THEN
    -- Se há itens pendentes, verificar status atual
    -- Manter awaiting_payment se esse for o status atual (orçamento não aprovado)
    IF current_status = 'awaiting_payment' THEN
      new_status := 'awaiting_payment';
    ELSE
      new_status := 'in_progress';
    END IF;
  ELSE
    -- Fallback: mantém status atual
    new_status := current_status;
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
$function$;