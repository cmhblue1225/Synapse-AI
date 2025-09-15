import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  TagIcon,
  CalendarIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { knowledgeService } from '../services/knowledge.service';

interface BacklinksPanelProps {
  nodeId: string;
  nodeTitle: string;
}

// PDF FR-9: 백링크를 엣지 타입별로 분류하는 타입
const EDGE_TYPE_LABELS = {
  'REFERENCES': '참조함',
  'EXPANDS_ON': '확장함',
  'CONTRADICTS': '모순함',
  'SUPPORTS': '뒷받침함',
  'IS_A': '일종임',
  // 기존 타입들도 지원
  'related_to': '관련됨',
  'depends_on': '의존함',
  'supports': '뒷받침함',
  'contradicts': '모순함',
} as const;

const EDGE_TYPE_COLORS = {
  'REFERENCES': 'bg-blue-100 text-blue-800 border-blue-200',
  'EXPANDS_ON': 'bg-green-100 text-green-800 border-green-200',
  'CONTRADICTS': 'bg-red-100 text-red-800 border-red-200',
  'SUPPORTS': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'IS_A': 'bg-purple-100 text-purple-800 border-purple-200',
  // 기존 타입들
  'related_to': 'bg-gray-100 text-gray-800 border-gray-200',
  'depends_on': 'bg-orange-100 text-orange-800 border-orange-200',
  'supports': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'contradicts': 'bg-red-100 text-red-800 border-red-200',
} as const;

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  nodeId,
  nodeTitle
}) => {
  const { data: relationships, isLoading } = useQuery({
    queryKey: ['node-backlinks', nodeId],
    queryFn: () => knowledgeService.getNodeRelationships(nodeId),
    enabled: !!nodeId,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // PDF FR-9: 백링크들을 엣지 유형별로 분류
  const backlinks = relationships?.filter(rel => rel.target_node_id === nodeId) || [];
  const outlinks = relationships?.filter(rel => rel.source_node_id === nodeId) || [];

  // 엣지 타입별로 그룹화
  const backlinksByType = backlinks.reduce((acc, rel) => {
    const type = rel.relationship_type as keyof typeof EDGE_TYPE_LABELS;
    if (!acc[type]) acc[type] = [];
    acc[type].push(rel);
    return acc;
  }, {} as Record<string, typeof backlinks>);

  const outlinksByType = outlinks.reduce((acc, rel) => {
    const type = rel.relationship_type as keyof typeof EDGE_TYPE_LABELS;
    if (!acc[type]) acc[type] = [];
    acc[type].push(rel);
    return acc;
  }, {} as Record<string, typeof outlinks>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const renderRelationshipGroup = (
    title: string,
    relationshipsByType: Record<string, any[]>,
    isBacklink: boolean
  ) => {
    const hasRelationships = Object.keys(relationshipsByType).length > 0;

    if (!hasRelationships) {
      return (
        <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-md">
          {isBacklink ? '이 노드를 참조하는 노드가 없습니다' : '연결된 노드가 없습니다'}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {Object.entries(relationshipsByType).map(([edgeType, rels]) => {
          const typeLabel = EDGE_TYPE_LABELS[edgeType as keyof typeof EDGE_TYPE_LABELS] || edgeType;
          const typeColor = EDGE_TYPE_COLORS[edgeType as keyof typeof EDGE_TYPE_COLORS] || EDGE_TYPE_COLORS.related_to;

          return (
            <div key={edgeType} className="border border-gray-200 rounded-md">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${typeColor}`}>
                    {typeLabel}
                  </span>
                  <span className="text-xs text-gray-500">{rels.length}개</span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {rels.map((rel) => {
                  const targetNode = isBacklink
                    ? (rel as any).source_node
                    : (rel as any).target_node;

                  if (!targetNode) return null;

                  return (
                    <div key={rel.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/app/knowledge/${targetNode.id}`}
                            className="text-sm font-medium text-primary-600 hover:text-primary-800 line-clamp-1"
                          >
                            {isBacklink && <ArrowLeftIcon className="inline h-3 w-3 mr-1" />}
                            {targetNode.title}
                          </Link>

                          {/* 노드 타입과 날짜 */}
                          <div className="flex items-center mt-1 space-x-2">
                            <span className="inline-flex items-center text-xs text-gray-500">
                              <TagIcon className="h-3 w-3 mr-1" />
                              {targetNode.node_type}
                            </span>
                            <span className="inline-flex items-center text-xs text-gray-400">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {formatDate(rel.created_at)}
                            </span>
                          </div>

                          {/* 관계 코멘트 (PDF 요구사항) */}
                          {rel.comment && (
                            <div className="mt-2 flex items-start">
                              <ChatBubbleBottomCenterTextIcon className="h-3 w-3 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                              <p className="text-xs text-gray-600 italic">
                                "{rel.comment}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 관계 가중치 */}
                        <div className="ml-2 text-xs text-gray-400 font-mono">
                          {rel.weight}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">연결 정보</h3>
        <p className="text-sm text-gray-500 mt-1">
          '{nodeTitle}'와(과) 연결된 노드들을 관계 유형별로 확인합니다
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* 백링크 섹션 - PDF FR-9 핵심 요구사항 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <ArrowLeftIcon className="h-4 w-4 mr-2 text-gray-500" />
              들어오는 연결 (Backlinks)
            </h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {backlinks.length}개
            </span>
          </div>

          {renderRelationshipGroup('백링크', backlinksByType, true)}
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-200"></div>

        {/* 나가는 연결 섹션 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              나가는 연결 (Outlinks)
            </h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {outlinks.length}개
            </span>
          </div>

          {renderRelationshipGroup('나가는 연결', outlinksByType, false)}
        </div>
      </div>
    </div>
  );
};