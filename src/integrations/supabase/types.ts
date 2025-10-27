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
          last_reminder_sent_at: string | null
          notes: string | null
          patient_id: string | null
          professional_id: string | null
          status: Database["public"]["Enums"]["appointment_status_enum"]
          treatment_id: string | null
        }
        Insert: {
          appointment_end_time: string
          appointment_start_time: string
          confirmation_sent_at?: string | null
          created_at?: string
          id?: string
          last_reminder_sent_at?: string | null
          notes?: string | null
          patient_id?: string | null
          professional_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status_enum"]
          treatment_id?: string | null
        }
        Update: {
          appointment_end_time?: string
          appointment_start_time?: string
          confirmation_sent_at?: string | null
          created_at?: string
          id?: string
          last_reminder_sent_at?: string | null
          notes?: string | null
          patient_id?: string | null
          professional_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status_enum"]
          treatment_id?: string | null
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
      expense_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          expense_id: string
          id: string
          installment_number: number
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          expense_id: string
          id?: string
          installment_number: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          expense_id?: string
          id?: string
          installment_number?: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_installments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category_enum"]
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          is_installment: boolean
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          receipt_url: string | null
          status: Database["public"]["Enums"]["expense_status_enum"]
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category_enum"]
          created_at?: string
          created_by?: string | null
          description: string
          expense_date: string
          id?: string
          is_installment?: boolean
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status_enum"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category_enum"]
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          is_installment?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status_enum"]
          updated_at?: string
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          created_at: string
          current_amount: number
          end_date: string
          goal_name: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["goal_status_enum"]
          target_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          end_date: string
          goal_name: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["goal_status_enum"]
          target_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          end_date?: string
          goal_name?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["goal_status_enum"]
          target_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          expected_receipt_date: string | null
          final_amount: number
          id: string
          net_amount: number | null
          notes: string | null
          patient_id: string
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          status: Database["public"]["Enums"]["payment_status_enum"]
          transaction_fee_amount: number | null
          transaction_fee_percentage: number | null
          transaction_type: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          expected_receipt_date?: string | null
          final_amount: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          patient_id: string
          payment_date?: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          status?: Database["public"]["Enums"]["payment_status_enum"]
          transaction_fee_amount?: number | null
          transaction_fee_percentage?: number | null
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          expected_receipt_date?: string | null
          final_amount?: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          patient_id?: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          status?: Database["public"]["Enums"]["payment_status_enum"]
          transaction_fee_amount?: number | null
          transaction_fee_percentage?: number | null
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          installment_plan_id: string
          notes: string | null
          payment_date: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          status: Database["public"]["Enums"]["installment_status_enum"]
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          installment_plan_id: string
          notes?: string | null
          payment_date?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          status?: Database["public"]["Enums"]["installment_status_enum"]
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          installment_plan_id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          status?: Database["public"]["Enums"]["installment_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          created_at: string
          first_due_date: string
          id: string
          installment_value: number
          status: Database["public"]["Enums"]["installment_plan_status_enum"]
          total_installments: number
          transaction_id: string
        }
        Insert: {
          created_at?: string
          first_due_date: string
          id?: string
          installment_value: number
          status?: Database["public"]["Enums"]["installment_plan_status_enum"]
          total_installments: number
          transaction_id: string
        }
        Update: {
          created_at?: string
          first_due_date?: string
          id?: string
          installment_value?: number
          status?: Database["public"]["Enums"]["installment_plan_status_enum"]
          total_installments?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
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
          created_at: string
          full_name: string
          id: string
          specialization: Database["public"]["Enums"]["specialization_enum"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          specialization: Database["public"]["Enums"]["specialization_enum"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
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
      payment_status_enum: "pending" | "completed" | "cancelled" | "refunded"
      specialization_enum: "Cirurgião-Dentista" | "Ortodontista"
      transaction_type_enum: "payment" | "refund" | "discount"
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
      ],
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
      payment_status_enum: ["pending", "completed", "cancelled", "refunded"],
      specialization_enum: ["Cirurgião-Dentista", "Ortodontista"],
      transaction_type_enum: ["payment", "refund", "discount"],
    },
  },
} as const
