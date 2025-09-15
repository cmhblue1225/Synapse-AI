import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  LinkIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  LightBulbIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { embeddingService } from '../../services/embedding.service';
import { knowledgeService } from '../../services/knowledge.service';
import { toast } from 'react-toastify';

interface LinkSuggestion {
  targetNodeId: string;
  targetNodeTitle: string;
  relationshipType: string;
  confidence: number;
  explanation: string;
  reasoning: string;
}

interface LinkRecommendationPanelProps {
  nodeId: string;
  nodeTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onLinkCreated: (targetNodeId: string) => void;
}

export function LinkRecommendationPanel({
  nodeId,
  nodeTitle,
  isOpen,
  onClose,
  onLinkCreated
}: LinkRecommendationPanelProps) {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingLinks, setCreatingLinks] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const relationshipTypes = {
    'related_to': { label: '관련됨', color: 'bg-blue-100 text-blue-800' },
    'supports': { label: '지지함', color: 'bg-green-100 text-green-800' },
    'contradicts': { label: '반대됨', color: 'bg-red-100 text-red-800' },
    'expands_on': { label: '확장함', color: 'bg-purple-100 text-purple-800' },
    'example_of': { label: '예시임', color: 'bg-orange-100 text-orange-800' },
    'part_of': { label: '부분임', color: 'bg-indigo-100 text-indigo-800' },
    'causes': { label: '원인임', color: 'bg-pink-100 text-pink-800' },
    'result_of': { label: '결과임', color: 'bg-cyan-100 text-cyan-800' }
  };

  const generateLinkSuggestions = async () => {
    if (!nodeId) return;

    setLoading(true);
    setError(null);

    try {
      // 유사한 노드들 찾기
      const similarNodes = await embeddingService.findSimilarNodes(nodeId, {
        limit: 10,
        similarity_threshold: 0.6,
        exclude_self: true
      });

      // 기존 관계가 있는 노드들 확인
      const existingRelationships = await knowledgeService.getNodeRelationships(nodeId);
      const existingTargetIds = new Set();

      // 안전하게 관계 정보 처리
      if (existingRelationships && Array.isArray(existingRelationships)) {
        existingRelationships.forEach(rel => {
          if (rel.source_node_id === nodeId) {
            // 현재 노드가 소스인 경우, 타겟 노드를 추가
            existingTargetIds.add(rel.target_node_id);
          } else if (rel.target_node_id === nodeId) {
            // 현재 노드가 타겟인 경우, 소스 노드를 추가
            existingTargetIds.add(rel.source_node_id);
          }
        });
      }

      // AI 기반 링크 제안 생성
      const linkSuggestions: LinkSuggestion[] = [];

      for (const node of similarNodes) {
        // 이미 관계가 있는 노드는 제외
        if (existingTargetIds.has(node.id)) continue;

        const suggestion = await generateRelationshipSuggestion(node);
        if (suggestion) {
          linkSuggestions.push(suggestion);
        }
      }

      // 신뢰도 순으로 정렬
      linkSuggestions.sort((a, b) => b.confidence - a.confidence);
      setSuggestions(linkSuggestions.slice(0, 6)); // 상위 6개만

    } catch (err: any) {
      console.error('링크 추천 생성 오류:', err);
      setError('AI 링크 추천을 생성하는 중 오류가 발생했습니다.');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRelationshipSuggestion = async (targetNode: any): Promise<LinkSuggestion | null> => {
    try {
      // 노드 내용 기반으로 관계 타입 추정
      const relationshipType = inferRelationshipType(targetNode);
      const confidence = Math.min(targetNode.similarity * 0.9, 0.95); // 약간 보수적으로 설정

      return {
        targetNodeId: targetNode.id,
        targetNodeTitle: targetNode.title,
        relationshipType,
        confidence,
        explanation: generateExplanation(relationshipType, targetNode),
        reasoning: `유사도 ${Math.round(targetNode.similarity * 100)}% 기반으로 분석`
      };
    } catch (error) {
      console.error('관계 제안 생성 오류:', error);
      return null;
    }
  };

  const inferRelationshipType = (targetNode: any): string => {
    const currentTitle = nodeTitle.toLowerCase();
    const targetTitle = targetNode.title.toLowerCase();
    const targetContent = (targetNode.content || '').toLowerCase();

    // 키워드 기반 관계 추론
    if (targetContent.includes('예시') || targetContent.includes('example')) {
      return 'example_of';
    } else if (targetContent.includes('원인') || targetContent.includes('때문에')) {
      return 'causes';
    } else if (targetContent.includes('결과') || targetContent.includes('따라서')) {
      return 'result_of';
    } else if (targetContent.includes('반대') || targetContent.includes('하지만')) {
      return 'contradicts';
    } else if (targetContent.includes('지지') || targetContent.includes('동의')) {
      return 'supports';
    } else if (targetNode.node_type === 'Concept' && targetTitle.includes(currentTitle)) {
      return 'part_of';
    } else if (targetContent.includes('확장') || targetContent.includes('발전')) {
      return 'expands_on';
    }

    return 'related_to'; // 기본값
  };

  const generateExplanation = (relationshipType: string, targetNode: any): string => {
    const typeInfo = relationshipTypes[relationshipType as keyof typeof relationshipTypes];
    return `"${targetNode.title}"와(과) "${typeInfo.label}" 관계로 분석되었습니다. 내용의 유사성과 맥락을 바탕으로 추천됩니다.`;
  };

  const createLink = async (suggestion: LinkSuggestion) => {
    if (creatingLinks.has(suggestion.targetNodeId)) return;

    setCreatingLinks(prev => new Set(prev).add(suggestion.targetNodeId));

    try {
      await knowledgeService.createRelationship({
        sourceNodeId: nodeId,
        targetNodeId: suggestion.targetNodeId,
        relationshipType: suggestion.relationshipType,
        comment: suggestion.explanation
      });

      toast.success(`"${suggestion.targetNodeTitle}"와의 링크가 생성되었습니다.`);
      onLinkCreated(suggestion.targetNodeId);

      // 생성된 제안을 목록에서 제거
      setSuggestions(prev => prev.filter(s => s.targetNodeId !== suggestion.targetNodeId));

    } catch (error: any) {
      console.error('링크 생성 오류:', error);
      toast.error('링크 생성 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setCreatingLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.targetNodeId);
        return newSet;
      });
    }
  };

  const dismissSuggestion = (targetNodeId: string) => {
    setSuggestions(prev => prev.filter(s => s.targetNodeId !== targetNodeId));
  };

  useEffect(() => {
    if (isOpen && nodeId) {
      generateLinkSuggestions();
    }
  }, [isOpen, nodeId]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between p-6 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                      <SparklesIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                        AI 링크 추천
                      </Dialog.Title>
                      <p className="text-sm text-gray-600">
                        "{nodeTitle}"와(과) 연결할 수 있는 지식들
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-gray-600">AI가 관련 지식을 분석하고 있습니다...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <InformationCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
                      <p className="text-red-600">{error}</p>
                      <button
                        onClick={generateLinkSuggestions}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        다시 시도
                      </button>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="text-center py-12">
                      <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">현재 추천할 수 있는 링크가 없습니다.</p>
                      <p className="text-sm text-gray-500">
                        더 많은 지식을 추가하면 AI가 연관성을 발견할 수 있습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-700">
                            <p className="font-medium mb-1">AI 링크 추천이란?</p>
                            <p>지식의 내용을 분석해서 의미적으로 연관된 다른 지식들과의 관계를 자동으로 찾아 추천합니다.</p>
                          </div>
                        </div>
                      </div>

                      {suggestions.map((suggestion) => (
                        <div
                          key={suggestion.targetNodeId}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <h4 className="font-medium text-gray-900 truncate">
                                  {suggestion.targetNodeTitle}
                                </h4>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  relationshipTypes[suggestion.relationshipType as keyof typeof relationshipTypes]?.color || 'bg-gray-100 text-gray-800'
                                }`}>
                                  {relationshipTypes[suggestion.relationshipType as keyof typeof relationshipTypes]?.label || suggestion.relationshipType}
                                </span>
                              </div>

                              <p className="text-sm text-gray-600 mb-3">
                                {suggestion.explanation}
                              </p>

                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <ClockIcon className="h-3 w-3" />
                                  <span>{suggestion.reasoning}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span>신뢰도</span>
                                  <span className={`font-medium ${
                                    suggestion.confidence > 0.8 ? 'text-green-600' :
                                    suggestion.confidence > 0.6 ? 'text-blue-600' :
                                    'text-gray-600'
                                  }`}>
                                    {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => createLink(suggestion)}
                                disabled={creatingLinks.has(suggestion.targetNodeId)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {creatingLinks.has(suggestion.targetNodeId) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    생성 중...
                                  </>
                                ) : (
                                  <>
                                    <CheckIcon className="h-4 w-4 mr-1" />
                                    연결
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => dismissSuggestion(suggestion.targetNodeId)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                              >
                                무시
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      총 {suggestions.length}개의 추천 링크
                    </p>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}