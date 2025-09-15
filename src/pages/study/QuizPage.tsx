import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, CheckIcon, XMarkIcon, ClockIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { TrophyIcon, FireIcon, LightBulbIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { studyService, type QuizResult } from '../../services/study.service';
import { knowledgeService, type KnowledgeNode } from '../../services/knowledge.service';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // in seconds
  category: string;
  tags: string[];
}

interface QuizState {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  userAnswers: (number | null)[];
  selectedAnswer: number | null;
  showResult: boolean;
  timeLeft: number;
  startTime: number;
  isTimerActive: boolean;
  isCompleted: boolean;
}

interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number;
  averageTime: number;
  accuracy: number;
  scoreByDifficulty: {
    easy: { correct: number; total: number };
    medium: { correct: number; total: number };
    hard: { correct: number; total: number };
  };
}

export const QuizPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const nodeIds = searchParams.get('nodes')?.split(',') || [];

  const [selectedNodes, setSelectedNodes] = useState<KnowledgeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    selectedAnswer: null,
    showResult: false,
    timeLeft: 0,
    startTime: 0,
    isTimerActive: false,
    isCompleted: false
  });

  const [quizStats, setQuizStats] = useState<QuizStats>({
    totalQuestions: 0,
    correctAnswers: 0,
    totalTime: 0,
    averageTime: 0,
    accuracy: 0,
    scoreByDifficulty: {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 }
    }
  });

  useEffect(() => {
    loadSelectedNodes();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizState.isTimerActive && quizState.timeLeft > 0) {
      timer = setInterval(() => {
        setQuizState(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1
        }));
      }, 1000);
    } else if (quizState.timeLeft === 0 && quizState.isTimerActive) {
      // Time up - auto submit current answer
      handleTimeUp();
    }
    return () => clearInterval(timer);
  }, [quizState.isTimerActive, quizState.timeLeft]);

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

  const generateQuiz = async () => {
    if (selectedNodes.length === 0) return;

    setIsGenerating(true);
    try {
      // Create study session
      const session = await studyService.createStudySession({
        session_type: 'quiz',
        title: `퀴즈 - ${selectedNodes.map(n => n.title).join(', ')}`,
        description: 'AI가 생성한 퀴즈',
        node_ids: selectedNodes.map(n => n.id),
        session_data: {
          quiz_settings: {
            total_questions: 20,
            time_per_question: 60,
            difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
            question_types: ['multiple_choice', 'true_false', 'fill_blank']
          }
        },
        progress: 0
      });

      setSessionId(session.id);

      // Generate quiz questions
      const questions = await generateQuizQuestions(selectedNodes);

      setQuizState({
        questions,
        currentQuestionIndex: 0,
        userAnswers: new Array(questions.length).fill(null),
        selectedAnswer: null,
        showResult: false,
        timeLeft: questions[0]?.timeLimit || 60,
        startTime: Date.now(),
        isTimerActive: false,
        isCompleted: false
      });

    } catch (error) {
      console.error('Failed to generate quiz:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQuizQuestions = async (nodes: KnowledgeNode[]): Promise<QuizQuestion[]> => {
    const questions: QuizQuestion[] = [];
    const totalQuestions = 20;
    const questionsPerNode = Math.ceil(totalQuestions / nodes.length);

    for (const node of nodes) {
      const nodeQuestions = await generateQuestionsForNode(node, questionsPerNode);
      questions.push(...nodeQuestions);
    }

    // Shuffle questions
    return questions.sort(() => Math.random() - 0.5).slice(0, totalQuestions);
  };

  const generateQuestionsForNode = async (node: KnowledgeNode, count: number): Promise<QuizQuestion[]> => {
    const questions: QuizQuestion[] = [];
    const content = node.content || '';
    const title = node.title;

    for (let i = 0; i < count; i++) {
      const questionTypes = ['multiple_choice', 'true_false'];
      const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

      let question: QuizQuestion;

      if (questionType === 'multiple_choice') {
        question = generateMultipleChoiceQuestion(node, difficulty);
      } else {
        question = generateTrueFalseQuestion(node, difficulty);
      }

      questions.push(question);
    }

    return questions;
  };

  const generateMultipleChoiceQuestion = (node: KnowledgeNode, difficulty: 'easy' | 'medium' | 'hard'): QuizQuestion => {
    const content = node.content || '';
    const title = node.title;

    // Generate question based on difficulty
    let question: string;
    let correctOption: string;
    let distractors: string[];

    switch (difficulty) {
      case 'easy':
        question = `${title}에 대한 설명으로 올바른 것은?`;
        correctOption = content.substring(0, 100) + '...';
        distractors = [
          '잘못된 설명 1...',
          '잘못된 설명 2...',
          '잘못된 설명 3...'
        ];
        break;
      case 'medium':
        question = `${title}의 핵심 특징은 무엇인가요?`;
        correctOption = `주요 특징: ${content.substring(50, 150)}...`;
        distractors = [
          '부정확한 특징 1...',
          '부정확한 특징 2...',
          '부정확한 특징 3...'
        ];
        break;
      case 'hard':
        question = `${title}를 다른 개념과 비교했을 때의 차이점은?`;
        correctOption = `차이점: ${content.substring(100, 200)}...`;
        distractors = [
          '잘못된 비교 1...',
          '잘못된 비교 2...',
          '잘못된 비교 3...'
        ];
        break;
    }

    const options = [correctOption, ...distractors].sort(() => Math.random() - 0.5);
    const correctAnswer = options.indexOf(correctOption);

    return {
      id: crypto.randomUUID(),
      question,
      options,
      correctAnswer,
      explanation: `정답: ${correctOption}`,
      difficulty,
      timeLimit: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
      category: node.node_type,
      tags: node.tags || []
    };
  };

  const generateTrueFalseQuestion = (node: KnowledgeNode, difficulty: 'easy' | 'medium' | 'hard'): QuizQuestion => {
    const content = node.content || '';
    const title = node.title;

    const isTrue = Math.random() > 0.5;

    let statement: string;
    if (isTrue) {
      statement = `${title}에 대한 다음 설명이 올바르다: ${content.substring(0, 150)}...`;
    } else {
      statement = `${title}에 대한 다음 설명이 올바르다: 잘못된 설명입니다...`;
    }

    return {
      id: crypto.randomUUID(),
      question: statement,
      options: ['참 (True)', '거짓 (False)'],
      correctAnswer: isTrue ? 0 : 1,
      explanation: isTrue ? '이 설명은 올바른 설명입니다.' : '이 설명은 틀린 설명입니다.',
      difficulty,
      timeLimit: difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60,
      category: node.node_type,
      tags: node.tags || []
    };
  };

  const startQuiz = () => {
    if (quizState.questions.length > 0) {
      setQuizState(prev => ({
        ...prev,
        isTimerActive: true,
        startTime: Date.now(),
        timeLeft: prev.questions[0].timeLimit
      }));
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (!quizState.showResult) {
      setQuizState(prev => ({
        ...prev,
        selectedAnswer: answerIndex
      }));
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = quizState.selectedAnswer === currentQuestion.correctAnswer;
    const timeTaken = (Date.now() - quizState.startTime) / 1000;

    // Update user answers
    const newUserAnswers = [...quizState.userAnswers];
    newUserAnswers[quizState.currentQuestionIndex] = quizState.selectedAnswer;

    // Save quiz result
    if (sessionId) {
      try {
        await studyService.createQuizResults([{
          session_id: sessionId,
          question: currentQuestion.question,
          user_answer: currentQuestion.options[quizState.selectedAnswer || 0],
          correct_answer: currentQuestion.options[currentQuestion.correctAnswer],
          is_correct: isCorrect,
          time_taken: Math.round(timeTaken),
          difficulty: currentQuestion.difficulty
        }]);
      } catch (error) {
        console.error('Failed to save quiz result:', error);
      }
    }

    setQuizState(prev => ({
      ...prev,
      userAnswers: newUserAnswers,
      showResult: true,
      isTimerActive: false
    }));
  };

  const handleNextQuestion = () => {
    const nextIndex = quizState.currentQuestionIndex + 1;

    if (nextIndex >= quizState.questions.length) {
      // Quiz completed
      completeQuiz();
    } else {
      const nextQuestion = quizState.questions[nextIndex];
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: nextIndex,
        selectedAnswer: null,
        showResult: false,
        timeLeft: nextQuestion.timeLimit,
        isTimerActive: true,
        startTime: Date.now()
      }));
    }
  };

  const handleTimeUp = () => {
    if (!quizState.showResult) {
      // Auto submit with no answer
      setQuizState(prev => ({
        ...prev,
        selectedAnswer: null,
        showResult: true,
        isTimerActive: false
      }));
    }
  };

  const completeQuiz = async () => {
    // Calculate stats
    const stats = calculateQuizStats();
    setQuizStats(stats);

    // Update session
    if (sessionId) {
      try {
        await studyService.updateStudySession(sessionId, {
          progress: 100,
          completed_at: new Date().toISOString(),
          session_data: {
            ...quizState,
            final_stats: stats
          }
        });
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    }

    setQuizState(prev => ({
      ...prev,
      isCompleted: true,
      isTimerActive: false
    }));
  };

  const calculateQuizStats = (): QuizStats => {
    let correctAnswers = 0;
    let totalTime = 0;
    const scoreByDifficulty = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 }
    };

    quizState.questions.forEach((question, index) => {
      const userAnswer = quizState.userAnswers[index];
      const isCorrect = userAnswer === question.correctAnswer;

      if (isCorrect) correctAnswers++;

      scoreByDifficulty[question.difficulty].total++;
      if (isCorrect) {
        scoreByDifficulty[question.difficulty].correct++;
      }
    });

    return {
      totalQuestions: quizState.questions.length,
      correctAnswers,
      totalTime,
      averageTime: totalTime / quizState.questions.length,
      accuracy: (correctAnswers / quizState.questions.length) * 100,
      scoreByDifficulty
    };
  };

  const resetQuiz = () => {
    setQuizState({
      questions: [],
      currentQuestionIndex: 0,
      userAnswers: [],
      selectedAnswer: null,
      showResult: false,
      timeLeft: 0,
      startTime: 0,
      isTimerActive: false,
      isCompleted: false
    });
    setQuizStats({
      totalQuestions: 0,
      correctAnswers: 0,
      totalTime: 0,
      averageTime: 0,
      accuracy: 0,
      scoreByDifficulty: {
        easy: { correct: 0, total: 0 },
        medium: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 }
      }
    });
    setSessionId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">퀴즈를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];

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

      {/* Main Content */}
      {quizState.questions.length === 0 && !isGenerating ? (
        <div className="text-center py-12">
          <QuestionMarkCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI 퀴즈 생성</h3>
          <p className="text-gray-600 mb-6">선택한 지식 노드를 바탕으로 AI가 맞춤형 퀴즈를 생성합니다.</p>

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
            onClick={generateQuiz}
            disabled={selectedNodes.length === 0 || isGenerating}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                퀴즈 생성 중...
              </>
            ) : (
              '퀴즈 시작하기'
            )}
          </button>
        </div>
      ) : quizState.isCompleted ? (
        <div className="text-center py-12">
          <TrophyIcon className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">퀴즈 완료!</h3>

          {/* Results Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
            <div className="bg-blue-50 p-4 rounded-lg">
              <ChartBarIcon className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-900">{quizStats.correctAnswers}/{quizStats.totalQuestions}</div>
              <div className="text-sm text-blue-600">정답</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <TrophyIcon className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-900">{quizStats.accuracy.toFixed(1)}%</div>
              <div className="text-sm text-green-600">정답률</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <LightBulbIcon className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-purple-900">{quizStats.scoreByDifficulty.hard.correct}</div>
              <div className="text-sm text-purple-600">고난이도 정답</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <FireIcon className="h-8 w-8 mx-auto text-orange-600 mb-2" />
              <div className="text-2xl font-bold text-orange-900">A+</div>
              <div className="text-sm text-orange-600">등급</div>
            </div>
          </div>

          {/* Difficulty Breakdown */}
          <div className="mb-8">
            <h4 className="text-lg font-medium mb-4">난이도별 성과</h4>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {Object.entries(quizStats.scoreByDifficulty).map(([difficulty, score]) => (
                <div key={difficulty} className="text-center">
                  <div className="text-sm text-gray-600 mb-1">
                    {difficulty === 'easy' ? '쉬움' : difficulty === 'medium' ? '보통' : '어려움'}
                  </div>
                  <div className="text-lg font-bold">
                    {score.correct}/{score.total}
                  </div>
                  <div className="text-xs text-gray-500">
                    {score.total > 0 ? ((score.correct / score.total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-x-4">
            <button
              onClick={resetQuiz}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              다시 퀴즈하기
            </button>
            <Link
              to="/app/study"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              다른 학습 활동 선택
            </Link>
          </div>
        </div>
      ) : quizState.questions.length > 0 && !quizState.isTimerActive ? (
        <div className="text-center py-12">
          <QuestionMarkCircleIcon className="mx-auto h-12 w-12 text-purple-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">퀴즈가 준비되었습니다!</h3>
          <p className="text-gray-600 mb-6">
            총 {quizState.questions.length}개의 문제가 생성되었습니다.
          </p>
          <button
            onClick={startQuiz}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            퀴즈 시작하기
          </button>
        </div>
      ) : currentQuestion && (
        <div className="max-w-3xl mx-auto">
          {/* Progress and Timer */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                문제 {quizState.currentQuestionIndex + 1} / {quizState.questions.length}
              </span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-500">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {Math.floor(quizState.timeLeft / 60)}:{(quizState.timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <span className={`
                  text-xs px-2 py-1 rounded-full
                  ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'}
                `}>
                  {currentQuestion.difficulty === 'easy' ? '쉬움' :
                   currentQuestion.difficulty === 'medium' ? '보통' : '어려움'}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              {currentQuestion.question}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                let buttonClass = "w-full text-left p-4 rounded-lg border transition-all duration-200 ";

                if (quizState.showResult) {
                  if (index === currentQuestion.correctAnswer) {
                    buttonClass += "border-green-500 bg-green-50 text-green-900";
                  } else if (index === quizState.selectedAnswer) {
                    buttonClass += "border-red-500 bg-red-50 text-red-900";
                  } else {
                    buttonClass += "border-gray-200 bg-gray-50 text-gray-600";
                  }
                } else if (quizState.selectedAnswer === index) {
                  buttonClass += "border-purple-500 bg-purple-50 text-purple-900";
                } else {
                  buttonClass += "border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={quizState.showResult}
                    className={buttonClass}
                  >
                    <div className="flex items-center">
                      <span className="w-6 h-6 rounded-full border-2 border-current mr-3 flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                      {quizState.showResult && index === currentQuestion.correctAnswer && (
                        <CheckIcon className="h-5 w-5 ml-auto text-green-600" />
                      )}
                      {quizState.showResult && index === quizState.selectedAnswer && index !== currentQuestion.correctAnswer && (
                        <XMarkIcon className="h-5 w-5 ml-auto text-red-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explanation (shown after answer) */}
          {quizState.showResult && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <LightBulbIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-blue-900 font-medium mb-1">해설</p>
                  <p className="text-blue-800">{currentQuestion.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center">
            {!quizState.showResult ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={quizState.selectedAnswer === null}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
              >
                답안 제출
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              >
                {quizState.currentQuestionIndex >= quizState.questions.length - 1 ? '결과 보기' : '다음 문제'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};