import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, CheckIcon, XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { FireIcon, AcademicCapIcon, ClockIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { studyService, type Flashcard } from '../../services/study.service';
import { knowledgeService, type KnowledgeNode } from '../../services/knowledge.service';
import { aiService } from '../../services/ai.service';

interface FlashcardDisplay extends Flashcard {
  isFlipped: boolean;
  showAnswer: boolean;
}

interface StudyStats {
  total: number;
  correct: number;
  streak: number;
  accuracy: number;
}

export const FlashcardsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const nodeIds = searchParams.get('nodes')?.split(',') || [];

  const [selectedNodes, setSelectedNodes] = useState<KnowledgeNode[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardDisplay[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [studyStats, setStudyStats] = useState<StudyStats>({ total: 0, correct: 0, streak: 0, accuracy: 0 });
  const [studyMode, setStudyMode] = useState<'review' | 'new'>('new');
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSelectedNodes();
  }, []);

  useEffect(() => {
    if (studyMode === 'review') {
      loadReviewFlashcards();
    }
  }, [studyMode]);

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

  const loadReviewFlashcards = async () => {
    setIsLoading(true);
    try {
      const cards = await studyService.getFlashcardsForReview(20);
      setFlashcards(cards.map(card => ({
        ...card,
        isFlipped: false,
        showAnswer: false
      })));
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to load review flashcards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFlashcards = async () => {
    if (selectedNodes.length === 0) return;

    setIsGenerating(true);
    try {
      // Create study session
      const session = await studyService.createStudySession({
        session_type: 'flashcards',
        title: `플래시카드 - ${selectedNodes.map(n => n.title).join(', ')}`,
        description: 'AI가 생성한 플래시카드 세트',
        node_ids: selectedNodes.map(n => n.id),
        session_data: {
          generation_params: {
            difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
            cards_per_node: Math.ceil(20 / selectedNodes.length),
            focus_areas: ['key_concepts', 'definitions', 'examples', 'applications']
          }
        },
        progress: 0
      });

      setSessionId(session.id);

      // Generate flashcards using AI
      console.log('🤖 AI 플래시카드 생성 시작...');
      const generatedCards = await generateFlashcardsWithAI(selectedNodes, session.id);

      // Save to database and get actual IDs
      console.log('💾 데이터베이스에 플래시카드 저장 중...');
      const savedCards = await studyService.createFlashcards(generatedCards);
      console.log('✅ 플래시카드 저장 완료:', savedCards.length, '개');

      // Load as display cards with real database IDs
      setFlashcards(savedCards.map(card => ({
        ...card,
        isFlipped: false,
        showAnswer: false
      })));

      setCurrentIndex(0);
      setStudyMode('new');

    } catch (error) {
      console.error('Failed to generate flashcards:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFlashcardsWithAI = async (nodes: KnowledgeNode[], sessionId: string) => {
    const flashcards = [];

    for (const node of nodes) {
      const cardsPerNode = Math.ceil(20 / nodes.length);

      // Generate different types of cards based on content
      const cardTypes = [
        { type: 'definition', weight: 0.3 },
        { type: 'concept', weight: 0.3 },
        { type: 'example', weight: 0.2 },
        { type: 'application', weight: 0.2 }
      ];

      let cardCount = 0;
      for (const cardType of cardTypes) {
        const numCards = Math.ceil(cardsPerNode * cardType.weight);

        for (let i = 0; i < numCards && cardCount < cardsPerNode; i++) {
          const card = await generateSingleFlashcard(node, cardType.type, sessionId);
          if (card) {
            flashcards.push(card);
            cardCount++;
          }
        }
      }
    }

    return flashcards;
  };

  const generateSingleFlashcard = async (node: KnowledgeNode, cardType: string, sessionId: string) => {
    try {
      console.log(`🤖 AI 플래시카드 생성: ${node.title} (${cardType})`);

      // 카드 타입별 프롬프트 생성
      let cardPrompt = '';
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

      switch (cardType) {
        case 'definition':
          cardPrompt = `"${node.title}"에서 핵심 개념이나 용어의 정의를 묻는 플래시카드를 만들어주세요.`;
          difficulty = 'easy';
          break;
        case 'concept':
          cardPrompt = `"${node.title}"의 주요 개념이나 특징을 설명하는 플래시카드를 만들어주세요.`;
          difficulty = 'medium';
          break;
        case 'example':
          cardPrompt = `"${node.title}"의 실제 적용 사례나 예시를 묻는 플래시카드를 만들어주세요.`;
          difficulty = 'medium';
          break;
        case 'application':
          cardPrompt = `"${node.title}"의 활용 방법이나 응용을 묻는 플래시카드를 만들어주세요.`;
          difficulty = 'hard';
          break;
      }

      const prompt = `다음 지식 내용을 바탕으로 학습용 플래시카드 1개를 생성해주세요.

**제목:** ${node.title}
**내용:**
${(node.content || '').substring(0, 1000)}

**요청사항:** ${cardPrompt}

다음 JSON 형식으로 응답해주세요:
{
  "question": "앞면 질문 (명확하고 구체적으로)",
  "answer": "뒷면 답변 (정확하고 간결하게, HTML 태그 없이 일반 텍스트만)"
}

**중요 규칙:**
1. 질문은 명확하고 이해하기 쉽게 작성
2. 답변은 HTML 태그 없이 일반 텍스트만 사용
3. 답변은 200자 이내로 간결하게 작성
4. 실제 내용을 바탕으로 정확한 답변 생성

**중요: JSON 형식만 반환해주세요.**`;

      const aiResponse = await aiService.generateResponse(prompt, {
        temperature: 0.6,
        maxTokens: 400
      });

      // AI 응답 파싱
      let cardData;
      try {
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/```\s*$/, '');
        }

        cardData = JSON.parse(cleanResponse);

      } catch (parseError) {
        console.error('AI 플래시카드 파싱 실패:', parseError);
        // 파싱 실패 시 기본 카드 생성
        cardData = {
          question: `${node.title}에 대해 설명하시오.`,
          answer: (node.content || '').replace(/<[^>]*>/g, '').substring(0, 200) + '...'
        };
      }

      // HTML 태그 제거 (혹시 모를 경우 대비)
      const cleanAnswer = (cardData.answer || '').replace(/<[^>]*>/g, '').trim();

      console.log(`✅ AI 플래시카드 생성 완료: ${cardData.question}`);

      return {
        session_id: sessionId,
        question: cardData.question || `${node.title}에 대해 설명하시오.`,
        answer: cleanAnswer || '답변을 생성할 수 없습니다.',
        difficulty,
        category: node.node_type || 'Knowledge',
        tags: node.tags || [],
        review_count: 0,
        correct_count: 0,
        ease_factor: 2.5,
        interval_days: 1
      };

    } catch (error) {
      console.error('AI 플래시카드 생성 실패:', error);

      // 오류 시 안전한 기본 카드 생성
      const cleanContent = (node.content || '').replace(/<[^>]*>/g, '').trim();
      return {
        session_id: sessionId,
        question: `${node.title}에 대해 설명하시오.`,
        answer: cleanContent.substring(0, 200) + (cleanContent.length > 200 ? '...' : ''),
        difficulty: 'medium' as const,
        category: node.node_type || 'Knowledge',
        tags: node.tags || [],
        review_count: 0,
        correct_count: 0,
        ease_factor: 2.5,
        interval_days: 1
      };
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (flashcards.length === 0) return;

    const currentCard = flashcards[currentIndex];
    const quality = isCorrect ? 4 : 2; // Simple quality rating

    try {
      // Update flashcard using spaced repetition
      if (currentCard.id) {
        console.log(`📝 플래시카드 업데이트 시도: ID=${currentCard.id}, Quality=${quality}`);
        await studyService.reviewFlashcard(currentCard.id, quality);
        console.log('✅ 플래시카드 업데이트 성공');
      } else {
        console.warn('⚠️ 플래시카드 ID가 없음:', currentCard);
      }

      // Update stats
      const newStats = {
        total: studyStats.total + 1,
        correct: studyStats.correct + (isCorrect ? 1 : 0),
        streak: isCorrect ? studyStats.streak + 1 : 0,
        accuracy: ((studyStats.correct + (isCorrect ? 1 : 0)) / (studyStats.total + 1)) * 100
      };
      setStudyStats(newStats);

      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Session completed
        if (sessionId) {
          await studyService.updateStudySession(sessionId, {
            progress: 100,
            completed_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ 플래시카드 업데이트 실패:', error);
      console.error('현재 카드 정보:', currentCard);
      // 에러가 발생해도 진행은 계속
    }
  };

  const flipCard = () => {
    const updatedCards = [...flashcards];
    updatedCards[currentIndex].isFlipped = !updatedCards[currentIndex].isFlipped;
    updatedCards[currentIndex].showAnswer = true;
    setFlashcards(updatedCards);
  };

  const resetSession = () => {
    setFlashcards([]);
    setCurrentIndex(0);
    setStudyStats({ total: 0, correct: 0, streak: 0, accuracy: 0 });
    setSessionId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">플래시카드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const isSessionComplete = currentIndex >= flashcards.length && flashcards.length > 0;

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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setStudyMode(studyMode === 'new' ? 'review' : 'new')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {studyMode === 'new' ? '복습 모드' : '새 학습'}
            </button>
          </div>
        </div>
      </div>

      {/* Study Stats */}
      {studyStats.total > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <AcademicCapIcon className="h-6 w-6 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-900">{studyStats.total}</div>
            <div className="text-sm text-blue-600">총 학습</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <CheckIcon className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold text-green-900">{studyStats.correct}</div>
            <div className="text-sm text-green-600">정답</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <FireIcon className="h-6 w-6 mx-auto text-orange-600 mb-2" />
            <div className="text-2xl font-bold text-orange-900">{studyStats.streak}</div>
            <div className="text-sm text-orange-600">연속 정답</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <TrophyIcon className="h-6 w-6 mx-auto text-purple-600 mb-2" />
            <div className="text-2xl font-bold text-purple-900">{studyStats.accuracy.toFixed(1)}%</div>
            <div className="text-sm text-purple-600">정답률</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {flashcards.length === 0 && !isGenerating ? (
        <div className="text-center py-12">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">플래시카드를 생성하세요</h3>
          <p className="text-gray-600 mb-6">선택한 지식 노드를 바탕으로 AI가 학습용 플래시카드를 생성합니다.</p>

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
            onClick={generateFlashcards}
            disabled={selectedNodes.length === 0 || isGenerating}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                플래시카드 생성 중...
              </>
            ) : (
              '플래시카드 생성하기'
            )}
          </button>
        </div>
      ) : isSessionComplete ? (
        <div className="text-center py-12">
          <TrophyIcon className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">학습 완료!</h3>
          <p className="text-gray-600 mb-6">
            총 {studyStats.total}개 카드 중 {studyStats.correct}개 정답 (정답률: {studyStats.accuracy.toFixed(1)}%)
          </p>
          <div className="space-x-4">
            <button
              onClick={resetSession}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              다시 학습하기
            </button>
            <Link
              to="/app/study"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              다른 학습 활동 선택
            </Link>
          </div>
        </div>
      ) : currentCard && (
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {currentIndex + 1} / {flashcards.length}
              </span>
              <div className="flex items-center text-sm text-gray-500">
                <ClockIcon className="h-4 w-4 mr-1" />
                {currentCard.difficulty === 'easy' ? '쉬움' : currentCard.difficulty === 'medium' ? '보통' : '어려움'}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Flashcard */}
          <div className="mb-6">
            <div
              className={`
                relative w-full h-80 cursor-pointer transition-transform duration-500 preserve-3d
                ${currentCard.isFlipped ? 'rotate-y-180' : ''}
              `}
              onClick={flipCard}
            >
              {/* Front (Question) */}
              <div className="absolute w-full h-full backface-hidden">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center p-6 text-white">
                  <div className="text-center">
                    <div className="text-xl font-medium mb-4">
                      {currentCard.question}
                    </div>
                    <div className="flex items-center justify-center text-blue-100">
                      <EyeIcon className="h-5 w-5 mr-2" />
                      클릭하여 답안 확인
                    </div>
                  </div>
                </div>
              </div>

              {/* Back (Answer) */}
              <div className="absolute w-full h-full backface-hidden rotate-y-180">
                <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg flex items-center justify-center p-6 text-white">
                  <div className="text-center">
                    <div className="text-lg leading-relaxed">
                      {currentCard.answer}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Answer Buttons */}
          {currentCard.showAnswer && (
            <div className="flex justify-center space-x-6">
              <button
                onClick={() => handleAnswer(false)}
                className="flex items-center px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-lg"
              >
                <XMarkIcon className="h-6 w-6 mr-2" />
                틀렸음
              </button>
              <button
                onClick={() => handleAnswer(true)}
                className="flex items-center px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors shadow-lg"
              >
                <CheckIcon className="h-6 w-6 mr-2" />
                맞았음
              </button>
            </div>
          )}

          {/* Card Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            {currentCard.tags && currentCard.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {currentCard.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};