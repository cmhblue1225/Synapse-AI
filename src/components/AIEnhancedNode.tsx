import { useState, useEffect } from 'react'
import { aiService } from '../services/ai.service'
import { knowledgeService } from '../services/knowledge.service'

interface AIEnhancedNodeProps {
  nodeId?: string
  title: string
  content: string
  currentTags?: string[]
  onUpdate?: (data: { summary?: string; tags?: string[] }) => void
}

export function AIEnhancedNode({ 
  nodeId, 
  title, 
  content, 
  currentTags = [], 
  onUpdate 
}: AIEnhancedNodeProps) {
  const [summary, setSummary] = useState<string>('')
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingTags, setIsGeneratingTags] = useState(false)
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false)
  const [embeddingStatus, setEmbeddingStatus] = useState<'none' | 'success' | 'error'>('none')

  // 요약 생성 (nodeId가 있으면 저장된 노드 사용, 없으면 임시 콘텐츠 사용)
  const handleGenerateSummary = async () => {
    if (isGeneratingSummary) return

    setIsGeneratingSummary(true)
    try {
      let generatedSummary: string

      if (nodeId) {
        // 저장된 노드가 있는 경우
        generatedSummary = await aiService.summarizeNode(nodeId)
      } else {
        // 저장되지 않은 임시 콘텐츠 사용
        if (!content || content.length < 100) {
          alert('요약하기에 내용이 너무 짧습니다. 100자 이상 입력해주세요.')
          return
        }
        generatedSummary = await aiService.summarizeContent(title, content)
      }

      setSummary(generatedSummary)
      onUpdate?.({ summary: generatedSummary })
    } catch (error) {
      console.error('요약 생성 실패:', error)
      alert('요약 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // 태그 생성
  const handleGenerateTags = async () => {
    if (isGeneratingTags) return

    setIsGeneratingTags(true)
    try {
      const generated = await aiService.generateTags(title, content)
      
      // 기존 태그와 중복되지 않는 새 태그만 추가
      const newTags = generated.filter(tag => !currentTags.includes(tag))
      setSuggestedTags(newTags)
      
      if (newTags.length === 0) {
        alert('새로운 태그 제안이 없습니다. 기존 태그가 이미 적절합니다.')
      }
    } catch (error) {
      console.error('태그 생성 실패:', error)
      alert('태그 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGeneratingTags(false)
    }
  }

  // 제안된 태그 적용
  const handleApplyTags = () => {
    const combinedTags = [...currentTags, ...suggestedTags]
    onUpdate?.({ tags: combinedTags })
    setSuggestedTags([]) // 적용 후 제안 목록 초기화
  }

  // 임베딩 생성
  const handleGenerateEmbedding = async () => {
    if (!nodeId || isGeneratingEmbedding) return

    setIsGeneratingEmbedding(true)
    setEmbeddingStatus('none')

    try {
      // embedding.service를 사용하여 임베딩 생성
      const embeddingService = await import('../services/embedding.service');
      await embeddingService.embeddingService.generateAndStoreNodeEmbedding(
        nodeId,
        title,
        content
      );

      setEmbeddingStatus('success')
      alert('벡터 임베딩이 성공적으로 생성되었습니다! 이제 이 노드는 AI 검색에서 찾을 수 있습니다.')
    } catch (error) {
      console.error('임베딩 생성 실패:', error)
      setEmbeddingStatus('error')
      alert('벡터 임베딩 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGeneratingEmbedding(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <span className="mr-2">🤖</span>
        AI 지식 강화 도구
      </h3>

      {/* 요약 생성 섹션 */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-800">📝 자동 요약 생성</h4>
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || (!title && !content)}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingSummary ? '생성 중...' : '요약 생성'}
          </button>
        </div>
        
        {summary && (
          <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
            <p className="text-sm text-gray-700">{summary}</p>
          </div>
        )}
        
        {(!title && !content) && (
          <p className="text-xs text-gray-500">제목과 내용을 입력하면 요약을 생성할 수 있습니다.</p>
        )}
      </div>

      {/* 태그 생성 섹션 */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-800">🏷️ 스마트 태그 제안</h4>
          <button
            onClick={handleGenerateTags}
            disabled={isGeneratingTags || !content}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingTags ? '생성 중...' : '태그 제안'}
          </button>
        </div>

        {/* 현재 태그 표시 */}
        {currentTags.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-1">현재 태그:</p>
            <div className="flex flex-wrap gap-1">
              {currentTags.map((tag, index) => (
                <span key={index} className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* 제안된 태그 */}
        {suggestedTags.length > 0 && (
          <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-800">제안된 태그:</p>
              <button
                onClick={handleApplyTags}
                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
              >
                모두 적용
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {suggestedTags.map((tag, index) => (
                <span key={index} className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 벡터 임베딩 생성 섹션 */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium text-gray-800">🔍 AI 검색 활성화</h4>
            <p className="text-xs text-gray-600">벡터 임베딩을 생성하여 AI 검색에서 이 지식을 찾을 수 있게 합니다</p>
          </div>
          <button
            onClick={handleGenerateEmbedding}
            disabled={isGeneratingEmbedding || !nodeId}
            className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingEmbedding ? '생성 중...' : '임베딩 생성'}
          </button>
        </div>

        {/* 임베딩 상태 표시 */}
        {embeddingStatus === 'success' && (
          <div className="bg-green-50 p-2 rounded border-l-4 border-green-400">
            <p className="text-sm text-green-800">✅ AI 검색 활성화 완료!</p>
          </div>
        )}
        
        {embeddingStatus === 'error' && (
          <div className="bg-red-50 p-2 rounded border-l-4 border-red-400">
            <p className="text-sm text-red-800">❌ AI 검색 활성화 실패</p>
          </div>
        )}
        
        {!nodeId && (
          <p className="text-xs text-gray-500">노드를 저장한 후 AI 검색을 활성화할 수 있습니다.</p>
        )}
      </div>

      {/* 사용 안내 */}
      <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
        <p className="font-medium mb-1">💡 AI 도구 사용 팁:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>요약: 긴 내용을 핵심만 간추려 표시합니다</li>
          <li>태그: 내용 분석을 통해 관련 키워드를 제안합니다</li>
          <li>임베딩: AI 검색과 유사 문서 찾기 기능을 활성화합니다</li>
        </ul>
      </div>
    </div>
  )
}