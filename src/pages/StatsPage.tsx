import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  TagIcon,
  BookOpenIcon,
  LinkIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { knowledgeService } from '../services/knowledge.service';
import { searchService } from '../services/search.service';

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

export const StatsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'nodes' | 'relationships' | 'activity'>('overview');

  // 기본 통계 데이터 조회
  const { data: basicStats, isLoading: statsLoading } = useQuery({
    queryKey: ['basic-stats'],
    queryFn: () => knowledgeService.getUserNodes({ limit: 1000 }),
  });

  // 그래프 데이터 조회
  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['graph-stats'],
    queryFn: () => knowledgeService.getGraphData(),
  });

  // 검색 통계 조회
  const { data: searchStats, isLoading: searchLoading } = useQuery({
    queryKey: ['search-stats'],
    queryFn: () => searchService.getPopularTags(),
  });

  const nodes = basicStats?.nodes || [];
  const relationships = graphData?.relationships || [];
  const totalNodes = nodes.length;
  const totalRelationships = relationships.length;

  // 노드 타입별 분포 계산
  const nodeTypeDistribution = nodes.reduce((acc, node) => {
    acc[node.node_type] = (acc[node.node_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 태그 사용 빈도 계산
  const tagDistribution = nodes.reduce((acc, node) => {
    node.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // 최근 7일간 생성된 노드 수
  const recentNodes = nodes.filter(node => {
    const createdAt = new Date(node.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdAt > sevenDaysAgo;
  }).length;

  // 관계 타입별 분포
  const relationshipTypeDistribution = relationships.reduce((acc, rel) => {
    acc[rel.relationship_type] = (acc[rel.relationship_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statCards: StatCard[] = [
    {
      title: '총 노드 수',
      value: totalNodes,
      change: `+${recentNodes} (7일)`,
      trend: recentNodes > 0 ? 'up' : 'neutral',
      icon: BookOpenIcon,
      color: 'bg-blue-500'
    },
    {
      title: '총 관계 수',
      value: totalRelationships,
      change: `평균 ${totalNodes > 0 ? (totalRelationships / totalNodes).toFixed(1) : 0}/노드`,
      trend: 'neutral',
      icon: LinkIcon,
      color: 'bg-green-500'
    },
    {
      title: '활성 태그 수',
      value: Object.keys(tagDistribution).length,
      change: `평균 ${totalNodes > 0 ? (Object.keys(tagDistribution).length / totalNodes).toFixed(1) : 0}/노드`,
      trend: 'neutral',
      icon: TagIcon,
      color: 'bg-purple-500'
    },
    {
      title: '지식 밀도',
      value: `${totalNodes > 0 ? ((totalRelationships / totalNodes) * 100).toFixed(1) : 0}%`,
      change: '연결성 지표',
      trend: totalRelationships > totalNodes ? 'up' : 'neutral',
      icon: ArrowTrendingUpIcon,
      color: 'bg-orange-500'
    }
  ];

  if (statsLoading || graphLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-8 w-8 mr-3 text-primary-600" />
              통계 대시보드
            </h1>
            <p className="mt-2 text-gray-600">지식 네트워크의 성장과 활동을 분석합니다.</p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="7d">최근 7일</option>
              <option value="30d">최근 30일</option>
              <option value="90d">최근 90일</option>
              <option value="1y">최근 1년</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    {stat.change && (
                      <p className={`ml-2 text-sm ${
                        stat.trend === 'up' ? 'text-green-600' :
                        stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {stat.change}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { key: 'overview', label: '개요', icon: ChartBarIcon },
            { key: 'nodes', label: '노드 분석', icon: BookOpenIcon },
            { key: 'relationships', label: '관계 분석', icon: LinkIcon },
            { key: 'activity', label: '활동 로그', icon: ClockIcon }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as typeof selectedTab)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 text-sm font-medium ${
                selectedTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {selectedTab === 'overview' && (
          <>
            {/* Node Type Distribution */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">노드 타입 분포</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Object.entries(nodeTypeDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 6)
                    .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-primary-500 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-gray-900">{type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{count}개</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${(count / totalNodes) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 w-12">
                          {((count / totalNodes) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Popular Tags */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">인기 태그</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {Object.entries(tagDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([tag, count]) => (
                    <div key={tag} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <TagIcon className="h-4 w-4 text-purple-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">#{tag}</span>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {selectedTab === 'relationships' && (
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">관계 타입 분석</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(relationshipTypeDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .map(([type, count]) => (
                    <div key={type} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{type}</span>
                        <span className="text-lg font-semibold text-primary-600">{count}</span>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-primary-500 h-1 rounded-full"
                            style={{ width: `${(count / totalRelationships) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'nodes' && (
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">노드 생성 타임라인</h3>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">타임라인 차트</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    향후 업데이트에서 상세한 시간별 분석 차트를 제공할 예정입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'activity' && (
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {nodes
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 10)
                    .map((node, index) => (
                    <div key={node.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {node.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {node.node_type} • {new Date(node.updated_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          업데이트됨
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};