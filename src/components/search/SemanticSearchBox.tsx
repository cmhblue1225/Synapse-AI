import React, { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { embeddingService } from '../../services/embedding.service';
import { useAuthStore } from '../../stores/auth.store';
import { toast } from 'react-toastify';

interface SemanticSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  node_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface SemanticSearchBoxProps {
  onResults?: (results: SemanticSearchResult[]) => void;
  className?: string;
  placeholder?: string;
}

export function SemanticSearchBox({
  onResults,
  className = '',
  placeholder = '의미 기반 검색으로 관련 지식을 찾아보세요...'
}: SemanticSearchBoxProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    nodeTypes: [] as string[],
    tags: [] as string[],
    similarityThreshold: 0.3,
    limit: 10,
  });

  // 디바운스된 검색
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || !user) return;

      setLoading(true);
      try {
        const searchResults = await embeddingService.semanticSearch(searchQuery, {
          limit: filters.limit,
          similarity_threshold: filters.similarityThreshold,
          node_types: filters.nodeTypes.length > 0 ? filters.nodeTypes : undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          user_id: user.id,
        });

        setResults(searchResults);
        onResults?.(searchResults);
      } catch (error: any) {
        console.error('시맨틱 검색 오류:', error);
        toast.error('검색 중 오류가 발생했습니다: ' + error.message);
      } finally {
        setLoading(false);
      }
    }, 500),
    [filters, user, onResults]
  );

  useEffect(() => {
    if (query.trim().length >= 3) {
      debouncedSearch(query);
    } else {
      setResults([]);
      onResults?.([]);
    }
  }, [query, debouncedSearch]);

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    onResults?.([]);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    if (query.trim().length >= 3) {
      debouncedSearch(query);
    }
  };

  const nodeTypeOptions = [
    'Knowledge', 'Concept', 'Fact', 'Question',
    'Idea', 'Project', 'Resource', 'Note'
  ];

  return (
    <div className={`relative ${className}`}>
      {/* 검색 입력 필드 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Sparkles className="h-5 w-5 text-purple-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg
                   bg-white shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                   transition-colors duration-200"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-2">
          {query && (
            <button
              onClick={handleClearSearch}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`text-gray-400 hover:text-gray-600 transition-colors ${
              showFilters ? 'text-purple-600' : ''
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 로딩 인디케이터 */}
      {loading && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-lg shadow-lg border">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
            <span className="text-sm text-gray-600">AI가 의미를 분석하고 있습니다...</span>
          </div>
        </div>
      )}

      {/* 필터 패널 */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-lg shadow-lg border z-10">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                유사도 임계값: {filters.similarityThreshold}
              </label>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={filters.similarityThreshold}
                onChange={(e) => handleFilterChange({
                  ...filters,
                  similarityThreshold: parseFloat(e.target.value)
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>관련성 낮음</span>
                <span>관련성 높음</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                노드 타입 필터
              </label>
              <div className="flex flex-wrap gap-2">
                {nodeTypeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const newTypes = filters.nodeTypes.includes(type)
                        ? filters.nodeTypes.filter(t => t !== type)
                        : [...filters.nodeTypes, type];
                      handleFilterChange({ ...filters, nodeTypes: newTypes });
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      filters.nodeTypes.includes(type)
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    } border`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색 결과 수: {filters.limit}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={filters.limit}
                onChange={(e) => handleFilterChange({
                  ...filters,
                  limit: parseInt(e.target.value)
                })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* 검색 결과 */}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto z-10">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {results.length}개의 관련 지식 발견
              </span>
              <span className="text-xs text-gray-500">
                AI 의미 분석 결과
              </span>
            </div>
          </div>
          <div className="divide-y">
            {results.map((result) => (
              <div
                key={result.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/app/knowledge/${result.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1 hover:text-purple-600 transition-colors">
                      {result.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {result.content}
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        {result.node_type}
                      </span>
                      {result.tags.length > 0 && (
                        <div className="flex space-x-1">
                          {result.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-gray-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-500 mb-1">
                      유사도
                    </div>
                    <div className={`text-sm font-medium ${
                      result.similarity > 0.9
                        ? 'text-green-600'
                        : result.similarity > 0.8
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}>
                      {Math.round(result.similarity * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검색어가 있지만 결과가 없을 때 */}
      {query.trim().length >= 3 && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-lg shadow-lg border">
          <div className="text-center text-gray-500">
            <Sparkles className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm">관련된 지식을 찾지 못했습니다.</p>
            <p className="text-xs text-gray-400 mt-1">
              더 구체적인 키워드로 검색해보세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// 디바운스 유틸리티 함수
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}