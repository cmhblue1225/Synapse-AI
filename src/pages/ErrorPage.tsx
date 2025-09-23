import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  ShieldExclamationIcon,
  WifiIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface ErrorPageProps {
  errorType?: 'network' | 'server' | 'permission' | 'notFound' | 'unknown';
  errorCode?: string | number;
  errorMessage?: string;
  showRetry?: boolean;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  errorType = 'unknown',
  errorCode = '500',
  errorMessage,
  showRetry = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getErrorInfo = () => {
    switch (errorType) {
      case 'network':
        return {
          icon: WifiIcon,
          title: '네트워크 연결 오류',
          description: '인터넷 연결을 확인해주세요',
          suggestions: [
            '인터넷 연결 상태를 확인해주세요',
            '잠시 후 다시 시도해주세요',
            'VPN을 사용 중이라면 비활성화해보세요',
            'DNS 설정을 확인해주세요'
          ],
          color: 'blue'
        };

      case 'server':
        return {
          icon: ServerIcon,
          title: '서버 오류',
          description: '서버에서 문제가 발생했습니다',
          suggestions: [
            '서버에 일시적인 문제가 발생했습니다',
            '잠시 후 다시 시도해주세요',
            '문제가 계속되면 고객지원팀에 문의해주세요',
            '시스템 상태를 확인해주세요'
          ],
          color: 'red'
        };

      case 'permission':
        return {
          icon: ShieldExclamationIcon,
          title: '접근 권한 없음',
          description: '이 페이지에 접근할 권한이 없습니다',
          suggestions: [
            '로그인이 필요한 페이지입니다',
            '적절한 권한이 있는지 확인해주세요',
            '계정 관리자에게 문의해주세요',
            '다시 로그인을 시도해주세요'
          ],
          color: 'amber'
        };

      case 'notFound':
        return {
          icon: ExclamationTriangleIcon,
          title: '페이지를 찾을 수 없습니다',
          description: '요청하신 페이지가 존재하지 않습니다',
          suggestions: [
            'URL 주소를 다시 확인해주세요',
            '페이지가 이동되었거나 삭제되었을 수 있습니다',
            '홈페이지에서 원하는 내용을 찾아보세요',
            '검색 기능을 사용해보세요'
          ],
          color: 'gray'
        };

      default:
        return {
          icon: ExclamationTriangleIcon,
          title: '예상치 못한 오류',
          description: '알 수 없는 오류가 발생했습니다',
          suggestions: [
            '페이지를 새로고침해보세요',
            '브라우저 캐시를 삭제해보세요',
            '다른 브라우저를 사용해보세요',
            '문제가 계속되면 고객지원팀에 문의해주세요'
          ],
          color: 'red'
        };
    }
  };

  const errorInfo = getErrorInfo();
  const IconComponent = errorInfo.icon;

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/app');
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      red: {
        bg: 'from-red-500 to-red-600',
        text: 'text-red-100',
        accent: 'text-red-600'
      },
      blue: {
        bg: 'from-blue-500 to-blue-600',
        text: 'text-blue-100',
        accent: 'text-blue-600'
      },
      amber: {
        bg: 'from-amber-500 to-amber-600',
        text: 'text-amber-100',
        accent: 'text-amber-600'
      },
      gray: {
        bg: 'from-gray-500 to-gray-600',
        text: 'text-gray-100',
        accent: 'text-gray-600'
      }
    };
    return colors[color as keyof typeof colors] || colors.red;
  };

  const colorClasses = getColorClasses(errorInfo.color);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* 에러 카드 */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* 헤더 */}
          <div className={`bg-gradient-to-r ${colorClasses.bg} px-8 py-6`}>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <IconComponent className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{errorInfo.title}</h1>
                <p className={`${colorClasses.text} mt-1`}>{errorInfo.description}</p>
                {errorCode && (
                  <p className={`${colorClasses.text} text-sm mt-1 opacity-80`}>
                    오류 코드: {errorCode}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 콘텐츠 */}
          <div className="px-8 py-8">
            {/* 커스텀 에러 메시지 */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">상세 정보:</h3>
                <p className="text-sm text-gray-700">{errorMessage}</p>
              </div>
            )}

            {/* 해결 방법 제안 */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">해결 방법을 시도해보세요:</h2>
              <ul className="space-y-2">
                {errorInfo.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full bg-gray-400 mt-2`}></div>
                    <p className="text-gray-600 text-sm">{suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-3">
              {showRetry && (
                <button
                  onClick={handleRetry}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                >
                  <ArrowPathIcon className="w-5 h-5 mr-2" />
                  다시 시도
                </button>
              )}

              <button
                onClick={handleGoBack}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                이전 페이지
              </button>

              <Link
                to="/app"
                className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                <HomeIcon className="w-5 h-5 mr-2" />
                홈으로 이동
              </Link>
            </div>

            {/* 디버그 정보 (개발 환경에서만) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                    개발자 정보 보기
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded border">
                    <div className="space-y-1 text-xs text-gray-600">
                      <p><span className="font-medium">Current path:</span> {location.pathname}</p>
                      <p><span className="font-medium">Search:</span> {location.search || 'None'}</p>
                      <p><span className="font-medium">Error type:</span> {errorType}</p>
                      <p><span className="font-medium">Error code:</span> {errorCode}</p>
                      <p><span className="font-medium">Timestamp:</span> {new Date().toISOString()}</p>
                      <p><span className="font-medium">User agent:</span> {navigator.userAgent}</p>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* 추가 도움말 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">
            문제가 지속적으로 발생하나요?
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <a
              href="mailto:support@synapse.ai"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              고객지원 문의
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="/status"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              서비스 상태
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="/help"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              도움말
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// 특정 HTTP 상태 코드를 위한 미리 구성된 컴포넌트들
export const Error404Page: React.FC = () => (
  <ErrorPage
    errorType="notFound"
    errorCode="404"
    errorMessage="요청하신 페이지가 존재하지 않거나 이동되었습니다."
  />
);

export const Error500Page: React.FC = () => (
  <ErrorPage
    errorType="server"
    errorCode="500"
    errorMessage="서버에서 내부 오류가 발생했습니다."
  />
);

export const Error403Page: React.FC = () => (
  <ErrorPage
    errorType="permission"
    errorCode="403"
    errorMessage="이 리소스에 접근할 권한이 없습니다."
  />
);

export const NetworkErrorPage: React.FC = () => (
  <ErrorPage
    errorType="network"
    errorMessage="네트워크 연결에 문제가 발생했습니다."
  />
);