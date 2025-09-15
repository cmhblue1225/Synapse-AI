import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, LightBulbIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { SparklesIcon, TrophyIcon, ChartBarIcon, AcademicCapIcon } from '@heroicons/react/24/solid';
import { studyService } from '../../services/study.service';
import { knowledgeService, type KnowledgeNode } from '../../services/knowledge.service';

interface AIFeedback {
  id: string;
  type: 'strength' | 'improvement' | 'suggestion' | 'warning' | 'insight';
  category: 'content' | 'structure' | 'connections' | 'completeness' | 'accuracy';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestions?: string[];
  relatedConcepts?: string[];
  confidence: number; // 0-100
}

interface KnowledgeAnalysis {
  id: string;
  title: string;
  summary: string;
  overallScore: number;
  categoryScores: {
    content_quality: number;
    structure: number;
    connections: number;
    completeness: number;
    accuracy: number;
  };
  feedbacks: AIFeedback[];
  recommendations: {
    immediate: string[];
    short_term: string[];
    long_term: string[];
  };
  learningPath: {
    current_level: 'beginner' | 'intermediate' | 'advanced';
    next_steps: string[];
    estimated_time: string;
  };
}

export const AIFeedbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const nodeIds = searchParams.get('nodes')?.split(',') || [];

  const [selectedNodes, setSelectedNodes] = useState<KnowledgeNode[]>([]);
  const [analysis, setAnalysis] = useState<KnowledgeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFeedbackType, setSelectedFeedbackType] = useState<AIFeedback['type'] | 'all'>('all');
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSelectedNodes();
  }, []);

  const loadSelectedNodes = async () => {
    if (nodeIds.length > 0) {
      setIsLoading(true);
      try {
        const nodes = await Promise.all(
          nodeIds.map(id => knowledgeService.getNode(id))
        );
        setSelectedNodes(nodes.filter(Boolean));
      } catch (error) {
        console.error('Failed to load nodes:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const generateAIFeedback = async () => {
    if (selectedNodes.length === 0) return;

    setIsAnalyzing(true);
    try {
      // Create study session
      const session = await studyService.createStudySession({
        session_type: 'ai_feedback',
        title: `AI 피드백 - ${selectedNodes.map(n => n.title).join(', ')}`,
        description: 'AI가 분석한 지식 노드 피드백',
        node_ids: selectedNodes.map(n => n.id),
        session_data: {
          analysis_settings: {
            depth: 'comprehensive',
            focus_areas: ['content', 'structure', 'connections'],
            provide_suggestions: true,
            learning_path: true
          }
        },
        progress: 0
      });

      setSessionId(session.id);

      // Generate AI analysis
      const generatedAnalysis = await analyzeNodesWithAI(selectedNodes);
      setAnalysis(generatedAnalysis);

    } catch (error) {
      console.error('Failed to generate AI feedback:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeNodesWithAI = async (nodes: KnowledgeNode[]): Promise<KnowledgeAnalysis> => {
    const feedbacks: AIFeedback[] = [];

    // Analyze each node individually
    for (const node of nodes) {
      const nodeFeedbacks = await analyzeIndividualNode(node);
      feedbacks.push(...nodeFeedbacks);
    }

    // Analyze relationships between nodes
    const relationshipFeedbacks = await analyzeNodeRelationships(nodes);
    feedbacks.push(...relationshipFeedbacks);

    // Calculate overall scores
    const categoryScores = calculateCategoryScores(feedbacks);
    const overallScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / Object.keys(categoryScores).length;

    // Generate recommendations
    const recommendations = generateRecommendations(feedbacks, overallScore);

    // Determine learning path
    const learningPath = determineLearningPath(overallScore, nodes);

    return {
      id: crypto.randomUUID(),
      title: `AI 분석 결과 - ${nodes.map(n => n.title).join(', ')}`,
      summary: generateAnalysisSummary(overallScore, feedbacks.length),
      overallScore,
      categoryScores,
      feedbacks,
      recommendations,
      learningPath
    };
  };

  const analyzeIndividualNode = async (node: KnowledgeNode): Promise<AIFeedback[]> => {
    const feedbacks: AIFeedback[] = [];
    const content = node.content || '';
    const title = node.title;

    // Content quality analysis
    if (content.length < 100) {
      feedbacks.push({
        id: crypto.randomUUID(),
        type: 'improvement',
        category: 'content',
        title: '내용 확장 필요',
        message: `"${title}" 노드의 내용이 너무 간단합니다. 더 자세한 설명과 예시를 추가하는 것이 좋겠습니다.`,
        priority: 'high',
        actionable: true,
        suggestions: [
          '구체적인 예시 추가',
          '상세한 설명 보완',
          '관련 자료 링크 포함'
        ],
        confidence: 85
      });
    } else if (content.length > 2000) {
      feedbacks.push({
        id: crypto.randomUUID(),
        type: 'suggestion',
        category: 'structure',
        title: '내용 구조화 권장',
        message: `"${title}" 노드의 내용이 매우 길어서 읽기 어려울 수 있습니다. 여러 개의 작은 노드로 분할을 고려해보세요.`,
        priority: 'medium',
        actionable: true,
        suggestions: [
          '주제별로 노드 분할',
          '핵심 요약 추가',
          '목차 구조 도입'
        ],
        confidence: 75
      });
    }

    // Tag analysis
    if (!node.tags || node.tags.length === 0) {
      feedbacks.push({
        id: crypto.randomUUID(),
        type: 'improvement',
        category: 'structure',
        title: '태그 추가 필요',
        message: `"${title}" 노드에 태그가 없어 분류와 검색이 어려울 수 있습니다.`,
        priority: 'medium',
        actionable: true,
        suggestions: [
          '주제 관련 키워드 태그 추가',
          '난이도 표시 태그 포함',
          '카테고리 태그 설정'
        ],
        confidence: 90
      });
    }

    // Content depth analysis
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) {
      feedbacks.push({
        id: crypto.randomUUID(),
        type: 'improvement',
        category: 'completeness',
        title: '내용 깊이 부족',
        message: `"${title}" 노드의 내용이 표면적입니다. 더 깊이 있는 분석과 설명이 필요합니다.`,
        priority: 'high',
        actionable: true,
        suggestions: [
          '개념의 배경 설명 추가',
          '실제 적용 사례 포함',
          '관련 이론 연결'
        ],
        confidence: 80
      });
    }

    // Positive feedback for good content
    if (content.length >= 200 && content.length <= 1000 && sentences.length >= 5) {
      feedbacks.push({
        id: crypto.randomUUID(),
        type: 'strength',
        category: 'content',
        title: '우수한 내용 구성',
        message: `"${title}" 노드는 적절한 분량과 구조를 가지고 있어 이해하기 쉽게 작성되었습니다.`,
        priority: 'low',
        actionable: false,
        confidence: 95
      });
    }

    return feedbacks;
  };

  const analyzeNodeRelationships = async (nodes: KnowledgeNode[]): Promise<AIFeedback[]> => {
    const feedbacks: AIFeedback[] = [];

    if (nodes.length === 1) {
      feedbacks.push({
        id: crypto.randomUUID(),
        type: 'suggestion',
        category: 'connections',
        title: '관련 노드 연결 권장',
        message: '단일 노드보다는 관련된 여러 노드를 연결하여 분석하면 더 깊이 있는 인사이트를 얻을 수 있습니다.',
        priority: 'medium',
        actionable: true,
        suggestions: [
          '관련 개념 노드 추가',
          '상위/하위 개념 연결',
          '대조되는 개념과의 비교'
        ],
        confidence: 70
      });
    }

    // Check for common themes across nodes
    const allTags = nodes.flatMap(node => node.tags || []);
    const tagFrequency = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonTags = Object.entries(tagFrequency)
      .filter(([_, count]) => count >= 2)
      .map(([tag, _]) => tag);

    if (commonTags.length > 0) {
      feedbacks.push({
        id: crypto.randomUUID(),
        type: 'insight',
        category: 'connections',
        title: '공통 주제 발견',
        message: `선택한 노드들 사이에 공통 주제가 발견되었습니다: ${commonTags.join(', ')}`,
        priority: 'medium',
        actionable: false,
        relatedConcepts: commonTags,
        confidence: 85
      });
    }

    return feedbacks;
  };

  const calculateCategoryScores = (feedbacks: AIFeedback[]): KnowledgeAnalysis['categoryScores'] => {
    const categories = ['content_quality', 'structure', 'connections', 'completeness', 'accuracy'] as const;
    const scores: Record<string, number> = {};

    categories.forEach(category => {
      const categoryFeedbacks = feedbacks.filter(f => f.category === category.replace('_', ''));
      const improvements = categoryFeedbacks.filter(f => f.type === 'improvement').length;
      const strengths = categoryFeedbacks.filter(f => f.type === 'strength').length;

      // Simple scoring: start with 70, add for strengths, subtract for improvements
      let score = 70;
      score += strengths * 10;
      score -= improvements * 15;

      scores[category] = Math.max(0, Math.min(100, score));
    });

    return scores as KnowledgeAnalysis['categoryScores'];
  };

  const generateRecommendations = (feedbacks: AIFeedback[], overallScore: number): KnowledgeAnalysis['recommendations'] => {
    const highPriorityFeedbacks = feedbacks.filter(f => f.priority === 'high' && f.actionable);
    const mediumPriorityFeedbacks = feedbacks.filter(f => f.priority === 'medium' && f.actionable);

    return {
      immediate: highPriorityFeedbacks.slice(0, 3).map(f => f.suggestions?.[0] || f.title),
      short_term: mediumPriorityFeedbacks.slice(0, 3).map(f => f.suggestions?.[0] || f.title),
      long_term: [
        '지식 네트워크 확장하기',
        '정기적인 내용 업데이트',
        '다른 학습자와 지식 공유'
      ]
    };
  };

  const determineLearningPath = (overallScore: number, nodes: KnowledgeNode[]): KnowledgeAnalysis['learningPath'] => {
    let currentLevel: 'beginner' | 'intermediate' | 'advanced';
    let nextSteps: string[];
    let estimatedTime: string;

    if (overallScore < 60) {
      currentLevel = 'beginner';
      nextSteps = [
        '기본 개념 정리 및 보완',
        '핵심 용어 정의 명확화',
        '예시와 설명 추가'
      ];
      estimatedTime = '2-3주';
    } else if (overallScore < 80) {
      currentLevel = 'intermediate';
      nextSteps = [
        '개념 간 연결 관계 강화',
        '실제 적용 사례 추가',
        '심화 내용 탐구'
      ];
      estimatedTime = '3-4주';
    } else {
      currentLevel = 'advanced';
      nextSteps = [
        '지식 체계 최적화',
        '새로운 관점과 이론 탐구',
        '다른 영역과의 융합 시도'
      ];
      estimatedTime = '4-6주';
    }

    return { current_level: currentLevel, next_steps: nextSteps, estimated_time: estimatedTime };
  };

  const generateAnalysisSummary = (overallScore: number, feedbackCount: number): string => {
    if (overallScore >= 80) {
      return `우수한 지식 구조를 가지고 있습니다. ${feedbackCount}개의 인사이트를 통해 더욱 발전시킬 수 있습니다.`;
    } else if (overallScore >= 60) {
      return `양호한 지식 기반을 가지고 있지만, ${feedbackCount}개의 개선점이 있습니다.`;
    } else {
      return `지식 기반 구축이 필요합니다. ${feedbackCount}개의 중요한 개선 사항을 확인하세요.`;
    }
  };

  const saveAnalysis = async () => {
    if (!analysis || !sessionId) return;

    try {
      await studyService.updateStudySession(sessionId, {
        progress: 100,
        completed_at: new Date().toISOString(),
        session_data: {
          ai_analysis: analysis
        }
      });
    } catch (error) {
      console.error('Failed to save analysis:', error);
    }
  };

  const getFeedbackIcon = (type: AIFeedback['type']) => {
    switch (type) {
      case 'strength': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'improvement': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'suggestion': return <LightBulbIcon className="h-5 w-5 text-blue-600" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'insight': return <InformationCircleIcon className="h-5 w-5 text-purple-600" />;
    }
  };

  const getFeedbackBgColor = (type: AIFeedback['type']) => {
    switch (type) {
      case 'strength': return 'bg-green-50 border-green-200';
      case 'improvement': return 'bg-red-50 border-red-200';
      case 'suggestion': return 'bg-blue-50 border-blue-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'insight': return 'bg-purple-50 border-purple-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">AI 피드백을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const filteredFeedbacks = analysis?.feedbacks.filter(
    feedback => selectedFeedbackType === 'all' || feedback.type === selectedFeedbackType
  ) || [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/app/study"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              학습 활동으로 돌아가기
            </Link>
          </div>

          {analysis && (
            <button
              onClick={saveAnalysis}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            >
              분석 결과 저장
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!analysis && !isAnalyzing ? (
        <div className="text-center py-12">
          <SparklesIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI 피드백 생성</h3>
          <p className="text-gray-600 mb-6">AI가 선택한 지식 노드를 분석하여 개선점과 인사이트를 제공합니다.</p>

          {selectedNodes.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">선택된 노드 ({selectedNodes.length}개)</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedNodes.map(node => (
                  <span
                    key={node.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {node.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={generateAIFeedback}
            disabled={selectedNodes.length === 0 || isAnalyzing}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                AI 분석 중...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5 mr-2" />
                AI 피드백 받기
              </>
            )}
          </button>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Analysis Overview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{analysis.title}</h2>
              <div className="flex items-center space-x-2">
                <TrophyIcon className="h-6 w-6 text-yellow-500" />
                <span className="text-2xl font-bold text-gray-900">{analysis.overallScore}점</span>
              </div>
            </div>
            <p className="text-gray-600 mb-6">{analysis.summary}</p>

            {/* Category Scores */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              {Object.entries(analysis.categoryScores).map(([category, score]) => (
                <div key={category} className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{score}</div>
                  <div className="text-xs text-gray-600">
                    {category === 'content_quality' ? '내용 품질' :
                     category === 'structure' ? '구조' :
                     category === 'connections' ? '연결성' :
                     category === 'completeness' ? '완성도' : '정확성'}
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Learning Path */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">학습 경로</h4>
              <div className="flex items-center space-x-4 mb-2">
                <span className={`
                  px-2 py-1 rounded text-sm font-medium
                  ${analysis.learningPath.current_level === 'beginner' ? 'bg-red-100 text-red-800' :
                    analysis.learningPath.current_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'}
                `}>
                  {analysis.learningPath.current_level === 'beginner' ? '초급' :
                   analysis.learningPath.current_level === 'intermediate' ? '중급' : '고급'}
                </span>
                <span className="text-sm text-gray-600">예상 소요시간: {analysis.learningPath.estimated_time}</span>
              </div>
              <div className="text-sm text-gray-600">
                다음 단계: {analysis.learningPath.next_steps.join(', ')}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">즉시 개선</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {analysis.recommendations.immediate.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">단기 계획</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {analysis.recommendations.short_term.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">장기 비전</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {analysis.recommendations.long_term.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feedback Filter */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">피드백 필터:</label>
            <select
              value={selectedFeedbackType}
              onChange={(e) => setSelectedFeedbackType(e.target.value as AIFeedback['type'] | 'all')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">전체</option>
              <option value="strength">장점</option>
              <option value="improvement">개선점</option>
              <option value="suggestion">제안</option>
              <option value="insight">인사이트</option>
            </select>
            <span className="text-sm text-gray-500">({filteredFeedbacks.length}개)</span>
          </div>

          {/* Feedback List */}
          <div className="space-y-4">
            {filteredFeedbacks.map(feedback => (
              <div
                key={feedback.id}
                className={`border rounded-lg p-4 ${getFeedbackBgColor(feedback.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getFeedbackIcon(feedback.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{feedback.title}</h4>
                        <span className={`
                          px-2 py-1 rounded text-xs font-medium
                          ${feedback.priority === 'high' ? 'bg-red-100 text-red-800' :
                            feedback.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'}
                        `}>
                          {feedback.priority === 'high' ? '높음' :
                           feedback.priority === 'medium' ? '보통' : '낮음'}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{feedback.message}</p>

                      {feedback.suggestions && feedback.suggestions.length > 0 && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-600 mb-1">제안사항:</p>
                          <ul className="text-sm text-gray-600 ml-4 space-y-1">
                            {feedback.suggestions.map((suggestion, index) => (
                              <li key={index}>• {suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feedback.relatedConcepts && feedback.relatedConcepts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {feedback.relatedConcepts.map((concept, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              #{concept}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 ml-4">
                    신뢰도: {feedback.confidence}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredFeedbacks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              선택한 필터에 해당하는 피드백이 없습니다.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};