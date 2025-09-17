import OpenAI from 'openai'
import { supabase } from '../lib/supabase'
import { knowledgeService } from './knowledge.service'

// OpenAI 클라이언트 초기화 (환경변수에서 API 키 로드)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'your-openai-api-key',
  dangerouslyAllowBrowser: true // 로컬 개발용 - 프로덕션에서는 백엔드에서 처리 권장
})

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

export interface SimilarNode {
  id: string
  title: string
  content: string
  similarity: number
  user_id: string
}

export interface RAGResponse {
  answer: string
  sources: SimilarNode[]
  tokens_used: number
}

export class AIService {
  // 텍스트를 벡터 임베딩으로 변환
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002', // OpenAI의 임베딩 모델
        input: text,
      })

      return {
        embedding: response.data[0].embedding,
        tokens: response.usage?.total_tokens || 0
      }
    } catch (error) {
      console.error('임베딩 생성 실패:', error)
      throw new Error('임베딩 생성에 실패했습니다')
    }
  }

  // 지식 노드의 임베딩 생성 및 저장
  async generateNodeEmbedding(nodeId: string): Promise<void> {
    try {
      // 노드 내용 가져오기
      const node = await knowledgeService.getNode(nodeId)
      if (!node) throw new Error('노드를 찾을 수 없습니다')

      // 제목과 내용을 결합한 텍스트
      const combinedText = `${node.title}\n\n${node.content || ''}`
      
      // 임베딩 생성
      const { embedding } = await this.generateEmbedding(combinedText)

      // 임베딩을 데이터베이스에 저장
      const { error } = await supabase
        .from('knowledge_nodes')
        .update({ embedding })
        .eq('id', nodeId)

      if (error) throw error

      console.log(`노드 ${nodeId}의 임베딩이 성공적으로 생성되었습니다`)
    } catch (error) {
      console.error('노드 임베딩 생성 실패:', error)
      throw error
    }
  }

  // 유사한 노드 검색 (Vector Similarity Search)
  async searchSimilarNodes(
    query: string,
    threshold: number = 0.7,
    limit: number = 5,
    userId?: string
  ): Promise<SimilarNode[]> {
    try {
      // 쿼리 텍스트의 임베딩 생성
      const { embedding: queryEmbedding } = await this.generateEmbedding(query)

      // Supabase의 유사도 검색 함수 호출
      const { data, error } = await supabase.rpc('search_similar_nodes', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        target_user_id: userId
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('유사 노드 검색 실패:', error)
      throw error
    }
  }

  // RAG (Retrieval Augmented Generation) 시스템
  async askRAG(question: string, userId?: string): Promise<RAGResponse> {
    try {
      console.log('🤖 RAG 질문:', question);
      console.log('👤 사용자 ID:', userId);

      // 1. embedding 서비스를 사용하여 시맨틱 검색 수행
      const embeddingService = await import('./embedding.service');
      const similarResults = await embeddingService.embeddingService.semanticSearch(question, {
        limit: 3,
        similarity_threshold: 0.3, // 낮은 threshold로 더 많은 결과 확보
        user_id: userId
      });

      console.log('🔍 검색 결과:', similarResults.length, '개 노드 발견');

      // SimilarNode 형식으로 변환
      const similarNodes: SimilarNode[] = similarResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        similarity: result.similarity,
        user_id: userId || ''
      }));

      if (similarNodes.length === 0) {
        console.log('❌ 관련 지식을 찾을 수 없음');
        return {
          answer: '죄송합니다. 관련된 지식을 찾을 수 없습니다. 더 구체적인 질문을 해보시거나 관련 지식을 먼저 추가해주세요.',
          sources: [],
          tokens_used: 0
        }
      }

      console.log('✅ 발견된 관련 지식:');
      similarNodes.forEach((node, i) => {
        console.log(`  ${i + 1}. "${node.title}" (유사도: ${(node.similarity * 100).toFixed(1)}%)`);
      });

      // 2. 검색된 지식을 컨텍스트로 구성
      const context = similarNodes
        .map((node, index) => `[지식 ${index + 1}] ${node.title}\n${node.content}`)
        .join('\n\n---\n\n')

      // 3. GPT를 사용해 답변 생성
      const prompt = `다음 지식들을 바탕으로 질문에 답해주세요. 답변은 한국어로, 정확하고 도움이 되도록 작성해주세요.

**질문:** ${question}

**관련 지식:**
${context}

**답변 지침:**
1. 제공된 지식을 바탕으로 정확하게 답변하세요
2. 지식에 없는 내용은 추측하지 마세요
3. 가능하면 어떤 지식을 참고했는지 언급하세요
4. 답변은 친근하고 이해하기 쉽게 작성하세요

**답변:**`

      console.log('🤖 GPT 답변 생성 중...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // 비용 효율적인 모델 사용
        messages: [
          {
            role: 'system',
            content: '당신은 사용자의 개인 지식 데이터베이스를 바탕으로 질문에 답하는 AI 어시스턴트입니다. 정확하고 도움이 되는 답변을 제공하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })

      const answer = completion.choices[0]?.message?.content || '답변을 생성할 수 없습니다.'
      console.log('✅ GPT 답변 생성 완료');

      return {
        answer,
        sources: similarNodes,
        tokens_used: completion.usage?.total_tokens || 0
      }

    } catch (error) {
      console.error('❌ RAG 시스템 오류:', error)
      throw new Error('AI 답변 생성 중 오류가 발생했습니다')
    }
  }

  // 지식 노드 요약 생성
  async summarizeNode(nodeId: string): Promise<string> {
    try {
      const node = await knowledgeService.getNode(nodeId)
      if (!node) throw new Error('노드를 찾을 수 없습니다')

      if (!node.content || node.content.length < 100) {
        return '내용이 너무 짧아서 요약이 필요하지 않습니다.'
      }

      const summary = await this.summarizeContent(node.title, node.content)

      // 요약을 노드에 저장
      await supabase
        .from('knowledge_nodes')
        .update({ summary })
        .eq('id', nodeId)

      return summary

    } catch (error) {
      console.error('노드 요약 생성 실패:', error)
      throw error
    }
  }

  // 콘텐츠 직접 요약 생성 (nodeId 없이 사용 가능)
  async summarizeContent(title: string, content: string): Promise<string> {
    try {
      if (!content || content.length < 100) {
        return '내용이 너무 짧아서 요약이 필요하지 않습니다.'
      }

      const prompt = `다음 지식 내용을 2-3문장으로 요약해주세요. 핵심 내용과 중요한 정보를 포함하세요.

**제목:** ${title}

**내용:**
${content}

**요약:**`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '지식 내용을 간결하고 정확하게 요약하는 전문가입니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.5
      })

      return completion.choices[0]?.message?.content || '요약을 생성할 수 없습니다.'

    } catch (error) {
      console.error('콘텐츠 요약 생성 실패:', error)
      throw error
    }
  }

  // 개별 파일 요약 생성
  async summarizeFile(fileUrl: string, fileName: string): Promise<string> {
    try {
      console.log(`📄 개별 파일 요약 생성 시작: ${fileName}`);

      // 파일 다운로드 및 텍스트 추출
      const fileText = await this.downloadAndExtractFile(fileUrl, fileName);

      if (!fileText || fileText.length < 100) {
        return '파일 내용이 너무 짧아서 요약이 필요하지 않습니다.';
      }

      // AI로 파일 내용 요약 생성
      const prompt = `다음 파일의 내용을 2-3문장으로 간결하게 요약해주세요. 핵심 내용과 주요 정보를 포함하세요.

**파일명:** ${fileName}

**내용:**
${fileText.substring(0, 8000)} ${fileText.length > 8000 ? '...(내용이 길어 일부만 표시)' : ''}

**요약:**`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '첨부 파일의 내용을 간결하고 정확하게 요약하는 전문가입니다. 파일의 핵심 내용과 주요 포인트를 파악하여 2-3문장으로 요약하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.5
      });

      const summary = completion.choices[0]?.message?.content || '요약을 생성할 수 없습니다.';

      console.log(`✅ 파일 요약 생성 완료: ${fileName} (${summary.length}자)`);
      return summary;

    } catch (error) {
      console.error(`❌ 파일 요약 생성 실패: ${fileName}`, error);
      throw new Error(`파일 요약 생성에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 파일 다운로드 및 텍스트 추출
  private async downloadAndExtractFile(fileUrl: string, fileName: string): Promise<string> {
    try {
      console.log(`📥 파일 다운로드 시작: ${fileName}`);

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`파일 다운로드 실패: ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      console.log(`📄 텍스트 추출 시작: ${fileName} (${blob.size} bytes)`);

      // FileTextExtractor를 사용하여 텍스트 추출
      const { FileTextExtractor } = await import('../lib/fileTextExtractor');
      const extraction = await FileTextExtractor.extractTextFromFile(file);

      if (extraction.wordCount === 0) {
        throw new Error('파일에서 추출할 수 있는 텍스트가 없습니다.');
      }

      console.log(`✅ 텍스트 추출 완료: ${extraction.wordCount}개 단어, ${extraction.text.length}자`);
      return extraction.text;

    } catch (error) {
      console.error(`❌ 파일 처리 실패: ${fileName}`, error);
      throw error;
    }
  }

  // 관련 태그 자동 생성
  async generateTags(title: string, content: string): Promise<string[]> {
    try {
      const prompt = `다음 지식 내용을 분석해서 관련된 태그를 5개 이하로 제안해주세요. 태그는 한국어로, 간결하게 작성해주세요.

**제목:** ${title}

**내용:**
${content}

**생성 규칙:**
1. 핵심 주제와 관련된 태그
2. 카테고리나 분야 관련 태그  
3. 중요 키워드 기반 태그
4. 한국어로 작성
5. 1-3단어 길이

**태그:** (쉼표로 구분해서 나열)`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '지식 내용을 분석해서 적절한 태그를 생성하는 전문가입니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.6
      })

      const tagsText = completion.choices[0]?.message?.content || ''
      
      // 텍스트에서 태그 추출 (쉼표로 분리)
      const tags = tagsText
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag.length <= 20)
        .slice(0, 5) // 최대 5개

      return tags

    } catch (error) {
      console.error('태그 생성 실패:', error)
      return [] // 실패 시 빈 배열 반환
    }
  }

  // 지식 추천 시스템
  async recommendNodes(userId: string, limit: number = 5): Promise<SimilarNode[]> {
    try {
      // 사용자의 최근 조회한 노드들을 기반으로 추천
      const { data: recentNodes } = await supabase
        .from('knowledge_nodes')
        .select('title, content')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(3)

      if (!recentNodes || recentNodes.length === 0) {
        return []
      }

      // 최근 노드들의 내용을 결합
      const recentContent = recentNodes
        .map(node => `${node.title} ${node.content}`)
        .join(' ')

      // 유사한 노드 검색
      return await this.searchSimilarNodes(recentContent, 0.5, limit, userId)

    } catch (error) {
      console.error('지식 추천 실패:', error)
      return []
    }
  }

  // 임베딩 일괄 생성 (기존 노드들에 대해)
  async generateBulkEmbeddings(userId?: string): Promise<{ success: number; failed: number }> {
    try {
      let query = supabase
        .from('knowledge_nodes')
        .select('id, title, content')
        .eq('is_active', true)
        .is('embedding', null) // 임베딩이 없는 노드들만

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: nodes, error } = await query.limit(10) // 한 번에 10개씩 처리

      if (error) throw error
      if (!nodes || nodes.length === 0) {
        return { success: 0, failed: 0 }
      }

      let success = 0
      let failed = 0

      for (const node of nodes) {
        try {
          await this.generateNodeEmbedding(node.id)
          success++

          // API 레이트 리밋 방지를 위한 지연
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`노드 ${node.id} 임베딩 생성 실패:`, error)
          failed++
        }
      }

      return { success, failed }

    } catch (error) {
      console.error('일괄 임베딩 생성 실패:', error)
      return { success: 0, failed: 1 }
    }
  }

  // AI 기반 관계 발견 시스템
  async discoverRelationships(
    nodeId: string,
    options?: {
      threshold?: number;
      maxSuggestions?: number;
      excludeExisting?: boolean;
    }
  ): Promise<{
    suggestions: Array<{
      targetNodeId: string;
      targetNodeTitle: string;
      relationshipType: string;
      confidence: number;
      explanation: string;
    }>;
    totalAnalyzed: number;
  }> {
    try {
      const { threshold = 0.75, maxSuggestions = 5, excludeExisting = true } = options || {};

      // 1. 기준 노드 정보 가져오기
      const baseNode = await knowledgeService.getNode(nodeId);
      if (!baseNode) throw new Error('노드를 찾을 수 없습니다');

      // 2. 기존 관계 가져오기 (제외할 경우)
      let existingRelationships: string[] = [];
      if (excludeExisting) {
        const existing = await knowledgeService.getNodeRelationships(nodeId);
        existingRelationships = existing.map(rel =>
          rel.source_node_id === nodeId ? rel.target_node_id : rel.source_node_id
        );
      }

      // 3. 동일 사용자의 다른 노드들 가져오기
      const { data: candidateNodes, error } = await supabase
        .from('knowledge_nodes')
        .select('id, title, content, node_type, tags')
        .eq('user_id', baseNode.user_id)
        .eq('is_active', true)
        .neq('id', nodeId);

      if (error) throw error;
      if (!candidateNodes || candidateNodes.length === 0) {
        return { suggestions: [], totalAnalyzed: 0 };
      }

      // 4. 기존 관계가 있는 노드들 제외
      const filteredCandidates = excludeExisting
        ? candidateNodes.filter(node => !existingRelationships.includes(node.id))
        : candidateNodes;

      if (filteredCandidates.length === 0) {
        return { suggestions: [], totalAnalyzed: candidateNodes.length };
      }

      // 5. 임베딩 기반 유사도 검색
      const baseContent = `${baseNode.title}\n\n${baseNode.content || ''}`;
      const similarNodes = await this.searchSimilarNodes(
        baseContent,
        threshold,
        filteredCandidates.length,
        baseNode.user_id
      );

      if (similarNodes.length === 0) {
        return { suggestions: [], totalAnalyzed: filteredCandidates.length };
      }

      // 6. AI를 사용해 관계 유형과 설명 생성
      const suggestions = [];

      for (const similarNode of similarNodes.slice(0, maxSuggestions)) {
        try {
          const candidateNode = filteredCandidates.find(c => c.id === similarNode.id);
          if (!candidateNode) continue;

          const relationshipAnalysis = await this.analyzeRelationship(baseNode, candidateNode);

          suggestions.push({
            targetNodeId: candidateNode.id,
            targetNodeTitle: candidateNode.title,
            relationshipType: relationshipAnalysis.type,
            confidence: similarNode.similarity,
            explanation: relationshipAnalysis.explanation
          });
        } catch (error) {
          console.error(`관계 분석 실패 (${similarNode.id}):`, error);
          continue;
        }
      }

      return {
        suggestions,
        totalAnalyzed: filteredCandidates.length
      };

    } catch (error) {
      console.error('관계 발견 실패:', error);
      throw error;
    }
  }

  // 두 노드 간의 관계 유형 분석
  private async analyzeRelationship(
    sourceNode: any,
    targetNode: any
  ): Promise<{ type: string; explanation: string }> {
    try {
      const prompt = `두 지식 노드 간의 관계를 분석해주세요. 가장 적절한 관계 유형과 설명을 제공해주세요.

**소스 노드:**
제목: ${sourceNode.title}
타입: ${sourceNode.node_type}
내용: ${(sourceNode.content || '').substring(0, 300)}...
태그: ${(sourceNode.tags || []).join(', ')}

**타겟 노드:**
제목: ${targetNode.title}
타입: ${targetNode.node_type}
내용: ${(targetNode.content || '').substring(0, 300)}...
태그: ${(targetNode.tags || []).join(', ')}

**관계 유형 옵션:**
- related_to: 일반적인 관련성
- depends_on: 소스가 타겟에 의존
- supports: 소스가 타겟을 뒷받침
- contradicts: 소스가 타겟과 모순
- similar_to: 유사한 내용이나 개념
- part_of: 소스가 타겟의 일부분
- example_of: 소스가 타겟의 예시
- causes: 소스가 타겟의 원인
- result_of: 소스가 타겟의 결과

JSON 형식으로 응답해주세요:
{
  "type": "선택한_관계_유형",
  "explanation": "관계에 대한 간단한 설명 (50자 이내)"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '지식 노드 간의 관계를 분석하는 전문가입니다. JSON 형식으로만 응답하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      });

      const responseText = completion.choices[0]?.message?.content || '';

      try {
        const parsed = JSON.parse(responseText);
        return {
          type: parsed.type || 'related_to',
          explanation: parsed.explanation || '관련된 내용입니다.'
        };
      } catch (parseError) {
        // JSON 파싱 실패 시 기본값 반환
        return {
          type: 'related_to',
          explanation: '관련된 내용입니다.'
        };
      }

    } catch (error) {
      console.error('관계 분석 실패:', error);
      return {
        type: 'related_to',
        explanation: '관련된 내용입니다.'
      };
    }
  }

  // 관계 제안 자동 적용
  async applyRelationshipSuggestion(
    sourceNodeId: string,
    targetNodeId: string,
    relationshipType: string,
    confidence: number,
    explanation: string
  ): Promise<void> {
    try {
      await knowledgeService.createRelationship({
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        relationship_type: relationshipType,
        weight: confidence,
        confidence: confidence,
        description: explanation,
        metadata: {
          createdBy: 'ai_discovery',
          discoveredAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('관계 생성 실패:', error);
      throw error;
    }
  }

  // 범용 AI 응답 생성 메서드
  async generateResponse(prompt: string, options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemMessage?: string;
  }): Promise<string> {
    try {
      const {
        model = 'gpt-4o-mini',
        maxTokens = 2000,
        temperature = 0.7,
        systemMessage = '도움이 되는 AI 어시스턴트입니다. JSON 응답을 요청받으면 코드 블록(```) 없이 순수 JSON만 반환합니다.'
      } = options || {};

      console.log('🤖 AI 응답 생성 요청:', { model, maxTokens, temperature });

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('AI 응답을 생성할 수 없습니다.');
      }

      console.log('✅ AI 응답 생성 완료');
      return response;

    } catch (error) {
      console.error('❌ AI 응답 생성 실패:', error);
      throw new Error('AI 응답 생성 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // 퀴즈 생성 메서드들
  async generateQuizQuestions(
    nodes: any[],
    options: {
      totalQuestions: number;
      difficulties: { easy: number; medium: number; hard: number };
      questionTypes: string[];
    }
  ): Promise<any[]> {
    try {
      console.log('🎯 AI 퀴즈 생성 시작:', { nodeCount: nodes.length, totalQuestions: options.totalQuestions });

      const questions: any[] = [];

      for (const node of nodes) {
        const nodeQuestions = await this.generateQuestionsForNode(node, options);
        questions.push(...nodeQuestions);
      }

      // 섞고 원하는 개수만큼 반환
      const shuffled = questions.sort(() => Math.random() - 0.5);
      const result = shuffled.slice(0, options.totalQuestions);

      console.log(`✅ AI 퀴즈 생성 완료: ${result.length}개 문제 생성`);
      return result;
    } catch (error) {
      console.error('❌ AI 퀴즈 생성 실패:', error);
      throw new Error('AI 퀴즈 생성에 실패했습니다.');
    }
  }

  private async generateQuestionsForNode(
    node: any,
    options: {
      totalQuestions: number;
      difficulties: { easy: number; medium: number; hard: number };
      questionTypes: string[];
    }
  ): Promise<any[]> {
    const questionsPerNode = Math.ceil(options.totalQuestions / 3); // 노드당 문제 수
    const questions: any[] = [];

    for (let i = 0; i < questionsPerNode; i++) {
      const difficulty = this.selectRandomDifficulty(options.difficulties);
      const questionType = options.questionTypes[Math.floor(Math.random() * options.questionTypes.length)];

      let question;
      if (questionType === 'multiple_choice') {
        question = await this.generateMultipleChoiceQuestion(node, difficulty);
      } else if (questionType === 'true_false') {
        question = await this.generateTrueFalseQuestion(node, difficulty);
      } else {
        question = await this.generateShortAnswerQuestion(node, difficulty);
      }

      if (question) {
        questions.push(question);
      }
    }

    return questions;
  }

  private selectRandomDifficulty(difficulties: { easy: number; medium: number; hard: number }): 'easy' | 'medium' | 'hard' {
    const total = difficulties.easy + difficulties.medium + difficulties.hard;
    const random = Math.random() * total;

    if (random < difficulties.easy) return 'easy';
    if (random < difficulties.easy + difficulties.medium) return 'medium';
    return 'hard';
  }

  private async generateMultipleChoiceQuestion(node: any, difficulty: 'easy' | 'medium' | 'hard'): Promise<any> {
    const difficultyPrompts = {
      easy: '기본적인 개념이나 정의를 묻는',
      medium: '개념들 간의 관계나 응용을 묻는',
      hard: '비판적 사고나 종합적 분석을 요구하는'
    };

    const prompt = `다음 내용을 바탕으로 ${difficultyPrompts[difficulty]} 객관식 문제를 만들어 주세요.

제목: ${node.title}
내용: ${node.content}

JSON 형식으로 답변해 주세요 (JSON 코드 블록 없이 순수 JSON만):
{
  "question": "문제",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
  "correct_answer": "정답",
  "explanation": "해설"
}

문제는 명확하고 구체적이어야 하며, 선택지는 4개, 정답은 명확해야 합니다.`;

    try {
      const response = await this.generateResponse(prompt, {
        temperature: 0.7,
        maxTokens: 500
      });

      // JSON 코드 블록 제거
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }

      const parsed = JSON.parse(cleanResponse);
      return {
        question: parsed.question,
        question_type: 'multiple_choice',
        options: parsed.options,
        correct_answer: parsed.correct_answer,
        explanation: parsed.explanation,
        difficulty,
        points: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        tags: node.tags || []
      };
    } catch (error) {
      console.error('객관식 문제 생성 실패:', error);
      return null;
    }
  }

  private async generateTrueFalseQuestion(node: any, difficulty: 'easy' | 'medium' | 'hard'): Promise<any> {
    const prompt = `다음 내용을 바탕으로 참/거짓 문제를 만들어 주세요.

제목: ${node.title}
내용: ${node.content}

JSON 형식으로 답변해 주세요 (JSON 코드 블록 없이 순수 JSON만):
{
  "statement": "판단할 문장",
  "is_true": true/false,
  "explanation": "해설"
}

문장은 명확하고 구체적이어야 합니다.`;

    try {
      const response = await this.generateResponse(prompt, {
        temperature: 0.7,
        maxTokens: 300
      });

      // JSON 코드 블록 제거
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }

      const parsed = JSON.parse(cleanResponse);
      return {
        question: parsed.statement,
        question_type: 'true_false',
        options: ['참 (True)', '거짓 (False)'],
        correct_answer: parsed.is_true ? '참 (True)' : '거짓 (False)',
        explanation: parsed.explanation,
        difficulty,
        points: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        tags: node.tags || []
      };
    } catch (error) {
      console.error('참/거짓 문제 생성 실패:', error);
      return null;
    }
  }

  private async generateShortAnswerQuestion(node: any, difficulty: 'easy' | 'medium' | 'hard'): Promise<any> {
    const prompt = `다음 내용을 바탕으로 단답형 문제를 만들어 주세요.

제목: ${node.title}
내용: ${node.content}

JSON 형식으로 답변해 주세요 (JSON 코드 블록 없이 순수 JSON만):
{
  "question": "문제",
  "correct_answer": "정답",
  "explanation": "해설"
}

문제는 명확한 단답을 요구해야 합니다.`;

    try {
      const response = await this.generateResponse(prompt, {
        temperature: 0.7,
        maxTokens: 300
      });

      // JSON 코드 블록 제거
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }

      const parsed = JSON.parse(cleanResponse);
      return {
        question: parsed.question,
        question_type: 'short_answer',
        correct_answer: parsed.correct_answer,
        explanation: parsed.explanation,
        difficulty,
        points: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        tags: node.tags || []
      };
    } catch (error) {
      console.error('단답형 문제 생성 실패:', error);
      return null;
    }
  }
}

export const aiService = new AIService()