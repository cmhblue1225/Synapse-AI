import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  LightBulbIcon,
  MapIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { knowledgeService } from '../services/knowledge.service';
import { Link } from 'react-router-dom';

interface GraphAnalysisProps {
  nodeId?: string;
  className?: string;
}

interface AnalysisResult {
  type: 'influence' | 'similar' | 'clusters' | 'bridges' | 'neighborhood';
  title: string;
  description: string;
  data: any[];
  loading: boolean;
  error?: string;
}

export const GraphAnalysis: React.FC<GraphAnalysisProps> = ({
  nodeId,
  className = ''
}) => {
  const [activeAnalysis, setActiveAnalysis] = useState<string>('influence');
  const [searchNodeId, setSearchNodeId] = useState(nodeId || '');

  // Node influence analysis
  const { data: influenceData, isLoading: influenceLoading } = useQuery({
    queryKey: ['node-influence', searchNodeId],
    queryFn: () => searchNodeId ? knowledgeService.getNodeInfluence(searchNodeId) : null,
    enabled: !!searchNodeId && activeAnalysis === 'influence',
  });

  // Similar nodes analysis
  const { data: similarNodes, isLoading: similarLoading } = useQuery({
    queryKey: ['similar-nodes', searchNodeId],
    queryFn: () => searchNodeId ? knowledgeService.findSimilarNodesByContent(searchNodeId) : null,
    enabled: !!searchNodeId && activeAnalysis === 'similar',
  });

  // Knowledge clusters
  const { data: clusters, isLoading: clustersLoading } = useQuery({
    queryKey: ['knowledge-clusters'],
    queryFn: () => knowledgeService.findClusters(3),
    enabled: activeAnalysis === 'clusters',
  });

  // Bridge nodes
  const { data: bridgeNodes, isLoading: bridgesLoading } = useQuery({
    queryKey: ['bridge-nodes'],
    queryFn: () => knowledgeService.getBridgeNodes(),
    enabled: activeAnalysis === 'bridges',
  });

  // Node neighborhood
  const { data: neighborhood, isLoading: neighborhoodLoading } = useQuery({
    queryKey: ['node-neighborhood', searchNodeId],
    queryFn: () => searchNodeId ? knowledgeService.getNodeNeighborhood(searchNodeId, 2) : null,
    enabled: !!searchNodeId && activeAnalysis === 'neighborhood',
  });

  const analysisOptions = [
    {
      id: 'influence',
      title: '노드 영향력',
      description: '특정 노드의 네트워크 내 영향력을 분석합니다',
      icon: ChartBarIcon,
      requiresNodeId: true
    },
    {
      id: 'similar',
      title: '유사 노드',
      description: '내용이 유사한 노드들을 찾습니다',
      icon: MagnifyingGlassIcon,
      requiresNodeId: true
    },
    {
      id: 'clusters',
      title: '지식 클러스터',
      description: '밀접하게 연결된 노드 그룹을 찾습니다',
      icon: ShareIcon,
      requiresNodeId: false
    },
    {
      id: 'bridges',
      title: '브리지 노드',
      description: '서로 다른 클러스터를 연결하는 핵심 노드를 찾습니다',
      icon: LightBulbIcon,
      requiresNodeId: false
    },
    {
      id: 'neighborhood',
      title: '노드 근접성',
      description: '특정 노드 주변의 연결된 노드들을 분석합니다',
      icon: MapIcon,
      requiresNodeId: true
    }
  ];

  const getCurrentAnalysisData = (): AnalysisResult => {
    switch (activeAnalysis) {
      case 'influence':
        return {
          type: 'influence',
          title: '노드 영향력 분석',
          description: '들어오는 연결과 나가는 연결을 기반으로 한 영향력 점수',
          data: influenceData ? [influenceData] : [],
          loading: influenceLoading
        };

      case 'similar':
        return {
          type: 'similar',
          title: '유사한 노드',
          description: '내용 유사도 기반 추천 노드들',
          data: similarNodes || [],
          loading: similarLoading
        };

      case 'clusters':
        return {
          type: 'clusters',
          title: '지식 클러스터',
          description: '밀접하게 연결된 노드 그룹들',
          data: clusters || [],
          loading: clustersLoading
        };

      case 'bridges':
        return {
          type: 'bridges',
          title: '브리지 노드',
          description: '서로 다른 클러스터를 연결하는 핵심 노드들',
          data: bridgeNodes || [],
          loading: bridgesLoading
        };

      case 'neighborhood':
        return {
          type: 'neighborhood',
          title: '노드 근접성 분석',
          description: '선택된 노드 주변의 연결 구조',
          data: neighborhood || [],
          loading: neighborhoodLoading
        };

      default:
        return {
          type: 'influence',
          title: '',
          description: '',
          data: [],
          loading: false
        };
    }
  };

  const renderInfluenceAnalysis = (data: any) => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-900">{data.inbound_count || 0}</div>
          <div className="text-sm text-blue-600">들어오는 연결</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-900">{data.outbound_count || 0}</div>
          <div className="text-sm text-green-600">나가는 연결</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-900">
            {(data.influence_score || 0).toFixed(2)}
          </div>
          <div className="text-sm text-purple-600">영향력 점수</div>
        </div>
      </div>
    </div>
  );

  const renderNodeList = (nodes: any[], linkable: boolean = true) => (
    <div className="space-y-2">
      {nodes.map((node, index) => (
        <div key={node.id || index} className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {linkable && node.id ? (
                <Link
                  to={`/app/knowledge/${node.id}`}
                  className="font-medium text-primary-600 hover:text-primary-800"
                >
                  {node.title || node.name || '제목 없음'}
                </Link>
              ) : (
                <h4 className="font-medium text-gray-900">
                  {node.title || node.name || '제목 없음'}
                </h4>
              )}

              {node.similarity_score && (
                <div className="text-sm text-gray-600 mt-1">
                  유사도: {(node.similarity_score * 100).toFixed(1)}%
                </div>
              )}

              {node.connection_count && (
                <div className="text-sm text-gray-600 mt-1">
                  연결 수: {node.connection_count}
                </div>
              )}

              {node.nodes && (
                <div className="text-sm text-gray-600 mt-1">
                  클러스터 크기: {node.nodes.length}개 노드
                </div>
              )}
            </div>

            {node.distance && (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                거리: {node.distance}
              </span>
            )}
          </div>
        </div>
      ))}

      {nodes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm">분석 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );

  const currentAnalysis = getCurrentAnalysisData();
  const selectedOption = analysisOptions.find(opt => opt.id === activeAnalysis);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">그래프 분석</h3>
        <p className="text-sm text-gray-500 mt-1">
          지식 네트워크의 구조와 패턴을 분석합니다
        </p>
      </div>

      <div className="p-6">
        {/* Analysis Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            분석 유형
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysisOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setActiveAnalysis(option.id)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    activeAnalysis === option.id
                      ? 'border-primary-300 bg-primary-50 text-primary-900'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <div className="flex items-start">
                    <Icon className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{option.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Node ID Input for node-specific analyses */}
        {selectedOption?.requiresNodeId && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              분석할 노드 ID
            </label>
            <input
              type="text"
              value={searchNodeId}
              onChange={(e) => setSearchNodeId(e.target.value)}
              placeholder="노드 ID를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}

        {/* Analysis Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                {currentAnalysis.title}
              </h4>
              <p className="text-sm text-gray-600">
                {currentAnalysis.description}
              </p>
            </div>

            {currentAnalysis.loading && (
              <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
            )}
          </div>

          {currentAnalysis.loading ? (
            <div className="text-center py-8">
              <ArrowPathIcon className="mx-auto h-8 w-8 text-gray-400 animate-spin mb-3" />
              <p className="text-sm text-gray-500">분석 중...</p>
            </div>
          ) : currentAnalysis.type === 'influence' ? (
            currentAnalysis.data.length > 0 ? (
              renderInfluenceAnalysis(currentAnalysis.data[0])
            ) : (
              <div className="text-center py-8 text-gray-500">
                노드 ID를 입력하여 영향력을 분석하세요.
              </div>
            )
          ) : (
            renderNodeList(currentAnalysis.data, currentAnalysis.type !== 'clusters')
          )}
        </div>
      </div>
    </div>
  );
};