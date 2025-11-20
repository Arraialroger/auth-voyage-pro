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

const editItemSchema = z.object({
  procedure_description: z.string().trim().min(3, "Descrição muito curta").max(500, "Descrição muito longa"),
  tooth_number: z.number().int().min(1, "Número inválido").max(48, "Número inválido").nullable(),
  estimated_cost: z.number().min(0, "Custo não pode ser negativo").max(999999.99, "Valor muito alto"),
  priority: z.number().int().min(1, "Prioridade mínima é 1").max(10, "Prioridade máxima é 10"),
  notes: z.string().trim().max(1000, "Observações muito longas").optional(),
});

interface EditItemModalProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditItemModal({ item, open, onOpenChange, onUpdate }: EditItemModalProps) {
  const [procedureDescription, setProcedureDescription] = useState(item.procedure_description);
  const [toothNumber, setToothNumber] = useState(item.tooth_number?.toString() || "");
  const [estimatedCost, setEstimatedCost] = useState(item.estimated_cost?.toString() || "0");
  const [priority, setPriority] = useState(item.priority?.toString() || "1");
  const [notes, setNotes] = useState(item.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validação dos dados
      const validatedData = editItemSchema.parse({
        procedure_description: procedureDescription,
        tooth_number: toothNumber ? parseInt(toothNumber) : null,
        estimated_cost: parseFloat(estimatedCost),
        priority: parseInt(priority),
        notes: notes || undefined,
      });

      const { error } = await supabase
        .from("treatment_plan_items")
        .update({
          procedure_description: validatedData.procedure_description,
          tooth_number: validatedData.tooth_number,
          estimated_cost: validatedData.estimated_cost,
          priority: validatedData.priority,
          notes: validatedData.notes || null,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Procedimento atualizado com sucesso");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
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
            <Label htmlFor="tooth">Dente (opcional)</Label>
            <Input
              id="tooth"
              type="number"
              min="1"
              max="48"
              value={toothNumber}
              onChange={(e) => setToothNumber(e.target.value)}
              placeholder="Ex: 16"
              className="mt-1"
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
            <Label htmlFor="priority">Prioridade *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Baixa</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3 - Média</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5 - Alta</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="7">7</SelectItem>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="9">9</SelectItem>
                <SelectItem value="10">10 - Urgente</SelectItem>
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
