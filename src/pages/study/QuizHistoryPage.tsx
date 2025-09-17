import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  ChartBarIcon,
  TrophyIcon,
  EyeIcon,
  PlayIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { FireIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { studyService, type StudySession } from '../../services/study.service';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface QuizHistoryItem extends StudySession {
  stats?: {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    totalTime: number;
    grade: string;
  };
}

export const QuizHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'accuracy' | 'grade'>('recent');

  useEffect(() => {
    loadQuizHistory();
  }, []);

  const loadQuizHistory = async () => {
    try {
      setLoading(true);
      const sessions = await studyService.getStudySessions('quiz');

      // 각 세션의 통계 정보를 계산
      const historyWithStats = await Promise.all(
        sessions.map(async (session) => {
          try {
            if (session.session_data?.final_stats) {
              const stats = session.session_data.final_stats;
              return {
                ...session,
                stats: {
                  totalQuestions: stats.totalQuestions || 0,
                  correctAnswers: stats.correctAnswers || 0,
                  accuracy: stats.accuracy || 0,
                  totalTime: stats.totalTime || 0,
                  grade: getGrade(stats.accuracy || 0)
                }
              };
            }
            return session;
          } catch (error) {
            console.error(`Failed to load stats for session ${session.id}:`, error);
            return session;
          }
        })
      );

      setQuizHistory(historyWithStats);
    } catch (error) {
      console.error('Failed to load quiz history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrade = (accuracy: number): string => {
    if (accuracy >= 90) return 'A+';
    if (accuracy >= 80) return 'A';
    if (accuracy >= 70) return 'B+';
    if (accuracy >= 60) return 'B';
    if (accuracy >= 50) return 'C';
    return 'D';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'B+':
      case 'B':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'C':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const deleteQuizSession = async (sessionId: string) => {
    if (!confirm('이 퀴즈 세션을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await studyService.deleteStudySession(sessionId);
      setQuizHistory(prev => prev.filter(item => item.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete quiz session:', error);
      alert('퀴즈 세션 삭제에 실패했습니다.');
    }
  };

  const filterAndSortHistory = () => {
    let filtered = [...quizHistory];

    // 필터링
    switch (selectedFilter) {
      case 'completed':
        filtered = filtered.filter(item => item.completed_at);
        break;
      case 'in_progress':
        filtered = filtered.filter(item => !item.completed_at);
        break;
      default:
        break;
    }

    // 정렬
    switch (sortBy) {
      case 'accuracy':
        filtered.sort((a, b) => (b.stats?.accuracy || 0) - (a.stats?.accuracy || 0));
        break;
      case 'grade':
        const gradeOrder = { 'A+': 6, 'A': 5, 'B+': 4, 'B': 3, 'C': 2, 'D': 1 };
        filtered.sort((a, b) => {
          const gradeA = gradeOrder[a.stats?.grade as keyof typeof gradeOrder] || 0;
          const gradeB = gradeOrder[b.stats?.grade as keyof typeof gradeOrder] || 0;
          return gradeB - gradeA;
        });
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return filtered;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}분 ${remainingSeconds}초`;
  };

  const filteredHistory = filterAndSortHistory();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">퀴즈 히스토리를 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
        </div>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ChartBarIcon className="h-8 w-8 text-purple-600 mr-3" />
            퀴즈 히스토리
          </h1>
          <p className="text-gray-600 mt-2">
            지금까지 완료한 퀴즈들의 결과를 확인하고 다시 풀어보세요.
          </p>
        </div>
      </div>

      {/* 필터 및 정렬 옵션 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">필터:</span>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">전체</option>
              <option value="completed">완료됨</option>
              <option value="in_progress">진행 중</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="recent">최신순</option>
              <option value="accuracy">정확도순</option>
              <option value="grade">등급순</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-500">
            총 {filteredHistory.length}개의 퀴즈
          </div>
        </div>
      </div>

      {/* 퀴즈 히스토리 목록 */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">퀴즈 히스토리가 없습니다</h3>
          <p className="text-gray-500 mb-6">
            {selectedFilter === 'all'
              ? '아직 생성된 퀴즈가 없습니다.'
              : '해당 조건에 맞는 퀴즈가 없습니다.'}
          </p>
          <Link
            to="/app/study"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            새 퀴즈 시작하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    {item.completed_at ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                    )}
                    {item.stats && (
                      <span className={`px-2 py-1 text-xs font-medium border rounded-full ${getGradeColor(item.stats.grade)}`}>
                        {item.stats.grade}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ko })}
                    </div>

                    {item.stats && (
                      <>
                        <div className="flex items-center">
                          <TrophyIcon className="h-4 w-4 mr-1" />
                          {item.stats.correctAnswers}/{item.stats.totalQuestions} ({item.stats.accuracy.toFixed(1)}%)
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatTime(item.stats.totalTime)}
                        </div>
                      </>
                    )}

                    <div className="flex items-center">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        진행률: {item.progress}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {item.completed_at && (
                    <button
                      onClick={() => navigate(`/app/study/quiz/results?session=${item.id}`)}
                      className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      결과 보기
                    </button>
                  )}

                  <button
                    onClick={() => deleteQuizSession(item.id)}
                    className="flex items-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    삭제
                  </button>
                </div>
              </div>

              {/* 진행률 바 */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>진행률</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      item.progress === 100 ? 'bg-green-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};