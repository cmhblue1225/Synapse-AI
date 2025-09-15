import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowLeftIcon, SparklesIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { knowledgeService } from '../../services/knowledge.service';
import { AIEnhancedNode } from '../../components/AIEnhancedNode';
import { RichTextEditor } from '../../components/RichTextEditor';
import { FileUpload } from '../../components/FileUpload';

interface EditNodeForm {
  title: string;
  content: string;
  nodeType: string;
  contentType: string;
  tags: string[];
  isPublic: boolean;
}

export const EditNodePage: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [aiData, setAiData] = useState<{ summary?: string; tags?: string[] }>({});
  const [existingFiles, setExistingFiles] = useState<Array<{
    url: string;
    name: string;
    type: string;
    uploadedAt: string;
  }>>([]);
  const [newFiles, setNewFiles] = useState<Array<{
    url: string;
    name: string;
    type: string;
    uploadedAt: string;
  }>>([]);

  // 기존 노드 데이터 로드
  const { data: node, isLoading, error } = useQuery({
    queryKey: ['node', nodeId],
    queryFn: () => knowledgeService.getNode(nodeId!),
    enabled: !!nodeId,
    retry: 2,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<EditNodeForm>();

  const watchedTitle = watch('title');
  const watchedContent = watch('content');
  const watchedTags = watch('tags');

  // 노드 데이터 로드 시 폼 초기화
  useEffect(() => {
    if (node) {
      reset({
        title: node.title || '',
        content: node.content || '',
        nodeType: node.node_type || 'Note',
        contentType: node.content_type || 'text',
        tags: node.tags || [],
        isPublic: node.is_public || false
      });
      setTagsInput(node.tags ? node.tags.join(', ') : '');

      // 기존 첨부파일 정보 설정
      if (node.metadata && node.metadata.files) {
        setExistingFiles(node.metadata.files);
      }
    }
  }, [node, reset]);

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagsInput(value);

    // 태그를 배열로 변환 (쉼표로 분리)
    const tagsArray = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    setValue('tags', tagsArray, { shouldValidate: true });
  };

  const onSubmit = async (data: EditNodeForm) => {
    if (!nodeId) return;

    setIsSubmitting(true);

    try {
      // 모든 파일 (기존 + 새로운) 결합
      const allFiles = [...existingFiles, ...newFiles];

      const updateData = {
        title: data.title,
        content: data.content,
        node_type: data.nodeType,
        content_type: data.contentType,
        tags: data.tags,
        is_public: data.isPublic,
        summary: aiData.summary || node?.summary || null,
        metadata: {
          ...node?.metadata,
          files: allFiles,
          updatedAt: new Date().toISOString(),
          ...(allFiles.length > 0 && { hasAttachments: true })
        }
      };

      await knowledgeService.updateNode(nodeId, updateData);

      toast.success('노드가 성공적으로 수정되었습니다!');
      navigate(`/app/knowledge/${nodeId}`);
    } catch (error) {
      console.error('노드 수정 실패:', error);
      toast.error('노드 수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIDataUpdate = (data: { summary?: string; tags?: string[] }) => {
    setAiData(data);

    // AI가 생성한 태그를 기존 태그와 합치기
    if (data.tags && data.tags.length > 0) {
      const currentTags = watchedTags || [];
      const newTags = [...new Set([...currentTags, ...data.tags])]; // 중복 제거
      setValue('tags', newTags);
      setTagsInput(newTags.join(', '));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="text-center">
              <BookOpenIcon className="mx-auto h-24 w-24 text-gray-400" />
              <h2 className="mt-4 text-xl font-medium text-gray-900">노드를 찾을 수 없습니다</h2>
              <p className="mt-2 text-gray-600">
                편집하려는 노드가 존재하지 않거나 접근 권한이 없습니다.
              </p>
              <div className="mt-4 space-x-3">
                <Link
                  to="/app/knowledge"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
                  목록으로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 헤더 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link
                  to={`/app/knowledge/${nodeId}`}
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-1" />
                  노드로 돌아가기
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">노드 편집</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAITools(!showAITools)}
                  className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md transition-colors ${
                    showAITools
                      ? 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  AI 도구
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid || !isDirty}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '저장 중...' : '변경사항 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 편집 영역 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>
              </div>
              <div className="p-6 space-y-6">
                {/* 제목 */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    제목 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    {...register('title', {
                      required: '제목은 필수입니다',
                      minLength: { value: 1, message: '제목은 최소 1글자 이상이어야 합니다' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="노드 제목을 입력하세요"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                {/* 내용 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내용
                  </label>
                  <RichTextEditor
                    content={watchedContent}
                    onChange={(content) => setValue('content', content, { shouldValidate: true })}
                    placeholder="노드 내용을 입력하세요..."
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                  )}
                </div>

                {/* 태그 */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    태그
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={tagsInput}
                    onChange={handleTagsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="태그를 쉼표로 구분하여 입력하세요 (예: 프로그래밍, 파이썬, 개발)"
                  />
                  {watchedTags && watchedTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {watchedTags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 첨부파일 관리 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    첨부파일 관리
                  </label>

                  {/* 기존 파일 목록 */}
                  {existingFiles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">기존 파일</h4>
                      <div className="space-y-2">
                        {existingFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-blue-600">📎</span>
                              <span className="text-sm font-medium text-gray-900">{file.name}</span>
                              <span className="text-xs text-gray-500">({file.type})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                보기
                              </a>
                              <button
                                type="button"
                                onClick={() => setExistingFiles(prev => prev.filter((_, i) => i !== index))}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 새 파일 업로드 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">새 파일 추가</h4>
                    <FileUpload
                      onFileUploaded={(url, fileName, fileType) => {
                        const newFile = {
                          url,
                          name: fileName,
                          type: fileType,
                          uploadedAt: new Date().toISOString()
                        };
                        setNewFiles(prev => [...prev, newFile]);

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
                  </div>

                  {/* 새로 업로드된 파일 목록 */}
                  {newFiles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">새로 추가된 파일</h4>
                      <div className="space-y-2">
                        {newFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-green-600">📎</span>
                              <span className="text-sm font-medium text-gray-900">{file.name}</span>
                              <span className="text-xs text-gray-500">({file.type})</span>
                              <span className="text-xs text-green-600">새 파일</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              제거
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 노드 설정 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">설정</h3>
              </div>
              <div className="p-6 space-y-4">
                {/* 노드 타입 */}
                <div>
                  <label htmlFor="nodeType" className="block text-sm font-medium text-gray-700 mb-2">
                    노드 타입
                  </label>
                  <select
                    id="nodeType"
                    {...register('nodeType')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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

                {/* 콘텐츠 타입 */}
                <div>
                  <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
                    콘텐츠 타입
                  </label>
                  <select
                    id="contentType"
                    {...register('contentType')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="text">텍스트</option>
                    <option value="document">문서</option>
                    <option value="image">이미지</option>
                    <option value="video">비디오</option>
                    <option value="audio">오디오</option>
                    <option value="link">링크</option>
                  </select>
                </div>

                {/* 공개 설정 */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('isPublic')}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">공개 노드</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    공개 노드는 다른 사용자도 볼 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* AI 도구 */}
            {showAITools && (
              <AIEnhancedNode
                title={watchedTitle}
                content={watchedContent}
                onAIDataUpdate={handleAIDataUpdate}
              />
            )}

            {/* AI 요약 표시 */}
            {(aiData.summary || node?.summary) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">AI 요약</h4>
                <p className="text-sm text-blue-800">
                  {aiData.summary || node?.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};