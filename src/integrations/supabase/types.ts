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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string | null
          company: string
          cover_letter_id: string | null
          created_at: string
          id: string
          job_url: string | null
          last_touch_at: string | null
          location: string | null
          notes: string | null
          resume_id: string | null
          role: string
          salary: string | null
          source: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          company: string
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          job_url?: string | null
          last_touch_at?: string | null
          location?: string | null
          notes?: string | null
          resume_id?: string | null
          role: string
          salary?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          company?: string
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          job_url?: string | null
          last_touch_at?: string | null
          location?: string | null
          notes?: string | null
          resume_id?: string | null
          role?: string
          salary?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          alignment: string | null
          closing: string | null
          company: string
          company_mission: string | null
          company_url: string | null
          created_at: string
          culture_fit: string | null
          full_letter: string
          hook: string | null
          id: string
          jd_keywords: Json
          job_description: string | null
          match_score: number | null
          matched_keywords: Json
          missing_keywords: Json
          model: string | null
          notes: string | null
          proof: string | null
          resume_id: string | null
          resume_skills: Json
          role: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alignment?: string | null
          closing?: string | null
          company: string
          company_mission?: string | null
          company_url?: string | null
          created_at?: string
          culture_fit?: string | null
          full_letter?: string
          hook?: string | null
          id?: string
          jd_keywords?: Json
          job_description?: string | null
          match_score?: number | null
          matched_keywords?: Json
          missing_keywords?: Json
          model?: string | null
          notes?: string | null
          proof?: string | null
          resume_id?: string | null
          resume_skills?: Json
          role: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alignment?: string | null
          closing?: string | null
          company?: string
          company_mission?: string | null
          company_url?: string | null
          created_at?: string
          culture_fit?: string | null
          full_letter?: string
          hook?: string | null
          id?: string
          jd_keywords?: Json
          job_description?: string | null
          match_score?: number | null
          matched_keywords?: Json
          missing_keywords?: Json
          model?: string | null
          notes?: string | null
          proof?: string | null
          resume_id?: string | null
          resume_skills?: Json
          role?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_answers: {
        Row: {
          answer: string
          clarity_score: number | null
          coaching_note: string | null
          confidence_score: number | null
          created_at: string
          gaps: Json
          id: string
          improved_answer: string | null
          keyword_score: number | null
          length_score: number | null
          matched_keywords: Json
          metrics_score: number | null
          missing_keywords: Json
          model: string | null
          overall_score: number | null
          question: string
          question_type: string
          resume_id: string | null
          star_breakdown: Json
          star_score: number | null
          strengths: Json
          target_role: string | null
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          answer: string
          clarity_score?: number | null
          coaching_note?: string | null
          confidence_score?: number | null
          created_at?: string
          gaps?: Json
          id?: string
          improved_answer?: string | null
          keyword_score?: number | null
          length_score?: number | null
          matched_keywords?: Json
          metrics_score?: number | null
          missing_keywords?: Json
          model?: string | null
          overall_score?: number | null
          question: string
          question_type?: string
          resume_id?: string | null
          star_breakdown?: Json
          star_score?: number | null
          strengths?: Json
          target_role?: string | null
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          answer?: string
          clarity_score?: number | null
          coaching_note?: string | null
          confidence_score?: number | null
          created_at?: string
          gaps?: Json
          id?: string
          improved_answer?: string | null
          keyword_score?: number | null
          length_score?: number | null
          matched_keywords?: Json
          metrics_score?: number | null
          missing_keywords?: Json
          model?: string | null
          overall_score?: number | null
          question?: string
          question_type?: string
          resume_id?: string | null
          star_breakdown?: Json
          star_score?: number | null
          strengths?: Json
          target_role?: string | null
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      interview_questions: {
        Row: {
          created_at: string
          difficulty: string | null
          focus_area: string | null
          id: string
          question: string
          question_hash: string
          question_type: string
          rationale: string | null
          resume_id: string | null
          target_role: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          focus_area?: string | null
          id?: string
          question: string
          question_hash: string
          question_type?: string
          rationale?: string | null
          resume_id?: string | null
          target_role?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          focus_area?: string | null
          id?: string
          question?: string
          question_hash?: string
          question_type?: string
          rationale?: string | null
          resume_id?: string | null
          target_role?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mock_interview_sessions: {
        Row: {
          created_at: string
          difficulty: string
          duration_minutes: number
          ended_at: string | null
          focus: string
          id: string
          improvements: Json
          model: string | null
          overall_score: number | null
          resume_id: string | null
          started_at: string
          status: string
          strengths: Json
          summary: string | null
          target_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          duration_minutes?: number
          ended_at?: string | null
          focus?: string
          id?: string
          improvements?: Json
          model?: string | null
          overall_score?: number | null
          resume_id?: string | null
          started_at?: string
          status?: string
          strengths?: Json
          summary?: string | null
          target_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          duration_minutes?: number
          ended_at?: string | null
          focus?: string
          id?: string
          improvements?: Json
          model?: string | null
          overall_score?: number | null
          resume_id?: string | null
          started_at?: string
          status?: string
          strengths?: Json
          summary?: string | null
          target_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_interview_turns: {
        Row: {
          answer: string | null
          created_at: string
          feedback: string | null
          follow_up_hint: string | null
          id: string
          question: string
          question_kind: string
          score: number | null
          session_id: string
          turn_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          feedback?: string | null
          follow_up_hint?: string | null
          id?: string
          question: string
          question_kind?: string
          score?: number | null
          session_id: string
          turn_index: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          feedback?: string | null
          follow_up_hint?: string | null
          id?: string
          question?: string
          question_kind?: string
          score?: number | null
          session_id?: string
          turn_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mock_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          plan: Database["public"]["Enums"]["app_plan"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          ats_score: number | null
          bullet_rewrites: Json
          created_at: string
          extracted: Json
          id: string
          insights: Json
          issues: Json
          job_match: Json
          model: string | null
          overall_score: number | null
          quick_wins: Json
          resume_id: string
          score_breakdown: Json
          strengths: Json
          summary: string | null
          target_role: string | null
          user_id: string
          weaknesses: Json
        }
        Insert: {
          ats_score?: number | null
          bullet_rewrites?: Json
          created_at?: string
          extracted?: Json
          id?: string
          insights?: Json
          issues?: Json
          job_match?: Json
          model?: string | null
          overall_score?: number | null
          quick_wins?: Json
          resume_id: string
          score_breakdown?: Json
          strengths?: Json
          summary?: string | null
          target_role?: string | null
          user_id: string
          weaknesses?: Json
        }
        Update: {
          ats_score?: number | null
          bullet_rewrites?: Json
          created_at?: string
          extracted?: Json
          id?: string
          insights?: Json
          issues?: Json
          job_match?: Json
          model?: string | null
          overall_score?: number | null
          quick_wins?: Json
          resume_id?: string
          score_breakdown?: Json
          strengths?: Json
          summary?: string | null
          target_role?: string | null
          user_id?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "resume_analyses_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_enhancements: {
        Row: {
          achievements: Json
          added_keywords: Json
          analysis_id: string | null
          changelog: Json
          contact: Json
          created_at: string
          education: Json
          estimated_score_after: number | null
          estimated_score_before: number | null
          experience: Json
          headline: string | null
          id: string
          model: string | null
          projects: Json
          resume_id: string
          skills: Json
          summary: string | null
          user_id: string
          verifiable_claims: Json
        }
        Insert: {
          achievements?: Json
          added_keywords?: Json
          analysis_id?: string | null
          changelog?: Json
          contact?: Json
          created_at?: string
          education?: Json
          estimated_score_after?: number | null
          estimated_score_before?: number | null
          experience?: Json
          headline?: string | null
          id?: string
          model?: string | null
          projects?: Json
          resume_id: string
          skills?: Json
          summary?: string | null
          user_id: string
          verifiable_claims?: Json
        }
        Update: {
          achievements?: Json
          added_keywords?: Json
          analysis_id?: string | null
          changelog?: Json
          contact?: Json
          created_at?: string
          education?: Json
          estimated_score_after?: number | null
          estimated_score_before?: number | null
          experience?: Json
          headline?: string | null
          id?: string
          model?: string | null
          projects?: Json
          resume_id?: string
          skills?: Json
          summary?: string | null
          user_id?: string
          verifiable_claims?: Json
        }
        Relationships: []
      }
      resume_tailorings: {
        Row: {
          analysis_id: string | null
          bullets: Json
          cover_note: string | null
          created_at: string
          id: string
          job_description: string | null
          keywords_to_add: Json
          match_after: number | null
          match_before: number | null
          model: string | null
          resume_id: string
          skills: Json
          summary: string | null
          target_role: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          bullets?: Json
          cover_note?: string | null
          created_at?: string
          id?: string
          job_description?: string | null
          keywords_to_add?: Json
          match_after?: number | null
          match_before?: number | null
          model?: string | null
          resume_id: string
          skills?: Json
          summary?: string | null
          target_role: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          bullets?: Json
          cover_note?: string | null
          created_at?: string
          id?: string
          job_description?: string | null
          keywords_to_add?: Json
          match_after?: number | null
          match_before?: number | null
          model?: string | null
          resume_id?: string
          skills?: Json
          summary?: string | null
          target_role?: string
          user_id?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          content_hash: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          raw_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          raw_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          raw_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          analyses: number
          cover_letters: number
          created_at: string
          id: string
          interview_questions: number
          mock_interviews: number
          period_start: string
          resume_uploads: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analyses?: number
          cover_letters?: number
          created_at?: string
          id?: string
          interview_questions?: number
          mock_interviews?: number
          period_start?: string
          resume_uploads?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analyses?: number
          cover_letters?: number
          created_at?: string
          id?: string
          interview_questions?: number
          mock_interviews?: number
          period_start?: string
          resume_uploads?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      increment_usage_counter: {
        Args: { _column: string; _delta?: number; _user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_plan: "free" | "pro" | "advanced" | "teams"
      app_role: "admin" | "user"
      application_status:
        | "saved"
        | "applied"
        | "interviewing"
        | "offer"
        | "rejected"
        | "withdrawn"
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
      app_plan: ["free", "pro", "advanced", "teams"],
      app_role: ["admin", "user"],
      application_status: [
        "saved",
        "applied",
        "interviewing",
        "offer",
        "rejected",
        "withdrawn",
      ],
    },
  },
} as const
