import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  SparklesIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  PrinterIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { knowledgeService } from '../../services/knowledge.service';
import { aiService } from '../../services/ai.service';
import { toast } from 'react-toastify';

interface MemoryNote {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  details: Array<{
    section: string;
    content: string;
    examples?: string[];
    importance: 'high' | 'medium' | 'low';
  }>;
  mnemonics: Array<{
    concept: string;
    technique: string;
    memory_aid: string;
  }>;
  reviewQuestions: Array<{
    question: string;
    answer: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  createdAt: Date;
}

export const MemoryNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<MemoryNote | null>(null);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());

  // URL에서 노드 ID 추출
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nodes = params.get('nodes');
    if (nodes) {
      setNodeIds(nodes.split(','));
    }
  }, [location.search]);

  // 선택된 노드들 데이터 가져오기
  const { data: selectedNodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['memory-notes-nodes', nodeIds],
    queryFn: async () => {
      if (nodeIds.length === 0) return [];
      return Promise.all(nodeIds.map(id => knowledgeService.getNode(id)));
    },
    enabled: nodeIds.length > 0,
  });

  // 암기 노트 생성
  const generateMemoryNote = async () => {
    if (selectedNodes.length === 0) {
      toast.error('노드를 선택해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      // 모든 노드의 내용을 하나로 합치기
      const combinedContent = selectedNodes.map(node =>
        `제목: ${node.title}\n내용: ${node.content || ''}`
      ).join('\n\n');

      const prompt = `
다음 지식 내용들을 바탕으로 체계적인 암기 노트를 작성해주세요. JSON 형태로 응답해주세요.

지식 내용:
${combinedContent}

다음 구조로 작성해주세요:
{
  "title": "암기 노트 제목",
  "summary": "핵심 내용을 3-4문장으로 요약",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "..."],
  "details": [
    {
      "section": "섹션 제목",
      "content": "상세 설명",
      "examples": ["예시1", "예시2"],
      "importance": "high|medium|low"
    }
  ],
  "mnemonics": [
    {
      "concept": "개념명",
      "technique": "기억 기법 종류",
      "memory_aid": "구체적인 암기법"
    }
  ],
  "reviewQuestions": [
    {
      "question": "복습 문제",
      "answer": "정답",
      "difficulty": "easy|medium|hard"
    }
  ]
}

한국어로 작성하고, 실제 학습에 도움이 되도록 구체적이고 실용적으로 만들어주세요.

**중요: 응답은 코드 블록(\`\`\`) 없이 순수 JSON 형태로만 반환해주세요.**
`;

      console.log('🧠 암기 노트 생성 요청:', { nodeCount: selectedNodes.length });

      const response = await aiService.generateResponse(prompt);

      // JSON 응답 파싱 (코드 블록 제거)
      let noteData;
      try {
        // ```json 및 ``` 코드 블록 제거
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/```\s*$/, '');
        }

        noteData = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError, 'Response:', response);
        // JSON 파싱 실패 시 대체 구조 생성
        noteData = {
          title: selectedNodes[0]?.title + ' 암기 노트',
          summary: response.substring(0, 200) + '...',
          keyPoints: ['핵심 내용이 생성되었습니다.'],
          details: [{
            section: '주요 내용',
            content: response,
            examples: [],
            importance: 'high' as const
          }],
          mnemonics: [],
          reviewQuestions: []
        };
      }

      const memoryNote: MemoryNote = {
        id: Date.now().toString(),
        ...noteData,
        createdAt: new Date()
      };

      setGeneratedNote(memoryNote);
      console.log('✅ 암기 노트 생성 완료');
      toast.success('암기 노트가 생성되었습니다!');

    } catch (error) {
      console.error('❌ 암기 노트 생성 실패:', error);
      toast.error('암기 노트 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAnswer = (questionIndex: number) => {
    setShowAnswers(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
  };

  const toggleSectionCompletion = (sectionIndex: number) => {
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionIndex)) {
        newSet.delete(sectionIndex);
      } else {
        newSet.add(sectionIndex);
      }
      return newSet;
    });
  };

  const exportToPDF = () => {
    toast.info('PDF 내보내기 기능은 준비 중입니다.');
  };

  const shareNote = () => {
    if (generatedNote) {
      navigator.clipboard.writeText(`${generatedNote.title}\n\n${generatedNote.summary}`);
      toast.success('암기 노트가 클립보드에 복사되었습니다!');
    }
  };

  if (nodesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">노드 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/study')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              학습 활동으로 돌아가기
            </button>
          </div>

          {generatedNote && (
            <div className="flex items-center gap-2">
              <button
                onClick={shareNote}
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                <ShareIcon className="h-4 w-4 mr-1" />
                공유
              </button>
              <button
                onClick={exportToPDF}
                className="inline-flex items-center px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                내보내기
              </button>
            </div>
          )}
        </div>

        {/* 선택된 노드들 표시 */}
        {selectedNodes.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpenIcon className="h-5 w-5 text-primary-600" />
              선택된 지식 노드 ({selectedNodes.length}개)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedNodes.map((node) => (
                <div key={node.id} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-1">{node.title}</h3>
                  <p className="text-sm text-gray-600">{node.node_type || 'Knowledge'}</p>
                  {node.content && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                      {node.content.substring(0, 100)}...
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!generatedNote && (
              <div className="mt-6 text-center">
                <button
                  onClick={generateMemoryNote}
                  disabled={isGenerating}
                  className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      암기 노트 생성 중...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      AI 암기 노트 생성
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 생성된 암기 노트 */}
        {generatedNote && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* 노트 헤더 */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
              <h1 className="text-2xl font-bold mb-2">{generatedNote.title}</h1>
              <p className="text-primary-100">
                생성일: {generatedNote.createdAt.toLocaleDateString('ko-KR')}
              </p>
            </div>

            <div className="p-6 space-y-8">
              {/* 요약 */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                  핵심 요약
                </h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-gray-800 leading-relaxed">{generatedNote.summary}</p>
                </div>
              </section>

              {/* 핵심 포인트 */}
              {generatedNote.keyPoints.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    🎯 핵심 포인트
                  </h2>
                  <ul className="space-y-2">
                    {generatedNote.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <p className="text-gray-800">{point}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 상세 내용 */}
              {generatedNote.details.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    📚 상세 내용
                  </h2>
                  <div className="space-y-4">
                    {generatedNote.details.map((detail, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className={`p-4 ${
                          detail.importance === 'high' ? 'bg-red-50 border-l-4 border-l-red-500' :
                          detail.importance === 'medium' ? 'bg-yellow-50 border-l-4 border-l-yellow-500' :
                          'bg-gray-50 border-l-4 border-l-gray-500'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{detail.section}</h3>
                            <button
                              onClick={() => toggleSectionCompletion(index)}
                              className={`p-1 rounded ${
                                completedSections.has(index)
                                  ? 'text-green-600 bg-green-100'
                                  : 'text-gray-400 hover:text-green-600'
                              }`}
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          </div>
                          <p className="text-gray-700 leading-relaxed mb-3">{detail.content}</p>
                          {detail.examples && detail.examples.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-800 mb-2">예시:</h4>
                              <ul className="list-disc list-inside space-y-1 text-gray-700">
                                {detail.examples.map((example, exIndex) => (
                                  <li key={exIndex}>{example}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 암기법 */}
              {generatedNote.mnemonics.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    🧠 암기법
                  </h2>
                  <div className="space-y-4">
                    {generatedNote.mnemonics.map((mnemonic, index) => (
                      <div key={index} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h3 className="font-semibold text-purple-900 mb-2">{mnemonic.concept}</h3>
                        <p className="text-sm text-purple-700 mb-2">
                          <span className="font-medium">기법:</span> {mnemonic.technique}
                        </p>
                        <p className="text-purple-800">{mnemonic.memory_aid}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 복습 문제 */}
              {generatedNote.reviewQuestions.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    ❓ 복습 문제
                  </h2>
                  <div className="space-y-4">
                    {generatedNote.reviewQuestions.map((qa, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className={`p-4 ${
                          qa.difficulty === 'hard' ? 'bg-red-50' :
                          qa.difficulty === 'medium' ? 'bg-yellow-50' :
                          'bg-green-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              qa.difficulty === 'hard' ? 'bg-red-200 text-red-800' :
                              qa.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-green-200 text-green-800'
                            }`}>
                              {qa.difficulty === 'hard' ? '어려움' : qa.difficulty === 'medium' ? '보통' : '쉬움'}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 mb-3">{qa.question}</p>
                          <button
                            onClick={() => toggleAnswer(index)}
                            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                          >
                            {showAnswers[index] ? (
                              <>
                                <EyeSlashIcon className="h-4 w-4 mr-1" />
                                답안 숨기기
                              </>
                            ) : (
                              <>
                                <EyeIcon className="h-4 w-4 mr-1" />
                                답안 보기
                              </>
                            )}
                          </button>
                          {showAnswers[index] && (
                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
                              <p className="text-gray-800">{qa.answer}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {selectedNodes.length === 0 && (
          <div className="text-center py-12">
            <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">암기 노트 생성</h2>
            <p className="text-gray-600 mb-4">
              선택한 지식 노드들을 바탕으로 AI가 개인화된 암기 노트를 생성합니다.
            </p>
            <button
              onClick={() => navigate('/app/study')}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              노드 선택하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};