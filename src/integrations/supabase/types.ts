export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          created_at: string
          email: string
          gst_number: string | null
          id: string
          industry: Database["public"]["Enums"]["industry_type"]
          logo_url: string | null
          name: string
          pan_number: string | null
          phone: string | null
          updated_at: string
          user_limit: number
          allow_login: boolean
          account_status: Database["public"]["Enums"]["company_account_status"]
          status_notes: string | null
          webhook_token: string | null
          meta_verify_token: string | null
          enable_meta_leads: boolean | null
          whatsapp_provider: string | null
          meta_phone_number_id: string | null
          meta_whatsapp_number: string | null
          meta_waba_id: string | null
          meta_access_token: string | null
          meta_webhook_verify_token: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          gst_number?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          logo_url?: string | null
          name: string
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
          user_limit?: number
          allow_login?: boolean
          account_status?: Database["public"]["Enums"]["company_account_status"]
          status_notes?: string | null
          webhook_token?: string | null
          meta_verify_token?: string | null
          enable_meta_leads?: boolean | null
          whatsapp_provider?: string | null
          meta_phone_number_id?: string | null
          meta_whatsapp_number?: string | null
          meta_waba_id?: string | null
          meta_access_token?: string | null
          meta_webhook_verify_token?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          gst_number?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          logo_url?: string | null
          name?: string
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
          user_limit?: number
          allow_login?: boolean
          account_status?: Database["public"]["Enums"]["company_account_status"]
          status_notes?: string | null
          webhook_token?: string | null
          meta_verify_token?: string | null
          enable_meta_leads?: boolean | null
          whatsapp_provider?: string | null
          meta_phone_number_id?: string | null
          meta_whatsapp_number?: string | null
          meta_waba_id?: string | null
          meta_access_token?: string | null
          meta_webhook_verify_token?: string | null
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
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
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date: string
          follow_up_time: string
          id?: string
          lead_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          type?: Database["public"]["Enums"]["follow_up_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
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
            foreignKeyName: "follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          }
        ]
      }
      leads: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          location: string | null
          property_type: string | null
          budget: string | null
          source: string | null
          notes: string | null
          tags: string[] | null
          stage: Database["public"]["Enums"]["lead_stage"]
          lead_status: Database["public"]["Enums"]["lead_status"] | null
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          last_contact: string | null
          lead_score: number | null
          score_reasoning: string | null
          scored_at: string | null
          company_id: string | null
          property_purchased_id: string | null
          deal_price: string | null
          buyer_commission_pct: number | null
          seller_commission_pct: number | null
          buyer_paid: number | null
          seller_paid: number | null
          deal_status: string | null
          deal_closed_at: string | null
          is_telephony_enabled: boolean | null
          last_called_at: string | null
          raw_payload: Json | null
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          location?: string | null
          property_type?: string | null
          budget?: string | null
          source?: string | null
          notes?: string | null
          tags?: string[] | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          lead_status?: Database["public"]["Enums"]["lead_status"] | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          last_contact?: string | null
          lead_score?: number | null
          score_reasoning?: string | null
          scored_at?: string | null
          company_id?: string | null
          property_purchased_id?: string | null
          deal_price?: string | null
          buyer_commission_pct?: number | null
          seller_commission_pct?: number | null
          buyer_paid?: number | null
          seller_paid?: number | null
          deal_status?: string | null
          deal_closed_at?: string | null
          is_telephony_enabled?: boolean | null
          last_called_at?: string | null
          raw_payload?: Json | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          location?: string | null
          property_type?: string | null
          budget?: string | null
          source?: string | null
          notes?: string | null
          tags?: string[] | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          lead_status?: Database["public"]["Enums"]["lead_status"] | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          last_contact?: string | null
          lead_score?: number | null
          score_reasoning?: string | null
          scored_at?: string | null
          company_id?: string | null
          property_purchased_id?: string | null
          deal_price?: string | null
          buyer_commission_pct?: number | null
          seller_commission_pct?: number | null
          buyer_paid?: number | null
          seller_paid?: number | null
          deal_status?: string | null
          deal_closed_at?: string | null
          is_telephony_enabled?: boolean | null
          last_called_at?: string | null
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      lead_history: {
        Row: {
          id: string
          lead_id: string
          lead_entity: Database["public"]["Enums"]["lead_entity"]
          company_id: string
          created_by: string
          created_at: string
          interaction_type: string
          message: string
          raw_data: Json
          visibility: string
        }
        Insert: {
          id?: string
          lead_id: string
          lead_entity: Database["public"]["Enums"]["lead_entity"]
          company_id: string
          created_by?: string
          created_at?: string
          interaction_type: string
          message: string
          raw_data?: Json
          visibility?: string
        }
        Update: {
          id?: string
          lead_id?: string
          lead_entity?: Database["public"]["Enums"]["lead_entity"]
          company_id?: string
          created_by?: string
          created_at?: string
          interaction_type?: string
          message?: string
          raw_data?: Json
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      profiles: {
        Row: {
          agent_identity: string | null
          company_id: string | null
          created_at: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
          user_id: string
          allow_login: boolean
        }
        Insert: {
          agent_identity?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id: string
          allow_login?: boolean
        }
        Update: {
          agent_identity?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id?: string
          allow_login?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[] | null
          area_sqft: number | null
          bhk: number | null
          city: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          location: string | null
          price: number | null
          property_type: string | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          area_sqft?: number | null
          bhk?: number | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          price?: number | null
          property_type?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          area_sqft?: number | null
          bhk?: number | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          price?: number | null
          property_type?: string | null
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
          }
        ]
      }
      source_configs: {
        Row: {
          id: string
          company_id: string
          source_name: string
          method: string
          webhook_config: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          source_name: string
          method?: string
          webhook_config?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          source_name?: string
          method?: string
          webhook_config?: Json
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
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
            foreignKeyName: "site_visits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          company_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      enrollments: {
        Row: {
          batch_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          enrollment_date: string
          fees_paid: number | null
          fees_pending: number | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          teacher_id: string | null
          total_fees: number | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          fees_paid?: number | null
          fees_pending?: number | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          teacher_id?: string | null
          total_fees?: number | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          fees_paid?: number | null
          fees_pending?: number | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          teacher_id?: string | null
          total_fees?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          company_id: string | null
          created_at: string
          enrollment_id: string
          id: string
          marked_by: string | null
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          attendance_date: string
          company_id?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          company_id?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      teacher_attendance: {
        Row: {
          attendance_date: string
          company_id: string | null
          created_at: string
          id: string
          marked_by: string | null
          notes: string | null
          status: Database["public"]["Enums"]["teacher_attendance_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          company_id?: string | null
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["teacher_attendance_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          company_id?: string | null
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["teacher_attendance_status"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
          gender: string | null
          id: string
          insurance_coverage_type: string | null
          insurance_policy_id: string | null
          insurance_provider_name: string | null
          insurance_remarks: string | null
          insurance_tpa_contact: string | null
          insurance_validity_date: string | null
          medical_conditions: string[] | null
          medical_id: string | null
          aadhar_number: string | null
          name: string
          notes: string | null
          past_surgeries_history: string | null
          phone: string
          stage: Database["public"]["Enums"]["patient_stage"]
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
          gender?: string | null
          id?: string
          insurance_coverage_type?: string | null
          insurance_policy_id?: string | null
          insurance_provider_name?: string | null
          insurance_remarks?: string | null
          insurance_tpa_contact?: string | null
          insurance_validity_date?: string | null
          medical_conditions?: string[] | null
          medical_id?: string | null
          aadhar_number?: string | null
          name: string
          notes?: string | null
          past_surgeries_history?: string | null
          phone: string
          stage?: Database["public"]["Enums"]["patient_stage"]
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
          gender?: string | null
          id?: string
          insurance_coverage_type?: string | null
          insurance_policy_id?: string | null
          insurance_provider_name?: string | null
          insurance_remarks?: string | null
          insurance_tpa_contact?: string | null
          insurance_validity_date?: string | null
          medical_conditions?: string[] | null
          medical_id?: string | null
          aadhar_number?: string | null
          name?: string
          notes?: string | null
          past_surgeries_history?: string | null
          phone?: string
          stage?: Database["public"]["Enums"]["patient_stage"]
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
          }
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          sku: string | null
          barcode: string | null
          category: string | null
          unit_type: string
          selling_price: number
          purchase_price: number | null
          tax_percentage: number
          stock_quantity: number
          created_by: string | null
          created_at: string
          updated_at: string
          company_id: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sku?: string | null
          barcode?: string | null
          category?: string | null
          unit_type?: string
          selling_price: number
          purchase_price?: number | null
          tax_percentage?: number
          stock_quantity?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          company_id: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sku?: string | null
          barcode?: string | null
          category?: string | null
          unit_type?: string
          selling_price?: number
          purchase_price?: number | null
          tax_percentage?: number
          stock_quantity?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      whatsapp_conversations: {
        Row: {
          id: string
          company_id: string
          contact_phone: string
          contact_name: string | null
          last_message_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          contact_phone: string
          contact_name?: string | null
          last_message_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          contact_phone?: string
          contact_name?: string | null
          last_message_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      whatsapp_messages: {
        Row: {
          id: string
          conversation_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          body: string
          status: string
          message_sid: string | null
          created_at: string
          company_id: string
          file_urls: string[] | null
          file_names: string[] | null
          file_types: string[] | null
          reply_to_message_id: string | null
          reply_to_message_sid: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          body: string
          status?: string
          message_sid?: string | null
          created_at?: string
          company_id: string
          file_urls?: string[] | null
          file_names?: string[] | null
          file_types?: string[] | null
          reply_to_message_id?: string | null
          reply_to_message_sid?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          body?: string
          status?: string
          message_sid?: string | null
          created_at?: string
          company_id?: string
          file_urls?: string[] | null
          file_names?: string[] | null
          file_types?: string[] | null
          reply_to_message_id?: string | null
          reply_to_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          }
        ]
      }
      whatsapp_settings: {
        Row: {
          id: string
          company_id: string
          twilio_sid: string
          twilio_auth_token: string
          whatsapp_number: string
          twilio_api_key_sid: string | null
          twilio_api_key_secret: string | null
          twilio_twiml_app_sid: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          twilio_sid: string
          twilio_auth_token: string
          whatsapp_number: string
          twilio_api_key_sid?: string | null
          twilio_api_key_secret?: string | null
          twilio_twiml_app_sid?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          twilio_sid?: string
          twilio_auth_token?: string
          whatsapp_number?: string
          twilio_api_key_sid?: string | null
          twilio_api_key_secret?: string | null
          twilio_twiml_app_sid?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      students: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string
          date_of_birth: string | null
          address: string | null
          parent_name: string | null
          parent_phone: string | null
          parent_email: string | null
          notes: string[] | null
          tags: string[] | null
          stage: Database["public"]["Enums"]["student_stage"] | null
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          company_id: string | null
          is_telephony_enabled: boolean | null
          last_called_at: string | null
          raw_payload: Json | null
          source: string | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone: string
          date_of_birth?: string | null
          address?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_email?: string | null
          notes?: string[] | null
          tags?: string[] | null
          stage?: Database["public"]["Enums"]["student_stage"] | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          company_id?: string | null
          is_telephony_enabled?: boolean | null
          last_called_at?: string | null
          raw_payload?: Json | null
          source?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string
          date_of_birth?: string | null
          address?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_email?: string | null
          notes?: string[] | null
          tags?: string[] | null
          stage?: Database["public"]["Enums"]["student_stage"] | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          company_id?: string | null
          is_telephony_enabled?: boolean | null
          last_called_at?: string | null
          raw_payload?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "students_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      wallets: {
        Row: {
          id: string
          company_id: string
          balance: number
          currency: string | null
          min_balance_threshold: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          balance?: number
          currency?: string | null
          min_balance_threshold?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          balance?: number
          currency?: string | null
          min_balance_threshold?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      wallet_transactions: {
        Row: {
          id: string
          company_id: string
          type: string
          provider: string | null
          service_type: string | null
          amount_inr: number
          usage_quantity: number | null
          destination_country: string | null
          message_category: string | null
          reference_id: string | null
          twilio_actual_price: number | null
          twilio_price_currency: string | null
          status: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          type: string
          provider?: string | null
          service_type?: string | null
          amount_inr: number
          usage_quantity?: number | null
          destination_country?: string | null
          message_category?: string | null
          reference_id?: string | null
          twilio_actual_price?: number | null
          twilio_price_currency?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          type?: string
          provider?: string | null
          service_type?: string | null
          amount_inr?: number
          usage_quantity?: number | null
          destination_country?: string | null
          message_category?: string | null
          reference_id?: string | null
          twilio_actual_price?: number | null
          twilio_price_currency?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      usage_logs: {
        Row: {
          id: string
          company_id: string
          provider: string
          service_type: string
          usage_type: string
          quantity: number
          destination_country: string | null
          message_category: string | null
          credits_deducted: number
          twilio_actual_price: number | null
          reference_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          provider: string
          service_type: string
          usage_type: string
          quantity: number
          destination_country?: string | null
          message_category?: string | null
          credits_deducted: number
          twilio_actual_price?: number | null
          reference_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          provider?: string
          service_type?: string
          usage_type?: string
          quantity?: number
          destination_country?: string | null
          message_category?: string | null
          credits_deducted?: number
          twilio_actual_price?: number | null
          reference_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      service_pricing: {
        Row: {
          id: string
          provider: string
          service_type: string
          destination_country: string
          message_category: string | null
          client_price_inr: number
          your_cost_usd: number | null
          unit: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          provider: string
          service_type: string
          destination_country: string
          message_category?: string | null
          client_price_inr: number
          your_cost_usd?: number | null
          unit: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          provider?: string
          service_type?: string
          destination_country?: string
          message_category?: string | null
          client_price_inr?: number
          your_cost_usd?: number | null
          unit?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          id: string
          company_id: string
          created_by: string
          assigned_to: string | null
          industry_type: string
          title: string
          description: string
          status: Database["public"]["Enums"]["ticket_status"]
          priority: Database["public"]["Enums"]["ticket_priority"]
          category: Database["public"]["Enums"]["ticket_category"]
          tags: string[]
          ticket_number: number
          is_read_by_admin: boolean
          is_read_by_client: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          created_by: string
          assigned_to?: string | null
          industry_type: string
          title: string
          description: string
          status?: Database["public"]["Enums"]["ticket_status"]
          priority?: Database["public"]["Enums"]["ticket_priority"]
          category?: Database["public"]["Enums"]["ticket_category"]
          tags?: string[]
          ticket_number?: number
          is_read_by_admin?: boolean
          is_read_by_client?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          created_by?: string
          assigned_to?: string | null
          industry_type?: string
          title?: string
          description?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          priority?: Database["public"]["Enums"]["ticket_priority"]
          category?: Database["public"]["Enums"]["ticket_category"]
          tags?: string[]
          ticket_number?: number
          is_read_by_admin?: boolean
          is_read_by_client?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      support_messages: {
        Row: {
          id: string
          ticket_id: string
          company_id: string
          sender_id: string
          sender_type: Database["public"]["Enums"]["ticket_message_sender"]
          message: string
          is_internal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          company_id: string
          sender_id: string
          sender_type: Database["public"]["Enums"]["ticket_message_sender"]
          message: string
          is_internal?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          company_id?: string
          sender_id?: string
          sender_type?: Database["public"]["Enums"]["ticket_message_sender"]
          message?: string
          is_internal?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      support_attachments: {
        Row: {
          id: string
          ticket_id: string
          message_id: string | null
          company_id: string
          file_name: string
          file_url: string
          file_size: number | null
          file_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          message_id?: string | null
          company_id: string
          file_name: string
          file_url: string
          file_size?: number | null
          file_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          message_id?: string | null
          company_id?: string
          file_name?: string
          file_url?: string
          file_size?: number | null
          file_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "sales"
      attendance_status: "present" | "absent"
      company_account_status: "active" | "suspended"
      teacher_attendance_status: "present" | "half_day" | "absent"
      enrollment_status: "active" | "completed" | "cancelled" | "on_hold"
      follow_up_status: "pending" | "completed" | "missed"
      follow_up_type: "call" | "whatsapp" | "meeting" | "email"
      industry_type: "real_estate" | "education" | "healthcare" | "automobile_dealers" | "online_business" | "internal_crm"
      lead_entity: "leads" | "auto_leads" | "students" | "internal_leads"
      lead_stage: "new" | "contacted" | "follow-up" | "site-visit" | "negotiation" | "closed-won" | "closed-lost"
      lead_status: "hot" | "warm" | "cold"
      patient_stage: "new_patient_inquiry" | "appointment_scheduled" | "checked_in_visit_started" | "consultation_treatment_completed" | "billing_payment_pending" | "payment_completed" | "follow_up_scheduled"
      message_direction: "incoming" | "outgoing"
      message_status: "sent" | "delivered" | "read"
      message_type: "text" | "image" | "document"
      property_status: "available" | "sold" | "upcoming"
      site_visit_status: "scheduled" | "completed" | "cancelled"
      student_stage: "new_students" | "contacted" | "demo_scheduled" | "demo_attended" | "interested" | "fees_discussed" | "enrolled" | "lost"
      workflow_status: "active" | "inactive"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_category: "bug" | "feature_request" | "help" | "integration" | "billing" | "other"
      ticket_message_sender: "client" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never
