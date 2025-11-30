export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_end_time: string
          appointment_start_time: string
          confirmation_sent_at: string | null
          created_at: string
          id: string
          is_squeeze_in: boolean | null
          last_reminder_sent_at: string | null
          notes: string | null
          patient_id: string | null
          professional_id: string | null
          status: Database["public"]["Enums"]["appointment_status_enum"]
          treatment_id: string | null
          treatment_plan_item_id: string | null
        }
        Insert: {
          appointment_end_time: string
          appointment_start_time: string
          confirmation_sent_at?: string | null
          created_at?: string
          id?: string
          is_squeeze_in?: boolean | null
          last_reminder_sent_at?: string | null
          notes?: string | null
          patient_id?: string | null
          professional_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status_enum"]
          treatment_id?: string | null
          treatment_plan_item_id?: string | null
        }
        Update: {
          appointment_end_time?: string
          appointment_start_time?: string
          confirmation_sent_at?: string | null
          created_at?: string
          id?: string
          is_squeeze_in?: boolean | null
          last_reminder_sent_at?: string | null
          notes?: string | null
          patient_id?: string | null
          professional_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status_enum"]
          treatment_id?: string | null
          treatment_plan_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_plan_item_id_fkey"
            columns: ["treatment_plan_item_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          appointment_id: string | null
          communication_content: string
          created_at: string
          direction: string
          id: string
          patient_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          communication_content: string
          created_at?: string
          direction: string
          id?: string
          patient_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          communication_content?: string
          created_at?: string
          direction?: string
          id?: string
          patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_certificates: {
        Row: {
          additional_notes: string | null
          appointment_id: string | null
          certificate_type: Database["public"]["Enums"]["certificate_type_enum"]
          cid_10_code: string | null
          created_at: string
          days_count: number | null
          end_date: string | null
          id: string
          patient_id: string
          pdf_file_path: string | null
          professional_id: string
          reason: string
          signature_hash: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          appointment_id?: string | null
          certificate_type?: Database["public"]["Enums"]["certificate_type_enum"]
          cid_10_code?: string | null
          created_at?: string
          days_count?: number | null
          end_date?: string | null
          id?: string
          patient_id: string
          pdf_file_path?: string | null
          professional_id: string
          reason: string
          signature_hash?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          appointment_id?: string | null
          certificate_type?: Database["public"]["Enums"]["certificate_type_enum"]
          cid_10_code?: string | null
          created_at?: string
          days_count?: number | null
          end_date?: string | null
          id?: string
          patient_id?: string
          pdf_file_path?: string | null
          professional_id?: string
          reason?: string
          signature_hash?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_certificates_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_certificates_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_certificates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      odontogram_records: {
        Row: {
          id: string
          last_updated_at: string
          last_updated_by: string | null
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["tooth_status_enum"]
          tooth_number: number
        }
        Insert: {
          id?: string
          last_updated_at?: string
          last_updated_by?: string | null
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["tooth_status_enum"]
          tooth_number: number
        }
        Update: {
          id?: string
          last_updated_at?: string
          last_updated_by?: string | null
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["tooth_status_enum"]
          tooth_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "odontogram_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          patient_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          patient_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          patient_id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          birth_date: string | null
          contact_phone: string
          cpf: string | null
          created_at: string
          full_name: string
          id: string
          medical_history_notes: string | null
        }
        Insert: {
          birth_date?: string | null
          contact_phone: string
          cpf?: string | null
          created_at?: string
          full_name: string
          id?: string
          medical_history_notes?: string | null
        }
        Update: {
          birth_date?: string | null
          contact_phone?: string
          cpf?: string | null
          created_at?: string
          full_name?: string
          id?: string
          medical_history_notes?: string | null
        }
        Relationships: []
      }
      payment_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string
          discount_amount: number
          discount_type: string | null
          discount_value: number | null
          id: string
          installment_number: number
          notes: string | null
          patient_id: string
          payment_date: string
          registered_by: string
          subtotal: number
          total_amount: number
          total_installments: number
          treatment_plan_id: string | null
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          installment_number?: number
          notes?: string | null
          patient_id: string
          payment_date?: string
          registered_by: string
          subtotal: number
          total_amount: number
          total_installments?: number
          treatment_plan_id?: string | null
        }
        Update: {
          created_at?: string
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          installment_number?: number
          notes?: string | null
          patient_id?: string
          payment_date?: string
          registered_by?: string
          subtotal?: number
          total_amount?: number
          total_installments?: number
          treatment_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          item_order: number
          medication_name: string
          prescription_id: string
        }
        Insert: {
          created_at?: string
          dosage: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          item_order?: number
          medication_name: string
          prescription_id: string
        }
        Update: {
          created_at?: string
          dosage?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          item_order?: number
          medication_name?: string
          prescription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_template_items: {
        Row: {
          dosage: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          item_order: number
          medication_name: string
          template_id: string
        }
        Insert: {
          dosage: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          item_order?: number
          medication_name: string
          template_id: string
        }
        Update: {
          dosage?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          item_order?: number
          medication_name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prescription_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_templates: {
        Row: {
          created_at: string
          description: string | null
          general_instructions: string | null
          id: string
          is_shared: boolean | null
          prescription_type: Database["public"]["Enums"]["prescription_type_enum"]
          professional_id: string | null
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          general_instructions?: string | null
          id?: string
          is_shared?: boolean | null
          prescription_type?: Database["public"]["Enums"]["prescription_type_enum"]
          professional_id?: string | null
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          general_instructions?: string | null
          id?: string
          is_shared?: boolean | null
          prescription_type?: Database["public"]["Enums"]["prescription_type_enum"]
          professional_id?: string | null
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_templates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          created_at: string
          general_instructions: string | null
          id: string
          is_template: boolean | null
          patient_id: string
          pdf_file_path: string | null
          prescription_type: Database["public"]["Enums"]["prescription_type_enum"]
          professional_id: string
          signature_hash: string | null
          template_name: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          general_instructions?: string | null
          id?: string
          is_template?: boolean | null
          patient_id: string
          pdf_file_path?: string | null
          prescription_type?: Database["public"]["Enums"]["prescription_type_enum"]
          professional_id: string
          signature_hash?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          general_instructions?: string | null
          id?: string
          is_template?: boolean | null
          patient_id?: string
          pdf_file_path?: string | null
          prescription_type?: Database["public"]["Enums"]["prescription_type_enum"]
          professional_id?: string
          signature_hash?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_schedules: {
        Row: {
          day_of_week: number
          end_time: string
          id: number
          professional_id: string | null
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: number
          professional_id?: string | null
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: number
          professional_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_schedules_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          clinic_address: string | null
          clinic_cnpj: string | null
          clinic_name: string | null
          clinic_phone: string | null
          contact_phone: string | null
          created_at: string
          full_name: string
          id: string
          professional_registry: string | null
          registry_uf: string | null
          specialization: Database["public"]["Enums"]["specialization_enum"]
          user_id: string | null
        }
        Insert: {
          clinic_address?: string | null
          clinic_cnpj?: string | null
          clinic_name?: string | null
          clinic_phone?: string | null
          contact_phone?: string | null
          created_at?: string
          full_name: string
          id?: string
          professional_registry?: string | null
          registry_uf?: string | null
          specialization: Database["public"]["Enums"]["specialization_enum"]
          user_id?: string | null
        }
        Update: {
          clinic_address?: string | null
          clinic_cnpj?: string | null
          clinic_name?: string | null
          clinic_phone?: string | null
          contact_phone?: string | null
          created_at?: string
          full_name?: string
          id?: string
          professional_registry?: string | null
          registry_uf?: string | null
          specialization?: Database["public"]["Enums"]["specialization_enum"]
          user_id?: string | null
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tooth_procedures: {
        Row: {
          created_at: string
          faces: Database["public"]["Enums"]["tooth_face_enum"][] | null
          id: string
          material_used: string | null
          notes: string | null
          patient_id: string
          procedure_date: string
          procedure_type: string
          professional_id: string | null
          status: string | null
          status_after: Database["public"]["Enums"]["tooth_status_enum"]
          status_before: Database["public"]["Enums"]["tooth_status_enum"] | null
          tooth_number: number
        }
        Insert: {
          created_at?: string
          faces?: Database["public"]["Enums"]["tooth_face_enum"][] | null
          id?: string
          material_used?: string | null
          notes?: string | null
          patient_id: string
          procedure_date?: string
          procedure_type: string
          professional_id?: string | null
          status?: string | null
          status_after: Database["public"]["Enums"]["tooth_status_enum"]
          status_before?:
            | Database["public"]["Enums"]["tooth_status_enum"]
            | null
          tooth_number: number
        }
        Update: {
          created_at?: string
          faces?: Database["public"]["Enums"]["tooth_face_enum"][] | null
          id?: string
          material_used?: string | null
          notes?: string | null
          patient_id?: string
          procedure_date?: string
          procedure_type?: string
          professional_id?: string | null
          status?: string | null
          status_after?: Database["public"]["Enums"]["tooth_status_enum"]
          status_before?:
            | Database["public"]["Enums"]["tooth_status_enum"]
            | null
          tooth_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tooth_procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_procedures_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_items: {
        Row: {
          appointment_id: string | null
          completed_at: string | null
          created_at: string
          estimated_cost: number | null
          id: string
          notes: string | null
          priority: number | null
          procedure_description: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["treatment_plan_item_status_enum"]
          tooth_number: number | null
          treatment_id: string | null
          treatment_plan_id: string
        }
        Insert: {
          appointment_id?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          priority?: number | null
          procedure_description: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_item_status_enum"]
          tooth_number?: number | null
          treatment_id?: string | null
          treatment_plan_id: string
        }
        Update: {
          appointment_id?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          priority?: number | null
          procedure_description?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_item_status_enum"]
          tooth_number?: number | null
          treatment_id?: string | null
          treatment_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_items_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_items_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          professional_id: string
          status: Database["public"]["Enums"]["treatment_plan_status_enum"]
          title: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          professional_id: string
          status?: Database["public"]["Enums"]["treatment_plan_status_enum"]
          title?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          professional_id?: string
          status?: Database["public"]["Enums"]["treatment_plan_status_enum"]
          title?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          cost: number | null
          default_duration_minutes: number
          description: string | null
          id: string
          treatment_name: string
        }
        Insert: {
          cost?: number | null
          default_duration_minutes: number
          description?: string | null
          id?: string
          treatment_name: string
        }
        Update: {
          cost?: number | null
          default_duration_minutes?: number
          description?: string | null
          id?: string
          treatment_name?: string
        }
        Relationships: []
      }
      waiting_list: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          professional_id: string
          treatment_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          professional_id: string
          treatment_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          professional_id?: string
          treatment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_professional_id: { Args: { _user_id: string }; Returns: string }
      is_professional: { Args: { _user_id: string }; Returns: boolean }
      is_receptionist: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      appointment_status_enum:
        | "Scheduled"
        | "Confirmed"
        | "Completed"
        | "Cancelled"
        | "No-Show"
        | "Pending Confirmation"
        | "Patient Arrived"
      block_type_enum: "full_day" | "morning" | "afternoon" | "custom"
      certificate_type_enum: "attendance" | "medical_leave" | "fitness"
      expense_category_enum:
        | "rent"
        | "utilities"
        | "supplies"
        | "equipment"
        | "salary"
        | "marketing"
        | "maintenance"
        | "other"
      expense_status_enum: "pending" | "paid"
      goal_status_enum: "active" | "completed" | "cancelled"
      installment_plan_status_enum: "active" | "completed" | "cancelled"
      installment_status_enum: "pending" | "paid" | "overdue" | "cancelled"
      payment_method_enum:
        | "cash"
        | "credit_card"
        | "debit_card"
        | "pix"
        | "bank_transfer"
        | "insurance"
        | "boleto"
      payment_status_enum:
        | "pending"
        | "completed"
        | "cancelled"
        | "refunded"
        | "partial"
      prescription_type_enum: "simple" | "controlled" | "special"
      specialization_enum: "Cirurgião-Dentista" | "Ortodontista"
      tooth_face_enum:
        | "oclusal"
        | "mesial"
        | "distal"
        | "vestibular"
        | "lingual"
        | "incisal"
      tooth_status_enum:
        | "higido"
        | "cariado"
        | "obturado"
        | "extraido"
        | "tratamento_canal"
        | "coroa"
        | "implante"
        | "ausente"
        | "fratura"
      transaction_type_enum: "payment" | "refund" | "discount"
      treatment_plan_item_status_enum:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
      treatment_plan_status_enum:
        | "awaiting_payment"
        | "approved"
        | "in_progress"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status_enum: [
        "Scheduled",
        "Confirmed",
        "Completed",
        "Cancelled",
        "No-Show",
        "Pending Confirmation",
        "Patient Arrived",
      ],
      block_type_enum: ["full_day", "morning", "afternoon", "custom"],
      certificate_type_enum: ["attendance", "medical_leave", "fitness"],
      expense_category_enum: [
        "rent",
        "utilities",
        "supplies",
        "equipment",
        "salary",
        "marketing",
        "maintenance",
        "other",
      ],
      expense_status_enum: ["pending", "paid"],
      goal_status_enum: ["active", "completed", "cancelled"],
      installment_plan_status_enum: ["active", "completed", "cancelled"],
      installment_status_enum: ["pending", "paid", "overdue", "cancelled"],
      payment_method_enum: [
        "cash",
        "credit_card",
        "debit_card",
        "pix",
        "bank_transfer",
        "insurance",
        "boleto",
      ],
      payment_status_enum: [
        "pending",
        "completed",
        "cancelled",
        "refunded",
        "partial",
      ],
      prescription_type_enum: ["simple", "controlled", "special"],
      specialization_enum: ["Cirurgião-Dentista", "Ortodontista"],
      tooth_face_enum: [
        "oclusal",
        "mesial",
        "distal",
        "vestibular",
        "lingual",
        "incisal",
      ],
      tooth_status_enum: [
        "higido",
        "cariado",
        "obturado",
        "extraido",
        "tratamento_canal",
        "coroa",
        "implante",
        "ausente",
        "fratura",
      ],
      transaction_type_enum: ["payment", "refund", "discount"],
      treatment_plan_item_status_enum: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ],
      treatment_plan_status_enum: [
        "awaiting_payment",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
