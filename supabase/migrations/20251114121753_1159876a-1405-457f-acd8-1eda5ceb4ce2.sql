-- =====================================================
-- FASE 1: Integração Plano de Tratamento ↔ Agendamentos
-- Preparado para módulo financeiro futuro
-- =====================================================

-- 1. Adicionar campo de vínculo em appointments
ALTER TABLE public.appointments
ADD COLUMN treatment_plan_item_id UUID REFERENCES public.treatment_plan_items(id) ON DELETE SET NULL;

-- 2. Adicionar campos de vínculo e agendamento em treatment_plan_items
ALTER TABLE public.treatment_plan_items
ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
ADD COLUMN scheduled_date TIMESTAMP WITH TIME ZONE;

-- 3. Criar índices para performance
CREATE INDEX idx_appointments_treatment_plan_item ON public.appointments(treatment_plan_item_id);
CREATE INDEX idx_treatment_plan_items_appointment ON public.treatment_plan_items(appointment_id);
CREATE INDEX idx_treatment_plan_items_scheduled_date ON public.treatment_plan_items(scheduled_date);

-- 4. Criar função para sincronizar status quando consulta for concluída
CREATE OR REPLACE FUNCTION public.sync_appointment_completion_to_plan_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um agendamento é marcado como 'Completed' e está vinculado a um item do plano
  IF NEW.status = 'Completed' AND NEW.treatment_plan_item_id IS NOT NULL THEN
    -- Atualiza o item do plano para 'completed'
    UPDATE public.treatment_plan_items
    SET 
      status = 'completed',
      completed_at = NEW.appointment_end_time
    WHERE id = NEW.treatment_plan_item_id
      AND status != 'completed'; -- Só atualiza se ainda não estiver concluído
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Criar trigger para executar a sincronização
CREATE TRIGGER trigger_sync_appointment_to_plan_item
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'Completed' AND NEW.treatment_plan_item_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_appointment_completion_to_plan_item();

-- 6. Comentários explicativos para campos futuros (módulo financeiro)
COMMENT ON COLUMN public.treatment_plan_items.estimated_cost IS 'Custo estimado do procedimento. Será integrado com módulo financeiro no futuro.';
COMMENT ON COLUMN public.treatment_plan_items.completed_at IS 'Data de conclusão. Será usado para calcular faturamento no módulo financeiro.';
COMMENT ON COLUMN public.treatment_plan_items.appointment_id IS 'Vínculo com agendamento. Será usado para rastreabilidade financeira.';

-- 7. Adicionar constraint para garantir consistência bidirecional (opcional, mas recomendado)
-- Nota: Isso garante que se um appointment tem treatment_plan_item_id, 
-- o item correspondente deve ter o appointment_id de volta
COMMENT ON COLUMN public.appointments.treatment_plan_item_id IS 'Vínculo com item do plano de tratamento. Usado para rastreabilidade e sincronização de status.';

-- =====================================================
-- CAMPOS PREPARADOS PARA MÓDULO FINANCEIRO FUTURO
-- (comentados para referência, não implementados ainda)
-- =====================================================
-- 
-- ALTER TABLE public.treatment_plan_items
-- ADD COLUMN paid_amount NUMERIC(10,2) DEFAULT 0,
-- ADD COLUMN payment_status payment_status_enum DEFAULT 'pending';
--
-- ALTER TABLE public.appointments  
-- ADD COLUMN payment_amount NUMERIC(10,2),
-- ADD COLUMN payment_method payment_method_enum,
-- ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;
--
-- =====================================================