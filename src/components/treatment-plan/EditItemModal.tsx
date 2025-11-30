import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { TreatmentPlanItem, TreatmentPlanItemStatus } from "@/types/treatment-plan";
import { isPostgresError, getErrorMessage } from "@/types/errors";

const editItemSchema = z.object({
  procedure_description: z.string().trim().min(3, "Descrição muito curta").max(500, "Descrição muito longa"),
  estimated_cost: z.number().min(0, "Custo não pode ser negativo").max(999999.99, "Valor muito alto"),
  notes: z.string().trim().max(1000, "Observações muito longas").optional(),
  status: z.enum(['pending', 'in_progress', 'awaiting_payment', 'completed', 'cancelled']),
});

interface EditItemModalProps {
  item: TreatmentPlanItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditItemModal({ item, open, onOpenChange, onUpdate }: EditItemModalProps) {
  const [procedureDescription, setProcedureDescription] = useState(item.procedure_description);
  const [estimatedCost, setEstimatedCost] = useState(item.estimated_cost?.toString() || "0");
  const [notes, setNotes] = useState(item.notes || "");
  const [status, setStatus] = useState<TreatmentPlanItemStatus>(item.status);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);

      const validatedData = editItemSchema.parse({
        procedure_description: procedureDescription,
        estimated_cost: parseFloat(estimatedCost),
        notes: notes || undefined,
        status: status,
      });

      const { error } = await supabase
        .from("treatment_plan_items")
        .update({
          procedure_description: validatedData.procedure_description,
          estimated_cost: validatedData.estimated_cost,
          notes: validatedData.notes || null,
          status: validatedData.status,
          completed_at: validatedData.status === 'completed' ? new Date().toISOString() : null,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Procedimento atualizado com sucesso");
      onUpdate();
      onOpenChange(false);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (isPostgresError(error)) {
        toast.error(getErrorMessage(error));
      } else {
        logger.error("Erro ao atualizar procedimento:", error);
        toast.error("Erro ao atualizar procedimento");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Procedimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição do Procedimento *</Label>
            <Textarea
              id="description"
              value={procedureDescription}
              onChange={(e) => setProcedureDescription(e.target.value)}
              placeholder="Ex: Restauração em resina composta"
              className="mt-1"
              maxLength={500}
            />
          </div>

          <div>
            <Label htmlFor="cost">Custo Estimado (R$) *</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              max="999999.99"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TreatmentPlanItemStatus)}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="awaiting_payment">Aguardando Pagamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais"
              className="mt-1"
              maxLength={1000}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
