import { Database } from '@/integrations/supabase/types';

export type PaymentMethod = Database['public']['Enums']['payment_method_enum'];

export interface PaymentEntry {
  id: string;
  payment_id: string;
  payment_method: PaymentMethod;
  amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  patient_id: string;
  treatment_plan_id: string | null;
  registered_by: string;
  installment_number: number;
  total_installments: number;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number | null;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  // Relational data
  entries?: PaymentEntry[];
  treatment_plan?: {
    title: string | null;
    total_cost: number | null;
  } | null;
  patient?: {
    full_name: string;
  } | null;
}

export interface PaymentFormEntry {
  id: string;
  payment_method: PaymentMethod;
  amount: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  debit_card: 'Cartão de Débito',
  credit_card: 'Cartão de Crédito',
  bank_transfer: 'Transferência',
  insurance: 'Convênio',
  boleto: 'Boleto',
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'pix',
  'debit_card',
  'credit_card',
  'bank_transfer',
  'insurance',
  'boleto',
];
