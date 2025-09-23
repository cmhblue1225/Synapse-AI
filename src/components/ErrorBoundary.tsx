import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 에러가 발생하면 fallback UI를 보여주도록 상태 업데이트
    return {
      hasError: true,
      error,
      errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅 및 모니터링 서비스에 전송
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);

    // 에러 정보를 상태에 저장
    this.setState({
      error,
      errorInfo
    });

    // 부모 컴포넌트에 에러 알림
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 실제 프로덕션에서는 Sentry, LogRocket 등으로 에러 리포팅
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // 에러 리포팅 로직
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: null, // 실제로는 현재 로그인한 사용자 ID를 가져와야 함
    };

    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Error Report');
      console.error('Error:', errorReport);
      console.groupEnd();
    }

    // 프로덕션에서는 외부 서비스로 전송
    // Example: Sentry.captureException(error, { extra: errorReport });
  };

  private handleRetry = () => {
    // 컴포넌트 상태 리셋하여 다시 렌더링 시도
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    // 페이지 새로고침
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback UI가 제공된 경우 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI 렌더링
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full">
            {/* 에러 카드 */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* 헤더 */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">앗! 문제가 발생했습니다</h1>
                    <p className="text-red-100 mt-1">예상치 못한 오류가 발생했습니다</p>
                  </div>
                </div>
              </div>

              {/* 콘텐츠 */}
              <div className="px-8 py-8">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">무엇이 잘못되었나요?</h2>
                  <p className="text-gray-600 leading-relaxed">
                    애플리케이션에서 예상치 못한 오류가 발생했습니다.
                    이 문제는 자동으로 개발팀에 보고되었으며, 빠른 시일 내에 해결하도록 하겠습니다.
                  </p>
                </div>

                {/* 에러 정보 (개발 환경에서만 표시) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">개발자 정보:</h3>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        에러 세부사항 보기
                      </summary>
                      <div className="mt-2 p-2 bg-red-50 rounded border-l-4 border-red-400">
                        <p className="font-mono text-xs text-red-800 whitespace-pre-wrap">
                          {this.state.error.message}
                        </p>
                        {this.state.error.stack && (
                          <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                            {this.state.error.stack}
                          </pre>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {/* 에러 ID */}
                <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">오류 ID:</span> {this.state.errorId}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    고객지원에 문의하실 때 이 ID를 알려주세요.
                  </p>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleRetry}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                  >
                    <ArrowPathIcon className="w-5 h-5 mr-2" />
                    다시 시도
                  </button>

                  <button
                    onClick={this.handleReload}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                  >
                    <ArrowPathIcon className="w-5 h-5 mr-2" />
                    페이지 새로고침
                  </button>

                  <Link
                    to="/app"
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                  >
                    <HomeIcon className="w-5 h-5 mr-2" />
                    홈으로 이동
                  </Link>
                </div>

                {/* 도움말 */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">계속 문제가 발생하나요?</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• 브라우저를 새로고침해보세요</p>
                    <p>• 브라우저 캐시를 삭제해보세요</p>
                    <p>• 다른 브라우저를 사용해보세요</p>
                    <p>• 문제가 계속되면 고객지원팀에 문의해주세요</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Synapse AI • 지식 관리 시스템 • 기술지원: support@synapse.ai
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 함수형 컴포넌트를 위한 커스텀 에러 훅
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: string) => {
    console.error('🚨 Manual error reported:', error, errorInfo);

    // 수동으로 에러를 던져서 ErrorBoundary가 캐치하도록 함
    throw error;
  }, []);

  return { handleError };
};

// 특정 상황을 위한 미리 구성된 에러 경계 컴포넌트들
export const RouteErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('🛣️ Route Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const FeatureErrorBoundary: React.FC<{
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
}> = ({ children, featureName, fallback }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error(`🔧 Feature Error (${featureName}):`, error, errorInfo);
    }}
    fallback={fallback || (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
          <h3 className="text-sm font-medium text-yellow-800">
            {featureName} 기능에 문제가 발생했습니다
          </h3>
        </div>
        <p className="mt-1 text-sm text-yellow-700">
          이 기능을 일시적으로 사용할 수 없습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
        </p>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);