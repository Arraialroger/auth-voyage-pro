import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PaymentFormModal } from './PaymentFormModal';
import { PaymentHistory } from './PaymentHistory';
import { PaymentSummaryCard } from './PaymentSummaryCard';
import { useUserProfile } from '@/hooks/useUserProfile';

interface FinancialViewProps {
  patientId: string;
}

export const FinancialView = ({ patientId }: FinancialViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const userProfile = useUserProfile();
  
  const isReceptionist = userProfile.type === 'receptionist';

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['payments', patientId] });
    queryClient.invalidateQueries({ queryKey: ['patient-payments-total', patientId] });
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <PaymentSummaryCard patientId={patientId} />

      {/* New Payment Button - Only for receptionists */}
      {isReceptionist && (
        <Button onClick={() => setIsModalOpen(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pagamento
        </Button>
      )}

      {/* Payment History */}
      <PaymentHistory patientId={patientId} />

      {/* Payment Form Modal */}
      <PaymentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientId={patientId}
        onSuccess={handleSuccess}
      />
    </div>
  );
};
