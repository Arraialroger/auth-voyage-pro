import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, FileText, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateTreatmentPlanModal } from "@/components/treatment-plan/CreateTreatmentPlanModal";

interface ToothDetailPanelProps {
  toothNumber: number;
  patientId: string;
  currentStatus: string;
  onUpdate: () => void;
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

const faceOptions = [
  { value: "oclusal", label: "Oclusal" },
  { value: "mesial", label: "Mesial" },
  { value: "distal", label: "Distal" },
  { value: "vestibular", label: "Vestibular" },
  { value: "lingual", label: "Lingual" },
  { value: "incisal", label: "Incisal" },
];

export const ToothDetailPanel = ({ toothNumber, patientId, currentStatus, onUpdate }: ToothDetailPanelProps) => {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [procedureType, setProcedureType] = useState("");
  const [notes, setNotes] = useState("");
  const [materialUsed, setMaterialUsed] = useState("");
  const [selectedFaces, setSelectedFaces] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [addToPlan, setAddToPlan] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);

  // Buscar planos de tratamento do paciente
  const { data: treatmentPlans, refetch: refetchPlans } = useQuery({
    queryKey: ['treatment-plans-active', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select('id, status, created_at, professional:professionals(full_name)')
        .eq('patient_id', patientId)
        .in('status', ['draft', 'approved', 'in_progress'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (!procedureType.trim()) {
      toast.error("Informe o tipo de procedimento");
      return;
    }

    if (addToPlan && !selectedPlanId) {
      toast.error("Selecione um plano de tratamento");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Buscar professional_id se for profissional
      let professionalId = null;
      if (user) {
        const { data: professional } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user.id)
          .single();
        professionalId = professional?.id;
      }

      // Atualizar ou criar registro do odontograma
      const { error: odontogramError } = await supabase
        .from('odontogram_records')
        .upsert({
          patient_id: patientId,
          tooth_number: toothNumber,
          status: newStatus as any,
          notes,
          last_updated_by: user?.id,
          last_updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'patient_id,tooth_number' 
        });

      if (odontogramError) throw odontogramError;

      // Registrar procedimento
      const { error: procedureError } = await supabase
        .from('tooth_procedures')
        .insert({
          patient_id: patientId,
          tooth_number: toothNumber,
          procedure_type: procedureType,
          professional_id: professionalId,
          notes,
          faces: selectedFaces as any,
          material_used: materialUsed || null,
          status_before: currentStatus as any,
          status_after: newStatus as any,
        });

      if (procedureError) throw procedureError;

      // Adicionar ao plano de tratamento se selecionado
      if (addToPlan && selectedPlanId) {
        const procedureDescription = `${procedureType} - Dente ${toothNumber}${selectedFaces.length > 0 ? ` (${selectedFaces.join(', ')})` : ''}`;
        
        const { error: planItemError } = await supabase
          .from('treatment_plan_items')
          .insert({
            treatment_plan_id: selectedPlanId,
            tooth_number: toothNumber,
            procedure_description: procedureDescription,
            estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
            status: 'completed', // Marcado como concluído pois já foi realizado
            notes: notes || null,
            completed_at: new Date().toISOString(),
          });

        if (planItemError) throw planItemError;
        
        toast.success("Procedimento registrado e adicionado ao plano!");
      } else {
        toast.success("Procedimento registrado com sucesso!");
      }
      
      // Limpar formulário
      setProcedureType("");
      setNotes("");
      setMaterialUsed("");
      setSelectedFaces([]);
      setAddToPlan(false);
      setSelectedPlanId("");
      setEstimatedCost("");
      
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error("Erro ao salvar procedimento");
    } finally {
      setSaving(false);
    }
  };

  const handleFaceToggle = (face: string) => {
    setSelectedFaces(prev => 
      prev.includes(face) 
        ? prev.filter(f => f !== face)
        : [...prev, face]
    );
  };

  const handlePlanCreated = async () => {
    await refetchPlans();
    
    // Automaticamente seleciona o plano mais recente
    const plans = await refetchPlans();
    if (plans.data && plans.data.length > 0) {
      setSelectedPlanId(plans.data[0].id);
      setAddToPlan(true);
      toast.success("Plano criado e selecionado!");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Dente {toothNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Status Atual</Label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tipo de Procedimento *</Label>
          <Select value={procedureType} onValueChange={setProcedureType}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exame">Exame Inicial</SelectItem>
              <SelectItem value="restauracao">Restauração</SelectItem>
              <SelectItem value="extracao">Extração</SelectItem>
              <SelectItem value="canal">Tratamento de Canal</SelectItem>
              <SelectItem value="limpeza">Limpeza</SelectItem>
              <SelectItem value="coroa">Instalação de Coroa</SelectItem>
              <SelectItem value="implante">Implante</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block">Faces Afetadas</Label>
          <div className="grid grid-cols-2 gap-2">
            {faceOptions.map(face => (
              <div key={face.value} className="flex items-center gap-2">
                <Checkbox
                  id={`face-${face.value}`}
                  checked={selectedFaces.includes(face.value)}
                  onCheckedChange={() => handleFaceToggle(face.value)}
                />
                <label htmlFor={`face-${face.value}`} className="text-sm cursor-pointer">
                  {face.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Material Utilizado</Label>
          <input
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            rows={3}
          />
        </div>

        <Separator />

        {/* Seção de Adicionar ao Plano */}
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
                    <span className="text-sm">Nenhum plano de tratamento ativo encontrado.</span>
                    <Button 
                      type="button"
                      size="sm"
                      onClick={() => setShowCreatePlanModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Plano
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div>
                    <Label>Selecione o Plano *</Label>
                    <div className="flex gap-2">
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha um plano..." />
                        </SelectTrigger>
                        <SelectContent>
                          {treatmentPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex items-center gap-2">
                                <span>
                                  {new Date(plan.created_at).toLocaleDateString('pt-BR', { 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {plan.status === 'draft' ? 'Rascunho' : 
                                   plan.status === 'approved' ? 'Aprovado' : 'Em Andamento'}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowCreatePlanModal(true)}
                        title="Criar novo plano"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
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
                </>
              )}
            </div>
          )}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : addToPlan ? "Registrar e Adicionar ao Plano" : "Registrar Procedimento"}
        </Button>
      </CardContent>

      {/* Modal de criação de plano */}
      <CreateTreatmentPlanModal
        isOpen={showCreatePlanModal}
        onClose={() => setShowCreatePlanModal(false)}
        patientId={patientId}
        onSuccess={handlePlanCreated}
      />
    </Card>
  );
};
