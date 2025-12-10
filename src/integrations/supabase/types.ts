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
      follow_ups: {
        Row: {
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
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget?: string | null
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
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget?: string | null
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
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          lead_id: string
          message_type: Database["public"]["Enums"]["message_type"]
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          content: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          lead_id: string
          message_type?: Database["public"]["Enums"]["message_type"]
          status?: Database["public"]["Enums"]["message_status"]
        }
        Update: {
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
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          area: string
          bhk: string
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
        Relationships: []
      }
      site_visits: {
        Row: {
          assigned_to: string | null
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
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          action: string
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role: "admin" | "manager" | "agent" | "telecaller"
      follow_up_status: "pending" | "completed" | "missed"
      follow_up_type: "call" | "whatsapp" | "meeting" | "email"
      lead_stage:
        | "new"
        | "contacted"
        | "follow-up"
        | "site-visit"
        | "negotiation"
        | "closed-won"
        | "closed-lost"
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
      app_role: ["admin", "manager", "agent", "telecaller"],
      follow_up_status: ["pending", "completed", "missed"],
      follow_up_type: ["call", "whatsapp", "meeting", "email"],
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
    },
  },
} as const
