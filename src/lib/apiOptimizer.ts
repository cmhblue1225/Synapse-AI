// API 성능 최적화를 위한 헬퍼 함수들

import { queryClient, invalidateQueries } from './queryClient';

// 응답 압축 및 크기 최적화
export const optimizeResponse = {
  // 큰 컨텐츠 필드 잘라내기 (리스트 뷰용)
  truncateContent: (nodes: any[], maxLength: number = 100) => {
    return nodes.map(node => ({
      ...node,
      content: node.content && node.content.length > maxLength
        ? node.content.substring(0, maxLength) + '...'
        : node.content,
      summary: node.content
        ? node.content.substring(0, maxLength) + '...'
        : null
    }));
  },

  // 불필요한 필드 제거 (메모리 최적화)
  minifyNodes: (nodes: any[]) => {
    return nodes.map(node => ({
      id: node.id,
      title: node.title,
      content: node.content,
      node_type: node.node_type,
      tags: node.tags || [],
      created_at: node.created_at,
      updated_at: node.updated_at,
      // metadata와 기타 무거운 필드 제외
    }));
  },

  // 페이지네이션 최적화
  paginate: (data: any[], page: number = 1, limit: number = 20) => {
    const offset = (page - 1) * limit;
    return {
      data: data.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages: Math.ceil(data.length / limit),
        hasNextPage: offset + limit < data.length,
        hasPreviousPage: page > 1,
      }
    };
  }
};

// 백그라운드 업데이트 최적화
export const backgroundSync = {
  // 백그라운드에서 중요한 데이터 새로고침
  syncCriticalData: async () => {
    try {
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ['knowledge', 'nodes'],
          type: 'active'
        }),
        queryClient.refetchQueries({
          queryKey: ['user', 'stats'],
          type: 'active'
        }),
      ]);
    } catch (error) {
      console.warn('Background sync failed:', error);
    }
  },

  // 사용자 활동 기반 프리페칭
  preloadBasedOnActivity: async (lastVisitedPages: string[]) => {
    const prefetchPromises = [];

    // 최근 방문 페이지에 따른 데이터 프리페치
    if (lastVisitedPages.includes('/app/graph')) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['graph', 'data'],
          staleTime: 30 * 60 * 1000, // 30분
        })
      );
    }

    if (lastVisitedPages.includes('/app/search')) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['tags', 'popular'],
          staleTime: 30 * 60 * 1000,
        })
      );
    }

    await Promise.all(prefetchPromises);
  }
};

// 요청 중복 제거 (디바운싱/스로틀링)
export const requestOptimizer = {
  // 검색 쿼리 디바운싱
  debounceMap: new Map<string, NodeJS.Timeout>(),

  debounceQuery: (key: string, callback: () => void, delay: number = 300) => {
    // 기존 타이머 취소
    if (requestOptimizer.debounceMap.has(key)) {
      clearTimeout(requestOptimizer.debounceMap.get(key)!);
    }

    // 새 타이머 설정
    const timeoutId = setTimeout(callback, delay);
    requestOptimizer.debounceMap.set(key, timeoutId);
  },

  // API 요청 스로틀링 (동일한 요청 중복 방지)
  pendingRequests: new Map<string, Promise<any>>(),

  throttleRequest: async <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
    // 이미 진행 중인 동일한 요청이 있으면 재사용
    if (requestOptimizer.pendingRequests.has(key)) {
      return requestOptimizer.pendingRequests.get(key)!;
    }

    // 새 요청 생성 및 캐싱
    const requestPromise = requestFn();
    requestOptimizer.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // 요청 완료 후 캐시에서 제거
      requestOptimizer.pendingRequests.delete(key);
    }
  }
};

