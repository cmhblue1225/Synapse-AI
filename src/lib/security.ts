// 보안 강화를 위한 유틸리티 함수들

import DOMPurify from 'isomorphic-dompurify';

// XSS 방지를 위한 HTML 새니타이제이션
export const sanitizer = {
  // HTML 콘텐츠 새니타이제이션
  sanitizeHtml: (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  },

  // 텍스트 새니타이제이션 (HTML 태그 제거)
  sanitizeText: (text: string): string => {
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  },

  // URL 새니타이제이션
  sanitizeUrl: (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      // 허용된 프로토콜만 통과
      if (!['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol)) {
        return '';
      }
      return url;
    } catch {
      return '';
    }
  },

  // 파일명 새니타이제이션
  sanitizeFilename: (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9가-힣.\-_]/g, '') // 허용된 문자만 유지
      .replace(/\.{2,}/g, '.') // 연속된 점 제거
      .substring(0, 100); // 길이 제한
  }
};

// 입력 검증
export const validator = {
  // 이메일 형식 검증
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  // 비밀번호 강도 검증
  isStrongPassword: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('소문자를 포함해야 합니다.');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('대문자를 포함해야 합니다.');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('숫자를 포함해야 합니다.');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('특수문자(@$!%*?&)를 포함해야 합니다.');
    }

    if (password.length > 128) {
      errors.push('비밀번호는 128자를 초과할 수 없습니다.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // UUID 형식 검증
  isValidUUID: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // 텍스트 길이 검증
  isValidTextLength: (text: string, min: number = 0, max: number = 10000): boolean => {
    return text.length >= min && text.length <= max;
  },

  // 태그 형식 검증 (공백 허용)
  isValidTag: (tag: string): boolean => {
    return /^[a-zA-Z0-9가-힣\s_-]{1,50}$/.test(tag) && tag.trim().length > 0;
  },

  // 노드 타입 검증 (UI에서 사용하는 타입들 포함)
  isValidNodeType: (nodeType: string): boolean => {
    const validTypes = [
      // 기본 영어 타입들
      'Knowledge', 'Concept', 'Fact', 'Question', 'Idea', 'Project', 'Resource', 'Note',
      // UI에서 사용하는 타입들
      'WebClip', 'Document', 'Image',
      // 한국어 타입들
      '지식', '개념', '사실', '질문', '아이디어', '프로젝트', '자료', '노트', '문서', '웹클립', '이미지'
    ];
    return validTypes.includes(nodeType);
  },

  // 콘텐츠 타입 검증
  isValidContentType: (contentType: string): boolean => {
    const validTypes = ['text', 'markdown', 'html', 'code', 'image', 'video', 'audio', 'document'];
    return validTypes.includes(contentType);
  }
};

// Rate Limiting (메모리 기반)
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 15 * 60 * 1000 // 15분
  ) {
    // 5분마다 만료된 항목 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // 요청 허용 여부 확인
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // 새로운 윈도우 시작
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  // 현재 요청 수 확인
  getCurrentCount(identifier: string): number {
    const record = this.requests.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return 0;
    }
    return record.count;
  }

  // 리셋 시간 확인 (밀리초)
  getResetTime(identifier: string): number {
    const record = this.requests.get(identifier);
    if (!record) {
      return 0;
    }
    return Math.max(0, record.resetTime - Date.now());
  }

  // 만료된 항목 정리
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  // 리소스 정리
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// 전역 Rate Limiter 인스턴스들
export const rateLimiters = {
  // 일반 API 요청 (분당 60회)
  api: new RateLimiter(60, 60 * 1000),

  // 검색 요청 (분당 30회)
  search: new RateLimiter(30, 60 * 1000),

  // 로그인 시도 (5분간 5회)
  login: new RateLimiter(5, 5 * 60 * 1000),

  // 파일 업로드 (시간당 20회)
  upload: new RateLimiter(20, 60 * 60 * 1000),

  // 노드 생성 (분당 10회)
  nodeCreation: new RateLimiter(10, 60 * 1000),
};

