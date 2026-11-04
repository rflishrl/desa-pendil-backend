export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      articles: {
        Row: {
          author: string;
          content: string;
          created_at: string;
          excerpt: string | null;
          id: string;
          published_at: string | null;
          slug: string;
          status: Database["public"]["Enums"]["article_status"];
          thumbnail_url: string | null;
          title: string;
          type: Database["public"]["Enums"]["article_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author?: string;
          content: string;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          published_at?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["article_status"];
          thumbnail_url?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["article_type"];
          updated_at?: string;
        };
        Update: {
          author?: string;
          content?: string;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          published_at?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["article_status"];
          thumbnail_url?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["article_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      gallery_images: {
        Row: {
          alt: string;
          caption: string | null;
          created_at: string;
          id: string;
          sort_order: number;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          alt: string;
          caption?: string | null;
          created_at?: string;
          id?: string;
          sort_order?: number;
          updated_at?: string;
          url: string;
        };
        Update: {
          alt?: string;
          caption?: string | null;
          created_at?: string;
          id?: string;
          sort_order?: number;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      count_articles: {
        Args: {
          p_q?: string;
          p_status?: Database["public"]["Enums"]["article_status"];
          p_type?: Database["public"]["Enums"]["article_type"];
        };
        Returns: number;
      };
      list_articles: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_q?: string;
          p_status?: Database["public"]["Enums"]["article_status"];
          p_type?: Database["public"]["Enums"]["article_type"];
        };
        Returns: {
          author: string;
          content: string;
          created_at: string;
          excerpt: string | null;
          id: string;
          published_at: string | null;
          slug: string;
          status: Database["public"]["Enums"]["article_status"];
          thumbnail_url: string | null;
          title: string;
          type: Database["public"]["Enums"]["article_type"];
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "articles";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: {
          allowed: boolean;
          retry_after_seconds: number;
        }[];
      };
      rate_limit_reset: { Args: { p_key: string }; Returns: undefined };
      update_article: {
        Args: { p_id: string; p_patch: Json };
        Returns: {
          author: string;
          content: string;
          created_at: string;
          excerpt: string;
          id: string;
          previous_thumbnail_url: string;
          published_at: string;
          slug: string;
          status: Database["public"]["Enums"]["article_status"];
          thumbnail_url: string;
          title: string;
          type: Database["public"]["Enums"]["article_type"];
          updated_at: string;
        }[];
      };
    };
    Enums: {
      article_status: "draft" | "published";
      article_type: "berita" | "artikel" | "postingan";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {
      article_status: ["draft", "published"],
      article_type: ["berita", "artikel", "postingan"],
    },
  },
} as const;
