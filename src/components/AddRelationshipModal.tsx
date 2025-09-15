import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { knowledgeService } from '../services/knowledge.service';
import { toast } from 'react-toastify';

interface Node {
  id: string;
  title: string;
  content?: string;
  node_type: string;
  tags?: string[];
}

interface AddRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceNodeId: string;
  sourceNodeTitle: string;
  onRelationshipAdded: () => void;
}

// PDF 2장 요구사항에 따른 의미론적 엣지 유형들
const RELATIONSHIP_TYPES = [
  {
    value: 'REFERENCES',
    label: '참조함 (REFERENCES)',
    description: '한 노드가 다른 노드를 인용하거나 참조함',
    example: '논문 A가 통계 자료 B를 REFERENCES한다'
  },
  {
    value: 'EXPANDS_ON',
    label: '확장함 (EXPANDS_ON)',
    description: '한 노드가 다른 노드의 내용을 상세히 설명하거나 확장함',
    example: '요약 노트 A가 원본 아티클 B를 EXPANDS_ON한다'
  },
  {
    value: 'CONTRADICTS',
    label: '모순함 (CONTRADICTS)',
    description: '한 노드가 다른 노드에 대해 반대되는 관점을 제시함',
    example: '비평 C가 주장 A를 CONTRADICTS한다'
  },
  {
    value: 'SUPPORTS',
    label: '뒷받침함 (SUPPORTS)',
    description: '한 노드가 다른 노드에 대한 근거를 제공함',
    example: '실험 데이터 D가 가설 E를 SUPPORTS한다'
  },
  {
    value: 'IS_A',
    label: '~의 일종임 (IS_A)',
    description: '특정 사례가 일반적인 개념에 속함을 나타냄',
    example: 'GPT-4 논문 노트는 머신러닝이라는 Concept 노드의 IS_A 인스턴스이다'
  },
];

export const AddRelationshipModal: React.FC<AddRelationshipModalProps> = ({
  isOpen,
  onClose,
  sourceNodeId,
  sourceNodeTitle,
  onRelationshipAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [relationshipType, setRelationshipType] = useState('REFERENCES');
  const [comment, setComment] = useState('');  // PDF 요구사항: 관계에 대한 코멘트
  const [weight, setWeight] = useState(1.0);
  const [isCreating, setIsCreating] = useState(false);

  // 검색 결과 쿼리
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search-nodes', searchQuery],
    queryFn: () => {
      if (!searchQuery.trim()) return { nodes: [] };
      return knowledgeService.searchNodes(searchQuery, { limit: 20 });
    },
    enabled: searchQuery.length > 0,
  });

  // 모든 노드 조회 (검색어가 없을 때)
  const { data: allNodes } = useQuery({
    queryKey: ['all-nodes'],
    queryFn: () => knowledgeService.getUserNodes({ limit: 50 }),
    enabled: !searchQuery.trim(),
  });

  const handleCreateRelationship = async () => {
    if (!selectedNode) {
      toast.error('연결할 노드를 선택해주세요.');
      return;
    }

    if (selectedNode.id === sourceNodeId) {
      toast.error('같은 노드끼리는 관계를 생성할 수 없습니다.');
      return;
    }

    setIsCreating(true);

    try {
      await knowledgeService.createRelationship({
        sourceNodeId: sourceNodeId,
        targetNodeId: selectedNode.id,
        relationshipType: relationshipType as any,  // EdgeType
        comment: comment.trim() || undefined,
        weight,
      });

      toast.success('관계가 성공적으로 생성되었습니다!');
      onRelationshipAdded();
      handleClose();
    } catch (error) {
      console.error('관계 생성 실패:', error);
      toast.error('관계 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedNode(null);
    setRelationshipType('REFERENCES');
    setComment('');
    setWeight(1.0);
    onClose();
  };

  const nodesToDisplay = searchQuery.trim()
    ? searchResults?.nodes || []
    : allNodes?.nodes || [];

  // 현재 소스 노드 제외
  const filteredNodes = nodesToDisplay.filter(node => node.id !== sourceNodeId);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      노드 관계 추가
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500">
                      '{sourceNodeTitle}'과(와) 연결할 노드를 선택하고 관계 유형을 설정하세요.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 노드 검색 및 선택 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">연결할 노드 선택</h4>

                    {/* 검색 입력 */}
                    <div className="relative mb-4">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="노드 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    {/* 노드 목록 */}
                    <div className="border border-gray-200 rounded-md max-h-80 overflow-y-auto">
                      {searching ? (
                        <div className="p-4 text-center text-gray-500">
                          검색 중...
                        </div>
                      ) : filteredNodes.length > 0 ? (
                        <div className="space-y-1 p-2">
                          {filteredNodes.map((node) => (
                            <button
                              key={node.id}
                              onClick={() => setSelectedNode(node)}
                              className={`w-full text-left p-3 rounded-md transition-colors ${
                                selectedNode?.id === node.id
                                  ? 'bg-primary-50 border border-primary-200'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="font-medium text-sm text-gray-900">{node.title}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {node.node_type} • {node.content ? node.content.substring(0, 80) + '...' : '내용 없음'}
                              </div>
                              {node.tags && node.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {node.tags.slice(0, 3).map((tag, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          {searchQuery.trim() ? '검색 결과가 없습니다.' : '노드가 없습니다.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 관계 설정 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">관계 설정</h4>

                    {selectedNode && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="font-medium text-blue-900">{sourceNodeTitle}</span>
                          <LinkIcon className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">{selectedNode.title}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* 관계 유형 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          관계 유형
                        </label>
                        <select
                          value={relationshipType}
                          onChange={(e) => setRelationshipType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          {RELATIONSHIP_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>

                        {/* 선택된 관계 유형의 설명과 예시 표시 */}
                        {relationshipType && (
                          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>설명:</strong> {RELATIONSHIP_TYPES.find(t => t.value === relationshipType)?.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              <strong>예시:</strong> {RELATIONSHIP_TYPES.find(t => t.value === relationshipType)?.example}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* PDF 요구사항: 관계에 대한 코멘트 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          관계 설명 (선택사항)
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="이 관계에 대한 추가 설명을 입력하세요..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          이 관계가 왜 중요한지, 어떤 맥락에서 연결되는지 설명해보세요.
                        </p>
                      </div>

                      {/* 가중치 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          관계 강도 ({weight})
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="2.0"
                          step="0.1"
                          value={weight}
                          onChange={(e) => setWeight(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>약함 (0.1)</span>
                          <span>보통 (1.0)</span>
                          <span>강함 (2.0)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreateRelationship}
                    disabled={!selectedNode || isCreating}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? '생성 중...' : '관계 생성'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};