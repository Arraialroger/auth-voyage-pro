import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User } from "lucide-react";

interface ProcedureHistoryProps {
  toothNumber: number | null;
  patientId: string;
}

export const ProcedureHistory = ({ toothNumber, patientId }: ProcedureHistoryProps) => {
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
      return data;
    },
    enabled: !!patientId,
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
                  <div>
                    <p className="font-semibold">
                      Dente {proc.tooth_number} - {proc.procedure_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(proc.procedure_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{proc.status_before}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge>{proc.status_after}</Badge>
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
  );
};
