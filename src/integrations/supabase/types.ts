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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      before_after: {
        Row: {
          after_url: string | null
          before_url: string | null
          created_at: string
          description: string | null
          id: string
          inbox: Json
          label: string | null
          media_error: string | null
          media_status: Database["public"]["Enums"]["media_status"]
          media_synced_at: string | null
          poster_time: number | null
          poster_url: string | null
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          after_url?: string | null
          before_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inbox?: Json
          label?: string | null
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          poster_time?: number | null
          poster_url?: string | null
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          after_url?: string | null
          before_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inbox?: Json
          label?: string | null
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          poster_time?: number | null
          poster_url?: string | null
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          inbox: Json
          line: string | null
          logo_url: string | null
          media_status: Database["public"]["Enums"]["media_status"]
          media_synced_at: string | null
          name: string
          published: boolean
          slug: string
          sort_order: number
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inbox?: Json
          line?: string | null
          logo_url?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          name: string
          published?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inbox?: Json
          line?: string | null
          logo_url?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          name?: string
          published?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          budget: string | null
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          source: string | null
        }
        Insert: {
          budget?: string | null
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          source?: string | null
        }
        Update: {
          budget?: string | null
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          source?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: number
          path: string
          referrer: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          path: string
          referrer?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          path?: string
          referrer?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          aspect_ratio: string
          brand_id: string | null
          brief: string | null
          caption: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          discipline: Database["public"]["Enums"]["discipline"]
          duration_s: number | null
          full_video_url: string | null
          id: string
          inbox: Json
          inbox_path: string | null
          is_featured: boolean
          is_premium: boolean
          is_xperience_original: boolean
          media_error: string | null
          media_status: Database["public"]["Enums"]["media_status"]
          media_synced_at: string | null
          og_url: string | null
          poster_source: string
          poster_time: number | null
          poster_url: string | null
          premium_order: number | null
          published: boolean
          result: string | null
          role: string | null
          show_caption: boolean
          slug: string
          sort_order: number
          subcategory: string | null
          teaser_url: string | null
          title: string
          tools: string[]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string
          brand_id?: string | null
          brief?: string | null
          caption?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          discipline: Database["public"]["Enums"]["discipline"]
          duration_s?: number | null
          full_video_url?: string | null
          id?: string
          inbox?: Json
          inbox_path?: string | null
          is_featured?: boolean
          is_premium?: boolean
          is_xperience_original?: boolean
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          og_url?: string | null
          poster_source?: string
          poster_time?: number | null
          poster_url?: string | null
          premium_order?: number | null
          published?: boolean
          result?: string | null
          role?: string | null
          show_caption?: boolean
          slug: string
          sort_order?: number
          subcategory?: string | null
          teaser_url?: string | null
          title: string
          tools?: string[]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string
          brand_id?: string | null
          brief?: string | null
          caption?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          discipline?: Database["public"]["Enums"]["discipline"]
          duration_s?: number | null
          full_video_url?: string | null
          id?: string
          inbox?: Json
          inbox_path?: string | null
          is_featured?: boolean
          is_premium?: boolean
          is_xperience_original?: boolean
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          og_url?: string | null
          poster_source?: string
          poster_time?: number | null
          poster_url?: string | null
          premium_order?: number | null
          published?: boolean
          result?: string | null
          role?: string | null
          show_caption?: boolean
          slug?: string
          sort_order?: number
          subcategory?: string | null
          teaser_url?: string | null
          title?: string
          tools?: string[]
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      section_media: {
        Row: {
          created_at: string
          desktop_url: string | null
          frames: Json
          inbox: Json
          key: string
          label: string | null
          media_error: string | null
          media_status: Database["public"]["Enums"]["media_status"]
          media_synced_at: string | null
          mobile_url: string | null
          overlay_opacity: number
          poster_url: string | null
          prompt: string | null
          published: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          desktop_url?: string | null
          frames?: Json
          inbox?: Json
          key: string
          label?: string | null
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          mobile_url?: string | null
          overlay_opacity?: number
          poster_url?: string | null
          prompt?: string | null
          published?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          desktop_url?: string | null
          frames?: Json
          inbox?: Json
          key?: string
          label?: string | null
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          mobile_url?: string | null
          overlay_opacity?: number
          poster_url?: string | null
          prompt?: string | null
          published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          inbox: Json
          included: string[]
          loop_url: string | null
          media_error: string | null
          media_status: Database["public"]["Enums"]["media_status"]
          media_synced_at: string | null
          poster_url: string | null
          price_from: string | null
          published: boolean
          slug: string
          sort_order: number
          title: string
          turnaround: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          inbox?: Json
          included?: string[]
          loop_url?: string | null
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          poster_url?: string | null
          price_from?: string | null
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          turnaround?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          inbox?: Json
          included?: string[]
          loop_url?: string | null
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          poster_url?: string | null
          price_from?: string | null
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          turnaround?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_email: string | null
          copy: Json
          credit_line: string | null
          hero_cta_primary: string | null
          hero_cta_secondary: string | null
          hero_cues: Json
          hero_headline: string | null
          hero_sub: string | null
          id: number
          layout: Json
          maintenance: boolean
          maintenance_message: string | null
          og_image_url: string | null
          seo_description: string | null
          seo_title: string | null
          stats: Json
          tagline: string | null
          tools: Json
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          contact_email?: string | null
          copy?: Json
          credit_line?: string | null
          hero_cta_primary?: string | null
          hero_cta_secondary?: string | null
          hero_cues?: Json
          hero_headline?: string | null
          hero_sub?: string | null
          id?: number
          layout?: Json
          maintenance?: boolean
          maintenance_message?: string | null
          og_image_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          stats?: Json
          tagline?: string | null
          tools?: Json
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          contact_email?: string | null
          copy?: Json
          credit_line?: string | null
          hero_cta_primary?: string | null
          hero_cta_secondary?: string | null
          hero_cues?: Json
          hero_headline?: string | null
          hero_sub?: string | null
          id?: number
          layout?: Json
          maintenance?: boolean
          maintenance_message?: string | null
          og_image_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          stats?: Json
          tagline?: string | null
          tools?: Json
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          brand_id: string | null
          company: string | null
          created_at: string
          id: string
          inbox: Json
          media_error: string | null
          media_status: Database["public"]["Enums"]["media_status"]
          media_synced_at: string | null
          name: string
          poster_time: number | null
          poster_url: string | null
          published: boolean
          quote: string | null
          role: string | null
          sort_order: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          brand_id?: string | null
          company?: string | null
          created_at?: string
          id?: string
          inbox?: Json
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          name: string
          poster_time?: number | null
          poster_url?: string | null
          published?: boolean
          quote?: string | null
          role?: string | null
          sort_order?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          brand_id?: string | null
          company?: string | null
          created_at?: string
          id?: string
          inbox?: Json
          media_error?: string | null
          media_status?: Database["public"]["Enums"]["media_status"]
          media_synced_at?: string | null
          name?: string
          poster_time?: number | null
          poster_url?: string | null
          published?: boolean
          quote?: string | null
          role?: string | null
          sort_order?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      inbox_usage: {
        Args: never
        Returns: {
          bytes: number
          files: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      page_view_stats: {
        Args: { days?: number }
        Returns: {
          day: string
          path: string
          views: number
        }[]
      }
      ping: { Args: never; Returns: string }
    }
    Enums: {
      discipline: "ai" | "editing"
      media_status: "pending" | "published" | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      discipline: ["ai", "editing"],
      media_status: ["pending", "published", "failed"],
    },
  },
} as const
