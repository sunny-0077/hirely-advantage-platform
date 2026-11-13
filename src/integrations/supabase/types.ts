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
      api_usage_logs: {
        Row: {
          created_at: string
          estimated_cost_usd: number
          feature_name: string
          id: string
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_cost_usd?: number
          feature_name: string
          id?: string
          provider: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_cost_usd?: number
          feature_name?: string
          id?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          app_key: string | null
          applied_at: string | null
          company: string
          cover_letter_id: string | null
          created_at: string
          id: string
          interview_prep_id: string | null
          job_id: string | null
          job_url: string | null
          last_touch_at: string | null
          location: string | null
          notes: string | null
          resume_id: string | null
          role: string
          salary: string | null
          source: string | null
          status: Database["public"]["Enums"]["application_status"]
          tailoring_id: string | null
          tracker_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_key?: string | null
          applied_at?: string | null
          company: string
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          interview_prep_id?: string | null
          job_id?: string | null
          job_url?: string | null
          last_touch_at?: string | null
          location?: string | null
          notes?: string | null
          resume_id?: string | null
          role: string
          salary?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tailoring_id?: string | null
          tracker_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_key?: string | null
          applied_at?: string | null
          company?: string
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          interview_prep_id?: string | null
          job_id?: string | null
          job_url?: string | null
          last_touch_at?: string | null
          location?: string | null
          notes?: string | null
          resume_id?: string | null
          role?: string
          salary?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tailoring_id?: string | null
          tracker_status?: string
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
          job_id: string | null
          match_score: number | null
          matched_keywords: Json
          missing_keywords: Json
          model: string | null
          notes: string | null
          proof: string | null
          request_id: string | null
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
          job_id?: string | null
          match_score?: number | null
          matched_keywords?: Json
          missing_keywords?: Json
          model?: string | null
          notes?: string | null
          proof?: string | null
          request_id?: string | null
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
          job_id?: string | null
          match_score?: number | null
          matched_keywords?: Json
          missing_keywords?: Json
          model?: string | null
          notes?: string | null
          proof?: string | null
          request_id?: string | null
          resume_id?: string | null
          resume_skills?: Json
          role?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          action_type: string
          created_at: string
          credits_delta: number
          id: string
          refund_of: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_delta: number
          id?: string
          refund_of?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_delta?: number
          id?: string
          refund_of?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_refund_of_fkey"
            columns: ["refund_of"]
            isOneToOne: true
            referencedRelation: "credit_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      document_feedback: {
        Row: {
          comment: string | null
          created_at: string
          document_id: string
          document_type: string
          helpful: boolean
          id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          document_id: string
          document_type: string
          helpful: boolean
          id?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          document_id?: string
          document_type?: string
          helpful?: boolean
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      hiring_accounts: {
        Row: {
          account_type: string
          company_name: string
          created_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          company_name?: string
          created_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          company_name?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingest_job_state: {
        Row: {
          cron_token: string
          id: string
          last_result: Json
          last_run_at: string | null
          locked_until: string | null
          paused_reason: string | null
        }
        Insert: {
          cron_token?: string
          id?: string
          last_result?: Json
          last_run_at?: string | null
          locked_until?: string | null
          paused_reason?: string | null
        }
        Update: {
          cron_token?: string
          id?: string
          last_result?: Json
          last_run_at?: string | null
          locked_until?: string | null
          paused_reason?: string | null
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
      interview_prep_guides: {
        Row: {
          company: string | null
          created_at: string
          guide_json: Json
          guide_text: string
          id: string
          job_id: string | null
          model: string | null
          request_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          guide_json?: Json
          guide_text: string
          id?: string
          job_id?: string | null
          model?: string | null
          request_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          guide_json?: Json
          guide_text?: string
          id?: string
          job_id?: string | null
          model?: string | null
          request_id?: string | null
          role?: string
          user_id?: string
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
      job_listings: {
        Row: {
          company_name: string
          created_at: string
          description: string
          employer_id: string
          employment_type: string
          id: string
          keywords: string[]
          location: string
          status: string
          title: string
        }
        Insert: {
          company_name: string
          created_at?: string
          description: string
          employer_id: string
          employment_type?: string
          id?: string
          keywords?: string[]
          location?: string
          status?: string
          title: string
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string
          employer_id?: string
          employment_type?: string
          id?: string
          keywords?: string[]
          location?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      job_submissions: {
        Row: {
          candidate_email: string
          candidate_id: string
          candidate_name: string
          cover_letter_text: string
          created_at: string
          employer_id: string
          id: string
          job_id: string
          match_score: number | null
          matched_keywords: string[]
          missing_keywords: string[]
          resume_name: string
          resume_text: string
          status: string
        }
        Insert: {
          candidate_email: string
          candidate_id: string
          candidate_name: string
          cover_letter_text?: string
          created_at?: string
          employer_id: string
          id?: string
          job_id: string
          match_score?: number | null
          matched_keywords?: string[]
          missing_keywords?: string[]
          resume_name: string
          resume_text: string
          status?: string
        }
        Update: {
          candidate_email?: string
          candidate_id?: string
          candidate_name?: string
          cover_letter_text?: string
          created_at?: string
          employer_id?: string
          id?: string
          job_id?: string
          match_score?: number | null
          matched_keywords?: string[]
          missing_keywords?: string[]
          resume_name?: string
          resume_text?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_catalog: {
        Row: {
          apply_url: string | null
          city_hub: string
          company_name: string
          external_job_id: string
          fetched_at: string
          id: string
          last_seen_at: string
          location_keys: string[]
          raw_description: string | null
          remote_scope: string
          source: string | null
          source_job_id: string | null
          source_url: string | null
          title: string
          truth_card_json: Json
          work_mode: string | null
        }
        Insert: {
          apply_url?: string | null
          city_hub: string
          company_name: string
          external_job_id: string
          fetched_at?: string
          id?: string
          last_seen_at?: string
          location_keys?: string[]
          raw_description?: string | null
          remote_scope?: string
          source?: string | null
          source_job_id?: string | null
          source_url?: string | null
          title: string
          truth_card_json?: Json
          work_mode?: string | null
        }
        Update: {
          apply_url?: string | null
          city_hub?: string
          company_name?: string
          external_job_id?: string
          fetched_at?: string
          id?: string
          last_seen_at?: string
          location_keys?: string[]
          raw_description?: string | null
          remote_scope?: string
          source?: string | null
          source_job_id?: string | null
          source_url?: string | null
          title?: string
          truth_card_json?: Json
          work_mode?: string | null
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
      platform_feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          page_path: string | null
          rating: number
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          message: string
          page_path?: string | null
          rating: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          page_path?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      pricing_interest: {
        Row: {
          bonus_granted: boolean
          created_at: string
          email: string | null
          id: string
          plan_tier: string
          price_inr: number
          user_id: string
        }
        Insert: {
          bonus_granted?: boolean
          created_at?: string
          email?: string | null
          id?: string
          plan_tier: string
          price_inr: number
          user_id: string
        }
        Update: {
          bonus_granted?: boolean
          created_at?: string
          email?: string | null
          id?: string
          plan_tier?: string
          price_inr?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city_hub: string
          country: string | null
          created_at: string
          credits_balance: number
          display_name: string | null
          education: Json
          email: string | null
          employment_preference: string | null
          experience: Json
          experience_level: string | null
          full_name: string | null
          getting_started_dismissed_at: string | null
          headline: string | null
          id: string
          master_resume_json: Json
          master_resume_text: string | null
          onboarding_completed: boolean
          onboarding_step: number
          pass_expires_at: string | null
          pass_started_at: string | null
          pass_tranches_granted: number
          plan: Database["public"]["Enums"]["app_plan"]
          plan_tier: string
          preferred_currency: string | null
          preferred_job_location: string | null
          preferred_location: string | null
          preferred_locations: string[]
          preferred_template: string | null
          resume_file_url: string | null
          resume_mode: string | null
          skills: string[]
          target_job_role: string | null
          updated_at: string
          user_id: string
          work_modes: string[]
        }
        Insert: {
          avatar_url?: string | null
          city_hub?: string
          country?: string | null
          created_at?: string
          credits_balance?: number
          display_name?: string | null
          education?: Json
          email?: string | null
          employment_preference?: string | null
          experience?: Json
          experience_level?: string | null
          full_name?: string | null
          getting_started_dismissed_at?: string | null
          headline?: string | null
          id?: string
          master_resume_json?: Json
          master_resume_text?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          pass_expires_at?: string | null
          pass_started_at?: string | null
          pass_tranches_granted?: number
          plan?: Database["public"]["Enums"]["app_plan"]
          plan_tier?: string
          preferred_currency?: string | null
          preferred_job_location?: string | null
          preferred_location?: string | null
          preferred_locations?: string[]
          preferred_template?: string | null
          resume_file_url?: string | null
          resume_mode?: string | null
          skills?: string[]
          target_job_role?: string | null
          updated_at?: string
          user_id: string
          work_modes?: string[]
        }
        Update: {
          avatar_url?: string | null
          city_hub?: string
          country?: string | null
          created_at?: string
          credits_balance?: number
          display_name?: string | null
          education?: Json
          email?: string | null
          employment_preference?: string | null
          experience?: Json
          experience_level?: string | null
          full_name?: string | null
          getting_started_dismissed_at?: string | null
          headline?: string | null
          id?: string
          master_resume_json?: Json
          master_resume_text?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          pass_expires_at?: string | null
          pass_started_at?: string | null
          pass_tranches_granted?: number
          plan?: Database["public"]["Enums"]["app_plan"]
          plan_tier?: string
          preferred_currency?: string | null
          preferred_job_location?: string | null
          preferred_location?: string | null
          preferred_locations?: string[]
          preferred_template?: string | null
          resume_file_url?: string | null
          resume_mode?: string | null
          skills?: string[]
          target_job_role?: string | null
          updated_at?: string
          user_id?: string
          work_modes?: string[]
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
      resume_career_levels: {
        Row: {
          id: string
          label: string
          published: boolean
          sort_order: number
        }
        Insert: {
          id: string
          label: string
          published?: boolean
          sort_order: number
        }
        Update: {
          id?: string
          label?: string
          published?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      resume_catalogue_sources: {
        Row: {
          attribution: string
          id: string
          label: string
          license: string
          modifications: string
          published: boolean
          source_url: string
          version: string
        }
        Insert: {
          attribution: string
          id: string
          label: string
          license: string
          modifications?: string
          published?: boolean
          source_url: string
          version: string
        }
        Update: {
          attribution?: string
          id?: string
          label?: string
          license?: string
          modifications?: string
          published?: boolean
          source_url?: string
          version?: string
        }
        Relationships: []
      }
      resume_categories: {
        Row: {
          id: string
          industry_id: string
          label: string
          published: boolean
        }
        Insert: {
          id: string
          industry_id: string
          label: string
          published?: boolean
        }
        Update: {
          id?: string
          industry_id?: string
          label?: string
          published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "resume_categories_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "resume_industries"
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
          resume_id: string | null
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
          resume_id?: string | null
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
          resume_id?: string | null
          skills?: Json
          summary?: string | null
          user_id?: string
          verifiable_claims?: Json
        }
        Relationships: []
      }
      resume_industries: {
        Row: {
          id: string
          label: string
          published: boolean
          sort_order: number
        }
        Insert: {
          id: string
          label: string
          published?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          published?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      resume_job_titles: {
        Row: {
          category_id: string
          id: string
          industry_id: string
          normalized_title: string
          occupation_id: string
          popular_rank: number | null
          published: boolean
          published_at: string
          title: string
        }
        Insert: {
          category_id: string
          id: string
          industry_id: string
          normalized_title: string
          occupation_id: string
          popular_rank?: number | null
          published?: boolean
          published_at?: string
          title: string
        }
        Update: {
          category_id?: string
          id?: string
          industry_id?: string
          normalized_title?: string
          occupation_id?: string
          popular_rank?: number | null
          published?: boolean
          published_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_job_titles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resume_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_job_titles_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "resume_industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_job_titles_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "resume_occupations"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_occupation_categories: {
        Row: {
          category_id: string
          occupation_id: string
        }
        Insert: {
          category_id: string
          occupation_id: string
        }
        Update: {
          category_id?: string
          occupation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_occupation_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resume_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_occupation_categories_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "resume_occupations"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_occupation_levels: {
        Row: {
          level_id: string
          occupation_id: string
        }
        Insert: {
          level_id: string
          occupation_id: string
        }
        Update: {
          level_id?: string
          occupation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_occupation_levels_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "resume_career_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_occupation_levels_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "resume_occupations"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_occupations: {
        Row: {
          blueprint_id: string
          id: string
          published: boolean
          published_at: string
          source_code: string | null
          source_id: string | null
          title: string
        }
        Insert: {
          blueprint_id: string
          id: string
          published?: boolean
          published_at?: string
          source_code?: string | null
          source_id?: string | null
          title: string
        }
        Update: {
          blueprint_id?: string
          id?: string
          published?: boolean
          published_at?: string
          source_code?: string | null
          source_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_occupations_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "resume_role_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_occupations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "resume_catalogue_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_role_blueprints: {
        Row: {
          definition: Json
          id: string
          label: string
          published: boolean
          version: number
        }
        Insert: {
          definition: Json
          id: string
          label: string
          published?: boolean
          version?: number
        }
        Update: {
          definition?: Json
          id?: string
          label?: string
          published?: boolean
          version?: number
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
          job_id: string | null
          keywords_to_add: Json
          match_after: number | null
          match_before: number | null
          match_label: string | null
          matched_keywords: Json
          missing_skills: Json
          model: string | null
          request_id: string | null
          resume_id: string | null
          skills: Json
          source: string
          summary: string | null
          tailored_text: string | null
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
          job_id?: string | null
          keywords_to_add?: Json
          match_after?: number | null
          match_before?: number | null
          match_label?: string | null
          matched_keywords?: Json
          missing_skills?: Json
          model?: string | null
          request_id?: string | null
          resume_id?: string | null
          skills?: Json
          source?: string
          summary?: string | null
          tailored_text?: string | null
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
          job_id?: string | null
          keywords_to_add?: Json
          match_after?: number | null
          match_before?: number | null
          match_label?: string | null
          matched_keywords?: Json
          missing_skills?: Json
          model?: string | null
          request_id?: string | null
          resume_id?: string | null
          skills?: Json
          source?: string
          summary?: string | null
          tailored_text?: string | null
          target_role?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_template_assignments: {
        Row: {
          blueprint_id: string
          design_id: string
          id: string
          level_id: string
          occupation_id: string
          published: boolean
          title_id: string | null
        }
        Insert: {
          blueprint_id: string
          design_id: string
          id: string
          level_id: string
          occupation_id: string
          published?: boolean
          title_id?: string | null
        }
        Update: {
          blueprint_id?: string
          design_id?: string
          id?: string
          level_id?: string
          occupation_id?: string
          published?: boolean
          title_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_template_assignments_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "resume_role_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_template_assignments_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "resume_template_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_template_assignments_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "resume_career_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_template_assignments_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "resume_occupations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_template_assignments_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "resume_job_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_template_designs: {
        Row: {
          definition: Json
          id: string
          label: string
          published: boolean
          renderer_key: string
          version: number
        }
        Insert: {
          definition: Json
          id: string
          label: string
          published?: boolean
          renderer_key: string
          version?: number
        }
        Update: {
          definition?: Json
          id?: string
          label?: string
          published?: boolean
          renderer_key?: string
          version?: number
        }
        Relationships: []
      }
      resume_title_aliases: {
        Row: {
          alias: string
          normalized_alias: string
          title_id: string
        }
        Insert: {
          alias: string
          normalized_alias: string
          title_id: string
        }
        Update: {
          alias?: string
          normalized_alias?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_title_aliases_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "resume_job_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_versions: {
        Row: {
          blueprint_id: string | null
          blueprint_version: number
          created_at: string
          design_id: string | null
          design_version: number
          document: Json
          id: string
          level_id: string | null
          name: string
          revision: number
          schema_version: number
          title_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blueprint_id?: string | null
          blueprint_version?: number
          created_at?: string
          design_id?: string | null
          design_version?: number
          document: Json
          id?: string
          level_id?: string | null
          name: string
          revision?: number
          schema_version?: number
          title_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          blueprint_id?: string | null
          blueprint_version?: number
          created_at?: string
          design_id?: string | null
          design_version?: number
          document?: Json
          id?: string
          level_id?: string | null
          name?: string
          revision?: number
          schema_version?: number
          title_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "resume_role_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "resume_template_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "resume_career_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "resume_job_titles"
            referencedColumns: ["id"]
          },
        ]
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
      user_profiles: {
        Row: {
          country: string | null
          created_at: string | null
          email: string | null
          employment_preference: string | null
          experience_level: string | null
          full_name: string | null
          id: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          preferred_currency: string | null
          preferred_job_location: string | null
          preferred_location: string | null
          target_job_role: string | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          email?: string | null
          employment_preference?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          preferred_currency?: string | null
          preferred_job_location?: string | null
          preferred_location?: string | null
          target_job_role?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          email?: string | null
          employment_preference?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          preferred_currency?: string | null
          preferred_job_location?: string | null
          preferred_location?: string | null
          target_job_role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_pass_90_day: { Args: { _user_id: string }; Returns: undefined }
      admin_document_feedback: {
        Args: never
        Returns: {
          comment: string
          created_at: string
          document_id: string
          document_type: string
          email: string
          helpful: boolean
          id: string
          user_id: string
        }[]
      }
      admin_platform_feedback: {
        Args: never
        Returns: {
          category: string
          created_at: string
          email: string
          id: string
          message: string
          page_path: string
          rating: number
          user_id: string
        }[]
      }
      ai_actions_paused: { Args: never; Returns: boolean }
      ai_spend_last_24h: { Args: never; Returns: number }
      claim_beta_offer: { Args: { _plan: string }; Returns: Json }
      credit_cost: {
        Args: { _action: string; _units?: number }
        Returns: number
      }
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
      refund_credits: { Args: { _ledger_id: string }; Returns: undefined }
      search_resume_titles: {
        Args: {
          p_category?: string
          p_industry?: string
          p_level?: string
          p_offset?: number
          p_search?: string
          p_sort?: string
        }
        Returns: {
          category_id: string
          id: string
          industry_id: string
          occupation_id: string
          popular_rank: number
          title: string
          total_count: number
        }[]
      }
      spend_credits: {
        Args: { _action: string; _units?: number; _user_id: string }
        Returns: string
      }
      submit_job_application: {
        Args: {
          p_cover_letter_id?: string
          p_job_id: string
          p_resume_id: string
        }
        Returns: string
      }
      sync_all_passes: { Args: never; Returns: number }
      sync_my_pass: { Args: never; Returns: undefined }
      sync_pass_state: { Args: { _user_id: string }; Returns: undefined }
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
