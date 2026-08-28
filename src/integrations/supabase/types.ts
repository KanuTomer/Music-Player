export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          is_ai_host: boolean;
          room_key: string;
          session_display_name: string;
          text: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          is_ai_host?: boolean;
          room_key: string;
          session_display_name: string;
          text: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          is_ai_host?: boolean;
          room_key?: string;
          session_display_name?: string;
          text?: string;
        };
        Relationships: [];
      };
      curated_set_tracks: {
        Row: {
          created_at: string;
          curated_set_id: string;
          daypart_tag: string;
          id: string;
          position: number;
          track_id: string;
        };
        Insert: {
          created_at?: string;
          curated_set_id: string;
          daypart_tag?: string;
          id?: string;
          position: number;
          track_id: string;
        };
        Update: {
          created_at?: string;
          curated_set_id?: string;
          daypart_tag?: string;
          id?: string;
          position?: number;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "curated_set_tracks_curated_set_id_fkey";
            columns: ["curated_set_id"];
            isOneToOne: false;
            referencedRelation: "curated_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "curated_set_tracks_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      curated_sets: {
        Row: {
          created_at: string;
          id: string;
          imported_at: string;
          is_active: boolean;
          origin_external_id: string | null;
          origin_provider: string | null;
          scene_id: string;
          shuffle_start: boolean;
          sort_order: number;
          title: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          imported_at?: string;
          is_active?: boolean;
          origin_external_id?: string | null;
          origin_provider?: string | null;
          scene_id: string;
          shuffle_start?: boolean;
          sort_order?: number;
          title: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          imported_at?: string;
          is_active?: boolean;
          origin_external_id?: string | null;
          origin_provider?: string | null;
          scene_id?: string;
          shuffle_start?: boolean;
          sort_order?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "curated_sets_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_rooms: {
        Row: {
          art_url: string | null;
          created_at: string;
          creator_user_id: string | null;
          hook: string | null;
          id: string;
          oneliners: Json;
          palette: Json;
          permalink_slug: string;
          playlist: Json;
          prompt: string;
          remix_of: string | null;
          title_en: string;
          title_hi: string | null;
        };
        Insert: {
          art_url?: string | null;
          created_at?: string;
          creator_user_id?: string | null;
          hook?: string | null;
          id?: string;
          oneliners?: Json;
          palette?: Json;
          permalink_slug: string;
          playlist?: Json;
          prompt: string;
          remix_of?: string | null;
          title_en: string;
          title_hi?: string | null;
        };
        Update: {
          art_url?: string | null;
          created_at?: string;
          creator_user_id?: string | null;
          hook?: string | null;
          id?: string;
          oneliners?: Json;
          palette?: Json;
          permalink_slug?: string;
          playlist?: Json;
          prompt?: string;
          remix_of?: string | null;
          title_en?: string;
          title_hi?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "generated_rooms_remix_of_fkey";
            columns: ["remix_of"];
            isOneToOne: false;
            referencedRelation: "generated_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      oneliners: {
        Row: {
          daypart_tag: string;
          id: string;
          scene_id: string;
          text_en: string;
          text_hi: string | null;
          weight: number;
        };
        Insert: {
          daypart_tag?: string;
          id?: string;
          scene_id: string;
          text_en: string;
          text_hi?: string | null;
          weight?: number;
        };
        Update: {
          daypart_tag?: string;
          id?: string;
          scene_id?: string;
          text_en?: string;
          text_hi?: string | null;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "oneliners_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
      };
      playback_source_failures: {
        Row: {
          error_code: number;
          failed_on: string;
          first_seen_at: string;
          last_seen_at: string;
          occurrence_count: number;
          source_id: string;
        };
        Insert: {
          error_code: number;
          failed_on?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          occurrence_count?: number;
          source_id: string;
        };
        Update: {
          error_code?: number;
          failed_on?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          occurrence_count?: number;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playback_source_failures_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "playback_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      playback_sources: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          priority: number;
          provider: string;
          provider_channel: string | null;
          provider_item_id: string;
          provider_title: string | null;
          source_url: string;
          track_id: string;
          validated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          priority?: number;
          provider: string;
          provider_channel?: string | null;
          provider_item_id: string;
          provider_title?: string | null;
          source_url: string;
          track_id: string;
          validated_at: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          priority?: number;
          provider?: string;
          provider_channel?: string | null;
          provider_item_id?: string;
          provider_title?: string | null;
          source_url?: string;
          track_id?: string;
          validated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playback_sources_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          lang_pref: string | null;
          region_pref: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          lang_pref?: string | null;
          region_pref?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          lang_pref?: string | null;
          region_pref?: string | null;
        };
        Relationships: [];
      };
      reactions: {
        Row: {
          created_at: string;
          emoji: string;
          id: string;
          room_key: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          id?: string;
          room_key: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          id?: string;
          room_key?: string;
        };
        Relationships: [];
      };
      saved_rooms: {
        Row: {
          created_at: string;
          custom_config: Json;
          generated_room_id: string | null;
          id: string;
          label: string | null;
          scene_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          custom_config?: Json;
          generated_room_id?: string | null;
          id?: string;
          label?: string | null;
          scene_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          custom_config?: Json;
          generated_room_id?: string | null;
          id?: string;
          label?: string | null;
          scene_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_rooms_generated_room_id_fkey";
            columns: ["generated_room_id"];
            isOneToOne: false;
            referencedRelation: "generated_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_rooms_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
      };
      scenes: {
        Row: {
          art_key: string;
          category: string;
          chat_mode: string;
          created_at: string;
          description: string | null;
          gag_label: string | null;
          hook: string;
          id: string;
          is_dark: boolean;
          is_live: boolean;
          palette: Json;
          region: string | null;
          slug: string;
          sort_order: number;
          sponsor_id: string | null;
          tags: string[];
          title_en: string;
          title_hi: string;
        };
        Insert: {
          art_key: string;
          category?: string;
          chat_mode?: string;
          created_at?: string;
          description?: string | null;
          gag_label?: string | null;
          hook: string;
          id?: string;
          is_dark?: boolean;
          is_live?: boolean;
          palette?: Json;
          region?: string | null;
          slug: string;
          sort_order?: number;
          sponsor_id?: string | null;
          tags?: string[];
          title_en: string;
          title_hi: string;
        };
        Update: {
          art_key?: string;
          category?: string;
          chat_mode?: string;
          created_at?: string;
          description?: string | null;
          gag_label?: string | null;
          hook?: string;
          id?: string;
          is_dark?: boolean;
          is_live?: boolean;
          palette?: Json;
          region?: string | null;
          slug?: string;
          sort_order?: number;
          sponsor_id?: string | null;
          tags?: string[];
          title_en?: string;
          title_hi?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenes_sponsor_id_fkey";
            columns: ["sponsor_id"];
            isOneToOne: false;
            referencedRelation: "sponsors";
            referencedColumns: ["id"];
          },
        ];
      };
      sound_stems: {
        Row: {
          category: string;
          default_volume: number;
          id: string;
          loop_url: string | null;
          name: string;
          name_hi: string | null;
          scene_id: string | null;
          synth_key: string;
        };
        Insert: {
          category?: string;
          default_volume?: number;
          id?: string;
          loop_url?: string | null;
          name: string;
          name_hi?: string | null;
          scene_id?: string | null;
          synth_key?: string;
        };
        Update: {
          category?: string;
          default_volume?: number;
          id?: string;
          loop_url?: string | null;
          name?: string;
          name_hi?: string | null;
          scene_id?: string | null;
          synth_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sound_stems_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
      };
      sponsors: {
        Row: {
          brand_palette: Json | null;
          campaign_config: Json | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
        };
        Insert: {
          brand_palette?: Json | null;
          campaign_config?: Json | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
        };
        Update: {
          brand_palette?: Json | null;
          campaign_config?: Json | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      tracks: {
        Row: {
          artist: string | null;
          catalogue_key: string;
          daypart_tag: string;
          id: string;
          scene_id: string | null;
          search_query: string | null;
          sort_order: number;
          spotify_url: string | null;
          title: string;
          year: number | null;
          youtube_id: string | null;
          ytmusic_url: string | null;
        };
        Insert: {
          artist?: string | null;
          catalogue_key: string;
          daypart_tag?: string;
          id?: string;
          scene_id?: string | null;
          search_query?: string | null;
          sort_order?: number;
          spotify_url?: string | null;
          title: string;
          year?: number | null;
          youtube_id?: string | null;
          ytmusic_url?: string | null;
        };
        Update: {
          artist?: string | null;
          catalogue_key?: string;
          daypart_tag?: string;
          id?: string;
          scene_id?: string | null;
          search_query?: string | null;
          sort_order?: number;
          spotify_url?: string | null;
          title?: string;
          year?: number | null;
          youtube_id?: string | null;
          ytmusic_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracks_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_playback_source_failure: {
        Args: { p_error_code: number; p_source_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
