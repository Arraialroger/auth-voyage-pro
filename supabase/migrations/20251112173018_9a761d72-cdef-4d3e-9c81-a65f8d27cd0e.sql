-- Função que recalcula o custo total do plano de tratamento
CREATE OR REPLACE FUNCTION public.update_treatment_plan_total_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_id uuid;
  new_total numeric;
BEGIN
  -- Determina qual plano foi afetado
  IF TG_OP = 'DELETE' THEN
    plan_id := OLD.treatment_plan_id;
  ELSE
    plan_id := NEW.treatment_plan_id;
  END IF;

  -- Calcula o novo total somando todos os itens do plano
  SELECT COALESCE(SUM(estimated_cost), 0)
  INTO new_total
  FROM public.treatment_plan_items
  WHERE treatment_plan_id = plan_id;

  -- Atualiza o custo total no plano de tratamento
  UPDATE public.treatment_plans
  SET total_cost = new_total
  WHERE id = plan_id;

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger que executa após INSERT, UPDATE ou DELETE em treatment_plan_items
CREATE TRIGGER trigger_update_treatment_plan_total_cost
AFTER INSERT OR UPDATE OF estimated_cost OR DELETE
ON public.treatment_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_treatment_plan_total_cost();