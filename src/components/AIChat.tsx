import { useState, useEffect } from 'react'
import { aiService } from '../services/ai.service'
import { supabase } from '../lib/supabase'
import type { RAGResponse, SimilarNode } from '../services/ai.service'

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
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <h2 className="text-xl font-semibold text-gray-900">AI 지식 어시스턴트</h2>
        <p className="text-sm text-gray-600">저장된 지식을 바탕으로 질문에 답해드립니다</p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* 참고 자료 출처 표시 */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-sm font-medium text-gray-600 mb-2">참고한 지식:</p>
                  <div className="space-y-2">
                    {message.sources.map((source, index) => (
                      <div key={source.id} className="text-sm">
                        <span className="font-medium">
                          {index + 1}. {source.title}
                        </span>
                        <span className="ml-2 text-gray-500">
                          (유사도: {(source.similarity * 100).toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs opacity-75 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4 max-w-2xl">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-gray-600">AI가 답변을 생성하고 있습니다...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="지식에 대해 질문해보세요..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500">
          팁: "Python이란 무엇인가요?", "React 컴포넌트 생성 방법", "머신러닝 기초" 등으로 질문해보세요
        </div>
      </div>
    </div>
  )
}