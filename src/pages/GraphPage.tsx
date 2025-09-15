import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShareIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { knowledgeService } from '../services/knowledge.service';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import type { GraphNode, GraphLink } from '../components/KnowledgeGraph';
import { GraphAnalysis } from '../components/GraphAnalysis';

export const GraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'analysis'>('graph');
  const [showLabels, setShowLabels] = useState(true);
  const [showLinkLabels, setShowLinkLabels] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'force' | 'radial' | 'hierarchical'>('force');
  const [colorScheme, setColorScheme] = useState<'default' | 'dark' | 'pastel'>('default');

  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['graph-data'],
    queryFn: () => knowledgeService.getGraphData(),
    retry: 2,
  });

  const nodeTypes = [
    'Knowledge', 'Concept', 'Fact', 'Question',
    'Idea', 'Project', 'Resource', 'Note'
  ];

  // Filter nodes and relationships based on search and filters
  const filteredNodes = graphData?.nodes.filter(node => {
    const matchesSearch = !searchQuery ||
      node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedNodeTypes.length === 0 ||
      selectedNodeTypes.includes(node.node_type);

    return matchesSearch && matchesType;
  }) || [];

  const filteredNodeIds = new Set(filteredNodes.map(node => node.id));

  const filteredRelationships = graphData?.relationships.filter(rel =>
    filteredNodeIds.has(rel.source) && filteredNodeIds.has(rel.target)
  ) || [];

  const handleNodeClick = (node: GraphNode) => {
    navigate(`/app/knowledge/${node.id}`);
  };

  const handleNodeDoubleClick = (node: GraphNode) => {
    navigate(`/app/knowledge/${node.id}/edit`);
  };

  const handleNodeTypeToggle = (nodeType: string) => {
    setSelectedNodeTypes(prev =>
      prev.includes(nodeType)
        ? prev.filter(type => type !== nodeType)
        : [...prev, nodeType]
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="text-center">
              <ShareIcon className="mx-auto h-24 w-24 text-gray-400" />
              <h2 className="mt-4 text-xl font-medium text-gray-900">그래프를 로드할 수 없습니다</h2>
              <p className="mt-2 text-gray-600">
                데이터를 불러오는 중 오류가 발생했습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const GraphContent = () => (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className={`${isFullscreen ? 'h-full' : ''} bg-white shadow rounded-lg overflow-hidden`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">지식 그래프</h1>
              <p className="mt-1 text-sm text-gray-600">
                노드 {filteredNodes.length}개, 관계 {filteredRelationships.length}개
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {isFullscreen ? (
                  <>
                    <ArrowsPointingInIcon className="h-4 w-4 mr-2" />
                    축소
                  </>
                ) : (
                  <>
                    <ArrowsPointingOutIcon className="h-4 w-4 mr-2" />
                    전체화면
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('graph')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'graph'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                그래프 시각화
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analysis'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                고급 분석
              </button>
            </nav>
          </div>
        </div>

        <div className={`${isFullscreen ? 'h-full flex' : 'flex'}`}>
          {/* Sidebar */}
          <div className={`${isFullscreen ? 'w-80' : 'w-64'} border-r border-gray-200 bg-gray-50 p-4 space-y-4`}>
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                검색
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="search"
                  type="text"
                  placeholder="노드 또는 태그 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Node Type Filters */}
            <div>
              <div className="flex items-center mb-2">
                <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700">노드 타입</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {nodeTypes.map(nodeType => (
                  <label key={nodeType} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedNodeTypes.includes(nodeType)}
                      onChange={() => handleNodeTypeToggle(nodeType)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{nodeType}</span>
                  </label>
                ))}
              </div>

              {selectedNodeTypes.length > 0 && (
                <button
                  onClick={() => setSelectedNodeTypes([])}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-800"
                >
                  모두 초기화
                </button>
              )}
            </div>

            {/* Visualization Options */}
            <div className="bg-white rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-900 mb-2">시각화 옵션</h3>

              {/* Layout Mode */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">레이아웃</label>
                <select
                  value={layoutMode}
                  onChange={(e) => setLayoutMode(e.target.value as 'force' | 'radial' | 'hierarchical')}
                  className="w-full text-xs p-1 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="force">Force-Directed</option>
                  <option value="radial">Radial</option>
                  <option value="hierarchical">Hierarchical</option>
                </select>
              </div>

              {/* Color Scheme */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">색상 테마</label>
                <select
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value as 'default' | 'dark' | 'pastel')}
                  className="w-full text-xs p-1 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="default">기본</option>
                  <option value="dark">다크</option>
                  <option value="pastel">파스텔</option>
                </select>
              </div>

              {/* Display Options */}
              <div className="space-y-2">
                <label className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="h-3 w-3 text-primary-600 border-gray-300 rounded mr-2"
                  />
                  노드 라벨 표시
                </label>
                <label className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    checked={showLinkLabels}
                    onChange={(e) => setShowLinkLabels(e.target.checked)}
                    className="h-3 w-3 text-primary-600 border-gray-300 rounded mr-2"
                  />
                  관계 라벨 표시
                </label>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-900 mb-2">통계</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div>전체 노드: {graphData?.nodes.length || 0}</div>
                <div>전체 관계: {graphData?.relationships.length || 0}</div>
                <div>표시된 노드: {filteredNodes.length}</div>
                <div>표시된 관계: {filteredRelationships.length}</div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-blue-900 mb-2">사용법</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 마우스로 드래그하여 이동</li>
                <li>• 휠로 확대/축소</li>
                <li>• 노드 클릭으로 상세보기</li>
                <li>• 노드 더블클릭으로 편집</li>
                <li>• 노드 드래그로 위치 조정</li>
              </ul>
            </div>
          </div>

          {/* Content Area */}
          <div className={`flex-1 ${isFullscreen ? 'h-full' : 'h-screen max-h-screen'} overflow-hidden`}>
            {activeTab === 'graph' ? (
              // Graph Visualization Tab
              filteredNodes.length > 0 ? (
                <KnowledgeGraph
                  nodes={filteredNodes as GraphNode[]}
                  relationships={filteredRelationships as GraphLink[]}
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleNodeDoubleClick}
                  width={isFullscreen ? window.innerWidth - 320 : 1200}
                  height={isFullscreen ? window.innerHeight - 80 : 700}
                  className="h-full"
                  showLabels={showLabels}
                  showLinkLabels={showLinkLabels}
                  layoutMode={layoutMode}
                  colorScheme={colorScheme}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <ShareIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">표시할 노드가 없습니다</h3>
                    <p className="text-gray-600 mb-4">
                      검색 조건을 변경하거나 새로운 지식 노드를 생성해보세요.
                    </p>
                    <button
                      onClick={() => navigate('/app/knowledge/create')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      새 노드 생성
                    </button>
                  </div>
                </div>
              )
            ) : (
              // Graph Analysis Tab
              <div className="h-full overflow-y-auto p-6">
                <GraphAnalysis />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${isFullscreen ? '' : 'max-w-7xl mx-auto'}`}>
      <GraphContent />
    </div>
  );
};