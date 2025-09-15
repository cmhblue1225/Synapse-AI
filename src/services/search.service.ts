import { supabase } from '../lib/supabase'
import { knowledgeService } from './knowledge.service'
import { requestOptimizer, optimizeResponse, performanceMonitor } from '../lib/apiOptimizer'

// Types for search functionality
interface AutocompleteQuery {
  query: string
  limit?: number
}

interface AutocompleteResponse {
  suggestions: string[]
}

interface PopularTag {
  name: string
  count: number
  color?: string
}

interface NodeStats {
  totalNodes: number
  totalTags: number
  totalUsers: number
  recentActivity: number
}

interface SearchQuery {
  query: string
  nodeTypes?: string[]
  contentTypes?: string[]
  tags?: string[]
  startDate?: string
  endDate?: string
  page: number
  limit: number
  sortBy: 'relevance' | 'date' | 'title'
  sortOrder: 'asc' | 'desc'
}

interface SearchResponse {
  nodes: any[]
  total: number
  page: number
  hasMore: boolean
}

export class SearchService {
  // 최적화된 기본 검색 (디바운싱 및 캐시 활용)
  async searchNodes(query: string, filters?: {
    nodeTypes?: string[]
    tags?: string[]
    isPublic?: boolean
    userId?: string
    limit?: number
  }) {
    const cacheKey = `search-nodes-${query}-${JSON.stringify(filters)}`;

    return requestOptimizer.throttleRequest(cacheKey, async () => {
      return performanceMonitor.measureApiCall(
        `searchNodes-${query}`,
        () => knowledgeService.searchNodes(query, {
          ...filters,
          limit: filters?.limit || 20,
        })
      );
    });
  }

  // 최적화된 자동완성 (디바운싱 적용)
  async autocomplete(query: AutocompleteQuery): Promise<AutocompleteResponse> {
    const cacheKey = `autocomplete-${query.query}-${query.limit}`;

    return requestOptimizer.throttleRequest(cacheKey, async () => {
      return performanceMonitor.measureApiCall(
        `autocomplete-${query.query}`,
        async () => {
          const { data, error } = await supabase
            .from('knowledge_nodes')
            .select('title')
            .ilike('title', `%${query.query}%`)
            .eq('is_active', true)
            .limit(query.limit || 10);

          if (error) throw error;

          const suggestions = data?.map(node => node.title) || [];
          return { suggestions };
        }
      );
    });
  }

  // 디바운싱된 자동완성 (클라이언트에서 사용)
  autocompleteDebounced(query: string, callback: (suggestions: string[]) => void, delay: number = 300) {
    const debouncedKey = `autocomplete-${query}`;

    requestOptimizer.debounceQuery(debouncedKey, async () => {
      try {
        const result = await this.autocomplete({ query, limit: 8 });
        callback(result.suggestions);
      } catch (error) {
        console.error('Autocomplete error:', error);
        callback([]);
      }
    }, delay);
  }

