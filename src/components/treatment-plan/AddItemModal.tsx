import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatmentPlanId: string;
  onSuccess: () => void;
}

export const AddItemModal = ({
  isOpen,
  onClose,
  treatmentPlanId,
  onSuccess,
}: AddItemModalProps) => {
  const { toast } = useToast();
  const [treatmentId, setTreatmentId] = useState<string>("");
  const [toothNumber, setToothNumber] = useState<string>("");
  const [procedureDescription, setProcedureDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [priority, setPriority] = useState("1");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: treatments } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .order('treatment_name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleTreatmentChange = (value: string) => {
    setTreatmentId(value);
    const treatment = treatments?.find(t => t.id === value);
    if (treatment) {
      setProcedureDescription(treatment.treatment_name);
      if (treatment.cost) {
        setEstimatedCost(treatment.cost.toString());
      }
    }
  };

  const handleSubmit = async () => {
    if (!procedureDescription.trim()) {
      toast({
        title: "Erro",
        description: "Informe a descrição do procedimento.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('treatment_plan_items')
        .insert({
          treatment_plan_id: treatmentPlanId,
          treatment_id: treatmentId || null,
          tooth_number: toothNumber ? parseInt(toothNumber) : null,
          procedure_description: procedureDescription,
          estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
          priority: parseInt(priority),
          notes: notes || null,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Procedimento adicionado",
        description: "O procedimento foi adicionado ao plano de tratamento.",
      });

      onSuccess();
      handleClose();
    } catch (error) {
      logger.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o procedimento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTreatmentId("");
    setToothNumber("");
    setProcedureDescription("");
    setEstimatedCost("");
    setPriority("1");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Procedimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tratamento (opcional)</Label>
            <Select value={treatmentId} onValueChange={handleTreatmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tratamento cadastrado" />
              </SelectTrigger>
              <SelectContent>
                {treatments?.map((treatment) => (
                  <SelectItem key={treatment.id} value={treatment.id}>
                    {treatment.treatment_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição do Procedimento *</Label>
            <Input
              value={procedureDescription}
              onChange={(e) => setProcedureDescription(e.target.value)}
              placeholder="Ex: Restauração em resina composta"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dente (opcional)</Label>
              <Input
                type="number"
                value={toothNumber}
                onChange={(e) => setToothNumber(e.target.value)}
                placeholder="Ex: 18"
                min="11"
                max="85"
              />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Normal</SelectItem>
                  <SelectItem value="2">Alta</SelectItem>
                  <SelectItem value="3">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Custo Estimado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o procedimento..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};