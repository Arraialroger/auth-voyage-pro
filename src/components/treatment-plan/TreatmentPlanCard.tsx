import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Download,
  Copy
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditTreatmentPlanModal } from "./EditTreatmentPlanModal";
import { AddItemModal } from "./AddItemModal";
import { TreatmentPlanItemRow } from "./TreatmentPlanItemRow";
import { generateTreatmentPlanPDF } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface TreatmentPlanCardProps {
  plan: any;
  onUpdate: () => void;
  isReceptionist: boolean;
}

export const TreatmentPlanCard = ({ plan, onUpdate, isReceptionist }: TreatmentPlanCardProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const getStatusConfig = (status: string) => {
    const configs = {
      draft: { label: 'Rascunho', icon: FileText, className: 'bg-secondary/10 text-secondary' },
      approved: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-primary/10 text-primary' },
      in_progress: { label: 'Em Andamento', icon: Clock, className: 'bg-primary/10 text-primary' },
      completed: { label: 'Concluído', icon: CheckCircle2, className: 'bg-success/10 text-success' },
      cancelled: { label: 'Cancelado', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  const statusConfig = getStatusConfig(plan.status);
  const StatusIcon = statusConfig.icon;

  const completedItems = plan.items?.filter((item: any) => item.status === 'completed').length || 0;
  const totalItems = plan.items?.length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Fetch patient data
      const { data: patient, error } = await supabase
        .from('patients')
        .select('full_name, contact_phone, cpf, birth_date')
        .eq('id', plan.patient_id)
        .single();
      
      if (error) throw error;
      
      await generateTreatmentPlanPDF(plan, patient);
      
      toast({
        title: "PDF gerado com sucesso",
        description: "O download do plano de tratamento foi iniciado.",
      });
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF do plano de tratamento.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDuplicatePlan = async () => {
    try {
      setIsDuplicating(true);
      
      // Create new treatment plan
      const { data: newPlan, error: planError } = await supabase
        .from('treatment_plans')
        .insert({
          patient_id: plan.patient_id,
          professional_id: plan.professional_id,
          status: 'draft',
          notes: plan.notes ? `[Cópia] ${plan.notes}` : '[Cópia do plano anterior]',
          total_cost: 0, // Will be updated by trigger
        })
        .select()
        .single();
      
      if (planError) throw planError;
      
      // Copy all items to new plan (reset status to pending)
      if (plan.items && plan.items.length > 0) {
        const itemsToCopy = plan.items.map((item: any) => ({
          treatment_plan_id: newPlan.id,
          procedure_description: item.procedure_description,
          tooth_number: item.tooth_number,
          estimated_cost: item.estimated_cost,
          priority: item.priority,
          notes: item.notes,
          treatment_id: item.treatment_id,
          status: 'pending', // Reset status
        }));
        
        const { error: itemsError } = await supabase
          .from('treatment_plan_items')
          .insert(itemsToCopy);
        
        if (itemsError) throw itemsError;
      }
      
      toast({
        title: "Plano duplicado",
        description: `Novo plano de tratamento criado com ${plan.items?.length || 0} procedimentos.`,
      });
      
      onUpdate();
    } catch (error) {
      logger.error('Erro ao duplicar plano:', error);
      toast({
        title: "Erro ao duplicar plano",
        description: "Não foi possível duplicar o plano de tratamento.",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-lg">
                  Plano de {format(new Date(plan.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
                </CardTitle>
                <Badge className={statusConfig.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Profissional: {plan.professional?.full_name}</span>
                <span>•</span>
                <span>{totalItems} {totalItems === 1 ? 'procedimento' : 'procedimentos'}</span>
                {plan.total_cost > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-foreground">
                      R$ {Number(plan.total_cost).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
              {totalItems > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span>{completedItems}/{totalItems} concluídos</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDuplicatePlan}
                disabled={isDuplicating}
                title="Duplicar plano"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                title="Gerar PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                title="Editar plano"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Recolher" : "Expandir"}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            
            {plan.notes && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground font-medium mb-1">Observações:</p>
                <p className="text-sm">{plan.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Procedimentos</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddItemModalOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>

              {totalItems === 0 ? (
                <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <AlertDescription className="text-amber-800 dark:text-amber-400">
                    Este plano não possui procedimentos. Adicione pelo menos um procedimento para iniciar o tratamento.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {plan.items.map((item: any) => (
                    <TreatmentPlanItemRow
                      key={item.id}
                      item={item}
                      onUpdate={onUpdate}
                      isReceptionist={isReceptionist}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <EditTreatmentPlanModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        plan={plan}
        onSuccess={onUpdate}
      />

      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        treatmentPlanId={plan.id}
        onSuccess={onUpdate}
      />
    </>
  );
};