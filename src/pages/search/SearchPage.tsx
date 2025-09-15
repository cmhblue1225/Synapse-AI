import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  BookmarkIcon,
  XMarkIcon,
  FunnelIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useSearchStore, createSearchQuery } from '../../stores/search.store';
import { SemanticSearchBox } from '../../components/search/SemanticSearchBox';

export const SearchPage: React.FC = () => {
  const {
    results,
    isSearching,
    totalCount,
    currentPage,
    totalPages,
    searchTime,
    quickSearch,
    search,
    clearResults,
    searchHistory,
    addToHistory,
    clearHistory
  } = useSearchStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [savedSearches, setSavedSearches] = useState<Array<{id: string, name: string, query: any}>>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchMode, setSearchMode] = useState<'traditional' | 'semantic'>('traditional');
  const [semanticResults, setSemanticResults] = useState<any[]>([]);

  useEffect(() => {
    // Clear results when component mounts
    return () => clearResults();
  }, [clearResults]);

  // 로컬 스토리지에서 저장된 검색 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('savedSearches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchQueryObj = createSearchQuery({
        text: searchQuery.trim(),
        nodeTypes: nodeTypeFilter ? [nodeTypeFilter] : undefined,
        contentTypes: contentTypeFilter ? [contentTypeFilter] : undefined,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
        sorting: { sortBy, sortOrder: 'desc' }
      });

      await search(searchQueryObj);
      addToHistory(searchQuery.trim());
    }
  };

  const handleAdvancedSearch = async () => {
    const searchQueryObj = createSearchQuery({
      text: searchQuery.trim(),
      nodeTypes: nodeTypeFilter ? [nodeTypeFilter] : undefined,
      contentTypes: contentTypeFilter ? [contentTypeFilter] : undefined,
      dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
      sorting: { sortBy, sortOrder: 'desc' }
    });

    await search(searchQueryObj);
    if (searchQuery.trim()) {
      addToHistory(searchQuery.trim());
    }
  };

  const saveCurrentSearch = () => {
    const searchName = prompt('검색을 저장할 이름을 입력하세요:');
    if (searchName && searchQuery.trim()) {
      const newSavedSearch = {
        id: Date.now().toString(),
        name: searchName,
        query: {
          text: searchQuery,
          nodeType: nodeTypeFilter,
          contentType: contentTypeFilter,
          sortBy,
          dateRange
        }
      };

      const updatedSaved = [...savedSearches, newSavedSearch];
      setSavedSearches(updatedSaved);
      localStorage.setItem('savedSearches', JSON.stringify(updatedSaved));
    }
  };

  const loadSavedSearch = (savedSearch: any) => {
    setSearchQuery(savedSearch.query.text || '');
    setNodeTypeFilter(savedSearch.query.nodeType || '');
    setContentTypeFilter(savedSearch.query.contentType || '');
    setSortBy(savedSearch.query.sortBy || 'relevance');
    setDateRange(savedSearch.query.dateRange || { start: '', end: '' });
  };

  const deleteSavedSearch = (id: string) => {
    const updatedSaved = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updatedSaved);
    localStorage.setItem('savedSearches', JSON.stringify(updatedSaved));
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">지식 검색</h1>

        {/* 검색 모드 선택 탭 */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => {
              setSearchMode('traditional');
              setSemanticResults([]);
              setSearchQuery('');
            }}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              searchMode === 'traditional'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            키워드 검색
          </button>
          <button
            onClick={() => {
              setSearchMode('semantic');
              clearResults();
              setSearchQuery('');
            }}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              searchMode === 'semantic'
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            AI 의미 검색
          </button>
        </div>

        {/* 시맨틱 검색 */}
        {searchMode === 'semantic' ? (
          <SemanticSearchBox
            onResults={setSemanticResults}
            placeholder="의미 기반 검색으로 관련 지식을 찾아보세요..."
            className="mb-4"
          />
        ) : (
          <>
            {/* 기존 전통적 검색 폼 */}
            <form onSubmit={handleSearch} className="relative">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="지식을 검색하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                showFilters
                  ? 'bg-primary-50 border-primary-500 text-primary-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              필터
            </button>
            <button
              type="button"
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="flex items-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500"
            >
              <BookmarkIcon className="h-5 w-5 mr-2" />
              저장된 검색
            </button>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? '검색 중...' : '검색'}
            </button>
          </div>
        </form>
          </>
        )}

        {/* 검색 기록 (전통적 검색 모드에서만 표시) */}
        {searchMode === 'traditional' && searchHistory.length > 0 && !isSearching && results.length === 0 && !searchQuery && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <ClockIcon className="h-4 w-4 mr-2" />
                최근 검색
              </h3>
              <button
                onClick={clearHistory}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                전체 삭제
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 8).map((query, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(query);
                    const searchQueryObj = createSearchQuery({ text: query });
                    search(searchQueryObj);
                  }}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 focus:ring-2 focus:ring-primary-500"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 저장된 검색 (전통적 검색 모드에서만 표시) */}
        {searchMode === 'traditional' && showSavedSearches && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <BookmarkSolidIcon className="h-4 w-4 mr-2 text-blue-600" />
                저장된 검색
              </h3>
              {searchQuery.trim() && (
                <button
                  onClick={saveCurrentSearch}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  현재 검색 저장
                </button>
              )}
            </div>
            {savedSearches.length > 0 ? (
              <div className="space-y-2">
                {savedSearches.map((savedSearch) => (
                  <div key={savedSearch.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{savedSearch.name}</h4>
                      <p className="text-xs text-gray-500">{savedSearch.query.text}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => loadSavedSearch(savedSearch)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        불러오기
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(savedSearch.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">저장된 검색이 없습니다.</p>
            )}
          </div>
        )}

        {/* Filters panel (전통적 검색 모드에서만 표시) */}
        {searchMode === 'traditional' && showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  노드 타입
                </label>
                <select
                  value={nodeTypeFilter}
                  onChange={(e) => setNodeTypeFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">모든 타입</option>
                  <option value="Knowledge">지식</option>
                  <option value="Concept">개념</option>
                  <option value="Fact">사실</option>
                  <option value="Question">질문</option>
                  <option value="Idea">아이디어</option>
                  <option value="Project">프로젝트</option>
                  <option value="Resource">리소스</option>
                  <option value="Note">노트</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  콘텐츠 타입
                </label>
                <select
                  value={contentTypeFilter}
                  onChange={(e) => setContentTypeFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">모든 타입</option>
                  <option value="text">텍스트</option>
                  <option value="document">문서</option>
                  <option value="image">이미지</option>
                  <option value="video">비디오</option>
                  <option value="url">URL</option>
                  <option value="file">파일</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  정렬
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'title')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="relevance">관련도순</option>
                  <option value="date">날짜순</option>
                  <option value="title">제목순</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜 범위
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-xs"
                    placeholder="시작일"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-xs"
                    placeholder="종료일"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setNodeTypeFilter('');
                  setContentTypeFilter('');
                  setSortBy('relevance');
                  setDateRange({ start: '', end: '' });
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                필터 초기화
              </button>
              <button
                onClick={handleAdvancedSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isSearching ? '검색 중...' : '고급 검색'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search results */}
      <div className="space-y-6">
        {/* Results header */}
        {(searchMode === 'traditional' ? results.length > 0 : semanticResults.length > 0) && (
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {searchMode === 'semantic' ? (
                `${semanticResults.length}개의 AI 의미 검색 결과`
              ) : (
                `총 ${totalCount.toLocaleString()}개의 결과 (${searchTime}ms)`
              )}
            </span>
            {searchMode === 'traditional' && (
              <span>
                페이지 {currentPage} / {totalPages}
              </span>
            )}
          </div>
        )}

        {/* Search results */}
        {searchMode === 'semantic' && semanticResults.length > 0 ? (
          <div className="space-y-4">
            {semanticResults.map((result) => (
              <div key={result.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-purple-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      <Link to={`/app/knowledge/${result.id}`} className="hover:text-purple-600">
                        {result.title}
                      </Link>
                    </h3>
                    <p className="text-gray-600 mb-3 line-clamp-3">
                      {result.content}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500">
                          {new Date(result.created_at).toLocaleDateString('ko-KR')}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {result.node_type}
                        </span>
                        <div className="flex items-center">
                          <SparklesIcon className="h-3 w-3 text-purple-500 mr-1" />
                          <span className="text-xs text-purple-600 font-medium">AI 추천</span>
                        </div>
                      </div>
                      {result.tags.length > 0 && (
                        <div className="flex space-x-1">
                          {result.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                            >
                              #{tag}
                            </span>
                          ))}
                          {result.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              +{result.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-500 mb-1">유사도</div>
                    <div className={`text-sm font-medium ${
                      result.similarity > 0.9
                        ? 'text-green-600'
                        : result.similarity > 0.8
                        ? 'text-blue-600'
                        : 'text-yellow-600'
                    }`}>
                      {Math.round(result.similarity * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isSearching ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result) => (
              <div key={result.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  <Link to={`/app/knowledge/${result.id}`} className="hover:text-primary-600">
                    {result.title}
                  </Link>
                </h3>
                <p className="text-gray-600 mb-3">
                  {result.content}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-500">
                      {new Date(result.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="text-gray-500">
                      관련도: {(result.relevanceScore * 100).toFixed(0)}%
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {result.nodeType || 'Knowledge'}
                    </span>
                    {result.contentType && result.contentType !== 'text' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {result.contentType}
                      </span>
                    )}
                  </div>
                  {result.tags.length > 0 && (
                    <div className="flex space-x-1">
                      {result.tags.slice(0, 3).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSearchQuery(tag);
                            const searchQueryObj = createSearchQuery({ text: tag });
                            search(searchQueryObj);
                          }}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                      {result.tags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          +{result.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Highlights */}
                {result.highlights.length > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    {result.highlights.map((highlight, index) => (
                      <div key={index} dangerouslySetInnerHTML={{ __html: highlight }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (searchMode === 'traditional' && searchQuery) ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과 없음</h3>
            <p className="mt-1 text-sm text-gray-500">
              '{searchQuery}'에 대한 검색 결과를 찾을 수 없습니다.
            </p>
          </div>
        ) : (searchMode === 'semantic' && semanticResults.length === 0 && !isSearching) ? (
          <div className="text-center py-12">
            <SparklesIcon className="mx-auto h-12 w-12 text-purple-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">AI 의미 검색</h3>
            <p className="mt-1 text-sm text-gray-500">
              자연어 질문으로 관련 지식을 찾아보세요.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">지식 검색</h3>
            <p className="mt-1 text-sm text-gray-500">
              저장된 지식 노드를 검색해보세요.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-700">
              <span>전체 {totalCount}개 결과 중 </span>
              <span className="font-medium">{((currentPage - 1) * 10) + 1}</span>
              <span> - </span>
              <span className="font-medium">{Math.min(currentPage * 10, totalCount)}</span>
              <span> 표시</span>
            </div>

            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={async () => {
                  if (currentPage > 1) {
                    const searchQueryObj = createSearchQuery({
                      text: searchQuery.trim(),
                      nodeTypes: nodeTypeFilter ? [nodeTypeFilter] : undefined,
                      contentTypes: contentTypeFilter ? [contentTypeFilter] : undefined,
                      dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
                      pagination: { page: currentPage - 1, limit: 10 },
                      sorting: { sortBy, sortOrder: 'desc' }
                    });
                    await search(searchQueryObj);
                  }
                }}
                disabled={currentPage <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>

              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, currentPage - 2) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={async () => {
                      const searchQueryObj = createSearchQuery({
                        text: searchQuery.trim(),
                        nodeTypes: nodeTypeFilter ? [nodeTypeFilter] : undefined,
                        contentTypes: contentTypeFilter ? [contentTypeFilter] : undefined,
                        dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
                        pagination: { page: pageNum, limit: 10 },
                        sorting: { sortBy, sortOrder: 'desc' }
                      });
                      await search(searchQueryObj);
                    }}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      pageNum === currentPage
                        ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={async () => {
                  if (currentPage < totalPages) {
                    const searchQueryObj = createSearchQuery({
                      text: searchQuery.trim(),
                      nodeTypes: nodeTypeFilter ? [nodeTypeFilter] : undefined,
                      contentTypes: contentTypeFilter ? [contentTypeFilter] : undefined,
                      dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
                      pagination: { page: currentPage + 1, limit: 10 },
                      sorting: { sortBy, sortOrder: 'desc' }
                    });
                    await search(searchQueryObj);
                  }
                }}
                disabled={currentPage >= totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};