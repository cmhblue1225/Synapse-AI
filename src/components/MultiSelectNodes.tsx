import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  FolderIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { knowledgeService, type KnowledgeNode } from '../services/knowledge.service';

interface MultiSelectNodesProps {
  selectedNodes: string[];
  onSelectionChange: (nodeIds: string[]) => void;
  maxSelections?: number;
  excludeNodeIds?: string[];
  showActions?: boolean;
}

export const MultiSelectNodes: React.FC<MultiSelectNodesProps> = ({
  selectedNodes,
  onSelectionChange,
  maxSelections = 10,
  excludeNodeIds = [],
  showActions = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: allNodes = [], isLoading } = useQuery({
    queryKey: ['nodes-for-selection'],
    queryFn: () => knowledgeService.getNodes(),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });

  // 노드 필터링
  const filteredNodes = allNodes.filter(node => {
    // 제외할 노드들
    if (excludeNodeIds.includes(node.id)) return false;

    // 검색어 필터링
    if (searchQuery && !node.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !node.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 카테고리 필터링
    if (selectedCategory !== 'all' && node.node_type !== selectedCategory) {
      return false;
    }

    return true;
  });

  // 노드 타입별 카테고리 통계
  const categories = allNodes.reduce((acc, node) => {
    const type = node.node_type || 'Knowledge';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleNodeSelection = (nodeId: string) => {
    if (selectedNodes.includes(nodeId)) {
      onSelectionChange(selectedNodes.filter(id => id !== nodeId));
    } else if (selectedNodes.length < maxSelections) {
      onSelectionChange([...selectedNodes, nodeId]);
    }
  };

  const selectAll = () => {
    const availableNodes = filteredNodes
      .filter(node => !excludeNodeIds.includes(node.id))
      .slice(0, maxSelections);
    onSelectionChange(availableNodes.map(node => node.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const getNodeTypeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'Project':
        return <FolderIcon className="h-4 w-4 text-blue-500" />;
      case 'Resource':
        return <DocumentTextIcon className="h-4 w-4 text-green-500" />;
      case 'Idea':
        return <SparklesIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">노드를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          지식 노드 선택
        </h3>
        <div className="text-sm text-gray-500">
          {selectedNodes.length}/{maxSelections} 선택됨
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="노드 제목이나 내용으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary-100 text-primary-800 border-primary-300'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }`}
          >
            전체 ({allNodes.length})
          </button>
          {Object.entries(categories).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setSelectedCategory(type)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                selectedCategory === type
                  ? 'bg-primary-100 text-primary-800 border-primary-300'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {type} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* 액션 버튼들 */}
      {showActions && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              disabled={filteredNodes.length === 0}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              전체 선택
            </button>
            <button
              onClick={clearAll}
              disabled={selectedNodes.length === 0}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* 노드 리스트 */}
      <div className="max-h-96 overflow-y-auto">
        {filteredNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery || selectedCategory !== 'all' ? '검색 결과가 없습니다.' : '노드가 없습니다.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNodes.map((node) => {
              const isSelected = selectedNodes.includes(node.id);
              const isSelectable = selectedNodes.length < maxSelections || isSelected;

              return (
                <div
                  key={node.id}
                  onClick={() => isSelectable && toggleNodeSelection(node.id)}
                  className={`group p-3 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-300 bg-primary-50'
                      : isSelectable
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {isSelected ? (
                        <CheckCircleIconSolid className="h-5 w-5 text-primary-600" />
                      ) : (
                        <CheckCircleIcon className={`h-5 w-5 ${isSelectable ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-300'}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getNodeTypeIcon(node.node_type || 'Knowledge')}
                        <h4 className={`text-sm font-medium truncate ${isSelectable ? 'text-gray-900' : 'text-gray-500'}`}>
                          {node.title}
                        </h4>
                      </div>

                      {node.content && (
                        <p className={`text-xs line-clamp-2 ${isSelectable ? 'text-gray-600' : 'text-gray-400'}`}>
                          {node.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isSelectable
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-gray-50 text-gray-400'
                        }`}>
                          {node.node_type || 'Knowledge'}
                        </span>

                        {node.created_at && (
                          <span className={`text-xs ${isSelectable ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(node.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 선택 제한 메시지 */}
      {selectedNodes.length >= maxSelections && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            최대 {maxSelections}개의 노드만 선택할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
};