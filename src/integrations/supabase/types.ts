export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ambience_asset_sources: {
        Row: {
          asset_id: string;
          id: string;
          source_order: number;
          source_sha256: string;
          source_title: string;
          source_url: string;
        };
        Insert: {
          asset_id: string;
          id?: string;
          source_order?: number;
          source_sha256: string;
          source_title: string;
          source_url: string;
        };
        Update: {
          asset_id?: string;
          id?: string;
          source_order?: number;
          source_sha256?: string;
          source_title?: string;
          source_url?: string;
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
          versioning_status: string;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
          versioning_status?: string;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
          versioning_status?: string;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          archived_at: string | null;
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          archived_at?: string | null;
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_delete_marker?: boolean;
          is_versioned?: boolean;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          archived_at?: string | null;
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_delete_marker?: boolean;
          is_versioned?: boolean;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
