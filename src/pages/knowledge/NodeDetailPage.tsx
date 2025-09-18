import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpenIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  TagIcon,
  ArrowLeftIcon,
  EyeIcon,
  LinkIcon,
  PlusIcon,
  DocumentIcon,
  PhotoIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { knowledgeService } from '../../services/knowledge.service';
import { aiService } from '../../services/ai.service';
import { AddRelationshipModal } from '../../components/AddRelationshipModal';
import { BacklinksPanel } from '../../components/BacklinksPanel';
import { SimilarNodesPanel } from '../../components/knowledge/SimilarNodesPanel';
import { LinkRecommendationPanel } from '../../components/knowledge/LinkRecommendationPanel';
import { toast } from 'react-toastify';

export const NodeDetailPage: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddRelationshipModalOpen, setIsAddRelationshipModalOpen] = useState(false);
  const [isDiscoveringRelationships, setIsDiscoveringRelationships] = useState(false);
  const [relationshipSuggestions, setRelationshipSuggestions] = useState<any[]>([]);
  const [isLinkRecommendationOpen, setIsLinkRecommendationOpen] = useState(false);

  // AI 기능 상태
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // 개별 파일 요약 상태
  const [generatingFileSummaries, setGeneratingFileSummaries] = useState<Set<number>>(new Set());
  const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<number>>(new Set());

  const { data: node, isLoading, error } = useQuery({
    queryKey: ['node', nodeId],
    queryFn: () => knowledgeService.getNode(nodeId!),
    enabled: !!nodeId,
    retry: 2,
  });

  useQuery({
    queryKey: ['node-relationships', nodeId],
    queryFn: () => knowledgeService.getNodeRelationships(nodeId!),
    enabled: !!nodeId,
    retry: 1,
  });

  const handleDelete = async () => {
    if (!nodeId || !node) return;

    if (window.confirm('정말로 이 노드를 삭제하시겠습니까?')) {
      try {
        await knowledgeService.deleteNode(nodeId);
        navigate('/app/knowledge');
      } catch (error) {
        console.error('노드 삭제 실패:', error);
        alert('노드 삭제에 실패했습니다.');
      }
    }
  };

  const toggleVisibility = async () => {
    if (!nodeId || !node) return;

    try {
      await knowledgeService.toggleNodeVisibility(nodeId, !node.is_public);
      // React Query 캐시 무효화로 데이터 새로고침
      window.location.reload();
    } catch (error) {
      console.error('공개 상태 변경 실패:', error);
      alert('공개 상태 변경에 실패했습니다.');
    }
  };

  const handleRelationshipAdded = () => {
    // 관계 추가 후 관련 데이터 새로고침
    queryClient.invalidateQueries({ queryKey: ['node-relationships', nodeId] });
    queryClient.invalidateQueries({ queryKey: ['node', nodeId] });
  };

  const handleLinkCreated = (targetNodeId: string) => {
    // 링크 생성 후 관련 데이터 새로고침
    queryClient.invalidateQueries({ queryKey: ['node-relationships', nodeId] });
    queryClient.invalidateQueries({ queryKey: ['node', nodeId] });
    console.log(`새로운 링크 생성됨: ${nodeId} -> ${targetNodeId}`);
  };

  const discoverRelationships = async () => {
    if (!nodeId) return;

    setIsDiscoveringRelationships(true);
    try {
      const result = await aiService.discoverRelationships(nodeId, {
        threshold: 0.7,
        maxSuggestions: 3,
        excludeExisting: true
      });

      setRelationshipSuggestions(result.suggestions);

      if (result.suggestions.length === 0) {
        alert('현재 이 노드와 관련된 새로운 관계를 발견하지 못했습니다.');
      }
    } catch (error) {
      console.error('관계 발견 실패:', error);
      alert('관계 발견 중 오류가 발생했습니다.');
    } finally {
      setIsDiscoveringRelationships(false);
    }
  };

  const applySuggestion = async (suggestion: any) => {
    try {
      await aiService.applyRelationshipSuggestion(
        nodeId!,
        suggestion.targetNodeId,
        suggestion.relationshipType,
        suggestion.confidence,
        suggestion.explanation
      );

      // 제안 목록에서 제거
      setRelationshipSuggestions(prev =>
        prev.filter(s => s.targetNodeId !== suggestion.targetNodeId)
      );

      // 관계 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['node-relationships', nodeId] });

      alert('관계가 성공적으로 추가되었습니다!');
    } catch (error) {
      console.error('관계 적용 실패:', error);
      alert('관계 추가 중 오류가 발생했습니다.');
    }
  };

  const dismissSuggestion = (targetNodeId: string) => {
    setRelationshipSuggestions(prev =>
      prev.filter(s => s.targetNodeId !== targetNodeId)
    );
  };

  // AI 요약 생성 (기존 노드용)
  const generateSummary = async () => {
    if (!nodeId || !node) return;

    setIsGeneratingSummary(true);
    try {
      console.log('🤖 기존 노드 AI 요약 생성 중...');

      const summary = await aiService.summarizeNode(nodeId);
      setGeneratedSummary(summary);

      // 노드의 메타데이터에 요약 저장
      await knowledgeService.updateNode(nodeId, {
        metadata: {
          ...node.metadata,
          summary
        }
      });

      // React Query 캐시 업데이트
      queryClient.invalidateQueries({ queryKey: ['node', nodeId] });

      console.log('✅ AI 요약 생성 및 저장 완료');
      toast.success('AI 요약이 생성되어 노드에 저장되었습니다!');
    } catch (error) {
      console.error('❌ AI 요약 생성 실패:', error);
      toast.error('AI 요약 생성에 실패했습니다.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // AI 태그 추천 생성 (기존 노드용)
  const generateTagSuggestions = async () => {
    if (!node) return;

    setIsGeneratingTags(true);
    try {
      console.log('🏷️ 기존 노드 AI 태그 추천 생성 중...');

      const tags = await aiService.generateTags(node.title, node.content || '');

      // 기존 태그와 중복 제거
      const existingTags = node.tags || [];
      const newTags = tags.filter(tag => !existingTags.includes(tag));

      setSuggestedTags(newTags);
      setShowTagSuggestions(true);

      console.log('✅ AI 태그 추천 완료:', newTags);
      toast.success(`${newTags.length}개의 새로운 태그가 추천되었습니다!`);
    } catch (error) {
      console.error('❌ AI 태그 생성 실패:', error);
      toast.error('AI 태그 생성에 실패했습니다.');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // 추천 태그 적용
  const applyTagSuggestion = async (tag: string) => {
    if (!nodeId || !node) return;

    try {
      const currentTags = node.tags || [];
      const newTags = [...currentTags, tag];

      await knowledgeService.updateNode(nodeId, { tags: newTags });

      // 적용된 태그를 추천 목록에서 제거
      setSuggestedTags(prev => prev.filter(t => t !== tag));

      // React Query 캐시 업데이트
      queryClient.invalidateQueries({ queryKey: ['node', nodeId] });

      toast.success(`"${tag}" 태그가 추가되었습니다!`);
    } catch (error) {
      console.error('태그 추가 실패:', error);
      toast.error('태그 추가에 실패했습니다.');
    }
  };

  // 추천 태그 제거
  const removeTagSuggestion = (tagToRemove: string) => {
    setSuggestedTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  // 개별 파일 요약 생성
  const generateFileSummary = async (fileIndex: number, file: any) => {
    if (!nodeId || !node) return;

    setGeneratingFileSummaries(prev => new Set([...prev, fileIndex]));

    try {
      console.log(`📄 파일 요약 생성 시작: ${file.name}`);

      const summary = await aiService.summarizeFile(file.url, file.name);

      // 파일 메타데이터에 요약 추가
      const updatedFiles = [...(node.metadata.files || [])];
      updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], summary };

      await knowledgeService.updateNode(nodeId, {
        metadata: { ...node.metadata, files: updatedFiles }
      });

      // 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['node', nodeId] });

      console.log(`✅ 파일 요약 생성 완료: ${file.name}`);
      toast.success(`"${file.name}" 파일의 요약이 생성되었습니다!`);

    } catch (error) {
      console.error('❌ 파일 요약 생성 실패:', error);
      toast.error('파일 요약 생성에 실패했습니다.');
    } finally {
      setGeneratingFileSummaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileIndex);
        return newSet;
      });
    }
  };

  // 파일 요약 표시 토글
  const toggleFileSummaryExpansion = (fileIndex: number) => {
    setExpandedFileSummaries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileIndex)) {
        newSet.delete(fileIndex);
      } else {
        newSet.add(fileIndex);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="text-center">
              <BookOpenIcon className="mx-auto h-24 w-24 text-gray-400" />
              <h2 className="mt-4 text-xl font-medium text-gray-900">노드를 찾을 수 없습니다</h2>
              <p className="mt-2 text-gray-600">
                요청한 노드가 존재하지 않거나 접근 권한이 없습니다.
              </p>
              <Link
                to="/app/knowledge"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
                목록으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 메인 컨텐츠 */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* 헤더 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <Link
                    to="/app/knowledge"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    목록으로 돌아가기
                  </Link>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleVisibility}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        node.is_public
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {node.is_public ? (
                        <>
                          <EyeIcon className="h-4 w-4 mr-1" />
                          공개
                        </>
                      ) : (
                        <>
                          <EyeIcon className="h-4 w-4 mr-1" />
                          비공개
                        </>
                      )}
                    </button>
                    <Link
                      to={`/app/study?nodes=${nodeId}`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <AcademicCapIcon className="h-4 w-4 mr-1" />
                      학습 활동
                    </Link>
                    <Link
                      to={`/app/knowledge/${nodeId}/edit`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      수정
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 노드 내용 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-6">
                {/* 제목과 메타데이터 */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4 break-words">{node.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <BookOpenIcon className="h-4 w-4 mr-1" />
                      {node.node_type}
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(node.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {node.updated_at !== node.created_at && (
                      <div className="text-gray-400">
                        (수정: {new Date(node.updated_at).toLocaleDateString('ko-KR')})
                      </div>
                    )}
                  </div>
                </div>

                {/* 태그 */}
                {((node.tags && node.tags.length > 0) || showTagSuggestions) && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">태그</span>
                      </div>
                      <button
                        onClick={generateTagSuggestions}
                        disabled={isGeneratingTags}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                      >
                        {isGeneratingTags ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                            생성 중...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-3 w-3 mr-1" />
                            AI 태그 추천
                          </>
                        )}
                      </button>
                    </div>

                    {/* 기존 태그 */}
                    {node.tags && node.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {node.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 추천 태그 */}
                    {showTagSuggestions && suggestedTags.length > 0 && (
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <SparklesIcon className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-purple-900">AI 추천 태그</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {suggestedTags.map((tag, index) => (
                            <div key={index} className="flex items-center">
                              <button
                                onClick={() => applyTagSuggestion(tag)}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-l-md bg-white border border-purple-300 text-purple-700 hover:bg-purple-50"
                              >
                                + #{tag}
                              </button>
                              <button
                                onClick={() => removeTagSuggestion(tag)}
                                className="px-1 py-1 text-xs border border-l-0 border-purple-300 rounded-r-md bg-white text-purple-600 hover:bg-red-50 hover:text-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 태그가 없는 경우 AI 태그 추천 버튼 */}
                {(!node.tags || node.tags.length === 0) && !showTagSuggestions && (
                  <div className="mb-6">
                    <button
                      onClick={generateTagSuggestions}
                      disabled={isGeneratingTags}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                    >
                      {isGeneratingTags ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                          생성 중...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          AI 태그 추천
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 요약 */}
                {(node.metadata?.summary || generatedSummary || isGeneratingSummary) && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <SparklesIcon className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-medium text-blue-900">AI 생성 요약</h3>
                      </div>
                      {!node.metadata?.summary && !generatedSummary && !isGeneratingSummary && (
                        <button
                          onClick={generateSummary}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          요약 생성
                        </button>
                      )}
                    </div>

                    {isGeneratingSummary ? (
                      <div className="flex items-center text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-sm">요약을 생성하고 있습니다...</span>
                      </div>
                    ) : (
                      <p className="text-blue-800 leading-relaxed break-words whitespace-pre-wrap">
                        {generatedSummary || node.metadata?.summary}
                      </p>
                    )}
                  </div>
                )}

                {/* 요약 생성 버튼 (요약이 없는 경우) */}
                {!node.metadata?.summary && !generatedSummary && !isGeneratingSummary && (
                  <div className="mb-6">
                    <button
                      onClick={generateSummary}
                      disabled={!node.content || node.content.length < 100}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!node.content || node.content.length < 100 ? "내용이 너무 짧아 요약이 필요하지 않습니다" : ""}
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      AI 요약 생성
                    </button>
                  </div>
                )}

                {/* 본문 내용 */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">내용</h3>
                  <div className="prose max-w-none break-words">
                    <div
                      className="text-gray-700 leading-relaxed break-words overflow-wrap-anywhere"
                      dangerouslySetInnerHTML={{
                        __html: node.content || '<p class="text-gray-500 italic">내용이 없습니다.</p>'
                      }}
                    />
                  </div>
                </div>

                {/* 첨부파일 섹션 */}
                {node.metadata && node.metadata.files && node.metadata.files.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="font-medium text-gray-900">첨부파일 ({node.metadata.files.length}개)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {node.metadata.files.map((file: any, index: number) => {
                        const getFileIcon = (fileType: string) => {
                          if (fileType.startsWith('image/')) {
                            return <PhotoIcon className="h-8 w-8 text-blue-500" />;
                          } else if (fileType === 'application/pdf') {
                            return <DocumentIcon className="h-8 w-8 text-red-500" />;
                          }
                          return <DocumentIcon className="h-8 w-8 text-gray-500" />;
                        };

                        const isExpanded = expandedFileSummaries.has(index);
                        const isGenerating = generatingFileSummaries.has(index);
                        const hasSummary = file.summary && file.summary.trim().length > 0;

                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                            {/* 파일 기본 정보 */}
                            <div className="flex items-start space-x-3">
                              {getFileIcon(file.type)}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm break-words" title={file.name}>
                                  {file.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {file.type}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  업로드: {new Date(file.uploadedAt).toLocaleDateString('ko-KR')}
                                </div>
                              </div>
                            </div>

                            {/* 파일 요약 섹션 - 개선된 UI */}
                            {hasSummary && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <SparklesIcon className="h-4 w-4 text-purple-500 mr-1" />
                                    <span className="text-sm font-medium text-gray-700">AI 요약</span>
                                  </div>
                                  <button
                                    onClick={() => toggleFileSummaryExpansion(index)}
                                    className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <>
                                        접기 <ChevronDownIcon className="h-3 w-3 ml-1" />
                                      </>
                                    ) : (
                                      <>
                                        자세히 <ChevronRightIcon className="h-3 w-3 ml-1" />
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* 요약 미리보기 (항상 표시) */}
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-100">
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {isExpanded
                                      ? file.summary
                                      : file.summary.length > 150
                                        ? `${file.summary.substring(0, 150)}...`
                                        : file.summary
                                    }
                                  </p>

                                  {/* 요약 길이가 긴 경우 더보기 표시 */}
                                  {!isExpanded && file.summary.length > 150 && (
                                    <button
                                      onClick={() => toggleFileSummaryExpansion(index)}
                                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                    >
                                      더 보기 →
                                    </button>
                                  )}
                                </div>

                                {/* 요약 메타데이터 */}
                                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                  <span className="flex items-center">
                                    <AcademicCapIcon className="h-3 w-3 mr-1" />
                                    AI 자동 생성
                                  </span>
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                                    요약 완료
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* 액션 버튼들 */}
                            <div className="mt-3 flex flex-col space-y-2">
                              {/* 파일 보기/다운로드 버튼 */}
                              <div className="flex space-x-2">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                  <EyeIcon className="h-4 w-4 mr-1" />
                                  보기
                                </a>
                                <a
                                  href={file.url}
                                  download={file.name}
                                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                  다운로드
                                </a>
                              </div>

                              {/* AI 요약 생성/재생성 통합 섹션 */}
                              {!hasSummary && !isGenerating && (
                                <div className="bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300">
                                  <div className="text-center">
                                    <SparklesIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                                    <p className="text-xs text-gray-600 mb-3">
                                      AI가 이 파일의 내용을 분석하여 요약을 생성할 수 있습니다
                                    </p>
                                    <button
                                      onClick={() => generateFileSummary(index, file)}
                                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
                                    >
                                      <SparklesIcon className="h-4 w-4 mr-1" />
                                      AI 요약 생성하기
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* 요약 생성 중 상태 */}
                              {isGenerating && (
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mr-3"></div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">AI 요약 생성 중</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        파일 내용을 분석하고 있습니다...
                                      </p>
                                    </div>
                                  </div>

                                  {/* 진행률 표시 */}
                                  <div className="mt-3">
                                    <div className="bg-gray-200 rounded-full h-1.5">
                                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full animate-pulse" style={{width: '60%'}}></div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 요약 재생성 버튼 - 개선된 UI */}
                              {hasSummary && !isGenerating && (
                                <div className="border-t border-gray-100 pt-3">
                                  <button
                                    onClick={() => generateFileSummary(index, file)}
                                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 group"
                                  >
                                    <svg className="h-4 w-4 mr-1 group-hover:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    새로운 요약 생성
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI 관계 제안 및 새 관계 추가 버튼 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <LinkIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">지식 관계 관리</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setIsAddRelationshipModalOpen(true)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        관계 추가
                      </button>

                      <button
                        onClick={() => setIsLinkRecommendationOpen(true)}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI 링크 추천
                      </button>

                      <button
                        onClick={discoverRelationships}
                        disabled={isDiscoveringRelationships}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        {isDiscoveringRelationships ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                        ) : (
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {isDiscoveringRelationships ? 'AI 분석 중...' : 'AI 관계 발견'}
                      </button>
                    </div>
                  </div>

                  {/* AI 관계 제안 */}
                  {relationshipSuggestions.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-purple-900 mb-2 flex items-center">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI 관계 제안
                      </h4>
                      <div className="space-y-2">
                        {relationshipSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.targetNodeId}
                            className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-purple-900 break-words overflow-wrap-anywhere">
                                {suggestion.targetNodeTitle}
                              </div>
                              <div className="text-xs text-purple-600 break-words overflow-wrap-anywhere">
                                {suggestion.relationshipType.replace('_', ' ')} • 신뢰도: {Math.round(suggestion.confidence * 100)}%
                              </div>
                              <div className="text-xs text-purple-500 mt-1 break-words overflow-wrap-anywhere">
                                {suggestion.explanation}
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => applySuggestion(suggestion)}
                                className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                              >
                                적용
                              </button>
                              <button
                                onClick={() => dismissSuggestion(suggestion.targetNodeId)}
                                className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              >
                                무시
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 메타데이터 */}
                {node.metadata && Object.keys(node.metadata).length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-3">추가 정보</h3>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm">
                      <pre className="whitespace-pre-wrap break-words break-all overflow-wrap-anywhere max-w-full">
                        {JSON.stringify(node.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 사이드바 - 반응형 */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-6">
            {/* 유사한 지식 패널 */}
            <SimilarNodesPanel nodeId={nodeId!} maxNodes={6} />

            {/* 백링크 패널 */}
            <BacklinksPanel nodeId={nodeId!} />
          </div>
        </div>
      </div>

      {/* 관계 추가 모달 */}
      <AddRelationshipModal
        isOpen={isAddRelationshipModalOpen}
        onClose={() => setIsAddRelationshipModalOpen(false)}
        sourceNodeId={nodeId!}
        sourceNodeTitle={node.title}
        onRelationshipAdded={handleRelationshipAdded}
      />

      {/* AI 링크 추천 패널 */}
      <LinkRecommendationPanel
        nodeId={nodeId!}
        nodeTitle={node.title}
        isOpen={isLinkRecommendationOpen}
        onClose={() => setIsLinkRecommendationOpen(false)}
        onLinkCreated={handleLinkCreated}
      />
    </div>
  );
};