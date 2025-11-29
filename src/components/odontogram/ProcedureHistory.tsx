import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EditProcedureModal } from "./EditProcedureModal";
import { Database } from "@/integrations/supabase/types";

type ToothStatusEnum = Database["public"]["Enums"]["tooth_status_enum"];
type ToothFaceEnum = Database["public"]["Enums"]["tooth_face_enum"];

interface ProcedureHistoryProps {
  toothNumber: number | null;
  patientId: string;
}

interface Procedure {
  id: string;
  tooth_number: number;
  procedure_type: string;
  procedure_date: string;
  status_before: ToothStatusEnum | null;
  status_after: ToothStatusEnum;
  faces: ToothFaceEnum[] | null;
  material_used: string | null;
  notes: string | null;
  status: string | null;
  professionals: { full_name: string } | null;
}

export const ProcedureHistory = ({ toothNumber, patientId }: ProcedureHistoryProps) => {
  const queryClient = useQueryClient();
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [deletingProcedure, setDeletingProcedure] = useState<Procedure | null>(null);

  const { data: procedures, isLoading } = useQuery({
    queryKey: ['tooth-procedures', patientId, toothNumber],
    queryFn: async () => {
      let query = supabase
        .from('tooth_procedures')
        .select(`
          *,
          professionals (
            full_name
          )
        `)
        .eq('patient_id', patientId)
        .order('procedure_date', { ascending: false });

      if (toothNumber) {
        query = query.eq('tooth_number', toothNumber);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Procedure[];
    },
    enabled: !!patientId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (procedureId: string) => {
      const { error } = await supabase
        .from('tooth_procedures')
        .delete()
        .eq('id', procedureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tooth-procedures', patientId] });
      toast.success("Procedimento excluído com sucesso");
      setDeletingProcedure(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir procedimento: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Procedimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Procedimentos
            {toothNumber && <Badge variant="outline">Dente {toothNumber}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!procedures || procedures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum procedimento registrado
              {toothNumber && " para este dente"}.
            </p>
          ) : (
            <div className="space-y-4">
              {procedures.map((proc) => (
                <div 
                  key={proc.id} 
                  className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold">
                        Dente {proc.tooth_number} - {proc.procedure_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(proc.procedure_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Badge variant="outline">{proc.status_before || "—"}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge>{proc.status_after}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingProcedure(proc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingProcedure(proc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {proc.faces && proc.faces.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {proc.faces.map((face: string) => (
                        <Badge key={face} variant="secondary" className="text-xs">
                          {face}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {proc.material_used && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Material:</span> {proc.material_used}
                    </p>
                  )}

                  {proc.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      {proc.notes}
                    </p>
                  )}

                  {proc.professionals && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {proc.professionals.full_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <EditProcedureModal
        isOpen={!!editingProcedure}
        onClose={() => setEditingProcedure(null)}
        procedure={editingProcedure}
        patientId={patientId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProcedure} onOpenChange={(open) => !open && setDeletingProcedure(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o procedimento "{deletingProcedure?.procedure_type}" 
              do dente {deletingProcedure?.tooth_number}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingProcedure && deleteMutation.mutate(deletingProcedure.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};