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
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          short_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          short_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          short_name?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          file_name: string
          file_url: string
          id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          semester: number
          subject_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
          year: number
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          file_name: string
          file_url: string
          id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          semester: number
          subject_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          year: number
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          file_name?: string
          file_url?: string
          id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          semester?: number
          subject_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string
          course_id: string
          created_at: string
          id: string
          name: string
          semester: number
          year: number
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          id?: string
          name: string
          semester: number
          year: number
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          id?: string
          name?: string
          semester?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      backtest_evaluations: {
        Row: {
          course_id: string
          created_at: string
          evaluation_summary: Json
          hit_rate: number
          id: string
          precision_at_k: number
          recall_at_k: number
          subject_id: string
          test_year: number
          top_k: number
          training_years: number[]
          unit_coverage_percent: number
        }
        Insert: {
          course_id: string
          created_at?: string
          evaluation_summary?: Json
          hit_rate?: number
          id?: string
          precision_at_k?: number
          recall_at_k?: number
          subject_id: string
          test_year: number
          top_k?: number
          training_years?: number[]
          unit_coverage_percent?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          evaluation_summary?: Json
          hit_rate?: number
          id?: string
          precision_at_k?: number
          recall_at_k?: number
          subject_id?: string
          test_year?: number
          top_k?: number
          training_years?: number[]
          unit_coverage_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "backtest_evaluations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backtest_evaluations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_topics: {
        Row: {
          aliases: string[]
          created_at: string
          id: string
          subject_id: string
          topic_name: string
          unit_number: number
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          id?: string
          subject_id: string
          topic_name: string
          unit_number: number
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          id?: string
          subject_id?: string
          topic_name?: string
          unit_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_papers: {
        Row: {
          back_image_url: string
          course_id: string
          created_at: string
          error_message: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          exam_year: number
          front_image_url: string
          id: string
          image_hash: string | null
          status: string
          subject_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          back_image_url: string
          course_id: string
          created_at?: string
          error_message?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          exam_year: number
          front_image_url: string
          id?: string
          image_hash?: string | null
          status?: string
          subject_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          back_image_url?: string
          course_id?: string
          created_at?: string
          error_message?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          exam_year?: number
          front_image_url?: string
          id?: string
          image_hash?: string | null
          status?: string
          subject_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_papers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_questions: {
        Row: {
          canonical_topic_id: string | null
          confidence: number
          created_at: string
          exam_year: number
          id: string
          is_verified: boolean
          marks: number | null
          paper_id: string
          question_number: string
          question_text: string
          raw_extracted_topic: string | null
          section: string | null
          subject_id: string
          unit_number: number | null
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          canonical_topic_id?: string | null
          confidence?: number
          created_at?: string
          exam_year: number
          id?: string
          is_verified?: boolean
          marks?: number | null
          paper_id: string
          question_number: string
          question_text: string
          raw_extracted_topic?: string | null
          section?: string | null
          subject_id: string
          unit_number?: number | null
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          canonical_topic_id?: string | null
          confidence?: number
          created_at?: string
          exam_year?: number
          id?: string
          is_verified?: boolean
          marks?: number | null
          paper_id?: string
          question_number?: string
          question_text?: string
          raw_extracted_topic?: string | null
          section?: string | null
          subject_id?: string
          unit_number?: number | null
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_questions_canonical_topic_id_fkey"
            columns: ["canonical_topic_id"]
            isOneToOne: false
            referencedRelation: "canonical_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "exam_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_forecasts: {
        Row: {
          confidence_rating: number
          course_id: string
          created_at: string
          created_by: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          is_published: boolean
          model_version: string
          subject_id: string
          total_papers_analyzed: number
          updated_at: string
          years_range: string
        }
        Insert: {
          confidence_rating?: number
          course_id: string
          created_at?: string
          created_by?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          is_published?: boolean
          model_version?: string
          subject_id: string
          total_papers_analyzed?: number
          updated_at?: string
          years_range: string
        }
        Update: {
          confidence_rating?: number
          course_id?: string
          created_at?: string
          created_by?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          is_published?: boolean
          model_version?: string
          subject_id?: string
          total_papers_analyzed?: number
          updated_at?: string
          years_range?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_forecasts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_forecasts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_forecast_items: {
        Row: {
          appearance_years: number[]
          canonical_topic_id: string
          created_at: string
          evidence: Json
          forecast_id: string
          forecast_score: number
          historical_appearances: number
          id: string
          priority_tier: string
          subject_id: string
          total_papers: number
          trend: string
        }
        Insert: {
          appearance_years?: number[]
          canonical_topic_id: string
          created_at?: string
          evidence?: Json
          forecast_id: string
          forecast_score: number
          historical_appearances?: number
          id?: string
          priority_tier: string
          subject_id: string
          total_papers?: number
          trend?: string
        }
        Update: {
          appearance_years?: number[]
          canonical_topic_id?: string
          created_at?: string
          evidence?: Json
          forecast_id?: string
          forecast_score?: number
          historical_appearances?: number
          id?: string
          priority_tier?: string
          subject_id?: string
          total_papers?: number
          trend?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_forecast_items_canonical_topic_id_fkey"
            columns: ["canonical_topic_id"]
            isOneToOne: false
            referencedRelation: "canonical_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_forecast_items_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "topic_forecasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_forecast_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      exam_type: "regular" | "supply" | "both"
      resource_type: "notes" | "question_papers"
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
      app_role: ["admin", "student"],
      exam_type: ["regular", "supply", "both"],
      resource_type: ["notes", "question_papers"],
    },
  },
} as const
