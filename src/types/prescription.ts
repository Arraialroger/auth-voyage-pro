import { Database } from '@/integrations/supabase/types';

export type PrescriptionType = Database['public']['Enums']['prescription_type_enum'];

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  item_order: number;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  professional_id: string;
  appointment_id: string | null;
  prescription_type: PrescriptionType;
  general_instructions: string | null;
  signature_hash: string | null;
  pdf_file_path: string | null;
  created_at: string;
  updated_at: string;
  // Relational data
  prescription_items?: PrescriptionItem[];
  patient?: {
    full_name: string;
  };
  professional?: {
    full_name: string;
  };
}

export interface PrescriptionTemplateItem {
  id: string;
  template_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  item_order: number;
}

export interface PrescriptionTemplate {
  id: string;
  template_name: string;
  description: string | null;
  prescription_type: PrescriptionType;
  general_instructions: string | null;
  professional_id: string | null;
  is_shared: boolean | null;
  created_at: string;
  updated_at: string;
  // Relational data
  prescription_template_items?: PrescriptionTemplateItem[];
  professional?: {
    full_name: string;
  };
}
