import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowLeftIcon, SparklesIcon, ShieldCheckIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { knowledgeService } from '../../services/knowledge.service';
import { aiService } from '../../services/ai.service';
import { AIEnhancedNode } from '../../components/AIEnhancedNode';
import { RichTextEditor } from '../../components/RichTextEditor';
import { FileUpload } from '../../components/FileUpload';
import { useSecureForm } from '../../hooks/useSecurity';

interface CreateNodeForm {
  title: string;
  content: string;
  nodeType: string;
  contentType: string;
  tags: string[];
  isPublic: boolean;
}

export const CreateNodePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [createdNodeId, setCreatedNodeId] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [aiData, setAiData] = useState<{ summary?: string; tags?: string[] }>({});
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    url: string;
    summary?: string; // AI로 생성된 파일 요약
    name: string;
    type: string;
    uploadedAt: string;
  }>>([]);
  const [fileObjects, setFileObjects] = useState<File[]>([]);

  // AI 기능 진행 상태
  const [aiProgress, setAiProgress] = useState<{
    summary: 'idle' | 'processing' | 'completed' | 'failed';
    tags: 'idle' | 'processing' | 'completed' | 'failed';
  }>({ summary: 'idle', tags: 'idle' });

  // 파일 요약 생성 상태
  const [generatingFileSummaries, setGeneratingFileSummaries] = useState<Set<number>>(new Set());
  const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<number>>(new Set());

  // 추천 태그 상태
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // 보안 훅 사용
  const {
    submitSecurely,
    validateFileUpload,
    checkRateLimit,
    sanitizeText,
    sanitizeHtml,
    getCSRFToken
  } = useSecureForm();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<CreateNodeForm>({
    defaultValues: {
      title: '',
      content: '',
      nodeType: 'Note',
      contentType: 'text',
      tags: [],
      isPublic: false
    }
  });

  const watchedTitle = watch('title');
  const watchedContent = watch('content');
  const watchedTags = watch('tags');

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeText(e.target.value); // 입력값 새니타이제이션
    setTagsInput(value);

    const tags = value
      .split(',')
      .map(tag => sanitizeText(tag.trim())) // 각 태그도 새니타이제이션
      .filter(tag => tag.length > 0 && tag.length <= 50) // 태그 길이 제한
      .slice(0, 20); // 최대 20개 태그로 제한

    setValue('tags', tags);
  };

  // AI 요약 생성
  const generateSummary = async (nodeId: string) => {
    try {
      setAiProgress(prev => ({ ...prev, summary: 'processing' }));
      console.log('🤖 AI 요약 생성 중...');

      const summary = await aiService.summarizeNode(nodeId);

      setAiData(prev => ({ ...prev, summary }));
      setAiProgress(prev => ({ ...prev, summary: 'completed' }));

      console.log('✅ AI 요약 생성 완료');
      toast.success('AI 요약이 생성되었습니다!');
    } catch (error) {
      console.error('❌ AI 요약 생성 실패:', error);
      setAiProgress(prev => ({ ...prev, summary: 'failed' }));
      toast.error('AI 요약 생성에 실패했습니다.');
    }
  };

  // AI 키워드 추출
  const generateTagSuggestions = async () => {
    try {
      setAiProgress(prev => ({ ...prev, tags: 'processing' }));
      console.log('🏷️ AI 태그 추천 생성 중...');

      const title = watchedTitle || '';
      const content = watchedContent || '';

      // 파일 내용도 포함
      let combinedText = `${title}\n\n${content}`;
      if (fileObjects.length > 0) {
        const { FileTextExtractor } = await import('../../lib/fileTextExtractor');
        const fileText = await FileTextExtractor.extractTextFromFiles(fileObjects);
        if (fileText) {
          combinedText += `\n\n${fileText}`;
        }
      }

      const tags = await aiService.generateTags(title, combinedText);

      setSuggestedTags(tags);
      setShowTagSuggestions(true);
      setAiProgress(prev => ({ ...prev, tags: 'completed' }));

      console.log('✅ AI 태그 추천 완료:', tags);
      toast.success(`${tags.length}개의 태그가 추천되었습니다!`);
    } catch (error) {
      console.error('❌ AI 태그 생성 실패:', error);
      setAiProgress(prev => ({ ...prev, tags: 'failed' }));
      toast.error('AI 태그 생성에 실패했습니다.');
    }
  };

  // 추천 태그 적용
  const applyTagSuggestion = (tag: string) => {
    const currentTags = watchedTags || [];
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];
      setValue('tags', newTags);
      setTagsInput(newTags.join(', '));
    }
  };

  // 추천 태그 제거
  const removeTagSuggestion = (tagToRemove: string) => {
    setSuggestedTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  // 파일 업로드 후 자동 요약 생성
  const generateFileSummaryOnUpload = async (fileIndex: number, file: any) => {
    if (!file.url || !file.name) return;

    setGeneratingFileSummaries(prev => new Set([...prev, fileIndex]));

    try {
      console.log(`📄 새 파일 자동 요약 생성 시작: ${file.name}`);

      const summary = await aiService.summarizeFile(file.url, file.name);

      // 업로드된 파일에 요약 추가
      setUploadedFiles(prev =>
        prev.map((uploadedFile, index) =>
          index === fileIndex ? { ...uploadedFile, summary } : uploadedFile
        )
      );

      console.log(`✅ 파일 자동 요약 생성 완료: ${file.name}`);
      toast.success(`"${file.name}" 파일의 요약이 자동으로 생성되었습니다!`);

    } catch (error) {
      console.error('❌ 파일 자동 요약 생성 실패:', error);
      // 요약 생성 실패 시 조용히 넘어가기 (사용자에게는 에러를 표시하지 않음)
      console.warn('파일 요약 생성에 실패했지만 파일 업로드는 성공했습니다.');
    } finally {
      setGeneratingFileSummaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileIndex);
        return newSet;
      });
    }
  };

  // 수동으로 파일 요약 재생성
  const regenerateFileSummary = async (fileIndex: number) => {
    const file = uploadedFiles[fileIndex];
    if (!file) return;

    setGeneratingFileSummaries(prev => new Set([...prev, fileIndex]));

    try {
      console.log(`📄 파일 요약 재생성 시작: ${file.name}`);

      const summary = await aiService.summarizeFile(file.url, file.name);

      setUploadedFiles(prev =>
        prev.map((uploadedFile, index) =>
          index === fileIndex ? { ...uploadedFile, summary } : uploadedFile
        )
      );

      console.log(`✅ 파일 요약 재생성 완료: ${file.name}`);
      toast.success(`"${file.name}" 파일의 요약이 재생성되었습니다!`);

    } catch (error) {
      console.error('❌ 파일 요약 재생성 실패:', error);
      toast.error('파일 요약 재생성에 실패했습니다.');
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

  const onSubmit = async (data: CreateNodeForm) => {
    if (isSubmitting) return;

    // Rate limiting 확인
    const rateLimitCheck = checkRateLimit('nodeCreation');
    if (!rateLimitCheck.allowed) {
      toast.error(rateLimitCheck.message);
      return;
    }

    setIsSubmitting(true);

    try {
      // 보안 검증된 데이터 준비
      const secureData = {
        title: sanitizeText(data.title),
        content: sanitizeHtml(data.content),
        nodeType: data.nodeType,
        contentType: data.contentType,
        tags: data.tags.map(tag => sanitizeText(tag)), // 태그 새니타이제이션
        isPublic: data.isPublic
      };

      // 보안 검증 및 제출
      const result = await submitSecurely(
        secureData,
        async (sanitizedData) => {
          const nodeData = {
            title: sanitizedData.title,
            content: sanitizedData.content,
            node_type: sanitizedData.nodeType,
            content_type: sanitizedData.contentType,
            tags: sanitizedData.tags,
            is_public: sanitizedData.isPublic,
            metadata: {
              summary: aiData.summary ? sanitizeText(aiData.summary) : null,
              files: uploadedFiles,
              createdAt: new Date().toISOString(),
              csrfToken: getCSRFToken(), // CSRF 토큰 포함
              ...(uploadedFiles.length > 0 && { hasAttachments: true })
            }
          };

          return knowledgeService.createNode(nodeData);
        },
        {
          requireCSRF: true,
          detectSuspicious: true,
          rateLimitAction: 'nodeCreation'
        }
      );

      if (result) {
        setCreatedNodeId(result.id);
        setShowAITools(true);

        // 자동 AI 기능 실행 (백그라운드에서 실행)
        const executeAIFeatures = async () => {
          try {
            console.log('🔄 자동 임베딩 생성 중...');
            const embeddingService = await import('../../services/embedding.service');

            // 첨부파일 정보가 있으면 파일 내용도 포함하도록 안내
            if (uploadedFiles.length > 0) {
              console.log(`📁 ${uploadedFiles.length}개의 첨부파일이 있습니다.`);
              const pdfCount = fileObjects.filter(f => f.type === 'application/pdf').length;
              if (pdfCount > 0) {
                console.log(`📕 PDF 파일 ${pdfCount}개의 텍스트가 자동으로 추출되어 임베딩에 포함됩니다.`);

                // PDF가 있는 경우 자동으로 요약 생성
                setTimeout(() => generateSummary(result.id), 1000);
              }
            }

            await embeddingService.embeddingService.generateAndStoreNodeEmbedding(
              result.id,
              sanitizeText(data.title),
              sanitizeText(data.content),
              fileObjects.length > 0 ? fileObjects : undefined
            );

            console.log('✅ 자동 임베딩 생성 완료');

            // 🔗 자동 링크 생성 (임베딩 생성 후)
            try {
              console.log('🔗 자동 링크 추천 및 생성 시작...');

              // 유사한 노드 찾기
              const similarNodes = await embeddingService.embeddingService.findSimilarNodes(result.id, {
                limit: 10,
                similarity_threshold: 0.6,
                exclude_self: true
              });

              if (similarNodes && similarNodes.length > 0) {
                console.log(`✅ ${similarNodes.length}개의 유사한 노드 발견`);

                // 기존 관계 확인
                const existingRelationships = await knowledgeService.getNodeRelationships(result.id);
                const existingTargetIds = new Set();

                if (existingRelationships && Array.isArray(existingRelationships)) {
                  existingRelationships.forEach(rel => {
                    if (rel.source_node_id === result.id) {
                      existingTargetIds.add(rel.target_node_id);
                    } else if (rel.target_node_id === result.id) {
                      existingTargetIds.add(rel.source_node_id);
                    }
                  });
                }

                // 자동으로 모든 추천 링크 생성
                let createdLinksCount = 0;
                for (const node of similarNodes) {
                  // 이미 관계가 있는 노드는 제외
                  if (existingTargetIds.has(node.id)) continue;

                  try {
                    await knowledgeService.createRelationship({
                      sourceNodeId: result.id,
                      targetNodeId: node.id,
                      relationshipType: 'related_to',
                      comment: `AI 자동 생성 (유사도: ${Math.round(node.similarity * 100)}%)`
                    });
                    createdLinksCount++;
                    console.log(`✅ "${node.title}"와(과) 링크 생성 완료`);
                  } catch (linkError) {
                    console.warn(`⚠️ "${node.title}"와(과) 링크 생성 실패:`, linkError);
                  }
                }

                if (createdLinksCount > 0) {
                  console.log(`✅ 총 ${createdLinksCount}개의 링크가 자동으로 생성되었습니다`);
                  toast.success(`지식 노드가 생성되고 ${createdLinksCount}개의 관련 지식과 자동으로 연결되었습니다!`);
                } else {
                  toast.success('지식 노드가 생성되고 AI 검색이 활성화되었습니다!');
                }
              } else {
                console.log('ℹ️ 연결할 유사한 노드가 없습니다');
                toast.success('지식 노드가 생성되고 AI 검색이 활성화되었습니다!');
              }
            } catch (linkError) {
              console.error('⚠️ 자동 링크 생성 실패 (노드 생성은 성공):', linkError);
              toast.success('지식 노드가 생성되고 AI 검색이 활성화되었습니다!');
            }

          } catch (embeddingError) {
            console.error('⚠️ 임베딩 생성 실패 (노드 생성은 성공):', embeddingError);
            toast.success('지식 노드가 생성되었습니다. (AI 검색은 나중에 활성화할 수 있습니다)');
          }
        };

        // AI 기능 실행
        executeAIFeatures();

        // 3초 후 상세 페이지로 이동
        setTimeout(() => {
          navigate(`/app/knowledge/${result.id}`);
        }, 3000);
      }
    } catch (error: any) {
      console.error('노드 생성 실패:', error);

      // 보안 관련 에러 메시지 처리
      if (error.message.includes('CSRF')) {
        toast.error('보안 토큰이 만료되었습니다. 페이지를 새로고침해주세요.');
      } else if (error.message.includes('Rate limit')) {
        toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else if (error.message.includes('의심스러운')) {
        toast.error('입력된 데이터에 문제가 있습니다. 다시 확인해주세요.');
      } else {
        toast.error('노드 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIUpdate = (data: { summary?: string; tags?: string[] }) => {
    setAiData(prev => ({ ...prev, ...data }));

    if (data.tags) {
      const currentTags = watchedTags || [];
      const combinedTags = [...currentTags, ...data.tags];
      const uniqueTags = Array.from(new Set(combinedTags));

      setValue('tags', uniqueTags);
      setTagsInput(uniqueTags.join(', '));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* 프리미엄 헤더 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-knowledge-500 via-primary-600 to-ai-500 rounded-t-3xl p-8 text-white shadow-strong mb-8">
        {/* 배경 장식 */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/app/knowledge')}
                className="flex items-center text-white/80 hover:text-white hover:bg-white/20 px-4 py-2 rounded-xl transition-all duration-200 group backdrop-blur-sm"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                지식 노드로 돌아가기
              </button>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="h-4 w-4 text-green-300" />
                <span>보안 검증 활성화</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-4 w-4 text-yellow-300" />
                <span>AI 도구 지원</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <SparklesIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">새 지식 노드 생성</h1>
              <p className="text-white/90 text-lg">
                새로운 지식을 추가하고 AI의 도움으로 체계적으로 관리해보세요
              </p>
            </div>
          </div>

          {/* 진행 단계 표시 */}
          <div className="flex items-center space-x-8 mt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span className="text-sm font-medium">기본 정보</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 border-2 border-white/40 rounded-full"></div>
              <span className="text-sm text-white/60">AI 분석</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 border-2 border-white/40 rounded-full"></div>
              <span className="text-sm text-white/60">저장 완료</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* 메인 폼 */}
        <div className="xl:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 프리미엄 메인 카드 */}
            <div className="card-premium border-0 shadow-strong">
              <div className="relative overflow-hidden bg-gradient-to-r from-white via-white to-primary-50/30 rounded-t-2xl px-8 py-6 border-b border-primary-100">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100/50 to-knowledge-100/50 rounded-full blur-xl opacity-50"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">노드 정보</h2>
                  <p className="text-neutral-600">지식의 핵심 내용을 구조화하여 입력해주세요</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* 제목 */}
                <div className="group">
                  <label htmlFor="title" className="block text-lg font-bold text-neutral-900 mb-4">
                    제목 *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-knowledge-500 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-all duration-300"></div>
                    <div className="relative">
                      <input
                        id="title"
                        type="text"
                        {...register('title', {
                          required: '제목은 필수입니다',
                          minLength: { value: 1, message: '제목을 입력해주세요' }
                        })}
                        className="input-premium text-xl font-semibold py-4 px-6 border-2 border-neutral-200 focus:border-primary-400 group-focus-within:shadow-glow"
                        placeholder="멋진 제목을 입력해주세요..."
                      />
                    </div>
                  </div>
                  {errors.title && (
                    <p className="mt-3 text-sm text-error-600 font-medium flex items-center">
                      <span className="w-2 h-2 bg-error-500 rounded-full mr-2"></span>
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* 내용 */}
                <div className="group">
                  <label className="block text-lg font-bold text-neutral-900 mb-4">
                    내용 *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-knowledge-600 to-ai-500 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-all duration-300"></div>
                    <div className="relative border-2 border-neutral-200 group-focus-within:border-knowledge-400 rounded-2xl overflow-hidden transition-all duration-300">
                      <RichTextEditor
                        content={watchedContent}
                        onChange={(content) => setValue('content', content, { shouldValidate: true })}
                        placeholder="지식의 핵심을 자세히 작성해주세요. 마크다운 문법을 지원합니다..."
                      />
                    </div>
                  </div>
                  {errors.content && (
                    <p className="mt-3 text-sm text-error-600 font-medium flex items-center">
                      <span className="w-2 h-2 bg-error-500 rounded-full mr-2"></span>
                      {errors.content.message}
                    </p>
                  )}
                </div>

                {/* 노드 타입 */}
                <div>
                  <label htmlFor="nodeType" className="block text-lg font-bold text-neutral-900 mb-4">
                    노드 타입
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { value: 'Note', label: '노트', icon: '📝', desc: '일반 텍스트' },
                      { value: 'WebClip', label: '웹클립', icon: '🌐', desc: '웹 컨텐츠' },
                      { value: 'Document', label: '문서', icon: '📄', desc: '구조화된 문서' },
                      { value: 'Image', label: '이미지', icon: '🖼️', desc: '시각적 자료' },
                      { value: 'Concept', label: '개념', icon: '💡', desc: '추상적 개념' }
                    ].map((type) => (
                      <label key={type.value} className="relative">
                        <input
                          type="radio"
                          value={type.value}
                          {...register('nodeType')}
                          className="sr-only peer"
                        />
                        <div className="card-interactive p-4 text-center border-2 border-neutral-200 peer-checked:border-primary-500 peer-checked:bg-primary-50 peer-checked:shadow-glow cursor-pointer">
                          <div className="text-2xl mb-2">{type.icon}</div>
                          <div className="font-semibold text-neutral-900 mb-1">{type.label}</div>
                          <div className="text-xs text-neutral-600">{type.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-3">
                    💡 각 노드 타입은 특별한 AI 분석과 시각화 기능을 제공합니다
                  </p>
                </div>
              </div>

              {/* 태그 섹션 - 개선된 디자인 */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <label htmlFor="tags" className="text-sm font-semibold text-gray-900">
                          스마트 태그
                        </label>
                        <p className="text-xs text-gray-600">
                          콘텐츠를 쉽게 찾고 분류할 수 있도록 태그를 추가하세요
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={generateTagSuggestions}
                      disabled={aiProgress.tags === 'processing' || (!watchedTitle && !watchedContent && fileObjects.length === 0)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {aiProgress.tags === 'processing' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          AI 분석 중...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          AI 태그 추천
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="tags"
                      type="text"
                      value={tagsInput}
                      onChange={handleTagsChange}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                      placeholder="태그를 입력하세요 (예: 프로그래밍, Python, 머신러닝)"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                        쉼표로 구분
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI 추천 태그 - 개선된 디자인 */}
                {showTagSuggestions && suggestedTags.length > 0 && (
                  <div className="bg-white border-2 border-indigo-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-gray-900">AI 추천 태그</span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          {suggestedTags.length}개
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTagSuggestions(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag, index) => {
                        const isApplied = watchedTags?.includes(tag);
                        return (
                          <div key={index} className="group relative">
                            <button
                              type="button"
                              onClick={() => applyTagSuggestion(tag)}
                              disabled={isApplied}
                              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isApplied
                                  ? 'bg-green-100 text-green-800 border-2 border-green-200'
                                  : 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-2 border-purple-200 hover:from-purple-100 hover:to-pink-100 hover:shadow-md'
                              }`}
                            >
                              {isApplied ? (
                                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              )}
                              {tag}
                            </button>
                            {!isApplied && (
                              <button
                                type="button"
                                onClick={() => removeTagSuggestion(tag)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 현재 적용된 태그 - 개선된 디자인 */}
                {watchedTags && watchedTags.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-1 bg-blue-100 rounded-md">
                        <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-blue-900">
                        적용된 태그 ({watchedTags.length}개)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {watchedTags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-blue-800 border border-blue-200 shadow-sm"
                        >
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI 요약 */}
              {(aiData.summary || aiProgress.summary === 'processing') && (
                <div>
                  <div className="flex items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      AI 생성 요약
                    </label>
                    {aiProgress.summary === 'processing' && (
                      <div className="ml-2 flex items-center text-xs text-blue-600">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                        생성 중...
                      </div>
                    )}
                  </div>

                  {aiProgress.summary === 'processing' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-600">
                      <div className="animate-pulse">요약을 생성하고 있습니다...</div>
                    </div>
                  ) : aiData.summary ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900">
                      {aiData.summary}
                    </div>
                  ) : null}
                </div>
              )}

              {/* 파일 첨부 섹션 - 개선된 디자인 */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900">
                        스마트 파일 첨부
                      </label>
                      <p className="text-xs text-gray-600">
                        PDF, 문서, 이미지 등을 업로드하면 AI가 자동으로 내용을 분석합니다
                      </p>
                    </div>
                  </div>
                <FileUpload
                  onFileUploaded={(url, fileName, fileType, fileObject) => {
                    // 파일 보안 검증
                    const dummyFile = new File([''], fileName, { type: fileType });
                    const validation = validateFileUpload(dummyFile);

                    if (!validation.isValid) {
                      toast.error(`파일 업로드 오류: ${validation.errors.join(', ')}`);
                      return;
                    }

                    // Rate limiting 확인
                    const rateLimitCheck = checkRateLimit('upload');
                    if (!rateLimitCheck.allowed) {
                      toast.error(rateLimitCheck.message);
                      return;
                    }

                    const newFile = {
                      url,
                      name: validation.sanitizedName, // 새니타이제이션된 파일명 사용
                      type: fileType,
                      uploadedAt: new Date().toISOString()
                    };
                    setUploadedFiles(prev => [...prev, newFile]);

                    // File 객체도 별도로 저장 (임베딩에 사용)
                    if (fileObject) {
                      setFileObjects(prev => [...prev, fileObject]);
                      console.log(`📄 File 객체 저장: ${fileObject.name} (${fileObject.type})`);
                    }

                    // 파일 업로드 완료 후 자동으로 요약 생성 (비동기적으로)
                    const fileIndex = uploadedFiles.length; // 새로 추가될 파일의 인덱스
                    setTimeout(() => {
                      generateFileSummaryOnUpload(fileIndex, newFile);
                    }, 1000); // 1초 후에 실행하여 UI 업데이트가 완료된 후 요약 생성

                    // PDF나 이미지 파일의 경우 적절한 content_type으로 설정
                    if (fileType === 'application/pdf') {
                      setValue('contentType', 'document');
                    } else if (fileType.startsWith('image/')) {
                      setValue('contentType', 'image');
                    }
                  }}
                  acceptedTypes={['image/*', 'application/pdf', '.doc', '.docx', '.txt', '.md']}
                  maxSizeInMB={10}
                  multiple={true}
                />

                  {/* 업로드된 파일 목록 표시 */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                          <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900">첨부된 파일들</h4>
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                          {uploadedFiles.length}개 파일
                        </span>
                      </div>
                      <div className="space-y-3">
                      {uploadedFiles.map((file, index) => {
                        const isExpanded = expandedFileSummaries.has(index);
                        const isGenerating = generatingFileSummaries.has(index);
                        const hasSummary = file.summary && file.summary.trim().length > 0;

                        return (
                          <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                            {/* 파일 기본 정보 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="p-2.5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                                  {file.type === 'application/pdf' ? (
                                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                  ) : file.type.startsWith('image/') ? (
                                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  ) : (
                                    <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-gray-900 mb-1">{file.name}</div>
                                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                                    <span className="bg-gray-100 px-2 py-1 rounded-full font-medium">
                                      {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                    </span>
                                    <span className="flex items-center">
                                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      방금 전
                                    </span>
                                  </div>
                                </div>
                                {isGenerating && (
                                  <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                    요약 생성 중
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                                  setFileObjects(prev => prev.filter((_, i) => i !== index));
                                  // 관련 상태도 정리
                                  setGeneratingFileSummaries(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(index);
                                    return newSet;
                                  });
                                  setExpandedFileSummaries(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(index);
                                    return newSet;
                                  });
                                }}
                                className="group p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="파일 제거"
                              >
                                <svg className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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
                                    type="button"
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
                                      type="button"
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
                                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                    AI 자동 생성
                                  </span>
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                    업로드 시 자동 생성
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* AI 요약 생성 중 상태 */}
                            {isGenerating && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
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
                              </div>
                            )}

                            {/* AI 요약 생성/재생성 버튼 */}
                            {!hasSummary && !isGenerating && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300">
                                  <div className="text-center">
                                    <SparklesIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                                    <p className="text-xs text-gray-600 mb-3">
                                      AI가 이 파일의 내용을 분석하여 요약을 생성할 수 있습니다
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => regenerateFileSummary(index)}
                                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
                                    >
                                      <SparklesIcon className="h-4 w-4 mr-1" />
                                      AI 요약 생성하기
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 요약 재생성 버튼 */}
                            {hasSummary && !isGenerating && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => regenerateFileSummary(index)}
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
                        );
                      })}
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* 공개 설정 */}
              <div className="flex items-center">
                <input
                  id="isPublic"
                  type="checkbox"
                  {...register('isPublic')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                  공개 노드로 설정 (다른 사용자가 볼 수 있습니다)
                </label>
              </div>
            </div>

            {/* 프리미엄 제출 버튼 영역 */}
            <div className="card-premium border-0 shadow-strong">
              <div className="p-8 bg-gradient-to-r from-neutral-50 via-white to-primary-50/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-1">지식 노드 생성</h3>
                    <p className="text-neutral-600">AI가 자동으로 분석하여 지식 그래프에 연결합니다</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => navigate('/app/knowledge')}
                      className="btn-secondary py-3 px-6 font-semibold"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={!isValid || isSubmitting}
                      className="btn-primary py-4 px-8 text-lg font-bold relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-knowledge-500 to-ai-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      <div className="relative z-10 flex items-center">
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                            생성 중...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-5 w-5 mr-3" />
                            노드 생성하기
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 진행 상태 표시 */}
                {isSubmitting && (
                  <div className="mt-6 p-4 bg-primary-50 rounded-2xl border border-primary-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent"></div>
                      <span className="font-semibold text-primary-900">지식 노드를 생성하고 있습니다</span>
                    </div>
                    <div className="space-y-2 text-sm text-primary-700">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 animate-pulse"></div>
                        보안 검증 및 데이터 처리
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-primary-300 rounded-full mr-3"></div>
                        AI 임베딩 생성
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-primary-200 rounded-full mr-3"></div>
                        지식 그래프 연결
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* 프리미엄 AI 도구 사이드바 */}
        <div className="xl:col-span-1 space-y-6">
          {watchedTitle && watchedContent ? (
            <div className="card-premium border-0 shadow-strong">
              <div className="bg-gradient-to-r from-ai-500 via-primary-600 to-knowledge-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <SparklesIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">AI 분석 도구</h3>
                    <p className="text-white/80 text-sm">실시간 지능형 분석</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <AIEnhancedNode
                  nodeId={createdNodeId}
                  title={watchedTitle}
                  content={watchedContent}
                  currentTags={watchedTags || []}
                  onUpdate={handleAIUpdate}
                />
              </div>
            </div>
          ) : (
            <div className="card-premium border-0 shadow-strong">
              <div className="p-8 text-center">
                <div className="w-20 h-20 gradient-ai rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-glow-ai">
                  <SparklesIcon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">AI 도구 대기 중</h3>
                <p className="text-neutral-600 mb-6 leading-relaxed">
                  제목과 내용을 입력하시면<br />
                  강력한 AI 분석 도구들이 활성화됩니다
                </p>
                <div className="space-y-3 text-left">
                  {[
                    { icon: '🤖', text: '자동 요약 생성' },
                    { icon: '🏷️', text: '스마트 태그 추천' },
                    { icon: '🔗', text: '지식 연결 분석' },
                    { icon: '📊', text: '내용 구조 분석' }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-neutral-50 rounded-lg">
                      <span className="text-lg">{feature.icon}</span>
                      <span className="text-sm font-medium text-neutral-700">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 빠른 도움말 */}
          <div className="card-premium border-0 shadow-soft">
            <div className="p-6">
              <h4 className="font-bold text-neutral-900 mb-4 flex items-center">
                <span className="text-lg mr-2">💡</span>
                작성 팁
              </h4>
              <div className="space-y-3 text-sm text-neutral-600">
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>구체적이고 명확한 제목으로 시작하세요</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-knowledge-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>마크다운 문법을 활용해 구조화된 내용을 작성하세요</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-ai-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>관련 파일이 있다면 함께 업로드하세요</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-success-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>AI 태그 추천을 활용해 발견 가능성을 높이세요</span>
                </div>
              </div>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="card-premium border-0 shadow-soft">
            <div className="p-6">
              <h4 className="font-bold text-neutral-900 mb-4 flex items-center">
                <span className="text-lg mr-2">📈</span>
                최근 활동
              </h4>
              <div className="space-y-3">
                {[
                  { action: '노드 생성', count: 12, period: '이번 주' },
                  { action: 'AI 분석', count: 28, period: '이번 달' },
                  { action: '태그 생성', count: 45, period: '전체' }
                ].map((stat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                    <span className="text-sm font-medium text-neutral-700">{stat.action}</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-neutral-900">{stat.count}</div>
                      <div className="text-xs text-neutral-500">{stat.period}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};