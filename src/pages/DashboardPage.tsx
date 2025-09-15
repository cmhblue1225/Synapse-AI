import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChartBarIcon,
  TagIcon,
  ClockIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/auth.store';
import { knowledgeService } from '../services/knowledge.service';
import { searchService } from '../services/search.service';

// Import optimized query keys and options
import { QUERY_KEYS, getQueryOptions, prefetchQueries } from '../lib/queryClient';
import { EmbeddingStatsCard } from '../components/dashboard/EmbeddingStatsCard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  // 대시보드 데이터 프리페칭 (사용자 경험 향상)
  useEffect(() => {
    if (user?.id) {
      prefetchQueries.dashboard();
    }
  }, [user?.id]);

  // 최적화된 쿼리: 최근 노드 조회 (짧은 캐싱 - 자주 변경됨)
  const { data: recentNodes, isLoading: nodesLoading, error: nodesError } = useQuery({
    queryKey: [...QUERY_KEYS.KNOWLEDGE_NODES, 'recent', { limit: 5 }],
    queryFn: () => knowledgeService.getUserNodes({ limit: 5 }),
    ...getQueryOptions.knowledgeNodes(),
    enabled: !!user?.id,
  });

  // 최적화된 쿼리: 사용자 통계 (긴 캐싱 - 실시간성 중요하지 않음)
  const { data: nodeStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: QUERY_KEYS.USER_STATS,
    queryFn: () => knowledgeService.getUserStats(),
    ...getQueryOptions.statistics(),
    enabled: !!user?.id,
  });

  // 최적화된 쿼리: 인기 태그 (중간 캐싱)
  const { data: popularTags, isLoading: tagsLoading, error: tagsError } = useQuery({
    queryKey: [...QUERY_KEYS.TAGS, 'popular', { limit: 10 }],
    queryFn: () => searchService.getPopularTags(10),
    ...getQueryOptions.statistics(),
    enabled: !!user?.id,
  });

  const quickActions = [
    {
      name: '새 노트 작성',
      description: '아이디어를 빠르게 기록하세요',
      href: '/app/knowledge/create',
      icon: PlusIcon,
      color: 'bg-primary-500',
    },
    {
      name: '지식 검색',
      description: '저장된 지식을 찾아보세요',
      href: '/app/search',
      icon: MagnifyingGlassIcon,
      color: 'bg-green-500',
    },
    {
      name: '지식 노드',
      description: '모든 노드를 살펴보세요',
      href: '/app/knowledge',
      icon: BookOpenIcon,
      color: 'bg-blue-500',
    },
    {
      name: '통계 보기',
      description: '지식 활동을 분석하세요',
      href: '/app/stats',
      icon: ChartBarIcon,
      color: 'bg-purple-500',
    },
  ];

  // 통계 데이터 처리 (최적화된 사용자 통계 활용)
  const stats = [
    {
      name: '전체 노드',
      value: nodeStats?.total_nodes || 0,
      change: nodeStats?.nodes_this_week > 0 ? `+${nodeStats.nodes_this_week}개 추가` : '변화 없음',
      changeType: nodeStats?.nodes_this_week > 0 ? 'positive' : 'neutral',
      icon: BookOpenIcon,
    },
    {
      name: '이번 주 생성',
      value: nodeStats?.nodes_this_week || 0,
      change: nodeStats?.recent_activity_days > 0 ? `${nodeStats.recent_activity_days}일 활동` : '활동 없음',
      changeType: nodeStats?.nodes_this_week > 0 ? 'positive' : 'neutral',
      icon: ArrowTrendingUpIcon,
    },
    {
      name: '연결된 관계',
      value: nodeStats?.total_relationships || 0,
      change: nodeStats?.avg_relationships_per_node
        ? `평균 ${nodeStats.avg_relationships_per_node.toFixed(1)}개/노드`
        : '관계 없음',
      changeType: nodeStats?.total_relationships > 0 ? 'positive' : 'neutral',
      icon: TagIcon,
    },
    {
      name: '활용된 태그',
      value: nodeStats?.total_tags || 0,
      change: nodeStats?.most_used_tags?.length > 0
        ? `인기: ${nodeStats.most_used_tags[0]?.tag || '없음'}`
        : '태그 없음',
      changeType: nodeStats?.total_tags > 0 ? 'positive' : 'neutral',
      icon: MagnifyingGlassIcon,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-knowledge-500 to-ai-600 rounded-3xl p-8 text-white shadow-strong">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-36 h-36 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">
                안녕하세요, {user?.username || user?.first_name || '사용자'}님! ✨
              </h1>
              <p className="text-lg text-white/90 leading-relaxed mb-6">
                오늘도 새로운 지식을 발견해보세요. 현재까지 <span className="font-bold text-white">{nodeStats?.total_nodes || 0}개</span>의 노드를 생성하셨습니다.
                {nodeStats?.recent_activity_days > 0 && (
                  <span className="block mt-1 text-white/80">최근 {nodeStats.recent_activity_days}일 동안 활발하게 활동하고 계시네요!</span>
                )}
              </p>

              {/* Quick action buttons */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/app/knowledge/create"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl font-semibold transition-all duration-300 hover:transform hover:scale-105 hover:shadow-glow"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>새 노드 생성</span>
                </Link>
                <Link
                  to="/app/ai-chat"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl font-semibold transition-all duration-300 hover:transform hover:scale-105 hover:shadow-glow"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>AI 채팅</span>
                </Link>
              </div>
            </div>

            {/* Stats circle */}
            <div className="hidden lg:block ml-8">
              <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">{nodeStats?.total_nodes || 0}</div>
                  <div className="text-sm opacity-90">노드</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="card-interactive group bg-white/80 backdrop-blur-sm border border-white/20 animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-r from-primary-500 to-knowledge-500 rounded-2xl group-hover:shadow-glow transition-all duration-300">
                  <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  stat.changeType === 'positive'
                    ? 'bg-success-100 text-success-700'
                    : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {stat.change}
                </div>
              </div>

              <div>
                <dt className="text-sm font-semibold text-neutral-600 mb-2">{stat.name}</dt>
                <dd className="text-3xl font-bold text-neutral-900 group-hover:text-primary-700 transition-colors duration-200">
                  {stat.value}
                </dd>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="card-premium">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900">빠른 작업</h3>
              </div>
              <p className="mt-2 text-sm text-neutral-600">자주 사용하는 기능들에 빠르게 접근하세요</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {quickActions.map((action, index) => (
                  <Link
                    key={action.name}
                    to={action.href}
                    className="relative group card-interactive bg-gradient-to-br from-white to-neutral-50 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-2xl shadow-soft transition-all duration-300 group-hover:shadow-glow ${action.color}`}>
                          <action.icon className="h-6 w-6 text-white" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-neutral-900 group-hover:text-primary-700 transition-colors duration-200">
                            {action.name}
                          </h3>
                          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{action.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Hover arrow */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-1">
                      <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Nodes */}
          <div className="mt-8 card-premium">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-knowledge-100 rounded-lg">
                    <BookOpenIcon className="h-5 w-5 text-knowledge-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900">최근 노드</h3>
                    <p className="text-sm text-neutral-600">최근에 작업한 지식 노드들</p>
                  </div>
                </div>
                <Link
                  to="/app/knowledge"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200"
                >
                  모두 보기 →
                </Link>
              </div>
            </div>

            <div className="divide-y divide-neutral-100">
              {nodesLoading ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <div className="skeleton h-12 w-12 rounded-xl"></div>
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-4 rounded w-3/4"></div>
                          <div className="skeleton h-3 rounded w-1/2"></div>
                          <div className="flex space-x-2">
                            <div className="skeleton h-5 w-16 rounded-full"></div>
                            <div className="skeleton h-5 w-12 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : recentNodes?.nodes?.length ? (
                recentNodes.nodes.map((node, index) => (
                  <Link
                    key={node.id}
                    to={`/app/knowledge/${node.id}`}
                    className="block hover:bg-neutral-50 px-6 py-5 transition-all duration-200 group animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-knowledge-500 rounded-xl flex items-center justify-center group-hover:shadow-glow transition-all duration-200">
                          <BookOpenIcon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 mr-4">
                            <h4 className="text-base font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors duration-200 truncate">
                              {node.title}
                            </h4>
                            <p className="text-sm text-neutral-600 line-clamp-2 mt-1">
                              {node.content ? node.content.substring(0, 120) + '...' : '내용 없음'}
                            </p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center space-x-3">
                          <div className="flex items-center space-x-1 text-xs text-neutral-500">
                            <ClockIcon className="h-3 w-3" />
                            <span>{new Date(node.updated_at || node.created_at).toLocaleDateString('ko-KR')}</span>
                          </div>

                          {node.tags?.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-neutral-400">•</span>
                              <div className="flex space-x-1">
                                {node.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <span
                                    key={`${node.id}-tag-${tagIndex}-${tag}`}
                                    className="badge-primary"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {node.tags.length > 3 && (
                                  <span className="text-xs text-neutral-500 font-medium">
                                    +{node.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-primary-100 to-knowledge-100 rounded-2xl flex items-center justify-center mb-4">
                    <BookOpenIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">아직 노드가 없습니다</h3>
                  <p className="text-neutral-600 mb-6">첫 번째 지식 노드를 생성해서 여정을 시작해보세요.</p>
                  <Link
                    to="/app/knowledge/create"
                    className="btn-primary"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    새 노드 생성
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Premium Sidebar */}
        <div className="space-y-8">
          {/* AI 임베딩 현황 */}
          <EmbeddingStatsCard />

          {/* Popular Tags */}
          <div className="card-premium">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-ai-100 rounded-lg">
                  <TagIcon className="h-5 w-5 text-ai-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">인기 태그</h3>
                  <p className="text-xs text-neutral-600">자주 사용되는 태그들</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {tagsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="skeleton h-6 w-20 rounded-full"></div>
                      <div className="skeleton h-4 w-8 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : popularTags?.tags?.length ? (
                <div className="space-y-4">
                  {popularTags.tags.map((tag, index) => (
                    <div key={`popular-tag-${index}-${tag.name}`} className="group flex items-center justify-between p-3 hover:bg-neutral-50 rounded-xl transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-gradient-to-r from-primary-500 to-ai-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-neutral-900 group-hover:text-primary-700">#{tag.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-neutral-600">{tag.count}</span>
                        <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-ai-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((tag.count / (popularTags.tags[0]?.count || 1)) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TagIcon className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
                  <p className="text-sm text-neutral-500">아직 태그가 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="card-premium">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success-100 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">활동 요약</h3>
                  <p className="text-xs text-neutral-600">지식 활동 현황</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-primary-50 to-knowledge-50 rounded-2xl">
                  <div className="text-2xl font-bold text-primary-700">{nodeStats?.total_nodes || 0}</div>
                  <div className="text-xs text-primary-600 font-medium">전체 노드</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-ai-50 to-success-50 rounded-2xl">
                  <div className="text-2xl font-bold text-ai-700">{nodeStats?.nodes_this_week || 0}</div>
                  <div className="text-xs text-ai-600 font-medium">이번 주</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                  <span className="text-sm font-medium text-neutral-700">연결된 관계</span>
                  <span className="text-sm font-bold text-neutral-900">{nodeStats?.total_relationships || 0}개</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                  <span className="text-sm font-medium text-neutral-700">활용된 태그</span>
                  <span className="text-sm font-bold text-neutral-900">{nodeStats?.total_tags || 0}개</span>
                </div>
              </div>

              {nodeStats?.most_used_tags?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-neutral-200">
                  <h4 className="text-sm font-semibold text-neutral-700 mb-3">최근 인기 태그</h4>
                  <div className="flex flex-wrap gap-2">
                    {nodeStats.most_used_tags.slice(0, 3).map((tag, index) => (
                      <div
                        key={index}
                        className="group bg-gradient-to-r from-primary-500 to-ai-500 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:shadow-glow transition-all duration-200 hover:scale-105 cursor-pointer"
                      >
                        #{tag.tag} <span className="opacity-75">({tag.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};