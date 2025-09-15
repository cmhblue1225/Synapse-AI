import React, { useEffect, useState } from 'react';
import { Sparkles, Database, Target, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { embeddingService } from '../../services/embedding.service';
import { toast } from 'react-toastify';

interface EmbeddingStats {
  total_nodes: number;
  nodes_with_embedding: number;
  embedding_coverage: number;
  avg_similarity: number;
}

interface EmbeddingQuality {
  cluster_count: number;
  avg_intra_cluster_similarity: number;
  avg_inter_cluster_similarity: number;
  quality_score: number;
}

export function EmbeddingStatsCard() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [quality, setQuality] = useState<EmbeddingQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const [statsData, qualityData] = await Promise.all([
        embeddingService.getEmbeddingStats(),
        embeddingService.analyzeEmbeddingQuality()
      ]);

      setStats(statsData);
      setQuality(qualityData);
    } catch (error: any) {
      console.error('임베딩 통계 조회 오류:', error);
      toast.error('통계를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateEmbeddings = async () => {
    if (!stats || generating) return;

    const missingCount = stats.total_nodes - stats.nodes_with_embedding;
    if (missingCount === 0) {
      toast.info('모든 노드에 이미 임베딩이 생성되어 있습니다.');
      return;
    }

    setGenerating(true);
    try {
      const result = await embeddingService.generateEmbeddingsForAllNodes();

      toast.success(`임베딩 생성 완료: 성공 ${result.success}개, 실패 ${result.failed}개`);
      setLastGenerated(new Date());

      // 통계 새로고침
      await fetchData();
    } catch (error: any) {
      console.error('임베딩 생성 오류:', error);
      toast.error('임베딩 생성 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !quality) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-gray-500">
          <Database className="h-8 w-8 mx-auto mb-2" />
          <p>임베딩 통계를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const missingEmbeddings = stats.total_nodes - stats.nodes_with_embedding;
  const coverageColor = stats.embedding_coverage >= 90 ? 'text-green-600' :
                       stats.embedding_coverage >= 70 ? 'text-yellow-600' : 'text-red-600';
  const qualityColor = quality.quality_score >= 0.3 ? 'text-green-600' :
                      quality.quality_score >= 0.2 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">AI 임베딩 현황</h3>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 기본 통계 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.total_nodes}</div>
            <div className="text-sm text-gray-600">총 지식 노드</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.nodes_with_embedding}</div>
            <div className="text-sm text-gray-600">임베딩 완료</div>
          </div>
        </div>

        {/* 커버리지 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">임베딩 커버리지</span>
            <span className={`text-sm font-bold ${coverageColor}`}>
              {stats.embedding_coverage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                stats.embedding_coverage >= 90 ? 'bg-green-500' :
                stats.embedding_coverage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.embedding_coverage}%` }}
            ></div>
          </div>
          {missingEmbeddings > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {missingEmbeddings}개 노드에 임베딩이 없습니다
            </p>
          )}
        </div>

        {/* 품질 메트릭 */}
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-gray-700">평균 유사도</span>
            </div>
            <span className="font-medium">{stats.avg_similarity.toFixed(3)}</span>
          </div>

          {quality.cluster_count > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700">추정 클러스터</span>
                </div>
                <span className="font-medium">{quality.cluster_count}개</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-700">품질 점수</span>
                </div>
                <span className={`font-medium ${qualityColor}`}>
                  {quality.quality_score.toFixed(3)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 임베딩 생성 버튼 */}
        {missingEmbeddings > 0 && (
          <div className="pt-4 border-t">
            <button
              onClick={handleGenerateEmbeddings}
              disabled={generating}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                generating
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                  <span>임베딩 생성 중...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>{missingEmbeddings}개 노드 임베딩 생성</span>
                </>
              )}
            </button>

            <div className="mt-2 text-xs text-gray-500 text-center">
              AI가 지식의 의미를 분석하여 검색과 추천 기능이 향상됩니다
            </div>
          </div>
        )}

        {/* 마지막 생성 시간 */}
        {lastGenerated && (
          <div className="pt-2 text-xs text-gray-500 text-center">
            마지막 생성: {lastGenerated.toLocaleString('ko-KR')}
          </div>
        )}

        {/* 도움말 */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700">
              <strong>임베딩이란?</strong><br />
              AI가 텍스트의 의미를 숫자로 변환한 것으로, 유사한 내용의 지식을 찾고 추천하는데 사용됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}