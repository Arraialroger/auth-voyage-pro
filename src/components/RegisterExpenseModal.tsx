import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const expenseSchema = z.object({
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  expense_date: z.date({ required_error: 'Data é obrigatória' }),
  category: z.string().min(1, 'Categoria é obrigatória'),
  payment_method: z.string().min(1, 'Forma de pagamento é obrigatória'),
  status: z.string().default('pending'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface RegisterExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterExpenseModal({ open, onOpenChange }: RegisterExpenseModalProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      status: 'pending'
    }
  });

  const expenseDate = watch('expense_date');
  const category = watch('category');
  const paymentMethod = watch('payment_method');
  const status = watch('status');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      
      // Validar tipo
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Tipo de arquivo inválido. Use JPG, PNG ou PDF.');
        return;
      }

      setReceiptFile(file);
    }
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `expense-receipts/${fileName}`;

      setUploadProgress(50);
      
      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(100);
      return filePath;
    } catch (error: any) {
      toast.error('Erro ao fazer upload do comprovante: ' + error.message);
      return null;
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let receiptUrl = null;
      if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile);
        if (!receiptUrl && receiptFile) {
          // Se havia arquivo mas o upload falhou, não prosseguir
          setLoading(false);
          return;
        }
      }

      const insertData = {
        description: data.description,
        amount: parseFloat(data.amount),
        expense_date: format(data.expense_date, 'yyyy-MM-dd'),
        category: data.category as "supplies" | "rent" | "utilities" | "equipment" | "maintenance" | "salary" | "marketing" | "other",
        payment_method: data.payment_method as "cash" | "credit_card" | "debit_card" | "pix" | "bank_transfer",
        status: data.status as "pending" | "paid",
        created_by: user.id,
        receipt_url: receiptUrl
      };

      const { error } = await supabase
        .from('expenses')
        .insert([insertData]);

      if (error) throw error;

      toast.success('Despesa registrada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      
      reset();
      setReceiptFile(null);
      setUploadProgress(0);
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao registrar despesa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setReceiptFile(null);
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Despesa</DialogTitle>
          <DialogDescription>
            Registre uma nova despesa da clínica com comprovante opcional
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Descrição */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Ex: Material odontológico, aluguel, energia elétrica..."
                className="mt-1"
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Valor */}
            <div>
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="0.00"
                className="mt-1"
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Data da Despesa */}
            <div>
              <Label>Data da Despesa *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !expenseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenseDate ? format(expenseDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expenseDate}
                    onSelect={(date) => date && setValue('expense_date', date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.expense_date && (
                <p className="text-sm text-destructive mt-1">{errors.expense_date.message}</p>
              )}
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select value={category} onValueChange={(value) => setValue('category', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplies">Material/Suprimentos</SelectItem>
                  <SelectItem value="rent">Aluguel</SelectItem>
                  <SelectItem value="utilities">Utilidades (Água/Luz/Internet)</SelectItem>
                  <SelectItem value="equipment">Equipamentos</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="salary">Salários/Folha de Pagamento</SelectItem>
                  <SelectItem value="marketing">Marketing/Publicidade</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Forma de Pagamento */}
            <div>
              <Label htmlFor="payment_method">Forma de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={(value) => setValue('payment_method', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
              {errors.payment_method && (
                <p className="text-sm text-destructive mt-1">{errors.payment_method.message}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value) => setValue('status', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload de Comprovante */}
            <div className="md:col-span-2">
              <Label htmlFor="receipt">Comprovante (Opcional)</Label>
              <div className="mt-1 space-y-2">
                {!receiptFile ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" disabled>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <span className="flex-1 text-sm truncate">{receiptFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReceiptFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: JPG, PNG ou PDF. Tamanho máximo: 5MB
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Despesa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
