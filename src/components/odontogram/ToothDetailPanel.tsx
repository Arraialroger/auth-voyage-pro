import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, History } from "lucide-react";

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

      toast.success("Procedimento registrado com sucesso!");
      
      // Limpar formulário
      setProcedureType("");
      setNotes("");
      setMaterialUsed("");
      setSelectedFaces([]);
      
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

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Registrar Procedimento"}
        </Button>
      </CardContent>
    </Card>
  );
};
