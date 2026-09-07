export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          actor_id: string;
          affected_count: number;
          created_at: string;
          id: number;
          request_id: string;
          scene_id: string | null;
          target_id: string | null;
        };
        Insert: {
          action: string;
          actor_id: string;
          affected_count?: number;
          created_at?: string;
          id?: never;
          request_id: string;
          scene_id?: string | null;
          target_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string;
          affected_count?: number;
          created_at?: string;
          id?: never;
          request_id?: string;
          scene_id?: string | null;
          target_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_rate_limits: {
        Row: {
          actor_id: string;
          bucket: string;
          request_count: number;
          window_started_at: string;
        };
        Insert: {
          actor_id: string;
          bucket: string;
          request_count: number;
          window_started_at: string;
        };
        Update: {
          actor_id?: string;
          bucket?: string;
          request_count?: number;
          window_started_at?: string;
        };
        Relationships: [];
      };
      admin_storage_cleanup_queue: {
        Row: {
          attempts: number;
          available_at: string;
          bucket: string;
          completed_at: string | null;
          created_at: string;
          id: string;
          last_error: string | null;
          object_path: string;
          reason: string;
        };
        Insert: {
          attempts?: number;
          available_at?: string;
          bucket: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          object_path: string;
          reason: string;
        };
        Update: {
          attempts?: number;
          available_at?: string;
          bucket?: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          object_path?: string;
          reason?: string;
        };
        Relationships: [];
      };
      admin_upload_reservations: {
        Row: {
          actor_id: string;
          bucket: string;
          created_at: string;
          discarded_at: string | null;
          expires_at: string;
          finalized_at: string | null;
          id: string;
          object_path: string;
          purpose: string;
          scene_id: string;
        };
        Insert: {
          actor_id: string;
          bucket: string;
          created_at?: string;
          discarded_at?: string | null;
          expires_at?: string;
          finalized_at?: string | null;
          id?: string;
          object_path: string;
          purpose: string;
          scene_id: string;
        };
        Update: {
          actor_id?: string;
          bucket?: string;
          created_at?: string;
          discarded_at?: string | null;
          expires_at?: string;
          finalized_at?: string | null;
          id?: string;
          object_path?: string;
          purpose?: string;
          scene_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_upload_reservations_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
      };
      ambience_asset_sources: {
        Row: {
          asset_id: string;
          id: string;
          original_byte_size: number | null;
          original_duration_seconds: number | null;
          original_filename: string | null;
          selected_duration_seconds: number | null;
          selected_start_seconds: number | null;
          source_order: number;
          source_sha256: string;
          source_title: string;
          source_url: string | null;
        };
        Insert: {
          asset_id: string;
          id?: string;
          original_byte_size?: number | null;
          original_duration_seconds?: number | null;
          original_filename?: string | null;
          selected_duration_seconds?: number | null;
          selected_start_seconds?: number | null;
          source_order?: number;
          source_sha256: string;
          source_title: string;
          source_url?: string | null;
        };
        Update: {
          asset_id?: string;
          id?: string;
          original_byte_size?: number | null;
          original_duration_seconds?: number | null;
          original_filename?: string | null;
          selected_duration_seconds?: number | null;
          selected_start_seconds?: number | null;
          source_order?: number;
          source_sha256?: string;
          source_title?: string;
          source_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ambience_asset_sources_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "ambience_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      ambience_assets: {
        Row: {
          byte_size: number;
          created_at: string;
          duration_seconds: number;
          id: string;
          is_active: boolean;
          mime_type: string;
          sha256: string;
          storage_path: string;
        };
        Insert: {
          byte_size: number;
          created_at?: string;
          duration_seconds: number;
          id?: string;
          is_active?: boolean;
          mime_type?: string;
          sha256: string;
          storage_path: string;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          duration_seconds?: number;
          id?: string;
          is_active?: boolean;
          mime_type?: string;
          sha256?: string;
          storage_path?: string;
        };
        Relationships: [];
      };
      ambience_profiles: {
        Row: {
          audio_theme: Json;
          created_at: string;
          enabled: boolean;
          fade_in_ms: number;
          fade_out_ms: number;
          id: string;
          max_master_gain: number;
          music_duck_ratio: number;
          scene_id: string;
          visual_theme: Json;
        };
        Insert: {
          audio_theme?: Json;
          created_at?: string;
          enabled?: boolean;
          fade_in_ms?: number;
          fade_out_ms?: number;
          id?: string;
          max_master_gain?: number;
          music_duck_ratio?: number;
          scene_id: string;
          visual_theme?: Json;
        };
        Update: {
          audio_theme?: Json;
          created_at?: string;
          enabled?: boolean;
          fade_in_ms?: number;
          fade_out_ms?: number;
          id?: string;
          max_master_gain?: number;
          music_duck_ratio?: number;
          scene_id?: string;
          visual_theme?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "ambience_profiles_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: true;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
      };
      app_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
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
      room_visits: {
        Row: {
          first_played_at: string | null;
          id: string;
          last_heartbeat_at: string | null;
          listening_seconds: number;
          scene_id: string;
          started_at: string;
        };
        Insert: {
          first_played_at?: string | null;
          id: string;
          last_heartbeat_at?: string | null;
          listening_seconds?: number;
          scene_id: string;
          started_at?: string;
        };
        Update: {
          first_played_at?: string | null;
          id?: string;
          last_heartbeat_at?: string | null;
          listening_seconds?: number;
          scene_id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_visits_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
        ];
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
          background_storage_path: string | null;
          category: string;
          chat_mode: string;
          created_at: string;
          description: string | null;
          foreground_text_color: string;
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
          background_storage_path?: string | null;
          category?: string;
          chat_mode?: string;
          created_at?: string;
          description?: string | null;
          foreground_text_color?: string;
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
          background_storage_path?: string | null;
          category?: string;
          chat_mode?: string;
          created_at?: string;
          description?: string | null;
          foreground_text_color?: string;
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
          asset_id: string | null;
          category: string;
          crossfade_ms: number;
          default_volume: number;
          event_max_seconds: number | null;
          event_min_seconds: number | null;
          id: string;
          is_active: boolean;
          loop_end_seconds: number | null;
          loop_start_seconds: number;
          loop_url: string | null;
          max_gain: number;
          min_gain: number;
          name: string;
          name_hi: string | null;
          role: string | null;
          scene_id: string | null;
          sort_order: number;
          synth_key: string;
        };
        Insert: {
          asset_id?: string | null;
          category?: string;
          crossfade_ms?: number;
          default_volume?: number;
          event_max_seconds?: number | null;
          event_min_seconds?: number | null;
          id?: string;
          is_active?: boolean;
          loop_end_seconds?: number | null;
          loop_start_seconds?: number;
          loop_url?: string | null;
          max_gain?: number;
          min_gain?: number;
          name: string;
          name_hi?: string | null;
          role?: string | null;
          scene_id?: string | null;
          sort_order?: number;
          synth_key?: string;
        };
        Update: {
          asset_id?: string | null;
          category?: string;
          crossfade_ms?: number;
          default_volume?: number;
          event_max_seconds?: number | null;
          event_min_seconds?: number | null;
          id?: string;
          is_active?: boolean;
          loop_end_seconds?: number | null;
          loop_start_seconds?: number;
          loop_url?: string | null;
          max_gain?: number;
          min_gain?: number;
          name?: string;
          name_hi?: string | null;
          role?: string | null;
          scene_id?: string | null;
          sort_order?: number;
          synth_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sound_stems_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "ambience_assets";
            referencedColumns: ["id"];
          },
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
      admin_append_queue_tracks: {
        Args: { p_curated_set_id: string; p_tracks: Json };
        Returns: undefined;
      };
      admin_assert_ready: { Args: never; Returns: undefined };
      admin_check_upload_reservation: {
        Args: {
          p_object_path: string;
          p_purpose: string;
          p_reservation_id: string;
          p_scene_id: string;
        };
        Returns: boolean;
      };
      admin_complete_upload_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      admin_consume_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number };
        Returns: number;
      };
      admin_create_upload_reservation: {
        Args: { p_purpose: string; p_scene_id: string };
        Returns: {
          bucket: string;
          expires_at: string;
          object_path: string;
          reservation_id: string;
        }[];
      };
      admin_discard_upload_reservation: {
        Args: { p_reservation_id: string };
        Returns: {
          bucket: string;
          object_path: string;
        }[];
      };
      admin_onboarding_status: { Args: never; Returns: string };
      admin_queue_storage_cleanup: {
        Args: { p_bucket: string; p_object_path: string; p_reason: string };
        Returns: undefined;
      };
      admin_record_audit: {
        Args: {
          p_action: string;
          p_affected_count?: number;
          p_request_id?: string;
          p_scene_id?: string;
          p_target_id?: string;
        };
        Returns: undefined;
      };
      admin_remove_queue_tracks: {
        Args: { p_curated_set_id: string; p_membership_ids: string[] };
        Returns: undefined;
      };
      admin_room_analytics: {
        Args: { p_since?: string };
        Returns: {
          listening_seconds: number;
          played_visits: number;
          scene_id: string;
          visits: number;
        }[];
      };
      admin_run_retention: {
        Args: never;
        Returns: {
          deleted_audit_rows: number;
          deleted_rate_rows: number;
          expired_reservations: number;
        }[];
      };
      admin_save_scene_presentation: {
        Args: {
          p_background_storage_path: string;
          p_foreground_text_color: string;
          p_gag_label: string;
          p_oneliners: Json;
          p_scene_id: string;
        };
        Returns: undefined;
      };
      admin_secured_append_queue_tracks: {
        Args: { p_curated_set_id: string; p_tracks: Json };
        Returns: undefined;
      };
      admin_secured_remove_queue_tracks: {
        Args: { p_curated_set_id: string; p_membership_ids: string[] };
        Returns: undefined;
      };
      admin_secured_room_analytics: {
        Args: { p_since?: string };
        Returns: {
          listening_seconds: number;
          played_visits: number;
          scene_id: string;
          visits: number;
        }[];
      };
      admin_secured_save_scene_presentation: {
        Args: {
          p_background_storage_path: string;
          p_foreground_text_color: string;
          p_gag_label: string;
          p_oneliners: Json;
          p_scene_id: string;
        };
        Returns: undefined;
      };
      admin_secured_update_queue_track: {
        Args: {
          p_artist: string;
          p_membership_id: string;
          p_scope: string;
          p_title: string;
          p_video_id: string;
          p_year: number;
        };
        Returns: undefined;
      };
      admin_session_ready: { Args: never; Returns: boolean };
      admin_update_queue_track: {
        Args: {
          p_artist: string;
          p_membership_id: string;
          p_scope: string;
          p_title: string;
          p_video_id: string;
          p_year: number;
        };
        Returns: undefined;
      };
      record_playback_source_failure: {
        Args: { p_error_code: number; p_source_id: string };
        Returns: undefined;
      };
      record_room_heartbeat: {
        Args: { p_scene_id: string; p_seconds: number; p_visit_id: string };
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
  public: {
    Enums: {},
  },
} as const;
