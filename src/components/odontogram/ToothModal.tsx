import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Save, FileText, Plus, Info, MapPin } from "lucide-react";
import { getToothInfo, getStatusLabel } from "@/lib/toothUtils";
import { ToothFaceSelector } from "./ToothFaceSelector";

interface ToothModalProps {
  isOpen: boolean;
  onClose: () => void;
  toothNumber: number;
  patientId: string;
  currentStatus: string;
  onSuccess: () => void;
}

const statusOptions = [
  { value: "higido", label: "Hígido" },
  { value: "cariado", label: "Cariado" },
  { value: "obturado", label: "Obturado" },
  { value: "extraido", label: "Extraído" },
  { value: "tratamento_canal", label: "Tratamento de Canal" },
  { value: "coroa", label: "Coroa" },
  { value: "implante", label: "Implante" },
  { value: "ausente", label: "Ausente" },
  { value: "fratura", label: "Fratura" },
];

// ID do tratamento de bloqueio (excluir da lista)
const BLOCK_TREATMENT_ID = "00000000-0000-0000-0000-000000000002";

export const ToothModal = ({
  isOpen,
  onClose,
  toothNumber,
  patientId,
  currentStatus,
  onSuccess,
}: ToothModalProps) => {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [procedureType, setProcedureType] = useState("");
  const [notes, setNotes] = useState("");
  const [materialUsed, setMaterialUsed] = useState("");
  const [selectedFaces, setSelectedFaces] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [addToPlan, setAddToPlan] = useState(true);
  const [planItemStatus, setPlanItemStatus] = useState<"completed" | "pending" | "in_progress">("pending");
  const [priority, setPriority] = useState("1");
  const [currentBudgetName, setCurrentBudgetName] = useState<string | null>(null);

  const toothInfo = getToothInfo(toothNumber);

  // Reset form when modal opens with new tooth
  useEffect(() => {
    if (isOpen) {
      setNewStatus(currentStatus);
      setProcedureType("");
      setNotes("");
      setMaterialUsed("");
      setSelectedFaces([]);
      setEstimatedCost("");
      setPlanItemStatus("pending");
      setPriority("1");
    }
  }, [isOpen, toothNumber, currentStatus]);

  // Buscar tratamentos do banco de dados
  const { data: treatments } = useQuery({
    queryKey: ["treatments-for-odontogram"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatments")
        .select("id, treatment_name, cost")
        .neq("id", BLOCK_TREATMENT_ID)
        .order("treatment_name");
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Auto-preencher custo quando selecionar tratamento
  useEffect(() => {
    if (procedureType && treatments) {
      const selectedTreatment = treatments.find(t => t.treatment_name === procedureType);
      if (selectedTreatment?.cost && !estimatedCost) {
        setEstimatedCost(selectedTreatment.cost.toString());
      }
    }
  }, [procedureType, treatments]);

  // Buscar orçamentos do paciente (planos com título começando com "Orçamento")
  const { data: budgetPlans, refetch: refetchBudgets } = useQuery({
    queryKey: ["budget-plans", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_plans")
        .select("id, title, status, created_at")
        .eq("patient_id", patientId)
        .ilike("title", "Orçamento%")
        .in("status", ["awaiting_payment", "approved", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Atualizar nome do orçamento atual quando carregar
  useEffect(() => {
    if (budgetPlans && budgetPlans.length > 0) {
      setCurrentBudgetName(budgetPlans[0].title);
    } else {
      setCurrentBudgetName(null);
    }
  }, [budgetPlans]);

  // Função para obter ou criar orçamento
  const getOrCreateBudget = async (professionalId: string): Promise<string> => {
    // Buscar orçamento existente mais recente
    if (budgetPlans && budgetPlans.length > 0) {
      return budgetPlans[0].id;
    }

    // Criar novo orçamento automaticamente
    const { data: newPlan, error } = await supabase
      .from("treatment_plans")
      .insert({
        patient_id: patientId,
        professional_id: professionalId,
        title: "Orçamento",
        status: "awaiting_payment",
      })
      .select("id")
      .single();

    if (error) throw error;
    return newPlan.id;
  };

  // Criar novo orçamento (Opção B - múltiplos)
  const handleCreateNewBudget = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!professional) {
        toast.error("Profissional não encontrado");
        return;
      }

      // Determinar próximo número do orçamento
      const existingCount = budgetPlans?.length || 0;
      const newTitle = existingCount === 0 ? "Orçamento" : `Orçamento ${existingCount + 1}`;

      const { error } = await supabase
        .from("treatment_plans")
        .insert({
          patient_id: patientId,
          professional_id: professional.id,
          title: newTitle,
          status: "awaiting_payment",
        });

      if (error) throw error;

      await refetchBudgets();
      toast.success(`${newTitle} criado!`);
    } catch (error) {
      logger.error("Erro ao criar orçamento:", error);
      toast.error("Erro ao criar orçamento");
    }
  };

  const handleSave = async () => {
    if (!procedureType.trim()) {
      toast.error("Informe o tipo de procedimento");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Buscar professional_id se for profissional
      let professionalId = null;
      if (user) {
        const { data: professional } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", user.id)
          .single();
        professionalId = professional?.id;
      }

      if (!professionalId) {
        toast.error("Profissional não encontrado");
        setSaving(false);
        return;
      }

      // Atualizar ou criar registro do odontograma
      const { error: odontogramError } = await supabase.from("odontogram_records").upsert(
        {
          patient_id: patientId,
          tooth_number: toothNumber,
          status: newStatus as any,
          notes,
          last_updated_by: user?.id,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: "patient_id,tooth_number" }
      );

      if (odontogramError) throw odontogramError;

      // Registrar procedimento com status
      const { error: procedureError } = await supabase.from("tooth_procedures").insert({
        patient_id: patientId,
        tooth_number: toothNumber,
        procedure_type: procedureType,
        professional_id: professionalId,
        notes,
        faces: selectedFaces as any,
        material_used: materialUsed || null,
        status_before: currentStatus as any,
        status_after: newStatus as any,
        status: planItemStatus,
      });

      if (procedureError) throw procedureError;

      // Adicionar ao orçamento se selecionado
      if (addToPlan) {
        const planId = await getOrCreateBudget(professionalId);
        
        const facesText = selectedFaces.length > 0 ? ` (${selectedFaces.map(f => f.charAt(0).toUpperCase()).join(", ")})` : "";
        const procedureDescription = `${procedureType} - Dente ${toothNumber}${facesText}`;

        const { error: planItemError } = await supabase.from("treatment_plan_items").insert({
          treatment_plan_id: planId,
          tooth_number: toothNumber,
          procedure_description: procedureDescription,
          estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
          status: planItemStatus,
          priority: parseInt(priority),
          notes: notes || null,
          completed_at: planItemStatus === "completed" ? new Date().toISOString() : null,
        });

        if (planItemError) throw planItemError;

        await refetchBudgets();
        toast.success("Diagnóstico registrado e adicionado ao orçamento!");
      } else {
        toast.success("Diagnóstico registrado com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (error) {
      logger.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setSaving(false);
    }
  };

  const handleFaceToggle = (face: string) => {
    setSelectedFaces((prev) => 
      prev.includes(face) ? prev.filter((f) => f !== face) : [...prev, face]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            🦷 Dente {toothNumber} - {toothInfo.name}
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{toothInfo.quadrantLabel}</span>
            <Badge variant="outline" className="text-xs">{toothInfo.typeLabel}</Badge>
            <Badge variant="secondary" className="text-xs">
              {getStatusLabel(currentStatus)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seleção Visual de Faces */}
          <div>
            <Label className="mb-2 block text-center">Selecione as Faces Afetadas</Label>
            <ToothFaceSelector
              selectedFaces={selectedFaces}
              onFaceToggle={handleFaceToggle}
              toothNumber={toothNumber}
            />
          </div>

          <Separator />

          {/* Procedimento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Procedimento *</Label>
              <Select value={procedureType} onValueChange={setProcedureType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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

            <div>
              <Label>Status do Dente</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Material e Notas */}
          <div>
            <Label>Material Utilizado</Label>
            <Input
              value={materialUsed}
              onChange={(e) => setMaterialUsed(e.target.value)}
              placeholder="Ex: Resina composta, Amálgama..."
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre o procedimento..."
              rows={2}
            />
          </div>

          <Separator />

          {/* Integração com Orçamento - Simplificada */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="add-to-plan"
                  checked={addToPlan}
                  onCheckedChange={(checked) => setAddToPlan(checked as boolean)}
                />
                <Label htmlFor="add-to-plan" className="cursor-pointer flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Adicionar ao Orçamento
                </Label>
              </div>
              {budgetPlans && budgetPlans.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCreateNewBudget}
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Novo Orçamento
                </Button>
              )}
            </div>

            {addToPlan && (
              <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                {/* Indicador do orçamento atual */}
                <Alert className="bg-muted/50 py-2">
                  <Info className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    {currentBudgetName 
                      ? `Será adicionado ao "${currentBudgetName}"`
                      : "Um novo Orçamento será criado automaticamente"
                    }
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Status *</Label>
                    <Select value={planItemStatus} onValueChange={(v: any) => setPlanItemStatus(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">⏳ Pendente</SelectItem>
                        <SelectItem value="in_progress">🔄 Em Andamento</SelectItem>
                        <SelectItem value="awaiting_payment">💰 Aguardando Pagamento</SelectItem>
                        <SelectItem value="completed">✅ Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Prioridade</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Baixa</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3 - Média</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5 - Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Custo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {planItemStatus !== "pending" && (
                  <Alert className="bg-muted/50 py-2">
                    <Info className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      {planItemStatus === "completed" 
                        ? "Procedimento já realizado - será marcado como concluído"
                        : "Procedimento em andamento - precisa de retorno"
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Registrar Diagnóstico"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
