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
            toast.success('지식 노드가 생성되고 AI 검색이 활성화되었습니다!');
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/app/knowledge')}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            지식 노드로 돌아가기
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">새 지식 노드 생성</h1>
        <p className="mt-2 text-gray-600">
          새로운 지식을 추가하고 AI 도구로 자동 분석해보세요.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* 메인 폼 */}
        <div className="xl:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">노드 정보</h2>
                <div className="flex items-center text-sm text-green-600">
                  <ShieldCheckIcon className="h-4 w-4 mr-1" />
                  보안 검증 활성화
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 제목 */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  제목 *
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title', {
                    required: '제목은 필수입니다',
                    minLength: { value: 1, message: '제목을 입력해주세요' }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="지식 노드의 제목을 입력하세요"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내용 *
                </label>
                <RichTextEditor
                  content={watchedContent}
                  onChange={(content) => setValue('content', content, { shouldValidate: true })}
                  placeholder="지식 노드의 내용을 상세히 작성하세요..."
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}
              </div>

              {/* 노드 타입 */}
              <div>
                <label htmlFor="nodeType" className="block text-sm font-medium text-gray-700 mb-2">
                  노드 타입
                </label>
                <select
                  id="nodeType"
                  {...register('nodeType')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Note">노트 (Note)</option>
                  <option value="WebClip">웹클립 (WebClip)</option>
                  <option value="Document">문서 (Document)</option>
                  <option value="Image">이미지 (Image)</option>
                  <option value="Concept">개념 (Concept)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  PDF 요구사항에 따른 5가지 노드 타입입니다.
                </p>
              </div>

              {/* 태그 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                    태그 (쉼표로 구분)
                  </label>
                  <button
                    type="button"
                    onClick={generateTagSuggestions}
                    disabled={aiProgress.tags === 'processing' || (!watchedTitle && !watchedContent && fileObjects.length === 0)}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiProgress.tags === 'processing' ? (
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

                <input
                  id="tags"
                  type="text"
                  value={tagsInput}
                  onChange={handleTagsChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 프로그래밍, Python, 머신러닝"
                />

                {/* 추천 태그 */}
                {showTagSuggestions && suggestedTags.length > 0 && (
                  <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <SparklesIcon className="h-4 w-4 text-purple-600 mr-1" />
                      <span className="text-sm font-medium text-purple-900">AI 추천 태그</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag, index) => (
                        <div key={index} className="flex items-center">
                          <button
                            type="button"
                            onClick={() => applyTagSuggestion(tag)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-l-md bg-white border border-purple-300 text-purple-700 hover:bg-purple-50"
                            disabled={watchedTags?.includes(tag)}
                          >
                            {watchedTags?.includes(tag) ? '✓' : '+'} #{tag}
                          </button>
                          <button
                            type="button"
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

                {/* 현재 태그 표시 */}
                {watchedTags && watchedTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {watchedTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        #{tag}
                      </span>
                    ))}
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

              {/* 파일 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  파일 첨부
                </label>
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
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">첨부된 파일</h4>
                    <div className="space-y-3">
                      {uploadedFiles.map((file, index) => {
                        const isExpanded = expandedFileSummaries.has(index);
                        const isGenerating = generatingFileSummaries.has(index);
                        const hasSummary = file.summary && file.summary.trim().length > 0;

                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                            {/* 파일 기본 정보 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">📎</span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{file.name}</div>
                                  <div className="text-xs text-gray-500">{file.type}</div>
                                </div>
                                {isGenerating && (
                                  <div className="flex items-center text-xs text-blue-600">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                    요약 생성 중...
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
                                className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                제거
                              </button>
                            </div>

                            {/* 파일 요약 섹션 */}
                            {hasSummary && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => toggleFileSummaryExpansion(index)}
                                  className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDownIcon className="h-4 w-4 mr-1" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 mr-1" />
                                  )}
                                  파일 요약
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 p-3 bg-blue-50 rounded-md border-l-4 border-blue-200">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                      {file.summary}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* AI 요약 생성/재생성 버튼 */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              {!hasSummary && !isGenerating && (
                                <button
                                  type="button"
                                  onClick={() => regenerateFileSummary(index)}
                                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                >
                                  <SparklesIcon className="h-3 w-3 mr-1" />
                                  AI 요약 생성
                                </button>
                              )}

                              {hasSummary && !isGenerating && (
                                <button
                                  type="button"
                                  onClick={() => regenerateFileSummary(index)}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-600 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                                >
                                  <SparklesIcon className="h-3 w-3 mr-1" />
                                  요약 재생성
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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

            {/* 제출 버튼 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center rounded-b-lg">
              <button
                type="button"
                onClick={() => navigate('/app/knowledge')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    노드 생성
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* AI 도구 사이드바 */}
        <div className="xl:col-span-1">
          {watchedTitle && watchedContent ? (
            <AIEnhancedNode
              nodeId={createdNodeId}
              title={watchedTitle}
              content={watchedContent}
              currentTags={watchedTags || []}
              onUpdate={handleAIUpdate}
            />
          ) : (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="text-center">
                <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">AI 도구 사용 가능</h3>
                <p className="mt-1 text-sm text-gray-500">
                  제목과 내용을 입력하면 AI 도구가 활성화됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};