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
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-gradient-to-br from-neutral-50 via-white to-primary-50/30' : ''}`}>
      <div className={`${isFullscreen ? 'h-full' : ''} overflow-hidden`}>
        {/* 프리미엄 헤더 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-knowledge-500 via-primary-600 to-ai-500 text-white shadow-strong">
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

          <div className="relative z-10 px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <ShareIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">지식 그래프</h1>
                  <p className="text-white/90 text-lg">
                    노드 {filteredNodes.length}개, 관계 {filteredRelationships.length}개의 지식 네트워크
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span>실시간 동기화</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span>3D 시각화</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="btn-secondary bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                >
                  {isFullscreen ? (
                    <>
                      <ArrowsPointingInIcon className="h-5 w-5 mr-2" />
                      축소
                    </>
                  ) : (
                    <>
                      <ArrowsPointingOutIcon className="h-5 w-5 mr-2" />
                      전체화면
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 프리미엄 탭 */}
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-2xl p-2">
              <button
                onClick={() => setActiveTab('graph')}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'graph'
                    ? 'bg-white text-primary-700 shadow-soft'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                그래프 시각화
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'analysis'
                    ? 'bg-white text-primary-700 shadow-soft'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                고급 분석
              </button>
            </div>
          </div>
        </div>

        <div className={`${isFullscreen ? 'h-full flex' : 'flex'} bg-gradient-to-br from-neutral-50 via-white to-primary-50/30`}>
          {/* 프리미엄 사이드바 */}
          <div className={`${isFullscreen ? 'w-96' : 'w-80'} bg-white/70 backdrop-blur-sm border-r border-white/20 p-6 space-y-6 overflow-y-auto`}>
            {/* 프리미엄 검색 */}
            <div className="card-premium border-0 shadow-soft p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-primary-600" />
                스마트 검색
              </h3>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-knowledge-500 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-all duration-300"></div>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 group-focus-within:text-primary-500 transition-colors duration-200" />
                  <input
                    id="search"
                    type="text"
                    placeholder="지식을 탐색해보세요..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-premium pl-12 py-3 text-lg border-2 border-neutral-200 focus:border-primary-400 group-focus-within:shadow-glow"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-neutral-500">노드 제목, 내용, 태그로 검색 가능</p>
            </div>

            {/* 프리미엄 노드 타입 필터 */}
            <div className="card-premium border-0 shadow-soft p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2 text-knowledge-600" />
                노드 타입 필터
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {nodeTypes.map(nodeType => {
                  const isSelected = selectedNodeTypes.includes(nodeType);
                  const typeIcons: { [key: string]: string } = {
                    'Knowledge': '📚',
                    'Concept': '💡',
                    'Fact': '📋',
                    'Question': '❓',
                    'Idea': '🔥',
                    'Project': '🚀',
                    'Resource': '🔗',
                    'Note': '📝'
                  };

                  return (
                    <label key={nodeType} className="relative cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleNodeTypeToggle(nodeType)}
                        className="sr-only peer"
                      />
                      <div className={`p-3 text-center border-2 rounded-xl transition-all duration-200 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-glow'
                          : 'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-soft'
                      }`}>
                        <div className="text-lg mb-1">{typeIcons[nodeType] || '📄'}</div>
                        <div className={`text-xs font-medium ${
                          isSelected ? 'text-primary-700' : 'text-neutral-700'
                        }`}>{nodeType}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {selectedNodeTypes.length > 0 && (
                <button
                  onClick={() => setSelectedNodeTypes([])}
                  className="mt-4 w-full btn-secondary text-sm py-2"
                >
                  모든 필터 초기화 ({selectedNodeTypes.length}개 선택됨)
                </button>
              )}
            </div>

            {/* 프리미엄 시각화 옵션 */}
            <div className="card-premium border-0 shadow-soft p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center">
                <span className="text-xl mr-2">🎨</span>
                시각화 옵션
              </h3>

              <div className="space-y-6">
                {/* 레이아웃 모드 */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-3">레이아웃 알고리즘</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'force', label: 'Force-Directed', icon: '🌀', desc: '자연스러운 배치' },
                      { value: 'radial', label: 'Radial', icon: '🎯', desc: '방사형 배치' },
                      { value: 'hierarchical', label: 'Hierarchical', icon: '🏗️', desc: '계층형 배치' }
                    ].map((layout) => (
                      <label key={layout.value} className="relative cursor-pointer">
                        <input
                          type="radio"
                          value={layout.value}
                          checked={layoutMode === layout.value}
                          onChange={(e) => setLayoutMode(e.target.value as 'force' | 'radial' | 'hierarchical')}
                          className="sr-only peer"
                        />
                        <div className="p-3 border-2 border-neutral-200 peer-checked:border-primary-500 peer-checked:bg-primary-50 rounded-xl hover:border-primary-300 transition-all duration-200">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{layout.icon}</span>
                            <div>
                              <div className="font-medium text-neutral-900">{layout.label}</div>
                              <div className="text-xs text-neutral-600">{layout.desc}</div>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 색상 테마 */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-3">색상 테마</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'default', label: '기본', colors: ['bg-primary-500', 'bg-knowledge-500', 'bg-ai-500'] },
                      { value: 'dark', label: '다크', colors: ['bg-neutral-700', 'bg-neutral-800', 'bg-neutral-900'] },
                      { value: 'pastel', label: '파스텔', colors: ['bg-pink-300', 'bg-blue-300', 'bg-green-300'] }
                    ].map((theme) => (
                      <label key={theme.value} className="relative cursor-pointer">
                        <input
                          type="radio"
                          value={theme.value}
                          checked={colorScheme === theme.value}
                          onChange={(e) => setColorScheme(e.target.value as 'default' | 'dark' | 'pastel')}
                          className="sr-only peer"
                        />
                        <div className="p-3 border-2 border-neutral-200 peer-checked:border-primary-500 peer-checked:bg-primary-50 rounded-xl hover:border-primary-300 transition-all duration-200">
                          <div className="flex items-center justify-center mb-2">
                            <div className="flex space-x-1">
                              {theme.colors.map((color, index) => (
                                <div key={index} className={`w-3 h-3 rounded-full ${color}`}></div>
                              ))}
                            </div>
                          </div>
                          <div className="text-xs font-medium text-center text-neutral-700">{theme.label}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 표시 옵션 */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-3">표시 옵션</label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors duration-200">
                      <span className="font-medium text-neutral-700">노드 라벨 표시</span>
                      <input
                        type="checkbox"
                        checked={showLabels}
                        onChange={(e) => setShowLabels(e.target.checked)}
                        className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors duration-200">
                      <span className="font-medium text-neutral-700">관계 라벨 표시</span>
                      <input
                        type="checkbox"
                        checked={showLinkLabels}
                        onChange={(e) => setShowLinkLabels(e.target.checked)}
                        className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 프리미엄 통계 */}
            <div className="card-premium border-0 shadow-soft p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                <span className="text-xl mr-2">📊</span>
                네트워크 통계
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-primary-50 rounded-xl">
                  <div className="text-2xl font-bold text-primary-700">{graphData?.nodes.length || 0}</div>
                  <div className="text-sm text-primary-600">전체 노드</div>
                </div>
                <div className="text-center p-4 bg-knowledge-50 rounded-xl">
                  <div className="text-2xl font-bold text-knowledge-700">{graphData?.relationships.length || 0}</div>
                  <div className="text-sm text-knowledge-600">전체 관계</div>
                </div>
                <div className="text-center p-4 bg-ai-50 rounded-xl">
                  <div className="text-2xl font-bold text-ai-700">{filteredNodes.length}</div>
                  <div className="text-sm text-ai-600">표시 노드</div>
                </div>
                <div className="text-center p-4 bg-success-50 rounded-xl">
                  <div className="text-2xl font-bold text-success-700">{filteredRelationships.length}</div>
                  <div className="text-sm text-success-600">표시 관계</div>
                </div>
              </div>

              {/* 네트워크 밀도 */}
              <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">네트워크 밀도</span>
                  <span className="text-sm font-bold text-neutral-900">
                    {graphData?.nodes.length ?
                      Math.round((filteredRelationships.length / (filteredNodes.length * (filteredNodes.length - 1)) * 2) * 100) : 0}%
                    </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-knowledge-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${graphData?.nodes.length ?
                        Math.round((filteredRelationships.length / (filteredNodes.length * (filteredNodes.length - 1)) * 2) * 100) : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 프리미엄 사용법 가이드 */}
            <div className="card-premium border-0 shadow-soft p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                <span className="text-xl mr-2">🎮</span>
                인터랙션 가이드
              </h3>
              <div className="space-y-4">
                {[
                  { icon: '🖱️', action: '마우스 드래그', desc: '그래프 전체 이동' },
                  { icon: '🔍', action: '마우스 휠', desc: '확대/축소' },
                  { icon: '👆', action: '노드 클릭', desc: '상세 정보 보기' },
                  { icon: '⚡', action: '노드 더블클릭', desc: '노드 편집하기' },
                  { icon: '🎯', action: '노드 드래그', desc: '위치 조정하기' }
                ].map((instruction, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-gradient-to-r from-primary-50 to-knowledge-50 rounded-xl">
                    <span className="text-xl">{instruction.icon}</span>
                    <div>
                      <div className="font-semibold text-neutral-900">{instruction.action}</div>
                      <div className="text-sm text-neutral-600">{instruction.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-ai-50 rounded-xl border border-ai-200">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">💡</span>
                  <span className="font-bold text-ai-700">프로 팁</span>
                </div>
                <p className="text-sm text-ai-600 leading-relaxed">
                  검색과 필터를 조합하여 원하는 지식 영역만 시각화할 수 있습니다.
                  노드가 많을 때는 타입 필터를 활용해보세요!
                </p>
              </div>
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