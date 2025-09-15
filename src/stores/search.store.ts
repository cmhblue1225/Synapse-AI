import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SearchResult, SearchQuery, PopularTag, AutocompleteResponse } from '../types/api';
import { searchService } from '../services/search.service';

interface SearchState {
  // State
  results: SearchResult[];
  suggestions: string[];
  popularTags: PopularTag[];
  isLoading: boolean;
  isSearching: boolean;
  isLoadingSuggestions: boolean;
  error: string | null;
  
  // Search metadata
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  searchTime: number;
  appliedFilters: Record<string, any>;
  
  // Current search query
  currentQuery: SearchQuery | null;
  searchHistory: string[];

  // Actions
  search: (query: SearchQuery) => Promise<void>;
  quickSearch: (text: string, limit?: number) => Promise<void>;
  autocomplete: (query: string, limit?: number) => Promise<void>;
  loadPopularTags: (limit?: number) => Promise<void>;
  setCurrentPage: (page: number) => Promise<void>;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  clearResults: () => void;
  clearError: () => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      // Initial state
      results: [],
      suggestions: [],
      popularTags: [],
      isLoading: false,
      isSearching: false,
      isLoadingSuggestions: false,
      error: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      searchTime: 0,
      appliedFilters: {},
      currentQuery: null,
      searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),

      // Main search function
      search: async (query: SearchQuery) => {
        set({ isSearching: true, error: null, currentQuery: query });

        try {
          const response = await searchService.search(query);
          
          set({
            results: response.results,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
            searchTime: response.searchTime,
            appliedFilters: response.appliedFilters,
            isSearching: false,
            error: null,
          });

          // Add to search history if it's a text query
          if (query.query && query.query.trim()) {
            get().addToHistory(query.query.trim());
          }
        } catch (error: any) {
          set({
            isSearching: false,
            error: error.response?.data?.message || error.message || 'Search failed',
          });
        }
      },

      // Quick search (simple text query)
      quickSearch: async (text: string, limit = 10) => {
        if (!text.trim()) {
          set({ results: [], totalCount: 0, currentPage: 1, totalPages: 1 });
          return;
        }

        const query: SearchQuery = {
          query: text.trim(),
          page: 1,
          limit,
          sortBy: 'relevance',
          sortOrder: 'desc',
        };

        await get().search(query);
      },

      // Autocomplete functionality
      autocomplete: async (query: string, limit = 5) => {
        if (!query.trim()) {
          set({ suggestions: [] });
          return;
        }

        set({ isLoadingSuggestions: true });

        try {
          const response = await searchService.autocomplete({ query: query.trim(), limit });
          
          set({
            suggestions: response.suggestions,
            isLoadingSuggestions: false,
          });
        } catch (error: any) {
          set({
            suggestions: [],
            isLoadingSuggestions: false,
          });
        }
      },

      // Load popular tags
      loadPopularTags: async (limit = 20) => {
        set({ isLoading: true, error: null });

        try {
          const response = await searchService.getPopularTags(limit);
          
          set({
            popularTags: response.tags,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Failed to load popular tags',
          });
        }
      },

      // Set current page and search
      setCurrentPage: async (page: number) => {
        const { currentQuery } = get();
        if (!currentQuery) return;

        const updatedQuery = { ...currentQuery, page };
        await get().search(updatedQuery);
      },

      // Add search query to history
      addToHistory: (query: string) => {
        const { searchHistory } = get();
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
        
        set({ searchHistory: newHistory });
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      },

      // Clear search history
      clearHistory: () => {
        set({ searchHistory: [] });
        localStorage.removeItem('searchHistory');
      },

      // Clear search results
      clearResults: () => {
        set({
          results: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 1,
          searchTime: 0,
          appliedFilters: {},
          currentQuery: null,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set({
          results: [],
          suggestions: [],
          popularTags: [],
          isLoading: false,
          isSearching: false,
          isLoadingSuggestions: false,
          error: null,
          totalCount: 0,
          currentPage: 1,
          pageSize: 10,
          totalPages: 1,
          searchTime: 0,
          appliedFilters: {},
          currentQuery: null,
        });
      },
    }),
    {
      name: 'search-store',
    }
  )
);

// Helper functions for building search queries
export const createSearchQuery = (params: {
  text?: string;
  nodeTypes?: string[];
  contentTypes?: string[];
  tags?: string[];
  dateRange?: { start?: string; end?: string };
  pagination?: { page?: number; limit?: number };
  sorting?: { sortBy?: 'relevance' | 'date' | 'title'; sortOrder?: 'asc' | 'desc' };
}): SearchQuery => {
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
};