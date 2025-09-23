import React from 'react';

interface SkeletonLoaderProps {
  variant: 'card' | 'list' | 'text' | 'avatar' | 'button' | 'node' | 'dashboard-stats' | 'search-result';
  count?: number;
  height?: string;
  width?: string;
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
}

const SkeletonBase: React.FC<{
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded'
}) => (
  <div
    className={`
      ${width} ${height} ${rounded}
      bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200
      animate-pulse bg-[length:200%_100%]
      ${className}
    `}
    style={{
      animation: 'shimmer 1.5s ease-in-out infinite',
    }}
  />
);

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant,
  count = 1,
  height,
  width,
  className = '',
  showAvatar = false,
  showActions = false,
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`bg-white rounded-xl border border-gray-200 p-6 space-y-4 ${className}`}>
            {/* 헤더 */}
            <div className="flex items-center space-x-3">
              {showAvatar && <SkeletonBase width="w-10" height="h-10" rounded="rounded-full" />}
              <div className="flex-1 space-y-2">
                <SkeletonBase width="w-3/4" height="h-5" />
                <SkeletonBase width="w-1/2" height="h-3" />
              </div>
            </div>

            {/* 콘텐츠 */}
            <div className="space-y-3">
              <SkeletonBase width="w-full" height="h-4" />
              <SkeletonBase width="w-5/6" height="h-4" />
              <SkeletonBase width="w-4/5" height="h-4" />
            </div>

            {/* 액션 */}
            {showActions && (
              <div className="flex justify-between items-center pt-4">
                <div className="flex space-x-2">
                  <SkeletonBase width="w-16" height="h-6" rounded="rounded-full" />
                  <SkeletonBase width="w-16" height="h-6" rounded="rounded-full" />
                </div>
                <SkeletonBase width="w-20" height="h-8" rounded="rounded-lg" />
              </div>
            )}
          </div>
        );

      case 'list':
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
                {showAvatar && <SkeletonBase width="w-12" height="h-12" rounded="rounded-full" />}
                <div className="flex-1 space-y-2">
                  <SkeletonBase width="w-3/4" height="h-5" />
                  <SkeletonBase width="w-1/2" height="h-3" />
                </div>
                {showActions && <SkeletonBase width="w-8" height="h-8" rounded="rounded" />}
              </div>
            ))}
          </div>
        );

      case 'node':
        return (
          <div className={`bg-white rounded-xl border border-gray-200 p-6 space-y-4 ${className}`}>
            {/* 노드 헤더 */}
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <SkeletonBase width="w-3/4" height="h-7" />
                <div className="flex items-center space-x-2">
                  <SkeletonBase width="w-16" height="h-5" rounded="rounded-full" />
                  <SkeletonBase width="w-20" height="h-5" rounded="rounded-full" />
                </div>
              </div>
              <SkeletonBase width="w-8" height="h-8" rounded="rounded" />
            </div>

            {/* 노드 콘텐츠 */}
            <div className="space-y-3 pt-4">
              <SkeletonBase width="w-full" height="h-4" />
              <SkeletonBase width="w-5/6" height="h-4" />
              <SkeletonBase width="w-4/5" height="h-4" />
              <SkeletonBase width="w-3/4" height="h-4" />
            </div>

            {/* 태그 및 액션 */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <SkeletonBase width="w-12" height="h-6" rounded="rounded-full" />
                <SkeletonBase width="w-16" height="h-6" rounded="rounded-full" />
                <SkeletonBase width="w-14" height="h-6" rounded="rounded-full" />
              </div>
              <div className="flex space-x-2">
                <SkeletonBase width="w-8" height="h-8" rounded="rounded" />
                <SkeletonBase width="w-8" height="h-8" rounded="rounded" />
              </div>
            </div>
          </div>
        );

      case 'dashboard-stats':
        return (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <SkeletonBase width="w-20" height="h-4" />
                    <SkeletonBase width="w-16" height="h-8" />
                  </div>
                  <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
                </div>
                <div className="mt-4">
                  <SkeletonBase width="w-24" height="h-3" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'search-result':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start space-x-3">
                  <SkeletonBase width="w-2" height="h-12" rounded="rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBase width="w-3/4" height="h-5" />
                    <SkeletonBase width="w-full" height="h-4" />
                    <SkeletonBase width="w-5/6" height="h-4" />
                    <div className="flex items-center space-x-4 pt-2">
                      <SkeletonBase width="w-16" height="h-3" />
                      <SkeletonBase width="w-20" height="h-3" />
                      <SkeletonBase width="w-12" height="h-3" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: count }).map((_, index) => (
              <SkeletonBase
                key={index}
                width={width || (index === count - 1 ? 'w-3/4' : 'w-full')}
                height={height || 'h-4'}
              />
            ))}
          </div>
        );

      case 'avatar':
        return (
          <div className={`flex items-center space-x-3 ${className}`}>
            <SkeletonBase width="w-10" height="h-10" rounded="rounded-full" />
            <div className="space-y-1">
              <SkeletonBase width="w-24" height="h-4" />
              <SkeletonBase width="w-16" height="h-3" />
            </div>
          </div>
        );

      case 'button':
        return (
          <SkeletonBase
            width={width || 'w-24'}
            height={height || 'h-10'}
            rounded="rounded-lg"
            className={className}
          />
        );

      default:
        return <SkeletonBase width={width} height={height} className={className} />;
    }
  };

  if (variant === 'list' || variant === 'search-result' || variant === 'text') {
    return <>{renderSkeleton()}</>;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={index > 0 ? 'mt-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

// 애니메이션 스타일을 위한 CSS
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// 스타일을 헤드에 주입
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = shimmerStyles;
  document.head.appendChild(styleElement);
}

// 특정 용도별 미리 구성된 스켈레톤 컴포넌트들
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`space-y-6 ${className || ''}`}>
    {/* 통계 카드들 */}
    <SkeletonLoader variant="dashboard-stats" />

    {/* 최근 노드 섹션 */}
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBase width="w-32" height="h-6" />
        <SkeletonBase width="w-20" height="h-8" rounded="rounded-lg" />
      </div>
      <SkeletonLoader variant="list" count={3} showAvatar />
    </div>
  </div>
);

