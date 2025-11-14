import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle, Trash2, Pencil, Calendar, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { EditItemModal } from "./EditItemModal";
import { NewAppointmentModal } from "../NewAppointmentModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  patientId: string;
}

export const TreatmentPlanItemRow = ({ item, onUpdate, isReceptionist, patientId }: TreatmentPlanItemRowProps) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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

  const handleScheduleSuccess = async () => {
    setShowScheduleModal(false);
    onUpdate();
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
            {item.scheduled_date && (
              <Badge variant="outline" className="text-xs gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(item.scheduled_date), "dd/MM/yy", { locale: ptBR })}
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
            onClick={() => setShowEditModal(true)}
            title="Editar procedimento"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            title="Excluir procedimento"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este procedimento do plano de tratamento?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditItemModal
        item={item}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdate={onUpdate}
      />
    </>
  );
};