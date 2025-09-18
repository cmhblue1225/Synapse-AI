import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ArrowLeftIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  BeakerIcon,
  ChartBarIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { MultiSelectNodes } from '../../components/MultiSelectNodes';
import { knowledgeService, type KnowledgeNode } from '../../services/knowledge.service';
import { studyService } from '../../services/study.service';

type StudyActivityType =
  | 'memory_notes'
  | 'flashcards'
  | 'quiz'
  | 'concept_map'
  | 'ai_feedback';

interface StudyActivity {
  id: StudyActivityType;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  requiresMultipleNodes?: boolean;
  minNodes?: number;
  maxNodes?: number;
}

export const StudyActivitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<StudyActivityType | null>(null);

  // URL에서 초기 노드 선택값 가져오기
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nodeIds = params.get('nodes');
    if (nodeIds) {
      setSelectedNodes(nodeIds.split(','));
    }
  }, [location.search]);

  // 선택된 노드들의 정보 가져오기
  const { data: selectedNodesData = [] } = useQuery({
    queryKey: ['selected-nodes', selectedNodes],
    queryFn: async () => {
      if (selectedNodes.length === 0) return [];
      return Promise.all(
        selectedNodes.map(nodeId => knowledgeService.getNode(nodeId))
      );
    },
    enabled: selectedNodes.length > 0,
  });

  // 최근 학습 활동 가져오기
  const { data: recentSessions = [] } = useQuery({
    queryKey: ['recent-study-sessions'],
    queryFn: () => studyService.getRecentStudySessions(5),
    refetchInterval: 30000, // 30초마다 갱신
  });

  // 학습 통계 가져오기
  const { data: studyStats } = useQuery({
    queryKey: ['study-statistics'],
    queryFn: () => studyService.getStudyStatistics(),
    refetchInterval: 60000, // 1분마다 갱신
  });

  const studyActivities: StudyActivity[] = [
    {
      id: 'memory_notes',
      title: '암기 노트',
      description: '선택한 지식을 체계적으로 정리한 암기용 노트를 AI가 생성합니다.',
      icon: BookOpenIcon,
      color: 'bg-blue-500',
      requiresMultipleNodes: false,
      minNodes: 1,
      maxNodes: 5,
    },
    {
      id: 'flashcards',
      title: '플래시카드',
      description: '핵심 개념을 문제-답변 형태의 플래시카드로 만들어 반복 학습하세요.',
      icon: BoltIcon,
      color: 'bg-yellow-500',
      requiresMultipleNodes: false,
      minNodes: 1,
      maxNodes: 10,
    },
    {
      id: 'quiz',
      title: '퀴즈 생성',
      description: '다양한 형태의 문제를 자동 생성하여 학습 효과를 확인하세요.',
      icon: AcademicCapIcon,
      color: 'bg-green-500',
      requiresMultipleNodes: false,
      minNodes: 1,
      maxNodes: 8,
    },
    {
      id: 'concept_map',
      title: '개념 맵',
      description: '지식들 간의 관계를 시각적 마인드맵으로 구성합니다.',
      icon: BeakerIcon,
      color: 'bg-indigo-500',
      requiresMultipleNodes: true,
      minNodes: 3,
      maxNodes: 12,
    },
    {
      id: 'ai_feedback',
      title: 'AI 피드백',
      description: '선택한 지식에 대한 AI의 전문적인 분석과 학습 조언을 받아보세요.',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-pink-500',
      requiresMultipleNodes: false,
      minNodes: 1,
      maxNodes: 3,
    },
  ];

  const handleActivitySelect = (activityId: StudyActivityType) => {
    const activity = studyActivities.find(a => a.id === activityId);
    if (!activity) return;

    // 노드 수 검증
    if (selectedNodes.length < (activity.minNodes || 1)) {
      alert(`이 활동은 최소 ${activity.minNodes}개의 노드가 필요합니다.`);
      return;
    }

    if (selectedNodes.length > (activity.maxNodes || 10)) {
      alert(`이 활동은 최대 ${activity.maxNodes}개의 노드만 선택할 수 있습니다.`);
      return;
    }

    // 각 활동별 페이지로 이동
    const nodeIds = selectedNodes.join(',');
    switch (activityId) {
      case 'memory_notes':
        navigate(`/app/study/memory-notes?nodes=${nodeIds}`);
        break;
      case 'flashcards':
        navigate(`/app/study/flashcards?nodes=${nodeIds}`);
        break;
      case 'quiz':
        navigate(`/app/study/quiz?nodes=${nodeIds}`);
        break;
      case 'concept_map':
        navigate(`/app/study/concept-map?nodes=${nodeIds}`);
        break;
      case 'ai_feedback':
        navigate(`/app/study/ai-feedback?nodes=${nodeIds}`);
        break;
    }
  };

  const getActivityAvailability = (activity: StudyActivity) => {
    const nodeCount = selectedNodes.length;
    const minNodes = activity.minNodes || 1;
    const maxNodes = activity.maxNodes || 10;

    if (nodeCount < minNodes) {
      return {
        available: false,
        message: `최소 ${minNodes}개의 노드가 필요합니다`
      };
    }

    if (nodeCount > maxNodes) {
      return {
        available: false,
        message: `최대 ${maxNodes}개의 노드까지 선택 가능합니다`
      };
    }

    return {
      available: true,
      message: ''
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/knowledge')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              지식 관리로 돌아가기
            </button>
          </div>
        </div>

        {/* 학습 통계 대시보드 */}
        {studyStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ChartBarIcon className="h-6 w-6 text-indigo-600" />
              학습 현황 대시보드
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* 총 학습 세션 */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">총 학습 세션</p>
                    <p className="text-3xl font-bold">{studyStats.totalSessions || 0}</p>
                  </div>
                  <BookOpenIcon className="h-8 w-8 text-blue-200" />
                </div>
              </div>

              {/* 평균 점수 */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">평균 점수</p>
                    <p className="text-3xl font-bold">{studyStats.averageScore || 0}%</p>
                  </div>
                  <TrophyIcon className="h-8 w-8 text-green-200" />
                </div>
              </div>

              {/* 학습 시간 */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">총 학습 시간</p>
                    <p className="text-3xl font-bold">{Math.round((studyStats.totalTime || 0) / 60)}분</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-purple-200" />
                </div>
              </div>

              {/* 연속 학습 일수 */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">연속 학습</p>
                    <p className="text-3xl font-bold">{studyStats.streakDays || 0}일</p>
                  </div>
                  <FireIcon className="h-8 w-8 text-orange-200" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 노드 선택 패널 */}
          <div className="lg:col-span-2">
            <MultiSelectNodes
              selectedNodes={selectedNodes}
              onSelectionChange={setSelectedNodes}
              maxSelections={15}
              showActions={true}
            />
          </div>

          {/* 학습 활동 패널 */}
          <div className="space-y-6">
            {/* 선택된 노드 요약 */}
            {selectedNodesData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-primary-600" />
                  선택된 노드
                </h3>
                <div className="space-y-3">
                  {selectedNodesData.map((node) => (
                    <div key={node.id} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {node.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {node.node_type || 'Knowledge'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 학습 활동 메뉴 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-primary-600" />
                학습 활동 선택
              </h3>

              <div className="space-y-3">
                {studyActivities.map((activity) => {
                  const availability = getActivityAvailability(activity);
                  const IconComponent = activity.icon;

                  return (
                    <button
                      key={activity.id}
                      onClick={() => availability.available && handleActivitySelect(activity.id)}
                      disabled={!availability.available}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        availability.available
                          ? 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 ${activity.color} rounded-lg flex items-center justify-center ${
                          !availability.available ? 'opacity-50' : ''
                        }`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${
                            availability.available ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {activity.title}
                          </h4>
                          <p className={`text-xs mt-1 ${
                            availability.available ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {activity.description}
                          </p>
                          {!availability.available && (
                            <p className="text-xs text-red-500 mt-2">
                              {availability.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 퀴즈 히스토리 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-primary-600" />
                퀴즈 히스토리
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                지금까지 완료한 퀴즈들의 결과를 확인하고 복습해보세요.
              </p>
              <button
                onClick={() => navigate('/app/study/quiz/history')}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
              >
                <ChartBarIcon className="h-4 w-4" />
                퀴즈 히스토리 보기
              </button>
            </div>

            {/* 최근 학습 활동 */}
            {recentSessions.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-gray-500" />
                  최근 학습 활동
                </h3>
                <div className="space-y-3">
                  {recentSessions.map((session: any, index: number) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => {
                        if (session.session_type === 'quiz') {
                          navigate(`/app/study/quiz/results?session=${session.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          session.progress === 100 ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {session.title || `${session.session_type} 세션`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.created_at).toLocaleDateString('ko-KR')} •
                            {session.progress === 100 ? ' 완료' : ` ${session.progress}% 진행`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.session_type === 'quiz' && session.progress === 100 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            점수 보기
                          </span>
                        )}
                        {session.progress === 100 && (
                          <TrophyIcon className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 모든 활동 보기 링크 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => navigate('/app/study/quiz/history')}
                    className="w-full text-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    모든 학습 기록 보기 →
                  </button>
                </div>
              </div>
            )}

            {/* 도움말 */}
            {selectedNodes.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-medium text-blue-900 mb-2">
                  🎯 시작하는 방법
                </h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. 왼쪽에서 학습하고 싶은 지식 노드를 선택하세요</li>
                  <li>2. 원하는 학습 활동을 선택하세요</li>
                  <li>3. AI가 개인화된 학습 자료를 생성합니다</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};