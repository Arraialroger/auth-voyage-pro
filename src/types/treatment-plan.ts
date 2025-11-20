import { Database } from '@/integrations/supabase/types';

export type TreatmentPlanStatus = Database['public']['Enums']['treatment_plan_status_enum'];
export type TreatmentPlanItemStatus = Database['public']['Enums']['treatment_plan_item_status_enum'];

export interface TreatmentPlanItem {
  id: string;
  treatment_plan_id: string;
  procedure_description: string;
  tooth_number: number | null;
  treatment_id: string | null;
  estimated_cost: number | null;
  status: TreatmentPlanItemStatus;
  priority: number | null;
  notes: string | null;
  scheduled_date: string | null;
  appointment_id: string | null;
  completed_at: string | null;
  created_at: string;
  // Relational data
  treatment?: {
    treatment_name: string;
    cost?: number | null;
  } | null;
  appointment?: {
    appointment_start_time: string;
    status: string;
  } | null;
}

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  professional_id: string;
  title: string | null;
  notes: string | null;
  status: TreatmentPlanStatus;
  total_cost: number | null;
  created_at: string;
  updated_at: string;
  // Relational data
  items?: TreatmentPlanItem[];
  patient?: {
    full_name: string;
  } | null;
  professional?: {
    full_name: string;
  } | null;
}

export interface PendingScheduleItem extends TreatmentPlanItem {
  selected?: boolean;
}