  // Popular tags
  async getPopularTags(limit: number = 20): Promise<{ tags: PopularTag[] }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get all tags from user's nodes
    const { data, error } = await supabase
      .from('knowledge_nodes')
      .select('tags')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) throw error

    // Count tag occurrences
    const tagCounts = new Map<string, number>()
    data?.forEach(node => {
      if (node.tags && Array.isArray(node.tags)) {
        node.tags.forEach((tag: string) => {
          const count = tagCounts.get(tag) || 0
          tagCounts.set(tag, count + 1)
        })
      }
    })

    // Convert to array and sort by count
    const tags: PopularTag[] = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({
        name,
        count,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}` // Random color
      }))

    return { tags }
  }

  // Search statistics
  async getSearchStats(): Promise<NodeStats> {
    const { data: nodeStats, error: nodeError } = await supabase
      .from('user_stats')
      .select('total_nodes, total_tags')
      .single()
    
    if (nodeError) throw nodeError
    
    // Get recent activity count (nodes created in last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const { count: recentActivity, error: activityError } = await supabase
      .from('knowledge_nodes')
      .select('id', { count: 'exact' })
      .gte('created_at', weekAgo.toISOString())
      .eq('is_active', true)
    
    if (activityError) throw activityError
    
    // Get unique users count
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
    
    if (userError) throw userError
    
    return {
      totalNodes: nodeStats?.total_nodes || 0,
      totalTags: nodeStats?.total_tags || 0,
      totalUsers: userData?.length || 0,
      recentActivity: recentActivity || 0
    }
  }

  // Health check
  async checkHealth(): Promise<{ status: string; timestamp: string; service: string; version: string }> {
    try {
      // Simple health check by querying Supabase
      const { error } = await supabase
        .from('knowledge_nodes')
        .select('id')
        .limit(1)
      
      if (error) throw error
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'search-service',
        version: '2.0.0-supabase'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'search-service',
        version: '2.0.0-supabase'
      }
    }
  }

  // Helper methods for building search queries
  static buildSearchQuery(params: {
    text?: string;
    nodeTypes?: string[];
    contentTypes?: string[];
    tags?: string[];
    dateRange?: { start?: string; end?: string };
    pagination?: { page?: number; limit?: number };
    sorting?: { sortBy?: 'relevance' | 'date' | 'title'; sortOrder?: 'asc' | 'desc' };
  }): SearchQuery {
    return {
      query: params.text || '',
      nodeTypes: params.nodeTypes as any[],
      contentTypes: params.contentTypes as any[],
      tags: params.tags,
      startDate: params.dateRange?.start,
      endDate: params.dateRange?.end,
      page: params.pagination?.page || 1,
      limit: params.pagination?.limit || 10,
      sortBy: params.sorting?.sortBy || 'relevance',
      sortOrder: params.sorting?.sortOrder || 'desc',
    };
  }

  // Advanced search with filters
  async advancedSearch(params: {
    query: string;
    filters?: {
      nodeTypes?: string[];
      contentTypes?: string[];
      tags?: string[];
      dateRange?: { start?: string; end?: string };
    };
    options?: {
      page?: number;
      limit?: number;
      sortBy?: 'relevance' | 'date' | 'title';
      sortOrder?: 'asc' | 'desc';
    };
  }): Promise<SearchResponse> {
    let query = supabase
      .from('knowledge_nodes')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
    
    // Text search
    if (params.query.trim()) {
      query = query.or(`title.ilike.%${params.query}%,content.ilike.%${params.query}%`)
    }
    
    // Filters
    if (params.filters?.nodeTypes?.length) {
      query = query.in('node_type', params.filters.nodeTypes)
    }
    
    if (params.filters?.tags?.length) {
      query = query.overlaps('tags', params.filters.tags)
    }
    
    if (params.filters?.dateRange?.start) {
      query = query.gte('created_at', params.filters.dateRange.start)
    }
    
    if (params.filters?.dateRange?.end) {
      query = query.lte('created_at', params.filters.dateRange.end)
    }
    
    // Sorting
    const sortBy = params.options?.sortBy || 'date'
    const sortOrder = params.options?.sortOrder || 'desc'
    const ascending = sortOrder === 'asc'
    
    switch (sortBy) {
      case 'title':
        query = query.order('title', { ascending })
        break
      case 'relevance':
        // For now, sort by updated_at for relevance
        query = query.order('updated_at', { ascending })
        break
      default: // 'date'
        query = query.order('created_at', { ascending })
    }
    
    // Pagination
    const page = params.options?.page || 1
    const limit = params.options?.limit || 10
    const offset = (page - 1) * limit
    
    query = query.range(offset, offset + limit - 1)
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    return {
      nodes: data || [],
      total: count || 0,
      page,
      hasMore: count ? (offset + limit) < count : false
    }
  }

  // Quick search (simple text query)
  async quickSearch(text: string, limit: number = 10): Promise<SearchResponse> {
    return await this.advancedSearch({
      query: text,
      options: { limit, page: 1 }
    })
  }

  // 최적화된 메인 검색 메소드 (SearchStore 호환)
  async search(query: any): Promise<{
    results: any[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    searchTime: number;
    appliedFilters: any;
  }> {
    const cacheKey = `main-search-${JSON.stringify(query)}`;

    return requestOptimizer.throttleRequest(cacheKey, async () => {
      return performanceMonitor.measureApiCall(
        `mainSearch-${query.query}`,
        async () => {
          const startTime = Date.now();

          const response = await this.advancedSearch({
            query: query.query || '',
            filters: {
              nodeTypes: query.nodeTypes,
              contentTypes: query.contentTypes,
              tags: query.tags,
              dateRange: query.startDate && query.endDate ? {
                start: query.startDate,
                end: query.endDate
              } : undefined
            },
            options: {
              page: query.page || 1,
              limit: query.limit || 10,
              sortBy: query.sortBy || 'relevance',
              sortOrder: query.sortOrder || 'desc'
            }
          });

          const endTime = Date.now();
          const searchTime = endTime - startTime;

          // 응답 최적화 (큰 컨텐츠 잘라내기)
          const optimizedResults = optimizeResponse.truncateContent(response.nodes, 300).map(node => ({
            id: node.id,
            title: node.title,
            content: node.summary || node.content || '',
            createdAt: node.created_at,
            tags: node.tags || [],
            relevanceScore: node.relevance_score || 1.0,
            highlights: [], // 향후 하이라이트 기능 추가 시 구현
          }));

          return {
            results: optimizedResults,
            totalCount: response.total,
            currentPage: response.page,
            pageSize: query.limit || 10,
            totalPages: Math.ceil(response.total / (query.limit || 10)),
            searchTime,
            appliedFilters: {
              nodeTypes: query.nodeTypes,
              contentTypes: query.contentTypes,
              tags: query.tags,
              dateRange: query.startDate && query.endDate ? {
                start: query.startDate,
                end: query.endDate
              } : undefined
            }
          };
        }
      );
    });
  }
}

export const searchService = new SearchService();