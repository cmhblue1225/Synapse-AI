import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 데이터베이스 타입 정의 (Supabase 스키마 기반)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          bio: string | null
          preferences: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: any
        }
        Update: {
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: any
          updated_at?: string
        }
      }
      knowledge_nodes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          summary: string | null
          node_type: string
          content_type: string
          tags: string[]
          metadata: any
          version: number
          is_active: boolean
          is_public: boolean
          view_count: number
          like_count: number
          search_vector: any
          embedding: number[] | null
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          user_id: string
          title: string
          content?: string | null
          summary?: string | null
          node_type?: string
          content_type?: string
          tags?: string[]
          metadata?: any
          version?: number
          is_active?: boolean
          is_public?: boolean
          view_count?: number
          like_count?: number
          embedding?: number[] | null
          published_at?: string | null
        }
        Update: {
          title?: string
          content?: string | null
          summary?: string | null
          node_type?: string
          content_type?: string
          tags?: string[]
          metadata?: any
          version?: number
          is_active?: boolean
          is_public?: boolean
          view_count?: number
          like_count?: number
          embedding?: number[] | null
          updated_at?: string
          published_at?: string | null
        }
      }
      knowledge_relationships: {
        Row: {
          id: string
          source_node_id: string
          target_node_id: string
          relationship_type: string
          weight: number
          confidence: number
          description: string | null
          metadata: any
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          source_node_id: string
          target_node_id: string
          relationship_type?: string
          weight?: number
          confidence?: number
          description?: string | null
          metadata?: any
          created_by?: string | null
        }
        Update: {
          relationship_type?: string
          weight?: number
          confidence?: number
          description?: string | null
          metadata?: any
          updated_at?: string
        }
      }
      knowledge_tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          description: string | null
          usage_count: number
          is_system_tag: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name: string
          color?: string
          description?: string | null
          usage_count?: number
          is_system_tag?: boolean
        }
        Update: {
          name?: string
          color?: string
          description?: string | null
          usage_count?: number
          is_system_tag?: boolean
          updated_at?: string
        }
      }
    }
    Views: {
      node_details: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          summary: string | null
          node_type: string
          tags: string[]
          created_at: string
          updated_at: string
          author_name: string | null
          author_avatar: string | null
          total_views: number
          comment_count: number
          relationship_count: number
        }
      }
      popular_nodes: {
        Row: {
          id: string
          title: string
          summary: string | null
          node_type: string
          tags: string[]
          created_at: string
          recent_views: number
          author_name: string | null
        }
      }
    }
    Functions: {
      search_similar_nodes: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
          target_user_id?: string
        }
        Returns: {
          id: string
          title: string
          content: string
          similarity: number
        }[]
      }
    }
  }
}