// 캐시 워밍업 (사용자 로그인 시 미리 로딩)
export const cacheWarming = {
  // 사용자 로그인 시 필수 데이터 프리로딩
  warmupUserData: async (userId: string) => {
    const warmupPromises = [
      // 사용자 통계 프리로드
      queryClient.prefetchQuery({
        queryKey: ['user', 'stats'],
        staleTime: 30 * 60 * 1000,
      }),

      // 최근 노드 프리로드
      queryClient.prefetchQuery({
        queryKey: ['knowledge', 'nodes', 'recent', { limit: 5 }],
        staleTime: 5 * 60 * 1000,
      }),

      // 인기 태그 프리로드
      queryClient.prefetchQuery({
        queryKey: ['tags', 'popular', { limit: 10 }],
        staleTime: 30 * 60 * 1000,
      }),
    ];

    await Promise.allSettled(warmupPromises);
  },

  // 페이지별 데이터 워밍업
  warmupPageData: async (pageName: string) => {
    switch (pageName) {
      case 'dashboard':
        await cacheWarming.warmupUserData('');
        break;

      case 'knowledge':
        await queryClient.prefetchQuery({
          queryKey: ['knowledge', 'nodes'],
          staleTime: 5 * 60 * 1000,
        });
        break;

      case 'graph':
        await queryClient.prefetchQuery({
          queryKey: ['graph', 'data'],
          staleTime: 30 * 60 * 1000,
        });
        break;

      case 'search':
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['tags', 'suggestions'],
            staleTime: 30 * 60 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: ['search', 'recent'],
            staleTime: 10 * 60 * 1000,
          }),
        ]);
        break;
    }
  }
};

// 네트워크 상태 기반 최적화
export const networkOptimizer = {
  // 네트워크 상태 감지
  getNetworkStatus: () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };
    }
    return { effectiveType: '4g', downlink: 10, rtt: 100, saveData: false };
  },

  // 네트워크 상태에 따른 캐시 전략 조정
  adaptCacheStrategy: () => {
    const network = networkOptimizer.getNetworkStatus();

    if (network.saveData || network.effectiveType === '2g') {
      // 저속 네트워크: 캐시 시간 증가, 백그라운드 업데이트 감소
      return {
        staleTime: 30 * 60 * 1000, // 30분
        gcTime: 60 * 60 * 1000,    // 1시간
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      };
    } else if (network.effectiveType === '3g') {
      // 중속 네트워크: 기본 설정
      return {
        staleTime: 5 * 60 * 1000,  // 5분
        gcTime: 30 * 60 * 1000,    // 30분
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      };
    } else {
      // 고속 네트워크: 실시간성 증가
      return {
        staleTime: 2 * 60 * 1000,  // 2분
        gcTime: 10 * 60 * 1000,    // 10분
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      };
    }
  }
};

// 에러 복구 최적화
export const errorRecovery = {
  // 네트워크 에러 시 캐시된 데이터 사용
  useStaleDataOnError: (error: any) => {
    if (error?.code === 'NETWORK_ERROR' || error?.status >= 500) {
      return true; // 네트워크 에러나 서버 에러 시 stale 데이터 사용
    }
    return false;
  },

  // 부분 실패 시 복구
  handlePartialFailure: (results: PromiseSettledResult<any>[]) => {
    const successful = results.filter((result): result is PromiseFulfilledResult<any> =>
      result.status === 'fulfilled'
    );

    const failed = results.filter((result): result is PromiseRejectedResult =>
      result.status === 'rejected'
    );

    // 부분적 성공이라도 사용자에게 데이터 제공
    if (successful.length > 0) {
      console.warn(`${failed.length}개 요청 실패, ${successful.length}개 요청 성공`);
      return successful.map(result => result.value);
    }

    throw new Error('모든 요청이 실패했습니다.');
  }
};

// 성능 모니터링
export const performanceMonitor = {
  // API 호출 시간 측정
  measureApiCall: async <T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();

    // 성능 측정 시작 마크 설정
    if (typeof window !== 'undefined') {
      try {
        window.performance.mark(`api-${name}-start`);
      } catch (e) {
        // Performance API 지원하지 않는 경우 무시
      }
    }

    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 느린 API 호출 로깅
      if (duration > 1000) {
        console.warn(`느린 API 호출: ${name} - ${duration.toFixed(2)}ms`);
      }

      // 성능 메트릭 저장 (실제 환경에서는 분석 도구로 전송)
      if (typeof window !== 'undefined') {
        try {
          window.performance.mark(`api-${name}-end`);
          window.performance.measure(`api-${name}`, `api-${name}-start`, `api-${name}-end`);
        } catch (e) {
          // Performance API 오류 시 무시
        }
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`API 호출 실패: ${name} - ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  },

  // 캐시 적중률 모니터링
  trackCacheHitRate: () => {
    const queries = queryClient.getQueryCache().getAll();
    const totalQueries = queries.length;
    const cachedQueries = queries.filter(q => q.state.data && !q.state.isFetching).length;
    const hitRate = totalQueries > 0 ? (cachedQueries / totalQueries) * 100 : 0;

    return {
      totalQueries,
      cachedQueries,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }
};