// CSRF 토큰 관리
export const csrfProtection = {
  // CSRF 토큰 생성
  generateToken: (): string => {
    return crypto.randomUUID();
  },

  // CSRF 토큰 저장 (세션 스토리지)
  storeToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csrf-token', token);
    }
  },

  // CSRF 토큰 조회
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('csrf-token');
    }
    return null;
  },

  // CSRF 토큰 검증
  validateToken: (token: string): boolean => {
    const storedToken = csrfProtection.getToken();
    return storedToken !== null && storedToken === token;
  },

  // CSRF 토큰 초기화
  initToken: (): string => {
    const token = csrfProtection.generateToken();
    csrfProtection.storeToken(token);
    return token;
  }
};

// 민감 데이터 보호
export const dataProtection = {
  // 민감한 정보 마스킹
  maskEmail: (email: string): string => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : '*'.repeat(username.length);
    return `${maskedUsername}@${domain}`;
  },

  // 개인정보 로깅 방지
  sanitizeForLogging: (obj: any): any => {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => dataProtection.sanitizeForLogging(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = dataProtection.sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },

  // 안전한 JSON 파싱
  safeJsonParse: <T>(json: string, defaultValue: T): T => {
    try {
      const parsed = JSON.parse(json);
      return parsed;
    } catch {
      return defaultValue;
    }
  }
};

// 보안 헤더 설정 (클라이언트 사이드)
export const securityHeaders = {
  // Content Security Policy 설정
  setupCSP: (): void => {
    if (typeof document !== 'undefined') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite HMR 때문에 필요
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' https:",
        "connect-src 'self' wss: https://wladfkadhsrmejigbnrw.supabase.co https://api.openai.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');

      document.head.appendChild(meta);
    }
  },

  // X-Frame-Options 설정
  setupFrameOptions: (): void => {
    if (typeof document !== 'undefined') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'X-Frame-Options';
      meta.content = 'DENY';
      document.head.appendChild(meta);
    }
  }
};

// 보안 감사 로깅
export const securityLogger = {
  // 보안 이벤트 로깅
  logSecurityEvent: (event: {
    type: 'auth' | 'access' | 'input' | 'rate_limit' | 'csrf';
    action: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): void => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: event.type,
      action: event.action,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: dataProtection.sanitizeForLogging(event.details)
    };

    // 프로덕션 환경에서는 실제 보안 로깅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // 실제 보안 로깅 시스템으로 전송 (예: Sentry, LogRocket 등)
      console.info('[SECURITY]', logEntry);
    } else {
      console.info('[SECURITY DEV]', logEntry);
    }
  },

  // 의심스러운 활동 감지
  detectSuspiciousActivity: (userId: string, action: string): boolean => {
    // 간단한 휴리스틱 기반 의심 활동 감지
    const suspiciousPatterns = [
      /script.*[<>]/i,
      /union.*select/i,
      /drop.*table/i,
      /\.\.\/.*\.\./, // Path traversal
      /<.*script.*>/i, // XSS attempt
    ];

    const isSuspicious = suspiciousPatterns.some(pattern =>
      pattern.test(action) || pattern.test(userId)
    );

    if (isSuspicious) {
      securityLogger.logSecurityEvent({
        type: 'access',
        action: 'suspicious_activity_detected',
        userId,
        details: { suspiciousAction: action }
      });
    }

    return isSuspicious;
  }
};

// 초기화 함수
export const initializeSecurity = (): void => {
  // 보안 헤더 설정
  securityHeaders.setupCSP();
  securityHeaders.setupFrameOptions();

  // CSRF 토큰 초기화
  csrfProtection.initToken();

  // 보안 초기화 로깅
  securityLogger.logSecurityEvent({
    type: 'auth',
    action: 'security_initialized',
    details: { timestamp: new Date().toISOString() }
  });
};