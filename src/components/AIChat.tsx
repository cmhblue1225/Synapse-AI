import { useState, useEffect, useRef } from 'react'
import { aiService } from '../services/ai.service'
import { supabase } from '../lib/supabase'
import type { RAGResponse, SimilarNode } from '../services/ai.service'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  BookOpenIcon,
  ClockIcon,
  ChartBarIcon,
  LightBulbIcon,
  BeakerIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import {
  SparklesIcon as SparklesSolidIcon,
  CheckIcon
} from '@heroicons/react/24/solid'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  sources?: SimilarNode[]
  timestamp: Date
}

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: '안녕하세요! 저는 당신의 AI 지식 어시스턴트입니다. 저장된 지식을 바탕으로 질문에 답해드릴 수 있습니다. 무엇이든 물어보세요!',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)

  // 추천 질문들
  const suggestedQuestions = [
    '오늘 새로 학습한 내용은 무엇인가요?',
    'React 관련 지식을 요약해주세요',
    '프론트엔드 개발 트렌드를 알려주세요',
    '머신러닝 기초 개념을 설명해주세요'
  ]

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser({ id: user.id })
        console.log('👤 AI 챗 사용자:', user.id)
      }
    }
    getCurrentUser()
  }, [])

  // 추천 질문 클릭 핸들러
  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // RAG 시스템을 통해 답변 생성 (사용자 ID 포함)
      const response: RAGResponse = await aiService.askRAG(input, currentUser?.id)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('AI 응답 오류:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {/* 프리미엄 헤더 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-ai-500 via-primary-600 to-knowledge-500 rounded-t-3xl p-8 text-white shadow-strong">
        {/* 배경 장식 */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <SparklesSolidIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">AI 지식 어시스턴트</h1>
              <p className="text-white/90 text-lg">
                저장된 지식을 바탕으로 스마트한 답변을 제공합니다
              </p>
            </div>
          </div>

          {/* 실시간 상태 */}
          <div className="flex items-center space-x-6 mt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">실시간 연결됨</span>
            </div>
            <div className="flex items-center space-x-2">
              <BookOpenIcon className="h-4 w-4" />
              <span className="text-sm">{messages.length - 1}개 대화</span>
            </div>
            <div className="flex items-center space-x-2">
              <BeakerIcon className="h-4 w-4" />
              <span className="text-sm">RAG 모델 활성화</span>
            </div>
          </div>
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-primary-50/30">
        {/* 메인 채팅 */}
        <div className="flex-1 flex flex-col">
          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 빈 상태 */}
            {messages.length === 1 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 gradient-ai rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-glow-ai">
                  <SparklesSolidIcon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                  지식을 탐험해보세요
                </h3>
                <p className="text-neutral-600 text-lg mb-8 max-w-md mx-auto">
                  저장된 지식을 기반으로 어떤 질문이든 답해드립니다
                </p>

                {/* 추천 질문 */}
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="p-4 bg-white border border-neutral-200 rounded-2xl hover:border-primary-300 hover:shadow-medium transition-all duration-200 text-left group"
                    >
                      <div className="flex items-start space-x-3">
                        <LightBulbIcon className="h-5 w-5 text-primary-500 mt-0.5 group-hover:text-primary-600" />
                        <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                          {question}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 메시지 목록 */}
            {messages.slice(1).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
              >
                <div className={`max-w-3xl ${message.type === 'user' ? 'ml-12' : 'mr-12'}`}>
                  {/* 메시지 타입 레이블 */}
                  <div className={`flex items-center space-x-2 mb-2 ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    {message.type === 'assistant' && (
                      <div className="p-1.5 bg-gradient-to-r from-ai-500 to-primary-600 rounded-lg">
                        <SparklesSolidIcon className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-neutral-600">
                      {message.type === 'user' ? '당신' : 'AI 어시스턴트'}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  {/* 메시지 박스 */}
                  <div
                    className={`rounded-2xl p-6 shadow-soft ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-primary-500 to-knowledge-500 text-white'
                        : 'bg-white border border-neutral-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>

                    {/* 참고 자료 출처 */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-neutral-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <DocumentTextIcon className="h-4 w-4 text-neutral-500" />
                          <span className="text-sm font-medium text-neutral-600">참고한 지식</span>
                        </div>
                        <div className="space-y-2">
                          {message.sources.map((source, index) => (
                            <div key={source.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-knowledge-100 rounded-lg flex items-center justify-center">
                                  <span className="text-xs font-bold text-knowledge-600">
                                    {index + 1}
                                  </span>
                                </div>
                                <span className="font-medium text-neutral-800">
                                  {source.title}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <ChartBarIcon className="h-4 w-4 text-neutral-400" />
                                <span className="text-sm text-neutral-500">
                                  {(source.similarity * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* 로딩 상태 */}
            {isLoading && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="max-w-3xl mr-12">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="p-1.5 bg-gradient-to-r from-ai-500 to-primary-600 rounded-lg">
                      <SparklesSolidIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-neutral-600">AI 어시스턴트</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-soft">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-200 border-t-primary-600"></div>
                      <span className="text-neutral-600 font-medium">지식을 분석하고 답변을 생성하고 있습니다...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-6 bg-white/50 backdrop-blur-sm border-t border-white/20">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-ai-500 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-all duration-300"></div>
                <div className="relative bg-white border border-neutral-200 rounded-2xl shadow-soft group-focus-within:shadow-medium group-focus-within:border-primary-300 transition-all duration-300">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="AI와 대화를 시작해보세요..."
                    className="w-full pl-6 pr-16 py-4 bg-transparent border-0 rounded-2xl text-neutral-900 placeholder-neutral-500 font-medium focus:outline-none focus:ring-0 text-lg"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-3 bg-gradient-to-r from-primary-500 to-ai-500 text-white rounded-xl hover:shadow-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <PaperAirplaneIcon className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
                <span>Shift + Enter로 줄바꿈, Enter로 전송</span>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <CheckIcon className="h-4 w-4 text-green-500" />
                    <span>RAG 활성화</span>
                  </span>
                  <span>지식 기반 답변</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* 사이드바 */}
        <div className="w-80 bg-white/30 backdrop-blur-sm border-l border-white/20 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* 대화 통계 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-primary-600" />
                대화 통계
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">총 대화</span>
                  <span className="font-semibold text-neutral-900">{messages.length - 1}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">활성 시간</span>
                  <span className="font-semibold text-neutral-900">
                    {Math.floor((Date.now() - messages[0].timestamp.getTime()) / 60000)}분
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">응답 속도</span>
                  <span className="font-semibold text-success-600">빠름</span>
                </div>
              </div>
            </div>

            {/* 최근 주제 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-knowledge-600" />
                최근 주제
              </h3>
              <div className="space-y-2">
                {['React 컴포넌트', '머신러닝', 'JavaScript', 'TypeScript'].map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-white/40 rounded-lg cursor-pointer transition-colors duration-200">
                    <span className="text-sm font-medium text-neutral-700">{topic}</span>
                    <span className="text-xs text-neutral-500">{index + 1}회</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-neutral-900 flex items-center">
                <BeakerIcon className="h-5 w-5 mr-2 text-ai-600" />
                빠른 액션
              </h3>
              {[
                { text: '대화 기록 저장', icon: DocumentTextIcon },
                { text: '지식 노드 생성', icon: BookOpenIcon },
                { text: '대화 초기화', icon: SparklesIcon }
              ].map((action, index) => (
                <button
                  key={index}
                  className="w-full flex items-center space-x-3 p-3 bg-white/40 hover:bg-white/60 rounded-xl transition-all duration-200 group"
                >
                  <action.icon className="h-4 w-4 text-neutral-600 group-hover:text-primary-600" />
                  <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                    {action.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}