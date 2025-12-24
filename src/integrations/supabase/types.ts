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
          city: string | null
          company_name: string
          created_at: string
          id: string
          industry_type: Database["public"]["Enums"]["industry_type"] | null
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          created_at?: string
          id?: string
          industry_type?: Database["public"]["Enums"]["industry_type"] | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          id?: string
          industry_type?: Database["public"]["Enums"]["industry_type"] | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
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
          address: string | null
          budget_max: number | null
          budget_min: number | null
          city: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          lead_status: Database["public"]["Enums"]["lead_status"] | null
          name: string
          notes: string | null
          phone: string
          property_type: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_status?: Database["public"]["Enums"]["lead_status"] | null
          name: string
          notes?: string | null
          phone: string
          property_type?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_status?: Database["public"]["Enums"]["lead_status"] | null
          name?: string
          notes?: string | null
          phone?: string
          property_type?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          state?: string | null
          updated_at?: string
          zip_code?: string | null
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
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "sales"
      attendance_status: "present" | "absent" | "late" | "excused"
      enrollment_status: "active" | "completed" | "cancelled" | "on_hold"
      follow_up_status: "pending" | "completed" | "missed"
      follow_up_type: "call" | "whatsapp" | "meeting" | "email"
      industry_type: "real_estate" | "education" | "healthcare" | "automobile_dealers" | "online_business"
      lead_stage: "new" | "contacted" | "follow-up" | "site-visit" | "negotiation" | "closed-won" | "closed-lost"
      lead_status: "hot" | "warm" | "cold"
      message_direction: "incoming" | "outgoing"
      message_status: "sent" | "delivered" | "read"
      message_type: "text" | "image" | "document"
      property_status: "available" | "sold" | "upcoming"
      site_visit_status: "scheduled" | "completed" | "cancelled"
      workflow_status: "active" | "inactive"
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
