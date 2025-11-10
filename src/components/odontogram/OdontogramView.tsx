import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OdontogramCanvas } from "./OdontogramCanvas";
import { ToothDetailPanel } from "./ToothDetailPanel";
import { ProcedureHistory } from "./ProcedureHistory";
import { Skeleton } from "@/components/ui/skeleton";

interface OdontogramViewProps {
  patientId: string;
}

export const OdontogramView = ({ patientId }: OdontogramViewProps) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const { data: teeth, isLoading, refetch } = useQuery({
    queryKey: ['odontogram', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('odontogram_records')
        .select('*')
        .eq('patient_id', patientId);
      
      if (error) throw error;
      return data;
    },
  });

  const handleToothClick = (toothNumber: number) => {
    setSelectedTooth(selectedTooth === toothNumber ? null : toothNumber);
  };

  const getCurrentToothStatus = () => {
    if (!selectedTooth) return "higido";
    const tooth = teeth?.find(t => t.tooth_number === selectedTooth);
    return tooth?.status || "higido";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OdontogramCanvas
        teeth={teeth || []}
        onToothClick={handleToothClick}
        selectedTooth={selectedTooth}
      />

      {selectedTooth && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ToothDetailPanel
            toothNumber={selectedTooth}
            patientId={patientId}
            currentStatus={getCurrentToothStatus()}
            onUpdate={() => {
              refetch();
              setSelectedTooth(null);
            }}
          />
          <ProcedureHistory
            toothNumber={selectedTooth}
            patientId={patientId}
          />
        </div>
      )}

      {!selectedTooth && (
        <ProcedureHistory
          toothNumber={null}
          patientId={patientId}
        />
      )}
    </div>
  );
};
