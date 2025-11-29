import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OdontogramCanvas } from "./OdontogramCanvas";
import { ToothModal } from "./ToothModal";
import { ProcedureHistory } from "./ProcedureHistory";
import { Skeleton } from "@/components/ui/skeleton";

interface OdontogramViewProps {
  patientId: string;
}

export const OdontogramView = ({ patientId }: OdontogramViewProps) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setSelectedTooth(toothNumber);
    setIsModalOpen(true);
  };

  const getCurrentToothStatus = () => {
    if (!selectedTooth) return "higido";
    const tooth = teeth?.find(t => t.tooth_number === selectedTooth);
    return tooth?.status || "higido";
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[300px] w-full" />
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

      {/* Modal centralizado para detalhes do dente */}
      {selectedTooth && (
        <ToothModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          toothNumber={selectedTooth}
          patientId={patientId}
          currentStatus={getCurrentToothStatus()}
          onSuccess={handleSuccess}
        />
      )}

      {/* Histórico de todos os procedimentos */}
      <ProcedureHistory
        toothNumber={null}
        patientId={patientId}
      />
    </div>
  );
};
