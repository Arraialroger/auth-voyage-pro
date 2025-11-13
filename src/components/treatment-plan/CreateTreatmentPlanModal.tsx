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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface CreateTreatmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
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
  const [notes, setNotes] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const { error } = await supabase
        .from('treatment_plans')
        .insert({
          patient_id: patientId,
          professional_id: planProfessionalId,
          status: 'draft',
          notes: notes || null,
          total_cost: 0,
        });

      if (error) throw error;

      toast({
        title: "Plano criado",
        description: "O plano de tratamento foi criado com sucesso.",
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
    setNotes("");
    setSelectedProfessionalId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Plano de Tratamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Após criar o plano, lembre-se de adicionar os procedimentos necessários para o tratamento do paciente.
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
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o plano de tratamento..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Plano"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};