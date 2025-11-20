/**
 * Supabase Realtime payload types
 */

export interface RealtimePayload<T = Record<string, unknown>> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors: string[] | null;
}

export interface AppointmentRealtimeData {
  id: string;
  appointment_start_time: string;
  appointment_end_time: string;
  status: string;
  patient_id: string | null;
  professional_id: string | null;
  treatment_id: string | null;
  notes: string | null;
  created_at: string;
  // Relational data loaded separately
  patient?: {
    full_name: string;
    contact_phone: string;
  } | null;
  treatment?: {
    treatment_name: string;
  } | null;
}
