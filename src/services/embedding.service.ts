// AI 임베딩 및 시맨틱 검색 서비스

import { supabase } from '../lib/supabase';
import { performanceMonitor } from '../lib/apiOptimizer';

// OpenAI Embeddings API 타입
interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
    object: string;
  }>;
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// 시맨틱 검색 결과 타입
interface SemanticSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  node_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export class EmbeddingService {
  private readonly OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1';
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small'; // 더 경제적인 모델
  private readonly EMBEDDING_DIMENSION = 1536; // text-embedding-3-small 차원

  // 텍스트를 벡터로 변환
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.OPENAI_API_KEY) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    // 텍스트 전처리 (길이 제한)
    const cleanText = this.preprocessText(text);

    return performanceMonitor.measureApiCall(
      `embedding-${cleanText.substring(0, 50)}`,
      async () => {
        const response = await fetch(`${this.OPENAI_API_URL}/embeddings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.EMBEDDING_MODEL,
            input: cleanText,
            encoding_format: 'float'
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API 오류: ${response.status} - ${error}`);
        }

        const data: EmbeddingResponse = await response.json();
        return data.data[0].embedding;
      }
    );
  }

  // 여러 텍스트를 한 번에 벡터로 변환 (배치 처리)
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.OPENAI_API_KEY) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    // 배치 크기 제한 (OpenAI 제한: 2048개)
    const BATCH_SIZE = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const cleanBatch = batch.map(text => this.preprocessText(text));

      const batchResults = await performanceMonitor.measureApiCall(
        `batch-embedding-${i}-${Math.min(i + BATCH_SIZE, texts.length)}`,
        async () => {
          const response = await fetch(`${this.OPENAI_API_URL}/embeddings`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.EMBEDDING_MODEL,
              input: cleanBatch,
              encoding_format: 'float'
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API 오류: ${response.status} - ${error}`);
          }

          const data: EmbeddingResponse = await response.json();
          return data.data.map(item => item.embedding);
        }
      );

      results.push(...batchResults);

      // API 제한 고려하여 잠시 대기
      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  // 텍스트 전처리
  private preprocessText(text: string): string {
    // 1. HTML 태그 제거
    const withoutHtml = text.replace(/<[^>]*>/g, ' ');

    // 2. 여러 공백을 하나로 통합
    const withoutExtraSpaces = withoutHtml.replace(/\s+/g, ' ');

    // 3. 앞뒤 공백 제거
    const trimmed = withoutExtraSpaces.trim();

    // 4. 길이 제한 (OpenAI 토큰 제한 고려: 약 8000 토큰)
    const MAX_CHARS = 6000; // 약간 여유를 두고 설정
    if (trimmed.length > MAX_CHARS) {
      return trimmed.substring(0, MAX_CHARS) + '...';
    }

    return trimmed;
  }

  // 노드의 임베딩 생성 및 저장 (파일 포함)
  async generateAndStoreNodeEmbedding(nodeId: string, title: string, content: string, files?: File[]): Promise<void> {
    try {
      // 파일에서 텍스트 추출
      let fileText = '';
      if (files && files.length > 0) {
        const { FileTextExtractor } = await import('../lib/fileTextExtractor');
        fileText = await FileTextExtractor.extractTextFromFiles(files);
        console.log(`📄 ${files.length}개 파일에서 텍스트 추출: ${fileText.length}자`);
      }

      // 제목, 내용, 파일 내용을 결합하여 임베딩 생성
      const combinedText = [
        title,
        content,
        fileText
      ].filter(text => text && text.trim().length > 0).join('\n\n---\n\n');

      console.log(`🔤 임베딩 생성할 전체 텍스트 길이: ${combinedText.length}자`);
      const embedding = await this.generateEmbedding(combinedText);

      // 데이터베이스에 임베딩 직접 저장 (PostgreSQL vector 타입 형식)
      const { error } = await supabase
        .from('knowledge_nodes')
        .update({
          embedding: JSON.stringify(embedding), // JSON 문자열로 전달 시도
          updated_at: new Date().toISOString()
        })
        .eq('id', nodeId);

      console.log(`노드 ${nodeId} 임베딩 저장 시도: 벡터 차원 ${embedding.length}`, error ? `실패: ${error.message}` : '성공');

      if (error) {
        throw new Error(`임베딩 저장 실패: ${error.message}`);
      }
    } catch (error) {
      console.error('노드 임베딩 생성 실패:', error);
      throw error;
    }
  }

  // 기존 노드들의 임베딩을 일괄 생성
  async generateEmbeddingsForAllNodes(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      console.log('🔍 임베딩이 없는 노드 조회 중...');

      // 임베딩이 없는 모든 활성 노드 조회
      const { data: nodes, error } = await supabase
        .from('knowledge_nodes')
        .select('id, title, content, embedding')
        .eq('is_active', true)
        .is('embedding', null)
        .limit(50); // 한 번에 50개씩 처리

      console.log('📊 조회 결과:', { 노드_수: nodes?.length || 0, 오류: error?.message || '없음' });

      if (error) {
        console.error('❌ 노드 조회 오류:', error);
        throw error;
      }

      if (!nodes || nodes.length === 0) {
        console.log('ℹ️ 임베딩이 필요한 노드가 없습니다.');
        return { success: 0, failed: 0 };
      }

      console.log(`🚀 ${nodes.length}개 노드의 임베딩 생성 시작...`);
      console.log('📋 대상 노드 목록:');
      nodes.forEach((node, i) => {
        console.log(`  ${i + 1}. ${node.title} (${node.id})`);
      });

      // 배치로 임베딩 생성
      const texts = nodes.map(node => `${node.title}\n\n${node.content || ''}`);
      const embeddings = await this.generateBatchEmbeddings(texts);

      // 각 노드별로 임베딩 저장
      for (let i = 0; i < nodes.length; i++) {
        try {
          // 직접 테이블 업데이트 (PostgreSQL vector 타입 형식)
          const { error: storeError } = await supabase
            .from('knowledge_nodes')
            .update({
              embedding: JSON.stringify(embeddings[i]), // JSON 문자열로 전달 시도
              updated_at: new Date().toISOString()
            })
            .eq('id', nodes[i].id);

          console.log(`노드 ${nodes[i].id} 임베딩 저장 시도: 벡터 차원 ${embeddings[i].length}`, storeError ? `실패: ${storeError.message}` : '성공');

          if (storeError) {
            console.error(`노드 ${nodes[i].id} 임베딩 저장 실패:`, storeError);
            failed++;
          } else {
            success++;
          }
        } catch (error) {
          console.error(`노드 ${nodes[i].id} 임베딩 저장 중 오류:`, error);
          failed++;
        }

        // 진행 상황 로그
        if ((i + 1) % 10 === 0) {
          console.log(`진행 상황: ${i + 1}/${nodes.length}`);
        }
      }

      console.log(`임베딩 생성 완료: 성공 ${success}개, 실패 ${failed}개`);
    } catch (error) {
      console.error('일괄 임베딩 생성 실패:', error);
    }

    return { success, failed };
  }

  // 시맨틱 검색 수행 (클라이언트 측 구현)
  async semanticSearch(
    query: string,
    options: {
      limit?: number;
      similarity_threshold?: number;
      node_types?: string[];
      tags?: string[];
      user_id?: string;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      // 쿼리 임베딩 생성
      console.log('🔍 쿼리 임베딩 생성 중:', query);
      const queryEmbedding = await this.generateEmbedding(query);

      // 모든 활성 노드와 임베딩 조회
      const { data: nodes, error } = await supabase
        .from('knowledge_nodes')
        .select('id, title, content, node_type, tags, created_at, updated_at, embedding')
        .eq('is_active', true)
        .not('embedding', 'is', null);

      if (error) {
        throw new Error(`노드 조회 실패: ${error.message}`);
      }

      if (!nodes || nodes.length === 0) {
        console.log('⚠️ 임베딩이 있는 노드가 없습니다.');
        return [];
      }

      console.log(`📊 검색 대상 노드: ${nodes.length}개`);

      // 코사인 유사도 계산
      const results: SemanticSearchResult[] = [];

      for (const node of nodes) {
        try {
          // 노드 임베딩 파싱
          const nodeEmbedding = typeof node.embedding === 'string'
            ? JSON.parse(node.embedding)
            : node.embedding;

          if (!Array.isArray(nodeEmbedding)) {
            console.warn(`⚠️ 노드 ${node.id}의 임베딩 형식이 올바르지 않음`);
            continue;
          }

          // 코사인 유사도 계산
          const similarity = this.cosineSimilarity(queryEmbedding, nodeEmbedding);

          // 디버깅을 위한 유사도 로그
          if (results.length < 5) {
            console.log(`📊 노드 "${node.title}" 유사도: ${similarity.toFixed(4)}`);
          }

          // 유사도 threshold 체크 (기본값을 0.3으로 낮춤)
          if (similarity >= (options.similarity_threshold || 0.3)) {
            // 필터링 조건 체크
            if (options.node_types && !options.node_types.includes(node.node_type)) {
              continue;
            }

            if (options.tags && (!node.tags || !options.tags.some(tag => node.tags.includes(tag)))) {
              continue;
            }

            results.push({
              id: node.id,
              title: node.title,
              content: node.content || '',
              similarity,
              node_type: node.node_type,
              tags: node.tags || [],
              created_at: node.created_at,
              updated_at: node.updated_at
            });
          }
        } catch (nodeError) {
          console.warn(`⚠️ 노드 ${node.id} 처리 중 오류:`, nodeError);
        }
      }

      // 유사도 순으로 정렬 후 제한
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, options.limit || 10);

      console.log(`✅ 시맨틱 검색 완료: ${limitedResults.length}개 결과 (총 ${results.length}개 중)`);

      return limitedResults;
    } catch (error) {
      console.error('시맨틱 검색 오류:', error);
      throw error;
    }
  }

  // 코사인 유사도 계산 함수
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('벡터 차원이 다릅니다');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // 유사한 노드 찾기 (클라이언트 측 구현)
  async findSimilarNodes(
    nodeId: string,
    options: {
      limit?: number;
      similarity_threshold?: number;
      exclude_self?: boolean;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      console.log('🔍 유사 노드 검색 시작:', nodeId);

      // embedding 필드가 있는지 먼저 확인
      let hasEmbeddingField = true;
      let targetNodeWithEmbedding = null;

      try {
        const { data: embeddingCheck, error: embeddingError } = await supabase
          .from('knowledge_nodes')
          .select('id, title, content, embedding')
          .eq('id', nodeId)
          .eq('is_active', true)
          .single();

        if (embeddingError || !embeddingCheck || !embeddingCheck.embedding) {
          hasEmbeddingField = false;
        } else {
          targetNodeWithEmbedding = embeddingCheck;
        }
      } catch (error) {
        console.warn('⚠️ embedding 필드 접근 불가, 콘텐츠 기반 검색으로 전환');
        hasEmbeddingField = false;
      }

      // embedding이 없으면 기본 필드만으로 조회
      if (!hasEmbeddingField || !targetNodeWithEmbedding) {
        const { data: targetNode, error: targetError } = await supabase
          .from('knowledge_nodes')
          .select('id, title, content')
          .eq('id', nodeId)
          .eq('is_active', true)
          .single();

        if (targetError || !targetNode) {
          console.error('❌ 대상 노드 조회 실패:', targetError);
          throw new Error(`대상 노드 조회 실패: ${targetError?.message || '노드를 찾을 수 없음'}`);
        }

        console.log('✅ 대상 노드 조회 성공 (콘텐츠 기반):', targetNode.title);
        return this.performContentBasedSearch(targetNode, options);
      }

      console.log('✅ 대상 노드 조회 성공 (임베딩 기반):', targetNodeWithEmbedding.title);

      // 대상 노드 임베딩 파싱
      const targetEmbedding = typeof targetNodeWithEmbedding.embedding === 'string'
        ? JSON.parse(targetNodeWithEmbedding.embedding)
        : targetNodeWithEmbedding.embedding;

      if (!Array.isArray(targetEmbedding)) {
        throw new Error('대상 노드의 임베딩 형식이 올바르지 않습니다');
      }

      console.log(`🔍 "${targetNodeWithEmbedding.title}" 노드와 유사한 노드 검색 중...`);

      // 모든 활성 노드 조회
      const { data: nodes, error } = await supabase
        .from('knowledge_nodes')
        .select('id, title, content, node_type, tags, created_at, updated_at, embedding')
        .eq('is_active', true)
        .not('embedding', 'is', null)
        .neq('id', options.exclude_self !== false ? nodeId : 'never-match');

      if (error) {
        throw new Error(`노드 조회 실패: ${error.message}`);
      }

      if (!nodes || nodes.length === 0) {
        return [];
      }

      // 유사도 계산
      const results: SemanticSearchResult[] = [];

      for (const node of nodes) {
        try {
          const nodeEmbedding = typeof node.embedding === 'string'
            ? JSON.parse(node.embedding)
            : node.embedding;

          if (!Array.isArray(nodeEmbedding)) {
            continue;
          }

          const similarity = this.cosineSimilarity(targetEmbedding, nodeEmbedding);

          if (similarity >= (options.similarity_threshold || 0.8)) {
            results.push({
              id: node.id,
              title: node.title,
              content: node.content || '',
              similarity,
              node_type: node.node_type,
              tags: node.tags || [],
              created_at: node.created_at,
              updated_at: node.updated_at
            });
          }
        } catch (nodeError) {
          console.warn(`⚠️ 노드 ${node.id} 처리 중 오류:`, nodeError);
        }
      }

      // 유사도 순으로 정렬 후 제한
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, options.limit || 5);

      console.log(`✅ 유사 노드 검색 완료: ${limitedResults.length}개 결과`);

      return limitedResults;
    } catch (error) {
      console.error('유사 노드 검색 오류:', error);
      throw error;
    }
  }

  // 키워드를 기반으로 관련 노드 추천
  async recommendNodesByKeywords(
    keywords: string[],
    options: {
      limit?: number;
      boost_recent?: boolean;
      user_id?: string;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      // 키워드들을 하나의 쿼리로 결합
      const combinedQuery = keywords.join(' ');

      const results = await this.semanticSearch(combinedQuery, {
        limit: options.limit || 8,
        similarity_threshold: 0.6, // 추천은 조금 더 관대한 threshold
        user_id: options.user_id
      });

      // 최근 노드에 가중치 부여
      if (options.boost_recent) {
        const now = new Date().getTime();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

        return results.map(result => {
          const createdTime = new Date(result.created_at).getTime();
          const recency = Math.max(0, (createdTime - thirtyDaysAgo) / (now - thirtyDaysAgo));
          const boostedSimilarity = result.similarity + (recency * 0.1); // 최대 0.1 부스트

          return {
            ...result,
            similarity: Math.min(1, boostedSimilarity)
          };
        }).sort((a, b) => b.similarity - a.similarity);
      }

      return results;
    } catch (error) {
      console.error('키워드 기반 노드 추천 오류:', error);
      throw error;
    }
  }

  // 임베딩 통계 조회
  async getEmbeddingStats(): Promise<{
    total_nodes: number;
    nodes_with_embedding: number;
    embedding_coverage: number;
    avg_similarity: number;
  }> {
    try {
      console.log('📊 임베딩 통계 조회 시작...');

      // 현재 로그인한 사용자의 세션 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('사용자 인증이 필요합니다');
      }

      console.log('👤 사용자 ID:', user.id);

      // 현재 사용자의 노드만 조회
      const { data: nodes, error } = await supabase
        .from('knowledge_nodes')
        .select('id, embedding, title, user_id')
        .eq('is_active', true)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ 임베딩 통계 조회 오류:', error);
        throw new Error(`임베딩 통계 조회 실패: ${error.message}`);
      }

      const totalNodes = nodes?.length || 0;
      const nodesWithEmbedding = nodes?.filter(node => node.embedding !== null && node.embedding !== '').length || 0;
      const embeddingCoverage = totalNodes > 0 ? (nodesWithEmbedding / totalNodes * 100) : 0;

      console.log('🔍 임베딩 통계 상세 분석:', {
        전체_노드: totalNodes,
        임베딩_있는_노드: nodesWithEmbedding,
        임베딩_없는_노드: totalNodes - nodesWithEmbedding,
        커버리지: `${embeddingCoverage.toFixed(2)}%`
      });

      // 임베딩이 없는 노드들 로그 출력
      const nodesWithoutEmbedding = nodes?.filter(node => node.embedding === null || node.embedding === '') || [];
      if (nodesWithoutEmbedding.length > 0) {
        console.log('📝 임베딩이 없는 노드들:', nodesWithoutEmbedding.map(n => `${n.title} (${n.id})`));
      }

      // 첫 번째 임베딩 샘플 확인
      if (nodesWithEmbedding > 0) {
        const firstEmbeddingNode = nodes?.find(node => node.embedding !== null);
        if (firstEmbeddingNode) {
          try {
            const embedding = typeof firstEmbeddingNode.embedding === 'string' ?
              JSON.parse(firstEmbeddingNode.embedding) : firstEmbeddingNode.embedding;
            console.log('📊 임베딩 샘플:', {
              노드_ID: firstEmbeddingNode.id,
              임베딩_차원: Array.isArray(embedding) ? embedding.length : '형식 오류',
              샘플_값: Array.isArray(embedding) ? embedding.slice(0, 3) : '파싱 실패'
            });
          } catch (parseError) {
            console.error('임베딩 데이터 파싱 오류:', parseError);
          }
        }
      }

      return {
        total_nodes: totalNodes,
        nodes_with_embedding: nodesWithEmbedding,
        embedding_coverage: Math.round(embeddingCoverage * 100) / 100,
        avg_similarity: 0 // 향후 구현
      };
    } catch (error) {
      console.error('임베딩 통계 조회 오류:', error);
      throw error;
    }
  }

  // 임베딩 품질 분석
  async analyzeEmbeddingQuality(): Promise<{
    cluster_count: number;
    avg_intra_cluster_similarity: number;
    avg_inter_cluster_similarity: number;
    quality_score: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('analyze_embedding_quality');

      if (error) {
        throw new Error(`임베딩 품질 분석 실패: ${error.message}`);
      }

      // 함수가 JSON을 직접 반환하므로 data를 직접 사용
      return data || {
        cluster_count: 0,
        avg_intra_cluster_similarity: 0,
        avg_inter_cluster_similarity: 0,
        quality_score: 0
      };
    } catch (error) {
      console.error('임베딩 품질 분석 오류:', error);
      throw error;
    }
  }

  // embedding 필드가 없을 때 사용할 콘텐츠 기반 검색
  private async performContentBasedSearch(
    targetNode: { id: string; title: string; content: string },
    options: { limit?: number; similarity_threshold?: number; exclude_self?: boolean } = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      console.log('📝 콘텐츠 기반 유사도 검색 수행');

      const { limit = 5 } = options;

      // 다른 노드들 조회
      const { data: otherNodes, error } = await supabase
        .from('knowledge_nodes')
        .select('id, title, content, node_type, tags, created_at, updated_at')
        .eq('is_active', true)
        .neq('id', targetNode.id)
        .limit(50); // 최대 50개 중에서 검색

      if (error) {
        console.error('❌ 다른 노드 조회 실패:', error);
        return [];
      }

      if (!otherNodes || otherNodes.length === 0) {
        console.log('📭 비교할 다른 노드가 없습니다');
        return [];
      }

      // 단순 텍스트 유사도 계산 (키워드 기반)
      const targetWords = this.extractKeywords(targetNode.title + ' ' + (targetNode.content || ''));

      const similarityResults = otherNodes.map(node => {
        const nodeWords = this.extractKeywords(node.title + ' ' + (node.content || ''));
        const similarity = this.calculateTextSimilarity(targetWords, nodeWords);

        return {
          id: node.id,
          title: node.title,
          content: node.content || '',
          node_type: node.node_type || 'Knowledge',
          tags: node.tags || [],
          created_at: node.created_at,
          updated_at: node.updated_at,
          similarity
        };
      });

      // 유사도 순으로 정렬 후 상위 결과 반환
      const sortedResults = similarityResults
        .filter(result => result.similarity > 0.1) // 최소 유사도 필터
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log(`✅ 콘텐츠 기반 검색 완료: ${sortedResults.length}개 결과`);
      return sortedResults;

    } catch (error) {
      console.error('❌ 콘텐츠 기반 검색 실패:', error);
      return [];
    }
  }

  // 키워드 추출 (간단한 구현)
  private extractKeywords(text: string): string[] {
    if (!text) return [];

    return text
      .toLowerCase()
      .replace(/[^가-힣a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .slice(0, 50); // 최대 50개 키워드
  }

  // 텍스트 유사도 계산 (자카드 유사도 기반)
  private calculateTextSimilarity(words1: string[], words2: string[]): number {
    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
}

export const embeddingService = new EmbeddingService();