import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  ClockIcon,
  TrophyIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { ChartBarIcon, FireIcon } from '@heroicons/react/24/solid';
import { studyService, type QuizQuestion, type QuizResult } from '../../services/study.service';

interface DetailedQuizResult {
  question: QuizQuestion;
  userResult: QuizResult;
  isCorrect: boolean;
}

export const QuizResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [detailedResults, setDetailedResults] = useState<DetailedQuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadQuizData();
    }
  }, [sessionId]);

  const loadQuizData = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);

      // 병렬로 데이터 로드
      const [sessionData, questionsData, resultsData] = await Promise.all([
        studyService.getStudySession(sessionId),
        studyService.getQuizQuestions(sessionId),
        studyService.getQuizResults(sessionId)
      ]);

      setSession(sessionData);
      setQuestions(questionsData);
      setResults(resultsData);

      // 상세 결과 조합
      const detailed: DetailedQuizResult[] = questionsData.map(question => {
        const userResult = resultsData.find(r => r.question_id === question.id);
        return {
          question,
          userResult: userResult!,
          isCorrect: userResult?.is_correct || false
        };
      }).filter(item => item.userResult); // 결과가 있는 것만

      setDetailedResults(detailed);
    } catch (error) {
      console.error('퀴즈 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const total = detailedResults.length;
    const correct = detailedResults.filter(r => r.isCorrect).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    const totalTime = detailedResults.reduce((sum, r) => sum + (r.userResult.time_taken || 0), 0);
    const avgTime = total > 0 ? totalTime / total : 0;
    const totalPoints = detailedResults.reduce((sum, r) => sum + (r.userResult.points_earned || 0), 0);
    const maxPoints = detailedResults.reduce((sum, r) => sum + (r.question.points || 1), 0);

    return { total, correct, accuracy, totalTime, avgTime, totalPoints, maxPoints };
  };

  const getDifficultyStats = () => {
    const stats = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };

    detailedResults.forEach(result => {
      const difficulty = result.question.difficulty;
      stats[difficulty].total++;
      if (result.isCorrect) {
        stats[difficulty].correct++;
      }
    });

    return stats;
  };

  const getGrade = (accuracy: number) => {
    if (accuracy >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-50' };
    if (accuracy >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
    if (accuracy >= 70) return { grade: 'B+', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (accuracy >= 60) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (accuracy >= 50) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const startWrongAnswerReview = () => {
    const wrongAnswers = detailedResults.filter(r => !r.isCorrect).map(r => r.question.id);
    if (wrongAnswers.length === 0) {
      alert('틀린 문제가 없습니다!');
      return;
    }

    // 틀린 문제만으로 새 퀴즈 세션 생성하거나 복습 모드로 이동
    const questionIds = wrongAnswers.join(',');
    navigate(`/app/study/quiz?review=true&questions=${questionIds}`);
  };

  if (!sessionId) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-600">세션 ID가 필요합니다.</p>
        <Link to="/app/study" className="text-purple-600 hover:text-purple-700">
          학습 활동으로 돌아가기
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-2 text-gray-600">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const stats = getStats();
  const difficultyStats = getDifficultyStats();
  const gradeInfo = getGrade(stats.accuracy);
  const filteredResults = showOnlyWrong ? detailedResults.filter(r => !r.isCorrect) : detailedResults;

  return (
    <div className="max-w-4xl mx-auto p-6">
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
      </div>

      {/* 결과 요약 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="text-center mb-6">
          <TrophyIcon className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">퀴즈 결과</h1>
          <p className="text-gray-600">{session?.title}</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <ChartBarIcon className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-900">{stats.correct}/{stats.total}</div>
            <div className="text-sm text-blue-600">정답</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className={`text-2xl font-bold ${gradeInfo.color}`}>{stats.accuracy.toFixed(1)}%</div>
            <div className="text-sm text-green-600">정답률</div>
          </div>

          <div className={`text-center p-4 rounded-lg ${gradeInfo.bg}`}>
            <div className={`text-2xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</div>
            <div className="text-sm text-gray-600">등급</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">{stats.totalPoints}/{stats.maxPoints}</div>
            <div className="text-sm text-purple-600">점수</div>
          </div>
        </div>

        {/* 시간 정보 */}
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 mb-6">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            총 소요시간: {Math.floor(stats.totalTime / 60)}분 {Math.round(stats.totalTime % 60)}초
          </div>
          <div>
            평균 문제당: {Math.round(stats.avgTime)}초
          </div>
        </div>

        {/* 난이도별 성과 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">난이도별 성과</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(difficultyStats).map(([difficulty, stat]) => (
              <div key={difficulty} className="text-center p-3 border rounded-lg">
                <div className={`text-sm font-medium mb-1 ${
                  difficulty === 'easy' ? 'text-green-600' :
                  difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {difficulty === 'easy' ? '쉬움' : difficulty === 'medium' ? '보통' : '어려움'}
                </div>
                <div className="text-lg font-bold">{stat.correct}/{stat.total}</div>
                <div className="text-xs text-gray-500">
                  {stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={startWrongAnswerReview}
            disabled={detailedResults.filter(r => !r.isCorrect).length === 0}
            className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            틀린 문제 복습
          </button>

          <button
            onClick={() => setShowOnlyWrong(!showOnlyWrong)}
            className={`flex items-center px-4 py-2 rounded-lg ${
              showOnlyWrong
                ? 'bg-gray-200 text-gray-700'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {showOnlyWrong ? '전체 보기' : '틀린 문제만 보기'}
          </button>
        </div>
      </div>

      {/* 문제별 상세 결과 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">
          문제별 결과 {showOnlyWrong && '(틀린 문제만)'}
        </h2>

        {filteredResults.map((result, index) => (
          <div key={result.question.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  result.isCorrect ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {result.isCorrect ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <span className="text-sm text-gray-500">문제 {index + 1}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      result.question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      result.question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.question.difficulty === 'easy' ? '쉬움' :
                       result.question.difficulty === 'medium' ? '보통' : '어려움'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {result.userResult.time_taken}초
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {result.userResult.points_earned || 0}/{result.question.points}점
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-3">{result.question.question}</h3>

              <div className="space-y-2">
                {result.question.options?.map((option, optIndex) => {
                  const isUserAnswer = result.userResult.user_answer === option;
                  const isCorrectAnswer = result.question.correct_answer === option;

                  return (
                    <div key={optIndex} className={`p-3 rounded-lg border ${
                      isCorrectAnswer ? 'border-green-500 bg-green-50' :
                      isUserAnswer && !isCorrectAnswer ? 'border-red-500 bg-red-50' :
                      'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        <div className="flex items-center space-x-2">
                          {isCorrectAnswer && (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          )}
                          {isUserAnswer && !isCorrectAnswer && (
                            <XCircleIcon className="h-4 w-4 text-red-600" />
                          )}
                          {isUserAnswer && (
                            <span className="text-xs text-gray-500">내 답</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {result.question.explanation && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start">
                  <LightBulbIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-blue-900 font-medium mb-1">해설</p>
                    <p className="text-blue-800 text-sm">{result.question.explanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredResults.length === 0 && showOnlyWrong && (
        <div className="text-center py-8">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium text-gray-900">모든 문제를 맞췄습니다! 🎉</p>
          <p className="text-gray-600">정말 훌륭합니다!</p>
        </div>
      )}
    </div>
  );
};