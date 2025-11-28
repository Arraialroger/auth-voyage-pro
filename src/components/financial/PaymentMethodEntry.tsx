import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { PaymentFormEntry, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/types/payment';

interface PaymentMethodEntryProps {
  entry: PaymentFormEntry;
  onUpdate: (id: string, field: 'payment_method' | 'amount', value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const PaymentMethodEntry = ({
  entry,
  onUpdate,
  onRemove,
  canRemove,
}: PaymentMethodEntryProps) => {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={entry.payment_method}
        onValueChange={(value) => onUpdate(entry.id, 'payment_method', value)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Forma de pagamento" />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_METHODS.map((method) => (
            <SelectItem key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          R$
        </span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={entry.amount}
          onChange={(e) => onUpdate(entry.id, 'amount', e.target.value)}
          className="pl-10"
          placeholder="0,00"
        />
      </div>
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(entry.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
