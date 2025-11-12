import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TreatmentPlanItemRowProps {
  item: any;
  onUpdate: () => void;
  isReceptionist: boolean;
}

export const TreatmentPlanItemRow = ({ item, onUpdate, isReceptionist }: TreatmentPlanItemRowProps) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: 'Pendente', icon: Clock, variant: 'secondary' as const },
      in_progress: { label: 'Em Andamento', icon: Clock, variant: 'default' as const },
      completed: { label: 'Concluído', icon: CheckCircle2, variant: 'default' as const },
      cancelled: { label: 'Cancelado', icon: XCircle, variant: 'destructive' as const },
    };
    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleToggleStatus = async () => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    
    try {
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('treatment_plan_items')
        .update(updateData)
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Procedimento marcado como ${newStatus === 'completed' ? 'concluído' : 'pendente'}.`,
      });

      onUpdate();
    } catch (error) {
      logger.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do procedimento.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('treatment_plan_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Procedimento removido",
        description: "O procedimento foi removido do plano de tratamento.",
      });

      onUpdate();
    } catch (error) {
      logger.error('Erro ao deletar item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o procedimento.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {item.tooth_number && (
              <Badge variant="outline" className="text-xs">
                Dente {item.tooth_number}
              </Badge>
            )}
            {getStatusBadge(item.status)}
            {item.priority > 1 && (
              <Badge variant="outline" className="text-xs">
                Prioridade {item.priority}
              </Badge>
            )}
          </div>
          <p className="font-medium text-sm">
            {item.treatment?.treatment_name || item.procedure_description}
          </p>
          {item.notes && (
            <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {item.estimated_cost > 0 && (
            <span className="text-sm font-medium whitespace-nowrap">
              R$ {Number(item.estimated_cost).toFixed(2)}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleStatus}
            title={item.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluído'}
          >
            <CheckCircle2 className={`h-4 w-4 ${item.status === 'completed' ? 'text-success' : 'text-muted-foreground'}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover procedimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O procedimento será permanentemente removido do plano de tratamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};