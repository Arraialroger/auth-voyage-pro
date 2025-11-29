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
import { CreateTreatmentPlanModal } from "@/components/treatment-plan/CreateTreatmentPlanModal";

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

const procedureOptions = [
  { value: "exame", label: "Exame Inicial" },
  { value: "restauracao", label: "Restauração" },
  { value: "extracao", label: "Extração" },
  { value: "canal", label: "Tratamento de Canal" },
  { value: "limpeza", label: "Limpeza" },
  { value: "limpeza_tartaro", label: "Limpeza de Tártaro" },
  { value: "clareamento", label: "Clareamento" },
  { value: "coroa", label: "Instalação de Coroa" },
  { value: "implante", label: "Implante" },
  { value: "outro", label: "Outro" },
];

const faceOptions = [
  { value: "oclusal", label: "O", fullLabel: "Oclusal" },
  { value: "mesial", label: "M", fullLabel: "Mesial" },
  { value: "distal", label: "D", fullLabel: "Distal" },
  { value: "vestibular", label: "V", fullLabel: "Vestibular" },
  { value: "lingual", label: "L", fullLabel: "Lingual/Palatina" },
];

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
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [addToPlan, setAddToPlan] = useState(true); // MARCADO POR PADRÃO
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [planItemStatus, setPlanItemStatus] = useState<"completed" | "pending" | "in_progress">("pending");

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
      // Manter addToPlan true e selectedPlanId se já selecionado
    }
  }, [isOpen, toothNumber, currentStatus]);

  // Buscar planos de tratamento do paciente
  const { data: treatmentPlans, refetch: refetchPlans } = useQuery({
    queryKey: ["treatment-plans-active", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_plans")
        .select("id, title, status, created_at, professional:professionals(full_name)")
        .eq("patient_id", patientId)
        .in("status", ["draft", "approved", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Auto-select first plan if available and none selected
  useEffect(() => {
    if (treatmentPlans && treatmentPlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(treatmentPlans[0].id);
    }
  }, [treatmentPlans, selectedPlanId]);

  const handleSave = async () => {
    if (!procedureType.trim()) {
      toast.error("Informe o tipo de procedimento");
      return;
    }

    if (addToPlan && !selectedPlanId) {
      toast.error("Selecione um plano de tratamento ou desmarque a opção");
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
      const procedureLabel = procedureOptions.find(p => p.value === procedureType)?.label || procedureType;
      
      const { error: procedureError } = await supabase.from("tooth_procedures").insert({
        patient_id: patientId,
        tooth_number: toothNumber,
        procedure_type: procedureLabel,
        professional_id: professionalId,
        notes,
        faces: selectedFaces as any,
        material_used: materialUsed || null,
        status_before: currentStatus as any,
        status_after: newStatus as any,
        status: planItemStatus, // Novo campo de status do procedimento
      });

      if (procedureError) throw procedureError;

      // Adicionar ao plano de tratamento se selecionado
      if (addToPlan && selectedPlanId) {
        const facesText = selectedFaces.length > 0 ? ` (${selectedFaces.map(f => f.charAt(0).toUpperCase()).join(", ")})` : "";
        const procedureDescription = `${procedureLabel} - Dente ${toothNumber}${facesText}`;

        const { error: planItemError } = await supabase.from("treatment_plan_items").insert({
          treatment_plan_id: selectedPlanId,
          tooth_number: toothNumber,
          procedure_description: procedureDescription,
          estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
          status: planItemStatus,
          notes: notes || null,
          completed_at: planItemStatus === "completed" ? new Date().toISOString() : null,
        });

        if (planItemError) throw planItemError;

        toast.success("Diagnóstico registrado e adicionado ao plano!");
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

  const handlePlanCreated = async () => {
    const plans = await refetchPlans();
    if (plans.data && plans.data.length > 0) {
      setSelectedPlanId(plans.data[0].id);
      toast.success("Plano criado e selecionado!");
    }
  };

  return (
    <>
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
            {/* Seleção de Faces */}
            <div>
              <Label className="mb-2 block">Selecione as Faces</Label>
              <div className="flex gap-2 justify-center">
                {faceOptions.map((face) => (
                  <button
                    key={face.value}
                    type="button"
                    onClick={() => handleFaceToggle(face.value)}
                    className={`
                      w-12 h-12 rounded-lg border-2 font-bold text-lg transition-all
                      ${selectedFaces.includes(face.value) 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-muted hover:bg-muted/80 border-border'
                      }
                    `}
                    title={face.fullLabel}
                  >
                    {face.label}
                  </button>
                ))}
              </div>
              {selectedFaces.length > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {selectedFaces.map(f => faceOptions.find(fo => fo.value === f)?.fullLabel).join(", ")}
                </p>
              )}
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
                    {procedureOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
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

            {/* Integração com Plano de Tratamento */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="add-to-plan"
                  checked={addToPlan}
                  onCheckedChange={(checked) => setAddToPlan(checked as boolean)}
                />
                <Label htmlFor="add-to-plan" className="cursor-pointer flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Adicionar ao Plano de Tratamento
                </Label>
              </div>

              {addToPlan && (
                <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                  {!treatmentPlans || treatmentPlans.length === 0 ? (
                    <Alert>
                      <AlertDescription className="flex items-center justify-between gap-2">
                        <span className="text-sm">Nenhum plano ativo.</span>
                        <Button type="button" size="sm" onClick={() => setShowCreatePlanModal(true)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Criar Plano
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs">Plano *</Label>
                        <div className="flex gap-2">
                          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {treatmentPlans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.title || new Date(plan.created_at).toLocaleDateString("pt-BR", {
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setShowCreatePlanModal(true)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Status *</Label>
                          <Select value={planItemStatus} onValueChange={(v: any) => setPlanItemStatus(v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">⏳ Pendente</SelectItem>
                              <SelectItem value="in_progress">🔄 Em Andamento</SelectItem>
                              <SelectItem value="completed">✅ Concluído</SelectItem>
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
                    </>
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

      <CreateTreatmentPlanModal
        isOpen={showCreatePlanModal}
        onClose={() => setShowCreatePlanModal(false)}
        patientId={patientId}
        onSuccess={handlePlanCreated}
      />
    </>
  );
};
