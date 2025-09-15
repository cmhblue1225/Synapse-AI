// AI 기반 링크 추천 서비스

import { supabase } from '../lib/supabase';
import { performanceMonitor } from '../lib/apiOptimizer';

// 링크 추천 결과 타입
export interface LinkRecommendation {
  node_id: string;
  title: string;
  score: number;
  node_type: string;
  tags: string[];
  created_at: string;
  recommendation_reason: string;
  recommendation_type: 'similarity' | 'tags' | 'type';
}

// 유사도 기반 추천 결과 타입
export interface SimilarityRecommendation {
  node_id: string;
  title: string;
  similarity_score: number;
  node_type: string;
  tags: string[];
  created_at: string;
  reason: string;
}

// 태그 기반 추천 결과 타입
export interface TagRecommendation {
  node_id: string;
  title: string;
  common_tags_count: number;
  node_type: string;
  tags: string[];
  created_at: string;
  reason: string;
}

// 타입 기반 추천 결과 타입
export interface TypeRecommendation {
  node_id: string;
  title: string;
  node_type: string;
  tags: string[];
  created_at: string;
  reason: string;
}

export class LinkRecommendationService {
  // 종합 링크 추천 (모든 방식 결합)
  async getComprehensiveLinkRecommendations(
    sourceNodeId: string,
    maxRecommendations: number = 10
  ): Promise<LinkRecommendation[]> {
    return performanceMonitor.measureApiCall(
      `comprehensive-recommendations-${sourceNodeId}`,
      async () => {
        const { data, error } = await supabase.rpc(
          'get_comprehensive_link_recommendations',
          {
            source_node_id: sourceNodeId,
            max_recommendations: maxRecommendations
          }
        );

        if (error) {
          throw new Error(`종합 링크 추천 실패: ${error.message}`);
        }

        return data || [];
      }
    );
  }

  // 유사도 기반 링크 추천
  async getSimilarityBasedRecommendations(
    sourceNodeId: string,
    options: {
      similarity_threshold?: number;
      max_recommendations?: number;
      exclude_existing?: boolean;
    } = {}
  ): Promise<SimilarityRecommendation[]> {
    return performanceMonitor.measureApiCall(
      `similarity-recommendations-${sourceNodeId}`,
      async () => {
        const { data, error } = await supabase.rpc(
          'recommend_links_by_similarity',
          {
            source_node_id: sourceNodeId,
            similarity_threshold: options.similarity_threshold || 0.7,
            max_recommendations: options.max_recommendations || 5,
            exclude_existing: options.exclude_existing !== false
          }
        );

        if (error) {
          throw new Error(`유사도 기반 추천 실패: ${error.message}`);
        }

        return data || [];
      }
    );
  }

  // 태그 기반 링크 추천
  async getTagBasedRecommendations(
    sourceNodeId: string,
    options: {
      max_recommendations?: number;
      exclude_existing?: boolean;
    } = {}
  ): Promise<TagRecommendation[]> {
    return performanceMonitor.measureApiCall(
      `tag-recommendations-${sourceNodeId}`,
      async () => {
        const { data, error } = await supabase.rpc(
          'recommend_links_by_tags',
          {
            source_node_id: sourceNodeId,
            max_recommendations: options.max_recommendations || 5,
            exclude_existing: options.exclude_existing !== false
          }
        );

        if (error) {
          throw new Error(`태그 기반 추천 실패: ${error.message}`);
        }

        return data || [];
      }
    );
  }

  // 노드 타입 기반 링크 추천
  async getTypeBasedRecommendations(
    sourceNodeId: string,
    options: {
      max_recommendations?: number;
      exclude_existing?: boolean;
    } = {}
  ): Promise<TypeRecommendation[]> {
    return performanceMonitor.measureApiCall(
      `type-recommendations-${sourceNodeId}`,
      async () => {
        const { data, error } = await supabase.rpc(
          'recommend_links_by_type',
          {
            source_node_id: sourceNodeId,
            max_recommendations: options.max_recommendations || 3,
            exclude_existing: options.exclude_existing !== false
          }
        );

        if (error) {
          throw new Error(`타입 기반 추천 실패: ${error.message}`);
        }

        return data || [];
      }
    );
  }

