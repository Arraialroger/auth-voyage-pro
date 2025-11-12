import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileText,
  Plus,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditTreatmentPlanModal } from "./EditTreatmentPlanModal";
import { AddItemModal } from "./AddItemModal";
import { TreatmentPlanItemRow } from "./TreatmentPlanItemRow";

interface TreatmentPlanCardProps {
  plan: any;
  onUpdate: () => void;
  isReceptionist: boolean;
}

export const TreatmentPlanCard = ({ plan, onUpdate, isReceptionist }: TreatmentPlanCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

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
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
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
                <p className="text-center text-muted-foreground py-6 text-sm">
                  Nenhum procedimento adicionado ainda
                </p>
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