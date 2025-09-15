import { QueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

// 캐싱 전략 상수
export const STALE_TIME = {
  IMMEDIATE: 0,
  SHORT: 30 * 1000,      // 30초
  MEDIUM: 5 * 60 * 1000, // 5분
  LONG: 30 * 60 * 1000,  // 30분
  EXTRA_LONG: 60 * 60 * 1000, // 1시간
} as const;

export const CACHE_TIME = {
  SHORT: 5 * 60 * 1000,  // 5분
  MEDIUM: 30 * 60 * 1000, // 30분
  LONG: 60 * 60 * 1000,   // 1시간
  EXTRA_LONG: 24 * 60 * 60 * 1000, // 24시간
} as const;

// QueryClient 인스턴스 생성 (성능 최적화된 설정)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기본 캐싱 설정
      staleTime: STALE_TIME.MEDIUM,    // 5분 동안 fresh 상태 유지
      gcTime: CACHE_TIME.MEDIUM,       // 30분 동안 캐시 유지 (구 cacheTime)

      // 네트워크 설정
      retry: (failureCount, error: any) => {
        // API 에러 타입에 따른 재시도 전략
        if (error?.status === 404 || error?.status === 403) {
          return false; // 404나 403은 재시도하지 않음
        }
        return failureCount < 3; // 최대 3회 재시도
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프

      // UI 최적화 설정
      refetchOnWindowFocus: false,     // 창 포커스 시 자동 리페치 비활성화
      refetchOnReconnect: true,        // 네트워크 재연결 시 리페치
      refetchOnMount: true,            // 컴포넌트 마운트 시 리페치

      // 성능 최적화
      keepPreviousData: true,          // 이전 데이터 유지 (페이징에 유용)
      notifyOnChangeProps: 'all',      // 모든 변경사항에 대해 알림
    },
    mutations: {
      retry: 1,
      // 뮤테이션 에러 처리
      onError: (error: any) => {
        const message = error?.message || '요청 처리 중 오류가 발생했습니다.';
        toast.error(message);
      },
    },
  },
});

// 특정 쿼리 키에 대한 캐싱 전략 설정
export const QUERY_KEYS = {
  // 사용자 관련 (자주 변경되지 않음)
  USER: ['user'] as const,
  USER_PROFILE: ['user', 'profile'] as const,
  USER_STATS: ['user', 'stats'] as const,

  // 지식 노드 관련 (자주 변경될 수 있음)
  KNOWLEDGE_NODES: ['knowledge', 'nodes'] as const,
  KNOWLEDGE_NODE_DETAIL: (id: string) => ['knowledge', 'nodes', id] as const,
  KNOWLEDGE_NODE_RELATIONSHIPS: (id: string) => ['knowledge', 'nodes', id, 'relationships'] as const,

  // 검색 관련 (즉시성이 중요함)
  SEARCH: ['search'] as const,
  SEARCH_RESULTS: (query: string, filters?: any) => ['search', 'results', query, filters] as const,

  // 그래프 관련 (계산 비용이 높음)
  GRAPH_DATA: ['graph', 'data'] as const,
  GRAPH_ANALYSIS: ['graph', 'analysis'] as const,

  // 태그 관련 (비교적 안정적)
  TAGS: ['tags'] as const,
  TAG_SUGGESTIONS: ['tags', 'suggestions'] as const,

  // 통계 관련 (실시간성이 중요하지 않음)
  STATISTICS: ['statistics'] as const,
  ANALYTICS: ['analytics'] as const,
} as const;

// 쿼리별 캐싱 설정 헬퍼 함수
export const getQueryOptions = {
  // 사용자 데이터 (오래 캐싱)
  user: () => ({
    staleTime: STALE_TIME.LONG,
    gcTime: CACHE_TIME.EXTRA_LONG,
  }),

  // 지식 노드 목록 (중간 캐싱)
  knowledgeNodes: () => ({
    staleTime: STALE_TIME.MEDIUM,
    gcTime: CACHE_TIME.MEDIUM,
  }),

  // 지식 노드 상세 (중간 캐싱, 실시간 업데이트 고려)
  knowledgeNodeDetail: () => ({
    staleTime: STALE_TIME.SHORT,
    gcTime: CACHE_TIME.MEDIUM,
  }),

  // 검색 결과 (짧은 캐싱, 즉시성 중요)
  search: () => ({
    staleTime: STALE_TIME.SHORT,
    gcTime: CACHE_TIME.SHORT,
  }),

  // 그래프 데이터 (긴 캐싱, 계산 비용 높음)
  graph: () => ({
    staleTime: STALE_TIME.LONG,
    gcTime: CACHE_TIME.LONG,
  }),

  // 통계 데이터 (매우 긴 캐싱)
  statistics: () => ({
    staleTime: STALE_TIME.EXTRA_LONG,
    gcTime: CACHE_TIME.EXTRA_LONG,
  }),
};

// 캐시 무효화 헬퍼 함수들
export const invalidateQueries = {
  // 사용자 관련 캐시 무효화
  user: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_STATS });
  },

  // 지식 노드 관련 캐시 무효화
  knowledgeNodes: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.KNOWLEDGE_NODES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GRAPH_DATA });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATISTICS });
  },

  // 특정 노드 관련 캐시 무효화
  knowledgeNode: (nodeId: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.KNOWLEDGE_NODE_DETAIL(nodeId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.KNOWLEDGE_NODE_RELATIONSHIPS(nodeId) });
    invalidateQueries.knowledgeNodes();
  },

  // 검색 관련 캐시 무효화
  search: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH });
  },

  // 그래프 관련 캐시 무효화
  graph: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GRAPH_DATA });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GRAPH_ANALYSIS });
  },

  // 전체 캐시 무효화 (주의해서 사용)
  all: () => {
    queryClient.invalidateQueries();
  },
};

// 프리페칭 헬퍼 함수들
export const prefetchQueries = {
  // 대시보드 진입 시 필요한 데이터 프리페치
  dashboard: async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.USER_STATS,
        staleTime: STALE_TIME.MEDIUM,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.KNOWLEDGE_NODES,
        staleTime: STALE_TIME.MEDIUM,
      }),
    ]);
  },

  // 그래프 페이지 진입 시 필요한 데이터 프리페치
  graph: async () => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.GRAPH_DATA,
      staleTime: STALE_TIME.LONG,
    });
  },
};

// 성능 모니터링을 위한 캐시 상태 헬퍼
export const getCacheInfo = () => {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  return {
    totalQueries: queries.length,
    staleQueries: queries.filter(q => q.isStale()).length,
    loadingQueries: queries.filter(q => q.state.isFetching).length,
    errorQueries: queries.filter(q => q.state.isError).length,
    cacheSize: JSON.stringify(cache).length, // 대략적인 캐시 크기
  };
};