  // 추천된 링크 생성 (실제 관계 생성)
  async createRecommendedLink(
    sourceNodeId: string,
    targetNodeId: string,
    options: {
      relationship_type?: string;
      weight?: number;
    } = {}
  ): Promise<string> {
    return performanceMonitor.measureApiCall(
      `create-link-${sourceNodeId}-${targetNodeId}`,
      async () => {
        const { data, error } = await supabase.rpc(
          'create_recommended_link',
          {
            source_node_id: sourceNodeId,
            target_node_id: targetNodeId,
            relationship_type: options.relationship_type || 'related_to',
            weight: options.weight || 1.0
          }
        );

        if (error) {
          throw new Error(`링크 생성 실패: ${error.message}`);
        }

        return data;
      }
    );
  }

  // 추천 품질 평가 (사용자 피드백 기반)
  async evaluateRecommendation(
    sourceNodeId: string,
    targetNodeId: string,
    recommendationType: string,
    feedback: 'accepted' | 'rejected' | 'ignored'
  ): Promise<void> {
    try {
      // 추천 품질 평가를 위한 로깅 (향후 ML 모델 개선용)
      const evaluationData = {
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        recommendation_type: recommendationType,
        user_feedback: feedback,
        timestamp: new Date().toISOString()
      };

      // 실제 환경에서는 별도 평가 테이블에 저장하거나 분석 시스템으로 전송
      console.log('Recommendation evaluation:', evaluationData);

      // 향후 구현: 평가 데이터를 기반으로 추천 알고리즘 개선
    } catch (error) {
      console.error('추천 평가 실패:', error);
      // 평가 실패는 사용자 경험에 영향을 주지 않음
    }
  }

  // 사용자별 추천 통계
  async getRecommendationStats(userId?: string): Promise<{
    total_recommendations: number;
    accepted_recommendations: number;
    acceptance_rate: number;
    most_common_type: string;
  }> {
    try {
      // 향후 구현: 사용자별 추천 통계 조회
      // 현재는 더미 데이터 반환
      return {
        total_recommendations: 0,
        accepted_recommendations: 0,
        acceptance_rate: 0,
        most_common_type: 'similarity'
      };
    } catch (error) {
      console.error('추천 통계 조회 실패:', error);
      throw error;
    }
  }

  // 배치 추천 (여러 노드에 대한 추천을 한 번에 처리)
  async getBatchRecommendations(
    nodeIds: string[],
    maxRecommendationsPerNode: number = 5
  ): Promise<{ [nodeId: string]: LinkRecommendation[] }> {
    const results: { [nodeId: string]: LinkRecommendation[] } = {};

    // 동시 실행으로 성능 향상
    const promises = nodeIds.map(async (nodeId) => {
      try {
        const recommendations = await this.getComprehensiveLinkRecommendations(
          nodeId,
          maxRecommendationsPerNode
        );
        results[nodeId] = recommendations;
      } catch (error) {
        console.error(`노드 ${nodeId} 추천 실패:`, error);
        results[nodeId] = [];
      }
    });

    await Promise.all(promises);
    return results;
  }

  // 추천 결과 필터링 (사용자 설정 기반)
  filterRecommendations(
    recommendations: LinkRecommendation[],
    filters: {
      min_score?: number;
      preferred_types?: string[];
      excluded_tags?: string[];
      max_age_days?: number;
    } = {}
  ): LinkRecommendation[] {
    return recommendations.filter((rec) => {
      // 최소 점수 필터
      if (filters.min_score && rec.score < filters.min_score) {
        return false;
      }

      // 선호 타입 필터
      if (filters.preferred_types &&
          filters.preferred_types.length > 0 &&
          !filters.preferred_types.includes(rec.node_type)) {
        return false;
      }

      // 제외 태그 필터
      if (filters.excluded_tags &&
          filters.excluded_tags.some(tag => rec.tags.includes(tag))) {
        return false;
      }

      // 생성일 필터 (너무 오래된 노드 제외)
      if (filters.max_age_days) {
        const createdDate = new Date(rec.created_at);
        const maxAge = new Date();
        maxAge.setDate(maxAge.getDate() - filters.max_age_days);

        if (createdDate < maxAge) {
          return false;
        }
      }

      return true;
    });
  }

  // 추천 결과 다양성 증대 (같은 타입의 노드가 너무 많지 않도록)
  diversifyRecommendations(
    recommendations: LinkRecommendation[],
    maxPerType: number = 2
  ): LinkRecommendation[] {
    const typeCount: { [type: string]: number } = {};
    const diversified: LinkRecommendation[] = [];

    recommendations.forEach((rec) => {
      const currentCount = typeCount[rec.node_type] || 0;
      if (currentCount < maxPerType) {
        diversified.push(rec);
        typeCount[rec.node_type] = currentCount + 1;
      }
    });

    return diversified;
  }
}

export const linkRecommendationService = new LinkRecommendationService();