export const KnowledgeListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <SkeletonLoader variant="node" count={count} />
  </div>
);

export const NodeDetailSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    {/* 헤더 */}
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-3">
          <SkeletonBase width="w-3/4" height="h-8" />
          <div className="flex items-center space-x-2">
            <SkeletonBase width="w-16" height="h-5" rounded="rounded-full" />
            <SkeletonBase width="w-20" height="h-5" rounded="rounded-full" />
            <SkeletonBase width="w-18" height="h-5" rounded="rounded-full" />
          </div>
        </div>
        <div className="flex space-x-2">
          <SkeletonBase width="w-8" height="h-8" rounded="rounded" />
          <SkeletonBase width="w-8" height="h-8" rounded="rounded" />
        </div>
      </div>
    </div>

    {/* 콘텐츠 */}
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SkeletonBase width="w-20" height="h-6" className="mb-4" />
      <div className="space-y-3">
        <SkeletonBase width="w-full" height="h-4" />
        <SkeletonBase width="w-5/6" height="h-4" />
        <SkeletonBase width="w-4/5" height="h-4" />
        <SkeletonBase width="w-full" height="h-4" />
        <SkeletonBase width="w-3/4" height="h-4" />
      </div>
    </div>

    {/* 관련 노드들 */}
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SkeletonBase width="w-24" height="h-6" className="mb-4" />
      <SkeletonLoader variant="list" count={3} showAvatar />
    </div>
  </div>
);

export const SearchSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-4">
    {/* 검색 필터 */}
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center space-x-4">
        <SkeletonBase width="w-32" height="h-10" rounded="rounded-lg" />
        <SkeletonBase width="w-24" height="h-10" rounded="rounded-lg" />
        <SkeletonBase width="w-28" height="h-10" rounded="rounded-lg" />
      </div>
    </div>

    {/* 검색 결과 */}
    <SkeletonLoader variant="search-result" count={count} />
  </div>
);