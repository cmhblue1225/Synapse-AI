import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  BookOpenIcon,
  DocumentTextIcon,
  LinkIcon,
  DocumentIcon,
  PhotoIcon,
  LightBulbIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKnowledgeStore } from '../../stores/knowledge.store';
import { knowledgeService } from '../../services/knowledge.service';
import { SampleDataGenerator } from '../../utils/sampleData';
import { KnowledgeListSkeleton } from '../../components/ui/SkeletonLoader';

// 노드 타입별 아이콘 매핑 (PDF 요구사항)
const getNodeTypeIcon = (nodeType: string) => {
  const iconProps = { className: "h-5 w-5 text-gray-400 ml-2 flex-shrink-0" };

  switch (nodeType) {
    case 'Note':
      return <DocumentTextIcon {...iconProps} />;
    case 'WebClip':
      return <LinkIcon {...iconProps} />;
    case 'Document':
      return <DocumentIcon {...iconProps} />;
    case 'Image':
      return <PhotoIcon {...iconProps} />;
    case 'Concept':
      return <LightBulbIcon {...iconProps} />;
    default:
      return <BookOpenIcon {...iconProps} />;
  }
};

export const KnowledgePage: React.FC = () => {
  const [generatingData, setGeneratingData] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('updatedAt');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-nodes'],
    queryFn: () => knowledgeService.getUserNodes({ limit: 50 }),
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // 디버깅용 - 모든 노드 조회
  const { data: debugData } = useQuery({
    queryKey: ['debug-all-nodes'],
    queryFn: () => knowledgeService.getAllNodesForDebug(50),
    retry: 1,
  });

  // 필터링 및 정렬 로직 적용
  const allNodes = React.useMemo(() => {
    let filteredNodes = data?.nodes || [];

    // 노드 타입 필터링
    if (selectedNodeType) {
      filteredNodes = filteredNodes.filter(node => node.node_type === selectedNodeType);
    }

    // 정렬 적용
    filteredNodes = [...filteredNodes].sort((a, b) => {
      switch (sortOrder) {
        case 'createdAt':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updatedAt':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title, 'ko');
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filteredNodes;
  }, [data?.nodes, selectedNodeType, sortOrder]);

  const totalNodes = data?.totalNodes || 0;
  const loading = isLoading;

  // 샘플 데이터 생성 함수
  const handleGenerateSampleData = async () => {
    try {
      setGeneratingData(true);
      setGenerationProgress('샘플 데이터 생성을 시작합니다...');

      const generator = new SampleDataGenerator();

      // 진행상황을 업데이트하는 콜백
      const onProgress = (progress: string) => {
        setGenerationProgress(progress);
      };

      await generator.generateAllSampleData(onProgress);

      // 쿼리 캐시 무효화하여 새 데이터 로드
      await queryClient.invalidateQueries({ queryKey: ['user-nodes'] });
      await queryClient.invalidateQueries({ queryKey: ['debug-all-nodes'] });

      setGenerationProgress('샘플 데이터 생성이 완료되었습니다!');

      setTimeout(() => {
        setGeneratingData(false);
        setGenerationProgress('');
      }, 2000);

    } catch (error) {
      console.error('샘플 데이터 생성 실패:', error);
      setGenerationProgress(`오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setTimeout(() => {
        setGeneratingData(false);
        setGenerationProgress('');
      }, 3000);
    }
  };

  // 추가 관계 생성 함수
  const handleCreateAdditionalRelationships = async () => {
    try {
      setGeneratingData(true);
      setGenerationProgress('기존 노드들 간의 추가 관계를 생성합니다...');

      const generator = new SampleDataGenerator();

      // 기존 노드들을 generator에 등록
      const userNodesResult = await knowledgeService.getUserNodes({ limit: 50 });
      for (const node of userNodesResult.nodes) {
        generator.getCreatedNodes().set(node.title, node.id);
      }

      // 관계만 생성
      await generator.generateSampleRelationships();

      // 쿼리 캐시 무효화
      await queryClient.invalidateQueries({ queryKey: ['user-nodes'] });
      await queryClient.invalidateQueries({ queryKey: ['debug-all-nodes'] });

      setGenerationProgress('추가 관계 생성이 완료되었습니다!');

      setTimeout(() => {
        setGeneratingData(false);
        setGenerationProgress('');
      }, 2000);

    } catch (error) {
      console.error('추가 관계 생성 실패:', error);
      setGenerationProgress(`오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setTimeout(() => {
        setGeneratingData(false);
        setGenerationProgress('');
      }, 3000);
    }
  };

  // 데이터 확인 함수
  const handleVerifyData = async () => {
    try {
      console.log('=== 샘플 데이터 검증 시작 ===');

      // 1. 노드 데이터 확인
      const userNodesResult = await knowledgeService.getUserNodes({ limit: 50 });
      console.log('✅ 사용자 노드 조회 결과:', {
        총_노드_수: userNodesResult.totalNodes,
        로드된_노드_수: userNodesResult.nodes.length,
        노드_목록: userNodesResult.nodes.map(node => ({
          제목: node.title,
          타입: node.node_type,
          태그_수: node.tags?.length || 0,
          생성일: node.created_at
        }))
      });

      // 2. 노드 타입별 분포 확인
      const nodeTypeDistribution = userNodesResult.nodes.reduce((acc, node) => {
        acc[node.node_type] = (acc[node.node_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📊 노드 타입별 분포:', nodeTypeDistribution);

      // 3. 관계 데이터 확인 (그래프 데이터 조회)
      const graphData = await knowledgeService.getGraphData();
      console.log('🔗 관계 데이터:', {
        노드_수: graphData.nodes.length,
        관계_수: graphData.relationships.length,
        관계_목록: graphData.relationships.map(rel => ({
          출발: rel.source_title,
          도착: rel.target_title,
          타입: rel.relationship_type,
          가중치: rel.weight
        }))
      });

      // 4. 태그 분석
      const allTags = userNodesResult.nodes.flatMap(node => node.tags || []);
      const tagCount = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('🏷️ 태그 분석:', {
        총_태그_수: allTags.length,
        고유_태그_수: Object.keys(tagCount).length,
        태그_분포: Object.entries(tagCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([tag, count]) => ({ 태그: tag, 사용횟수: count }))
      });

      // 5. 요약 리포트
      console.log('🎉 === 데이터 검증 완료 ===');
      console.log(`✅ 노드 생성 완료: ${userNodesResult.nodes.length}개`);
      console.log(`✅ 관계 생성 완료: ${graphData.relationships.length}개`);
      console.log(`✅ 태그 생성 완료: ${Object.keys(tagCount).length}개 고유 태그`);
      console.log(`✅ 노드 타입 분포:`, nodeTypeDistribution);

      alert(`✅ 데이터 검증 완료!\n\n노드: ${userNodesResult.nodes.length}개\n관계: ${graphData.relationships.length}개\n태그: ${Object.keys(tagCount).length}개\n\n자세한 내용은 콘솔을 확인하세요.`);

    } catch (error) {
      console.error('❌ 데이터 검증 실패:', error);
      alert(`❌ 데이터 검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  console.log('KnowledgePage render:', {
    userNodes: data,
    debugNodes: debugData,
    loading,
    error
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">지식 노드</h1>
          <p className="mt-2 text-gray-600">
            총 {totalNodes || allNodes.length}개의 노드가 있습니다.
          </p>
          {generationProgress && (
            <p className="mt-1 text-sm text-blue-600 font-medium">
              {generationProgress}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleVerifyData}
            className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <BeakerIcon className="-ml-1 mr-2 h-5 w-5" />
            데이터 검증
          </button>
          <button
            onClick={handleCreateAdditionalRelationships}
            disabled={generatingData}
            className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BeakerIcon className="-ml-1 mr-2 h-5 w-5" />
            {generatingData ? '관계 생성 중...' : '관계 추가 생성'}
          </button>
          <button
            onClick={handleGenerateSampleData}
            disabled={generatingData}
            className="inline-flex items-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BeakerIcon className="-ml-1 mr-2 h-5 w-5" />
            {generatingData ? '생성 중...' : '샘플 데이터 생성'}
          </button>
          <Link
            to="/app/knowledge/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            새 노드 생성
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex space-x-4">
            <select
              value={selectedNodeType}
              onChange={(e) => setSelectedNodeType(e.target.value)}
              className="block p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">모든 타입</option>
              <option value="Note">노트</option>
              <option value="WebClip">웹클립</option>
              <option value="Document">문서</option>
              <option value="Image">이미지</option>
              <option value="Concept">개념</option>
              <option value="Knowledge">지식</option>
              <option value="Idea">아이디어</option>
              <option value="Project">프로젝트</option>
              <option value="Resource">자료</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="block p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="updatedAt">최근 수정순</option>
              <option value="createdAt">최근 생성순</option>
              <option value="title">제목순</option>
            </select>
          </div>

          {/* Filter status */}
          <div className="text-sm text-gray-600">
            {selectedNodeType ? (
              <span>
                <strong>{selectedNodeType}</strong> 타입: {allNodes.length}개 노드
                {allNodes.length !== totalNodes && (
                  <span className="text-gray-500"> (전체 {totalNodes}개 중)</span>
                )}
              </span>
            ) : (
              <span>{allNodes.length}개 노드 표시 중</span>
            )}
          </div>
        </div>

        {/* Clear filters */}
        {selectedNodeType && (
          <div className="mt-2">
            <button
              onClick={() => setSelectedNodeType('')}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              ✕ 필터 초기화
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-red-800">데이터를 불러오는 중 오류가 발생했습니다</h3>
            <p className="mt-1 text-sm text-red-600">
              {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}
            </p>
          </div>
        </div>
      )}

      {/* Node grid */}
      {!error && isLoading ? (
        <KnowledgeListSkeleton count={6} />
      ) : allNodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allNodes.map((node) => (
            <Link
              key={node.id}
              to={`/app/knowledge/${node.id}`}
              className="block bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {node.title}
                  </h3>
                  <p className="mt-2 text-gray-600 text-sm line-clamp-3">
                    {node.content.substring(0, 150)}
                    {node.content.length > 150 ? '...' : ''}
                  </p>
                </div>
                {getNodeTypeIcon(node.node_type)}
              </div>
              
              <div className="mt-4">
                {node.tags && node.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {node.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800"
                      >
                        #{tag}
                      </span>
                    ))}
                    {node.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        +{node.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{node.node_type}</span>
                  <span>{new Date(node.updated_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">노드가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            첫 번째 지식 노드를 생성해보세요.
          </p>
          <div className="mt-6">
            <Link
              to="/app/knowledge/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              새 노드 생성
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};