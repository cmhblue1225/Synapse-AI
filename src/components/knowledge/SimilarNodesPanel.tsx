import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Clock, Tag, TrendingUp } from 'lucide-react';
import { embeddingService } from '../../services/embedding.service';
import { toast } from 'react-toastify';

interface SimilarNode {
  id: string;
  title: string;
  content: string;
  similarity: number;
  node_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface SimilarNodesPanelProps {
  nodeId: string;
  className?: string;
  maxNodes?: number;
}

export function SimilarNodesPanel({
  nodeId,
  className = '',
  maxNodes = 5
}: SimilarNodesPanelProps) {
  const [similarNodes, setSimilarNodes] = useState<SimilarNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nodeId) return;

    const fetchSimilarNodes = async () => {
      setLoading(true);
      setError(null);

      try {
        const nodes = await embeddingService.findSimilarNodes(nodeId, {
          limit: maxNodes,
          similarity_threshold: 0.4,
          exclude_self: true
        });

        setSimilarNodes(nodes);
      } catch (err: any) {
        console.error('유사 노드 조회 오류:', err);
        setError('유사한 지식을 찾는 중 오류가 발생했습니다.');
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarNodes();
  }, [nodeId, maxNodes]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
          <h3 className="font-semibold text-gray-900">관련 지식</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">관련 지식</h3>
        </div>
        <div className="text-center py-4">
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (similarNodes.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">관련 지식</h3>
        </div>
        <div className="text-center py-6">
          <Sparkles className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">
            아직 관련된 지식이 없습니다.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            더 많은 지식을 추가하면 AI가 연관성을 분석해드립니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold text-gray-900">관련 지식</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            AI 추천
          </span>
        </div>
        <div className="text-xs text-gray-500 flex items-center">
          <TrendingUp className="h-3 w-3 mr-1" />
          유사도 기준
        </div>
      </div>

      <div className="space-y-4">
        {similarNodes.map((node, index) => (
          <Link
            key={node.id}
            to={`/app/knowledge/${node.id}`}
            className="block group hover:bg-gray-50 p-3 -m-3 rounded-lg transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                    {node.title}
                  </h4>
                  <ArrowRight className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {node.content}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                      {node.node_type}
                    </span>

                    {node.tags.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Tag className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">
                          {node.tags.slice(0, 2).join(', ')}
                          {node.tags.length > 2 && ` +${node.tags.length - 2}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-500">
                      {formatRelativeTime(node.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-3 flex-shrink-0 text-right">
                <div className="text-xs text-gray-500 mb-1">유사도</div>
                <div className={`text-sm font-medium ${getSimilarityColor(node.similarity)}`}>
                  {Math.round(node.similarity * 100)}%
                </div>
                <div className="w-12 bg-gray-200 rounded-full h-1 mt-1">
                  <div
                    className={`h-1 rounded-full ${getSimilarityBarColor(node.similarity)}`}
                    style={{ width: `${node.similarity * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {similarNodes.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-gray-500 text-center">
            <Sparkles className="h-3 w-3 inline mr-1" />
            AI가 내용의 의미를 분석해서 추천한 지식입니다
          </div>
        </div>
      )}
    </div>
  );
}

// 유틸리티 함수들
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}일 전`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}주 전`;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getSimilarityColor(similarity: number): string {
  if (similarity > 0.9) return 'text-green-600';
  if (similarity > 0.8) return 'text-blue-600';
  if (similarity > 0.7) return 'text-yellow-600';
  return 'text-gray-600';
}

function getSimilarityBarColor(similarity: number): string {
  if (similarity > 0.9) return 'bg-green-500';
  if (similarity > 0.8) return 'bg-blue-500';
  if (similarity > 0.7) return 'bg-yellow-500';
  return 'bg-gray-500';
}