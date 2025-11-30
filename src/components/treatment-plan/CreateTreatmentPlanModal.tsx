import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, FileDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";
import { getToothFullDescription } from "@/lib/toothUtils";

interface CreateTreatmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

interface PendingProcedure {
  id: string;
  tooth_number: number;
  procedure_type: string;
  faces: string[] | null;
  notes: string | null;
  treatment_id?: string | null;
  estimated_cost?: number | null;
}

export const CreateTreatmentPlanModal = ({
  isOpen,
  onClose,
  patientId,
  onSuccess,
}: CreateTreatmentPlanModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const userProfile = useUserProfile();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);

  const isReceptionist = userProfile.type === 'receptionist';
  const professionalId = userProfile.professionalId;

  const { data: professionals } = useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
    enabled: isReceptionist,
  });

  // Buscar procedimentos pendentes do odontograma
  const { data: pendingProcedures } = useQuery({
    queryKey: ['pending-procedures', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tooth_procedures')
        .select('id, tooth_number, procedure_type, faces, notes')
        .eq('patient_id', patientId)
        .eq('status', 'pending')
        .order('tooth_number');
      
      if (error) throw error;
      return data as PendingProcedure[];
    },
    enabled: isOpen && !!patientId,
  });

  // Buscar tratamentos para obter custos
  const { data: treatments } = useQuery({
    queryKey: ['treatments-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatments')
        .select('id, treatment_name, cost');
      
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const toggleProcedure = (procedureId: string) => {
    setSelectedProcedures(prev =>
      prev.includes(procedureId)
        ? prev.filter(id => id !== procedureId)
        : [...prev, procedureId]
    );
  };

  const selectAllProcedures = () => {
    if (pendingProcedures) {
      setSelectedProcedures(pendingProcedures.map(p => p.id));
    }
  };

  const deselectAllProcedures = () => {
    setSelectedProcedures([]);
  };

  const handleSubmit = async () => {
    const planProfessionalId = isReceptionist ? selectedProfessionalId : professionalId;

    if (!planProfessionalId) {
      toast({
        title: "Erro",
        description: "Selecione um profissional.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Criar o plano de tratamento
      const { data: newPlan, error: planError } = await supabase
        .from('treatment_plans')
        .insert({
          patient_id: patientId,
          professional_id: planProfessionalId,
          status: 'draft',
          title: title.trim() || null,
          notes: notes || null,
          total_cost: 0,
        })
        .select('id')
        .single();

      if (planError) throw planError;

      // Se há procedimentos selecionados, criar os itens do plano
      if (selectedProcedures.length > 0 && pendingProcedures) {
        const itemsToCreate = selectedProcedures.map(procId => {
          const proc = pendingProcedures.find(p => p.id === procId);
          if (!proc) return null;

          // Tentar encontrar tratamento correspondente para obter custo
          const matchingTreatment = treatments?.find(t => 
            t.treatment_name.toLowerCase().includes(proc.procedure_type.toLowerCase()) ||
            proc.procedure_type.toLowerCase().includes(t.treatment_name.toLowerCase())
          );

          const facesText = proc.faces && proc.faces.length > 0 
            ? ` (${proc.faces.join(', ')})` 
            : '';

          return {
            treatment_plan_id: newPlan.id,
            tooth_number: proc.tooth_number,
            procedure_description: `${proc.procedure_type}${facesText}`,
            treatment_id: matchingTreatment?.id || null,
            estimated_cost: matchingTreatment?.cost || 0,
            status: 'pending' as const,
            notes: proc.notes || null,
          };
        }).filter(Boolean);

        if (itemsToCreate.length > 0) {
          const { error: itemsError } = await supabase
            .from('treatment_plan_items')
            .insert(itemsToCreate);

          if (itemsError) {
            logger.error('Erro ao criar itens do plano:', itemsError);
            // Não falhar completamente, plano foi criado
          }
        }
      }

      toast({
        title: "Plano criado",
        description: selectedProcedures.length > 0 
          ? `Plano criado com ${selectedProcedures.length} procedimento(s) importado(s).`
          : "O plano de tratamento foi criado com sucesso.",
      });

      onSuccess();
      handleClose();
    } catch (error) {
      logger.error('Erro ao criar plano:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o plano de tratamento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setNotes("");
    setSelectedProfessionalId("");
    setSelectedProcedures([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Plano de Tratamento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Após criar o plano, você pode adicionar mais procedimentos ou importar do odontograma abaixo.
            </AlertDescription>
          </Alert>

          {isReceptionist && (
            <div>
              <Label>Profissional Responsável *</Label>
              <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals?.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Título do Plano</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Tratamento Ortodôntico, Reabilitação Completa..."
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o plano de tratamento..."
              rows={3}
            />
          </div>

          {/* Seção de importação do odontograma */}
          {pendingProcedures && pendingProcedures.length > 0 && (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Importar do Odontograma</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllProcedures}
                    className="text-xs h-7"
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllProcedures}
                    className="text-xs h-7"
                  >
                    Nenhum
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="max-h-40">
                <div className="space-y-2">
                  {pendingProcedures.map((proc) => (
                    <div
                      key={proc.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleProcedure(proc.id)}
                    >
                      <Checkbox
                        checked={selectedProcedures.includes(proc.id)}
                        onCheckedChange={() => toggleProcedure(proc.id)}
                      />
                      <div className="flex-1 text-sm">
                        <span className="font-medium">Dente {proc.tooth_number}</span>
                        <span className="text-muted-foreground"> - {getToothFullDescription(proc.tooth_number)}</span>
                        <div className="text-muted-foreground">
                          {proc.procedure_type}
                          {proc.faces && proc.faces.length > 0 && (
                            <span> ({proc.faces.join(', ')})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedProcedures.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedProcedures.length} procedimento(s) selecionado(s)
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar Plano"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};