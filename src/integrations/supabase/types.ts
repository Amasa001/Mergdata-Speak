export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      asr_workflows: {
        Row: {
          created_at: string | null
          current_stage: string
          id: number
          task_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stage: string
          id?: number
          task_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stage?: string
          id?: number
          task_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asr_workflows_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_validations: {
        Row: {
          created_at: string | null
          decision: string
          has_background_noise: boolean | null
          id: number
          is_off_topic: boolean | null
          other_issues: string | null
          quality_rating: number | null
          validator_id: string | null
          workflow_id: number | null
        }
        Insert: {
          created_at?: string | null
          decision: string
          has_background_noise?: boolean | null
          id?: number
          is_off_topic?: boolean | null
          other_issues?: string | null
          quality_rating?: number | null
          validator_id?: string | null
          workflow_id?: number | null
        }
        Update: {
          created_at?: string | null
          decision?: string
          has_background_noise?: boolean | null
          id?: number
          is_off_topic?: boolean | null
          other_issues?: string | null
          quality_rating?: number | null
          validator_id?: string | null
          workflow_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_validations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "asr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: number
          status: Database["public"]["Enums"]["contribution_status"]
          storage_url: string | null
          submitted_data: Json
          task_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: number
          status?: Database["public"]["Enums"]["contribution_status"]
          storage_url?: string | null
          submitted_data?: Json
          task_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: number
          status?: Database["public"]["Enums"]["contribution_status"]
          storage_url?: string | null
          submitted_data?: Json
          task_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_contribution_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          languages: string[] | null
          preferred_languages: string[] | null
          role: string | null
          roles: Json | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          languages?: string[] | null
          preferred_languages?: string[] | null
          role?: string | null
          roles?: Json | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          languages?: string[] | null
          preferred_languages?: string[] | null
          role?: string | null
          roles?: Json | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          batch_id: string | null
          content: Json
          created_at: string
          created_by: string
          id: number
          language: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["task_status"]
          type: Database["public"]["Enums"]["task_type"]
        }
        Insert: {
          assigned_to?: string | null
          batch_id?: string | null
          content: Json
          created_at?: string
          created_by: string
          id?: number
          language: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["task_status"]
          type: Database["public"]["Enums"]["task_type"]
        }
        Update: {
          assigned_to?: string | null
          batch_id?: string | null
          content?: Json
          created_at?: string
          created_by?: string
          id?: number
          language?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["task_status"]
          type?: Database["public"]["Enums"]["task_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_contribution_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_validations: {
        Row: {
          accuracy_score: number | null
          created_at: string | null
          decision: string
          has_grammar_errors: boolean | null
          has_spelling_errors: boolean | null
          id: number
          is_incomplete: boolean | null
          notes: string | null
          transcription_id: number | null
          validator_id: string | null
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string | null
          decision: string
          has_grammar_errors?: boolean | null
          has_spelling_errors?: boolean | null
          id?: number
          is_incomplete?: boolean | null
          notes?: string | null
          transcription_id?: number | null
          validator_id?: string | null
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string | null
          decision?: string
          has_grammar_errors?: boolean | null
          has_spelling_errors?: boolean | null
          id?: number
          is_incomplete?: boolean | null
          notes?: string | null
          transcription_id?: number | null
          validator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_validations_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          created_at: string | null
          id: number
          transcriber_id: string | null
          transcript: string
          updated_at: string | null
          workflow_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          transcriber_id?: string | null
          transcript: string
          updated_at?: string | null
          workflow_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          transcriber_id?: string | null
          transcript?: string
          updated_at?: string | null
          workflow_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "asr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          contribution_id: number | null
          created_at: string | null
          domain: string | null
          id: number
          source_language: string
          source_text: string
          target_language: string
          task_id: number | null
          translation_text: string
          translator_id: string | null
          updated_at: string | null
          validator_id: string | null
        }
        Insert: {
          contribution_id?: number | null
          created_at?: string | null
          domain?: string | null
          id?: number
          source_language: string
          source_text: string
          target_language: string
          task_id?: number | null
          translation_text: string
          translator_id?: string | null
          updated_at?: string | null
          validator_id?: string | null
        }
        Update: {
          contribution_id?: number | null
          created_at?: string | null
          domain?: string | null
          id?: number
          source_language?: string
          source_text?: string
          target_language?: string
          task_id?: number | null
          translation_text?: string
          translator_id?: string | null
          updated_at?: string | null
          validator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translations_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translations_translator_id_fkey"
            columns: ["translator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translations_translator_id_fkey"
            columns: ["translator_id"]
            isOneToOne: false
            referencedRelation: "user_contribution_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translations_validator_id_fkey"
            columns: ["validator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translations_validator_id_fkey"
            columns: ["validator_id"]
            isOneToOne: false
            referencedRelation: "user_contribution_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_recordings: {
        Row: {
          audio_url: string
          contributor_id: string | null
          created_at: string | null
          id: number
          revision_number: number | null
          workflow_id: number | null
        }
        Insert: {
          audio_url: string
          contributor_id?: string | null
          created_at?: string | null
          id?: number
          revision_number?: number | null
          workflow_id?: number | null
        }
        Update: {
          audio_url?: string
          contributor_id?: string | null
          created_at?: string | null
          id?: number
          revision_number?: number | null
          workflow_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tts_recordings_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "tts_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_validations: {
        Row: {
          clarity_rating: number | null
          created_at: string | null
          decision: string
          faithfulness_rating: number | null
          feedback: string | null
          has_background_noise: boolean | null
          id: number
          pronunciation_rating: number | null
          recording_id: number | null
          validator_id: string | null
        }
        Insert: {
          clarity_rating?: number | null
          created_at?: string | null
          decision: string
          faithfulness_rating?: number | null
          feedback?: string | null
          has_background_noise?: boolean | null
          id?: number
          pronunciation_rating?: number | null
          recording_id?: number | null
          validator_id?: string | null
        }
        Update: {
          clarity_rating?: number | null
          created_at?: string | null
          decision?: string
          faithfulness_rating?: number | null
          feedback?: string | null
          has_background_noise?: boolean | null
          id?: number
          pronunciation_rating?: number | null
          recording_id?: number | null
          validator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tts_validations_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "tts_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_workflows: {
        Row: {
          contributor_id: string | null
          created_at: string | null
          current_stage: string
          id: number
          revision_count: number | null
          task_id: number | null
          updated_at: string | null
        }
        Insert: {
          contributor_id?: string | null
          created_at?: string | null
          current_stage: string
          id?: number
          revision_count?: number | null
          task_id?: number | null
          updated_at?: string | null
        }
        Update: {
          contributor_id?: string | null
          created_at?: string | null
          current_stage?: string
          id?: number
          revision_count?: number | null
          task_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tts_workflows_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      validations: {
        Row: {
          comment: string | null
          contribution_id: number
          created_at: string
          id: number
          is_approved: boolean
          validator_id: string
        }
        Insert: {
          comment?: string | null
          contribution_id: number
          created_at?: string
          id?: number
          is_approved: boolean
          validator_id: string
        }
        Update: {
          comment?: string | null
          contribution_id?: number
          created_at?: string
          id?: number
          is_approved?: boolean
          validator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validations_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_validator_id_fkey"
            columns: ["validator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_validator_id_fkey"
            columns: ["validator_id"]
            isOneToOne: false
            referencedRelation: "user_contribution_stats"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      translation_statistics: {
        Row: {
          completed_tasks: number | null
          domain: string | null
          in_progress_tasks: number | null
          pending_tasks: number | null
          target_language: string | null
          total_tasks: number | null
        }
        Relationships: []
      }
      user_contribution_stats: {
        Row: {
          asr_contributions: number | null
          full_name: string | null
          id: string | null
          total_contributions: number | null
          transcription_contributions: number | null
          translation_contributions: number | null
          tts_contributions: number | null
          validated_contributions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_admin_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_available_translation_tasks: {
        Args: { user_id_param: string }
        Returns: {
          task_id: number
          task_title: string
          source_language: string
          target_language: string
          current_task_status: string
          domain: string
        }[]
      }
    }
    Enums: {
      contribution_status:
        | "pending_validation"
        | "validated"
        | "rejected"
        | "ready_for_transcription"
        | "rejected_audio"
        | "in_transcription"
        | "pending_transcript_validation"
        | "rejected_transcript"
        | "finalized"
        | "needs_correction"
      priority_level: "low" | "medium" | "high"
      task_status: "pending" | "assigned" | "completed" | "archived"
      task_type: "asr" | "tts" | "transcription" | "translation"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      contribution_status: [
        "pending_validation",
        "validated",
        "rejected",
        "ready_for_transcription",
        "rejected_audio",
        "in_transcription",
        "pending_transcript_validation",
        "rejected_transcript",
        "finalized",
        "needs_correction",
      ],
      priority_level: ["low", "medium", "high"],
      task_status: ["pending", "assigned", "completed", "archived"],
      task_type: ["asr", "tts", "transcription", "translation"],
    },
  },
} as const
