import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { statusLabels } from "@/lib/toothUtils";
import { Database } from "@/integrations/supabase/types";
import { ToothFaceSelector } from "./ToothFaceSelector";

type ToothStatusEnum = Database["public"]["Enums"]["tooth_status_enum"];
type ToothFaceEnum = Database["public"]["Enums"]["tooth_face_enum"];

interface Procedure {
  id: string;
  tooth_number: number;
  procedure_type: string;
  procedure_date: string;
  status_before: ToothStatusEnum | null;
  status_after: ToothStatusEnum;
  faces: ToothFaceEnum[] | null;
  material_used: string | null;
  notes: string | null;
  status: string | null;
}

interface EditProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedure: Procedure | null;
  patientId: string;
}

// ID do tratamento de bloqueio (excluir da lista)
const BLOCK_TREATMENT_ID = "00000000-0000-0000-0000-000000000002";

export const EditProcedureModal = ({
  isOpen,
  onClose,
  procedure,
  patientId,
}: EditProcedureModalProps) => {
  const queryClient = useQueryClient();

  const [procedureType, setProcedureType] = useState(procedure?.procedure_type || "");
  const [statusAfter, setStatusAfter] = useState<ToothStatusEnum>(procedure?.status_after || "higido");
  const [selectedFaces, setSelectedFaces] = useState<ToothFaceEnum[]>(procedure?.faces || []);
  const [materialUsed, setMaterialUsed] = useState(procedure?.material_used || "");
  const [notes, setNotes] = useState(procedure?.notes || "");

  // Buscar tratamentos do banco de dados
  const { data: treatments } = useQuery({
    queryKey: ["treatments-for-odontogram"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatments")
        .select("id, treatment_name")
        .neq("id", BLOCK_TREATMENT_ID)
        .order("treatment_name");
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Reset form when procedure changes
  useState(() => {
    if (procedure) {
      setProcedureType(procedure.procedure_type);
      setStatusAfter(procedure.status_after);
      setSelectedFaces(procedure.faces || []);
      setMaterialUsed(procedure.material_used || "");
      setNotes(procedure.notes || "");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!procedure) throw new Error("Procedimento não encontrado");

      const { error } = await supabase
        .from("tooth_procedures")
        .update({
          procedure_type: procedureType,
          status_after: statusAfter,
          faces: selectedFaces.length > 0 ? selectedFaces : null,
          material_used: materialUsed || null,
          notes: notes || null,
        })
        .eq("id", procedure.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tooth-procedures", patientId] });
      toast.success("Procedimento atualizado com sucesso");
      onClose();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar procedimento: " + error.message);
    },
  });

  const toggleFace = (face: ToothFaceEnum) => {
    setSelectedFaces((prev) =>
      prev.includes(face) ? prev.filter((f) => f !== face) : [...prev, face]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedureType) {
      toast.error("Selecione o tipo de procedimento");
      return;
    }
    updateMutation.mutate();
  };

  if (!procedure) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Procedimento - Dente {procedure.tooth_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Procedimento</Label>
            <Select value={procedureType} onValueChange={setProcedureType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                {treatments?.map((t) => (
                  <SelectItem key={t.id} value={t.treatment_name}>
                    {t.treatment_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status Após Procedimento</Label>
            <Select value={statusAfter} onValueChange={(v) => setStatusAfter(v as ToothStatusEnum)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Faces Afetadas</Label>
            <ToothFaceSelector
              selectedFaces={selectedFaces}
              onFaceToggle={(face) => toggleFace(face as ToothFaceEnum)}
              toothNumber={procedure.tooth_number}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material">Material Utilizado</Label>
            <Input
              id="material"
              value={materialUsed}
              onChange={(e) => setMaterialUsed(e.target.value)}
              placeholder="Ex: Resina composta"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
