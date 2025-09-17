import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import {
  validator,
  sanitizer,
  rateLimiters,
  csrfProtection,
  securityLogger,
  dataProtection
} from '../lib/security';

// 보안 검증을 위한 커스텀 훅
export const useSecurity = () => {
  const { user } = useAuthStore();

  // 컴포넌트 마운트 시 보안 초기화
  useEffect(() => {
    if (user?.id) {
      securityLogger.logSecurityEvent({
        type: 'access',
        action: 'page_access',
        userId: user.id,
        details: {
          page: window.location.pathname,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [user?.id]);

  // 입력 데이터 검증
  const validateInput = useCallback((data: {
    title?: string;
    content?: string;
    tags?: string[];
    nodeType?: string;
    contentType?: string;
  }) => {
    const errors: string[] = [];

    // 제목 검증
    if (data.title !== undefined) {
      if (!validator.isValidTextLength(data.title, 1, 200)) {
        errors.push('제목은 1자 이상 200자 이하여야 합니다.');
      }
    }

    // 내용 검증
    if (data.content !== undefined) {
      if (!validator.isValidTextLength(data.content, 0, 50000)) {
        errors.push('내용은 50,000자를 초과할 수 없습니다.');
      }
    }

    // 태그 검증
    if (data.tags !== undefined) {
      if (data.tags.length > 20) {
        errors.push('태그는 최대 20개까지 가능합니다.');
      }

      for (const tag of data.tags) {
        if (!validator.isValidTag(tag)) {
          errors.push(`'${tag}'는 유효하지 않은 태그입니다. 영문, 숫자, 한글, 공백, _, -만 사용 가능하며 50자 이하여야 합니다.`);
        }
      }
    }

    // 노드 타입 검증
    if (data.nodeType !== undefined) {
      console.log('🔍 노드 타입 검증:', { nodeType: data.nodeType, isValid: validator.isValidNodeType(data.nodeType) });
      if (!validator.isValidNodeType(data.nodeType)) {
        errors.push(`유효하지 않은 노드 타입입니다: '${data.nodeType}'. 지원되는 타입: Note, WebClip, Document, Image, Concept`);
      }
    }

    // 콘텐츠 타입 검증
    if (data.contentType !== undefined && !validator.isValidContentType(data.contentType)) {
      errors.push('유효하지 않은 콘텐츠 타입입니다.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // 데이터 새니타이제이션
  const sanitizeInput = useCallback((data: {
    title?: string;
    content?: string;
    tags?: string[];
  }) => {
    const sanitized: any = {};

    if (data.title !== undefined) {
      sanitized.title = sanitizer.sanitizeText(data.title);
    }

    if (data.content !== undefined) {
      sanitized.content = sanitizer.sanitizeHtml(data.content);
    }

    if (data.tags !== undefined) {
      sanitized.tags = data.tags
        .map(tag => sanitizer.sanitizeText(tag))
        .filter(tag => tag.length > 0);
    }

    return sanitized;
  }, []);

  // Rate Limiting 확인
  const checkRateLimit = useCallback((action: 'api' | 'search' | 'upload' | 'nodeCreation') => {
    const identifier = user?.id || 'anonymous';
    const limiter = rateLimiters[action];

    if (!limiter.isAllowed(identifier)) {
      const resetTime = limiter.getResetTime(identifier);

      securityLogger.logSecurityEvent({
        type: 'rate_limit',
        action: 'rate_limit_exceeded',
        userId: user?.id,
        details: {
          action,
          resetTime,
          currentCount: limiter.getCurrentCount(identifier)
        }
      });

      return {
        allowed: false,
        message: `요청 한도를 초과했습니다. ${Math.ceil(resetTime / 1000)}초 후에 다시 시도해주세요.`,
        resetTime
      };
    }

    return { allowed: true };
  }, [user?.id]);

  // CSRF 토큰 검증
  const validateCSRFToken = useCallback((token: string) => {
    const isValid = csrfProtection.validateToken(token);

    if (!isValid) {
      securityLogger.logSecurityEvent({
        type: 'csrf',
        action: 'csrf_token_invalid',
        userId: user?.id,
        details: { providedToken: token ? '[PROVIDED]' : '[MISSING]' }
      });
    }

    return isValid;
  }, [user?.id]);

  // 의심스러운 활동 감지
  const detectSuspiciousActivity = useCallback((action: string, data?: any) => {
    if (!user?.id) return false;

    const isSuspicious = securityLogger.detectSuspiciousActivity(user.id, action);

    if (isSuspicious) {
      // 의심스러운 활동 감지 시 추가 로깅
      securityLogger.logSecurityEvent({
        type: 'access',
        action: 'suspicious_activity',
        userId: user.id,
        details: {
          suspiciousAction: action,
          data: dataProtection.sanitizeForLogging(data)
        }
      });
    }

    return isSuspicious;
  }, [user?.id]);

  // 안전한 API 호출 래퍼
  const secureApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: {
      action: 'api' | 'search' | 'upload' | 'nodeCreation';
      requireCSRF?: boolean;
      detectSuspicious?: boolean;
      data?: any;
    }
  ): Promise<T> => {
    // Rate Limiting 확인
    const rateLimitResult = checkRateLimit(options.action);
    if (!rateLimitResult.allowed) {
      throw new Error(rateLimitResult.message);
    }

    // CSRF 토큰 확인
    if (options.requireCSRF) {
      const token = csrfProtection.getToken();
      if (!token || !validateCSRFToken(token)) {
        throw new Error('CSRF 토큰이 유효하지 않습니다.');
      }
    }

    // 의심스러운 활동 감지
    if (options.detectSuspicious && options.data) {
      const isSuspicious = detectSuspiciousActivity(options.action, options.data);
      if (isSuspicious) {
        throw new Error('의심스러운 활동이 감지되었습니다.');
      }
    }

    try {
      const result = await apiCall();

      // 성공적인 API 호출 로깅
      securityLogger.logSecurityEvent({
        type: 'access',
        action: `${options.action}_success`,
        userId: user?.id,
      });

      return result;
    } catch (error: any) {
      // API 호출 실패 로깅
      securityLogger.logSecurityEvent({
        type: 'access',
        action: `${options.action}_failed`,
        userId: user?.id,
        details: {
          error: error.message,
          action: options.action
        }
      });

      throw error;
    }
  }, [user?.id, checkRateLimit, validateCSRFToken, detectSuspiciousActivity]);

  // 파일 업로드 보안 검증
  const validateFileUpload = useCallback((file: File) => {
    const errors: string[] = [];

    // 파일 크기 확인 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('파일 크기는 10MB를 초과할 수 없습니다.');
    }

    // 허용된 파일 타입 확인
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('지원하지 않는 파일 형식입니다.');
    }

    // 파일명 길이 확인
    if (file.name.length > 255) {
      errors.push('파일명이 너무 깁니다.');
    }

    // 파일명에 위험한 문자 확인
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(file.name)) {
      errors.push('파일명에 허용되지 않는 문자가 포함되어 있습니다.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName: sanitizer.sanitizeFilename(file.name)
    };
  }, []);

  return {
    // 검증 함수들
    validateInput,
    sanitizeInput,
    checkRateLimit,
    validateCSRFToken,
    detectSuspiciousActivity,
    validateFileUpload,

    // 안전한 API 호출
    secureApiCall,

    // CSRF 토큰 관리
    getCSRFToken: csrfProtection.getToken,
    generateCSRFToken: csrfProtection.initToken,

    // 유틸리티 함수들
    isValidEmail: validator.isValidEmail,
    isStrongPassword: validator.isStrongPassword,
    isValidUUID: validator.isValidUUID,

    // 새니타이제이션 함수들
    sanitizeHtml: sanitizer.sanitizeHtml,
    sanitizeText: sanitizer.sanitizeText,
    sanitizeUrl: sanitizer.sanitizeUrl,
  };
};

// 폼 보안 검증을 위한 커스텀 훅
export const useSecureForm = () => {
  const security = useSecurity();

  const validateAndSanitize = useCallback((data: any) => {
    // 입력 검증
    const validation = security.validateInput(data);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        data: null
      };
    }

    // 데이터 새니타이제이션
    const sanitized = security.sanitizeInput(data);

    return {
      success: true,
      errors: [],
      data: sanitized
    };
  }, [security]);

  const submitSecurely = useCallback(async (
    data: any,
    submitFn: (data: any) => Promise<any>,
    options?: {
      requireCSRF?: boolean;
      detectSuspicious?: boolean;
      rateLimitAction?: 'api' | 'search' | 'upload' | 'nodeCreation';
    }
  ) => {
    // 데이터 검증 및 새니타이제이션
    const validation = validateAndSanitize(data);
    if (!validation.success) {
      throw new Error(validation.errors.join('\n'));
    }

    // 보안 API 호출
    return security.secureApiCall(
      () => submitFn(validation.data),
      {
        action: options?.rateLimitAction || 'api',
        requireCSRF: options?.requireCSRF,
        detectSuspicious: options?.detectSuspicious,
        data: validation.data
      }
    );
  }, [security, validateAndSanitize]);

  return {
    validateAndSanitize,
    submitSecurely,
    ...security
  };
};