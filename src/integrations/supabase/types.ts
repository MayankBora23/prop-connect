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
    Json: Json
    Tables: {
      companies: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          industry: Database["public"]["Enums"]["industry_type"] | null
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"] | null
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"] | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          follow_up_date: string
          follow_up_time: string
          id: string
          lead_id: string
          notes: string | null
          status: Database["public"]["Enums"]["follow_up_status"]
          type: Database["public"]["Enums"]["follow_up_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date: string
          follow_up_time: string
          id?: string
          lead_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          type: Database["public"]["Enums"]["follow_up_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string
          follow_up_time?: string
          id?: string
          lead_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          type?: Database["public"]["Enums"]["follow_up_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          last_contact: string
          lead_score: number | null
          location: string | null
          name: string
          notes: string[] | null
          phone: string
          property_type: string | null
          score_reasoning: string | null
          scored_at: string | null
          source: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          lead_status: Database["public"]["Enums"]["lead_status"] | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          last_contact?: string
          lead_score?: number | null
          location?: string | null
          name: string
          notes?: string[] | null
          phone: string
          property_type?: string | null
          score_reasoning?: string | null
          scored_at?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          lead_status?: Database["public"]["Enums"]["lead_status"] | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          last_contact?: string
          lead_score?: number | null
          location?: string | null
          name?: string
          notes?: string[] | null
          phone?: string
          property_type?: string | null
          score_reasoning?: string | null
          scored_at?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          lead_status?: Database["public"]["Enums"]["lead_status"] | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          company_id: string | null
          content: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          lead_id: string
          message_type: Database["public"]["Enums"]["message_type"]
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          lead_id: string
          message_type?: Database["public"]["Enums"]["message_type"]
          status?: Database["public"]["Enums"]["message_status"]
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          lead_id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          status?: Database["public"]["Enums"]["message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          area: string
          bhk: string
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          images: string[] | null
          location: string
          price: string
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
        }
        Insert: {
          area: string
          bhk: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          location: string
          price: string
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
        }
        Update: {
          area?: string
          bhk?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string
          price?: string
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          feedback: string | null
          id: string
          lead_id: string
          property_id: string
          status: Database["public"]["Enums"]["site_visit_status"]
          updated_at: string
          visit_date: string
          visit_time: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          feedback?: string | null
          id?: string
          lead_id: string
          property_id: string
          status?: Database["public"]["Enums"]["site_visit_status"]
          updated_at?: string
          visit_date: string
          visit_time: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          feedback?: string | null
          id?: string
          lead_id?: string
          property_id?: string
          status?: Database["public"]["Enums"]["site_visit_status"]
          updated_at?: string
          visit_date?: string
          visit_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_run: string | null
          name: string
          runs_count: number
          status: Database["public"]["Enums"]["workflow_status"]
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_run?: string | null
          name: string
          runs_count?: number
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_run?: string | null
          name?: string
          runs_count?: number
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          appointment_type: string
          company_id: string | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          doctor_name: string
          duration_minutes: number | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          symptoms: string | null
          treatment: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          appointment_type: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          doctor_name: string
          duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          symptoms?: string | null
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          appointment_type?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          doctor_name?: string
          duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          symptoms?: string | null
          treatment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      billing: {
        Row: {
          amount: number
          appointment_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          due_date: string | null
          id: string
          insurance_amount: number | null
          insurance_claimed: boolean | null
          invoice_number: string | null
          notes: string | null
          patient_id: string
          payment_date: string | null
          payment_method: string | null
          service_description: string
          status: Database["public"]["Enums"]["billing_status"]
          tax_amount: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          insurance_amount?: number | null
          insurance_claimed?: boolean | null
          invoice_number?: string | null
          notes?: string | null
          patient_id: string
          payment_date?: string | null
          payment_method?: string | null
          service_description: string
          status?: Database["public"]["Enums"]["billing_status"]
          tax_amount?: number | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          insurance_amount?: number | null
          insurance_claimed?: boolean | null
          invoice_number?: string | null
          notes?: string | null
          patient_id?: string
          payment_date?: string | null
          payment_method?: string | null
          service_description?: string
          status?: Database["public"]["Enums"]["billing_status"]
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_details: {
        Row: {
          co_payment_amount: number | null
          company_id: string | null
          coverage_percentage: number | null
          coverage_type: string
          created_at: string
          created_by: string | null
          deductible_amount: number | null
          id: string
          max_coverage_amount: number | null
          notes: string | null
          patient_id: string
          policy_number: string
          provider_name: string
          status: Database["public"]["Enums"]["insurance_status"]
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          co_payment_amount?: number | null
          company_id?: string | null
          coverage_percentage?: number | null
          coverage_type: string
          created_at?: string
          created_by?: string | null
          deductible_amount?: number | null
          id?: string
          max_coverage_amount?: number | null
          notes?: string | null
          patient_id: string
          policy_number: string
          provider_name: string
          status?: Database["public"]["Enums"]["insurance_status"]
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          co_payment_amount?: number | null
          company_id?: string | null
          coverage_percentage?: number | null
          coverage_type?: string
          created_at?: string
          created_by?: string | null
          deductible_amount?: number | null
          id?: string
          max_coverage_amount?: number | null
          notes?: string | null
          patient_id?: string
          policy_number?: string
          provider_name?: string
          status?: Database["public"]["Enums"]["insurance_status"]
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_details_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          appointment_id: string | null
          attachments: string[] | null
          company_id: string | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          id: string
          medications_prescribed: string[] | null
          notes: string | null
          patient_id: string
          record_date: string
          record_type: string
          symptoms: string | null
          test_results: string | null
          title: string
          treatment: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          attachments?: string[] | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          medications_prescribed?: string[] | null
          notes?: string | null
          patient_id: string
          record_date: string
          record_type: string
          symptoms?: string | null
          test_results?: string | null
          title: string
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          attachments?: string[] | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          medications_prescribed?: string[] | null
          notes?: string | null
          patient_id?: string
          record_date?: string
          record_type?: string
          symptoms?: string | null
          test_results?: string | null
          title?: string
          treatment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          blood_type: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          medical_conditions: string[] | null
          medical_id: string | null
          name: string
          notes: string | null
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          phone: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          blood_type?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          medical_conditions?: string[] | null
          medical_id?: string | null
          name: string
          notes?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          blood_type?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          medical_conditions?: string[] | null
          medical_id?: string | null
          name?: string
          notes?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          dosage: string
          duration_days: number | null
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          medication_name: string
          notes: string | null
          patient_id: string
          prescribed_date: string
          refills_allowed: number | null
          refills_used: number | null
          status: string | null
          updated_at: string
          appointment_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          dosage: string
          duration_days?: number | null
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          medication_name: string
          notes?: string | null
          patient_id: string
          prescribed_date?: string
          refills_allowed?: number | null
          refills_used?: number | null
          status?: string | null
          updated_at?: string
          appointment_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          dosage?: string
          duration_days?: number | null
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          medication_name?: string
          notes?: string | null
          patient_id?: string
          prescribed_date?: string
          refills_allowed?: number | null
          refills_used?: number | null
          status?: string | null
          updated_at?: string
          appointment_id?: string | null
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
            foreignKeyName: "prescriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_leads: {
        Row: {
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          company_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          financing_needed: boolean | null
          id: string
          insurance_needed: boolean | null
          last_contact: string | null
          name: string
          notes: string[] | null
          phone: string
          preferred_brand: string | null
          preferred_model: string | null
          preferred_vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
          source: string | null
          status: string | null
          tags: string[] | null
          test_drive_requested: boolean | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          financing_needed?: boolean | null
          id?: string
          insurance_needed?: boolean | null
          last_contact?: string | null
          name: string
          notes?: string[] | null
          phone: string
          preferred_brand?: string | null
          preferred_model?: string | null
          preferred_vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          test_drive_requested?: boolean | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          financing_needed?: boolean | null
          id?: string
          insurance_needed?: boolean | null
          last_contact?: string | null
          name?: string
          notes?: string[] | null
          phone?: string
          preferred_brand?: string | null
          preferred_model?: string | null
          preferred_vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          test_drive_requested?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          deal_number: string | null
          delivery_date: string | null
          down_payment: number | null
          financed_amount: number | null
          final_price: number
          id: string
          lead_id: string
          payment_terms: string | null
          quote_id: string | null
          special_conditions: string | null
          status: Database["public"]["Enums"]["deal_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_number?: string | null
          delivery_date?: string | null
          down_payment?: number | null
          financed_amount?: number | null
          final_price: number
          id?: string
          lead_id: string
          payment_terms?: string | null
          quote_id?: string | null
          special_conditions?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_number?: string | null
          delivery_date?: string | null
          down_payment?: number | null
          financed_amount?: number | null
          final_price?: number
          id?: string
          lead_id?: string
          payment_terms?: string | null
          quote_id?: string | null
          special_conditions?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "auto_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_applications: {
        Row: {
          applicant_email: string | null
          applicant_name: string
          applicant_phone: string
          application_number: string | null
          approval_date: string | null
          bank_name: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          disbursement_date: string | null
          documents_required: string[] | null
          documents_submitted: string[] | null
          emi_amount: number | null
          employment_type: string | null
          id: string
          interest_rate: number | null
          lead_id: string
          monthly_income: number | null
          remarks: string | null
          requested_amount: number
          status: Database["public"]["Enums"]["finance_status"]
          tenure_months: number
          updated_at: string
        }
        Insert: {
          applicant_email?: string | null
          applicant_name: string
          applicant_phone: string
          application_number?: string | null
          approval_date?: string | null
          bank_name?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          disbursement_date?: string | null
          documents_required?: string[] | null
          documents_submitted?: string[] | null
          emi_amount?: number | null
          employment_type?: string | null
          id?: string
          interest_rate?: number | null
          lead_id: string
          monthly_income?: number | null
          remarks?: string | null
          requested_amount: number
          status?: Database["public"]["Enums"]["finance_status"]
          tenure_months: number
          updated_at?: string
        }
        Update: {
          applicant_email?: string | null
          applicant_name?: string
          applicant_phone?: string
          application_number?: string | null
          approval_date?: string | null
          bank_name?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          disbursement_date?: string | null
          documents_required?: string[] | null
          documents_submitted?: string[] | null
          emi_amount?: number | null
          employment_type?: string | null
          id?: string
          interest_rate?: number | null
          lead_id?: string
          monthly_income?: number | null
          remarks?: string | null
          requested_amount?: number
          status?: Database["public"]["Enums"]["finance_status"]
          tenure_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_applications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_applications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "auto_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_sales: {
        Row: {
          agent_name: string | null
          commission_amount: number | null
          company_id: string | null
          coverage_amount: number
          created_at: string
          created_by: string | null
          deal_id: string | null
          end_date: string
          id: string
          insurance_type: string
          lead_id: string | null
          policy_number: string | null
          policy_term_months: number
          premium_amount: number
          provider_name: string
          remarks: string | null
          start_date: string
          status: Database["public"]["Enums"]["insurance_sale_status"]
          updated_at: string
        }
        Insert: {
          agent_name?: string | null
          commission_amount?: number | null
          company_id?: string | null
          coverage_amount: number
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          end_date: string
          id?: string
          insurance_type: string
          lead_id?: string | null
          policy_number?: string | null
          policy_term_months: number
          premium_amount: number
          provider_name: string
          remarks?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["insurance_sale_status"]
          updated_at?: string
        }
        Update: {
          agent_name?: string | null
          commission_amount?: number | null
          company_id?: string | null
          coverage_amount?: number
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          end_date?: string
          id?: string
          insurance_type?: string
          lead_id?: string | null
          policy_number?: string | null
          policy_term_months?: number
          premium_amount?: number
          provider_name?: string
          remarks?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["insurance_sale_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_sales_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "auto_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accessories_cost: number | null
          company_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          finance_cost: number | null
          id: string
          insurance_cost: number | null
          lead_id: string | null
          notes: string | null
          quote_number: string | null
          registration_cost: number | null
          status: Database["public"]["Enums"]["quote_status"]
          terms_conditions: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
          vehicle_id: string
          vehicle_price: number
        }
        Insert: {
          accessories_cost?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          finance_cost?: number | null
          id?: string
          insurance_cost?: number | null
          lead_id?: string | null
          notes?: string | null
          quote_number?: string | null
          registration_cost?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          terms_conditions?: string | null
          total_amount: number
          updated_at?: string
          valid_until?: string | null
          vehicle_id: string
          vehicle_price: number
        }
        Update: {
          accessories_cost?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          finance_cost?: number | null
          id?: string
          insurance_cost?: number | null
          lead_id?: string | null
          notes?: string | null
          quote_number?: string | null
          registration_cost?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          terms_conditions?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          vehicle_id?: string
          vehicle_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "auto_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_drives: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          driver_license: string | null
          driver_name: string
          driver_phone: string
          duration_minutes: number | null
          feedback: string | null
          id: string
          lead_id: string | null
          rating: number | null
          status: Database["public"]["Enums"]["test_drive_status"]
          test_drive_date: string
          test_drive_time: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_license?: string | null
          driver_name: string
          driver_phone: string
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          lead_id?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["test_drive_status"]
          test_drive_date: string
          test_drive_time: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_license?: string | null
          driver_name?: string
          driver_phone?: string
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          lead_id?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["test_drive_status"]
          test_drive_date?: string
          test_drive_time?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_drives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_drives_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "auto_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_drives_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_images: {
        Row: {
          company_id: string | null
          created_at: string
          display_order: number | null
          id: string
          image_type: string | null
          image_url: string
          is_primary: boolean | null
          vehicle_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_type?: string | null
          image_url: string
          is_primary?: boolean | null
          vehicle_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_type?: string | null
          image_url?: string
          is_primary?: boolean | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          color: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          engine_capacity: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          images: string[] | null
          location: string | null
          mileage: number | null
          model: string
          price: number
          seating_capacity: number | null
          specifications: Database["public"]["Json"] | null
          status: Database["public"]["Enums"]["vehicle_status"]
          stock_number: string | null
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at: string
          variant: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vin: string | null
          year: number
        }
        Insert: {
          brand: string
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          engine_capacity?: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id?: string
          images?: string[] | null
          location?: string | null
          mileage?: number | null
          model: string
          price: number
          seating_capacity?: number | null
          specifications?: Database["public"]["Json"] | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          stock_number?: string | null
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          variant?: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vin?: string | null
          year: number
        }
        Update: {
          brand?: string
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          engine_capacity?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          images?: string[] | null
          location?: string | null
          mileage?: number | null
          model?: string
          price?: number
          seating_capacity?: number | null
          specifications?: Database["public"]["Json"] | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          stock_number?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          variant?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vin?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      barcodes: {
        Row: {
          barcode_image_url: string | null
          barcode_type: Database["public"]["Enums"]["barcode_type"]
          barcode_value: string
          company_id: string | null
          created_at: string
          generated_by: string | null
          id: string
          product_id: string
        }
        Insert: {
          barcode_image_url?: string | null
          barcode_type: Database["public"]["Enums"]["barcode_type"]
          barcode_value: string
          company_id?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          product_id: string
        }
        Update: {
          barcode_image_url?: string | null
          barcode_type?: Database["public"]["Enums"]["barcode_type"]
          barcode_value?: string
          company_id?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barcodes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: string[] | null
          company_id: string | null
          coupon_code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean | null
          maximum_discount: number | null
          minimum_purchase: number | null
          name: string
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          company_id?: string | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean | null
          maximum_discount?: number | null
          minimum_purchase?: number | null
          name: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          company_id?: string | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean | null
          maximum_discount?: number | null
          minimum_purchase?: number | null
          name?: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          available_quantity: number | null
          batch_number: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          product_id: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number
          reserved_quantity: number | null
          supplier_id: string | null
          updated_at: string
          variant_id: string | null
          warehouse_location: string | null
        }
        Insert: {
          batch_number?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity: number
          reserved_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string
          variant_id?: string | null
          warehouse_location?: string | null
        }
        Update: {
          batch_number?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number
          reserved_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string
          variant_id?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      online_customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_group: string | null
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: string
          last_order_date: string | null
          name: string
          notes: string | null
          phone: string
          pincode: string | null
          state: string | null
          tags: string[] | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_group?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_order_date?: string | null
          name: string
          notes?: string | null
          phone: string
          pincode?: string | null
          state?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_group?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_order_date?: string | null
          name?: string
          notes?: string | null
          phone?: string
          pincode?: string | null
          state?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          company_id: string | null
          created_at: string
          discount_amount: number | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          failure_reason: string | null
          id: string
          notes: string | null
          order_id: string
          payment_date: string | null
          payment_gateway: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          order_id: string
          payment_date?: string | null
          payment_gateway?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          payment_date?: string | null
          payment_gateway?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          additional_price: number | null
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
          updated_at: string
          variant_name: string
          variant_value: string
        }
        Insert: {
          additional_price?: number | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          variant_name: string
          variant_value: string
        }
        Update: {
          additional_price?: number | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          variant_name?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          base_price: number
          brand: string | null
          category: string | null
          company_id: string | null
          cost_price: number | null
          created_at: string
          created_by: string | null
          description: string | null
          dimensions: string | null
          id: string
          images: string[] | null
          is_digital: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          mrp: number | null
          name: string
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number | null
          tags: string[] | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          base_price: number
          brand?: string | null
          category?: string | null
          company_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          images?: string[] | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          mrp?: number | null
          name: string
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          base_price?: number
          brand?: string | null
          category?: string | null
          company_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          images?: string[] | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          mrp?: number | null
          name?: string
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          approved_by: string | null
          approved_date: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          refund_amount: number | null
          refund_status: Database["public"]["Enums"]["payment_status"] | null
          return_date: string
          return_items: Database["public"]["Json"] | null
          return_number: string | null
          return_reason: string | null
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          approved_date?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          refund_amount?: number | null
          refund_status?: Database["public"]["Enums"]["payment_status"] | null
          return_date?: string
          return_items?: Database["public"]["Json"] | null
          return_number?: string | null
          return_reason?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          approved_date?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          refund_amount?: number | null
          refund_status?: Database["public"]["Enums"]["payment_status"] | null
          return_date?: string
          return_items?: Database["public"]["Json"] | null
          return_number?: string | null
          return_reason?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          billing_address: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number | null
          discount_id: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          shipping_address: string | null
          shipping_amount: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipping_address?: string | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipping_address?: string | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "online_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone: string
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_level: {
        Args: {
          _min_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "sales"
      appointment_status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show"
      billing_status: "pending" | "paid" | "overdue" | "cancelled" | "refunded"
      follow_up_status: "pending" | "completed" | "missed"
      follow_up_type: "call" | "whatsapp" | "meeting" | "email"
      industry_type: "real_estate" | "education" | "healthcare" | "automobile_dealers" | "online_business"
      insurance_status: "active" | "expired" | "cancelled"
      lead_stage:
        | "new"
        | "contacted"
        | "follow-up"
        | "site-visit"
        | "negotiation"
        | "closed-won"
        | "closed-lost"
      lead_status: "hot" | "warm" | "cold"
      message_direction: "incoming" | "outgoing"
      message_status: "sent" | "delivered" | "read"
      message_type: "text" | "image" | "document"
      property_status: "available" | "sold" | "upcoming"
      site_visit_status: "scheduled" | "completed" | "cancelled"
      workflow_status: "active" | "inactive"
      vehicle_type: "car" | "bike"
      fuel_type: "petrol" | "diesel" | "electric" | "hybrid" | "cng"
      transmission_type: "manual" | "automatic" | "cvt" | "dct"
      vehicle_status: "available" | "sold" | "reserved" | "maintenance"
      test_drive_status: "scheduled" | "completed" | "cancelled" | "no_show"
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      deal_status: "pending" | "approved" | "completed" | "cancelled"
      finance_status: "applied" | "approved" | "rejected" | "disbursed"
      insurance_sale_status: "quoted" | "sold" | "cancelled"
      barcode_type: "EAN" | "UPC" | "CODE128" | "QR"
      order_status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      payment_method: "cash" | "card" | "upi" | "net_banking" | "wallet" | "cod"
      return_status: "requested" | "approved" | "received" | "refunded" | "rejected"
      discount_type: "percentage" | "fixed_amount"
      product_status: "active" | "inactive" | "discontinued"
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
      app_role: ["super_admin", "admin", "manager", "sales"],
      appointment_status: ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
      billing_status: ["pending", "paid", "overdue", "cancelled", "refunded"],
      follow_up_status: ["pending", "completed", "missed"],
      follow_up_type: ["call", "whatsapp", "meeting", "email"],
      industry_type: ["real_estate", "education", "healthcare", "automobile_dealers", "online_business"],
      insurance_status: ["active", "expired", "cancelled"],
      lead_stage: [
        "new",
        "contacted",
        "follow-up",
        "site-visit",
        "negotiation",
        "closed-won",
        "closed-lost",
      ],
      message_direction: ["incoming", "outgoing"],
      message_status: ["sent", "delivered", "read"],
      message_type: ["text", "image", "document"],
      property_status: ["available", "sold", "upcoming"],
      site_visit_status: ["scheduled", "completed", "cancelled"],
      workflow_status: ["active", "inactive"],
      vehicle_type: ["car", "bike"],
      fuel_type: ["petrol", "diesel", "electric", "hybrid", "cng"],
      transmission_type: ["manual", "automatic", "cvt", "dct"],
      vehicle_status: ["available", "sold", "reserved", "maintenance"],
      test_drive_status: ["scheduled", "completed", "cancelled", "no_show"],
      quote_status: ["draft", "sent", "accepted", "rejected", "expired"],
      deal_status: ["pending", "approved", "completed", "cancelled"],
      finance_status: ["applied", "approved", "rejected", "disbursed"],
      insurance_sale_status: ["quoted", "sold", "cancelled"],
      barcode_type: ["EAN", "UPC", "CODE128", "QR"],
      order_status: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      payment_method: ["cash", "card", "upi", "net_banking", "wallet", "cod"],
      return_status: ["requested", "approved", "received", "refunded", "rejected"],
      discount_type: ["percentage", "fixed_amount"],
      product_status: ["active", "inactive", "discontinued"],
    },
  },
} as const
