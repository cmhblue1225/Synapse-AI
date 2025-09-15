// 환경변수 검증 및 타입 정의

interface EnvironmentConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_OPENAI_API_KEY: string;
}

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

function validateEnvironment(): EnvironmentConfig {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_OPENAI_API_KEY'
  ] as const;

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of required) {
    const value = import.meta.env[key];

    if (!value) {
      missing.push(key);
      continue;
    }

    // 각 환경변수별 유효성 검사
    switch (key) {
      case 'VITE_SUPABASE_URL':
        if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
          invalid.push(`${key}: Supabase URL 형식이 올바르지 않습니다`);
        }
        break;

      case 'VITE_SUPABASE_ANON_KEY':
        if (value.length < 100 || !value.startsWith('eyJ')) {
          invalid.push(`${key}: Supabase Anon Key 형식이 올바르지 않습니다`);
        }
        break;

      case 'VITE_OPENAI_API_KEY':
        if (!value.startsWith('sk-') || value.length < 20) {
          invalid.push(`${key}: OpenAI API Key 형식이 올바르지 않습니다`);
        }
        break;
    }
  }

  if (missing.length > 0) {
    throw new EnvironmentError(
      `다음 환경변수가 누락되었습니다:\n${missing.map(key => `- ${key}`).join('\n')}\n\n.env 파일을 확인하고 필요한 환경변수를 설정해주세요.`
    );
  }

  if (invalid.length > 0) {
    throw new EnvironmentError(
      `다음 환경변수의 형식이 올바르지 않습니다:\n${invalid.map(msg => `- ${msg}`).join('\n')}`
    );
  }

  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY
  };
}

// 환경변수 검증 실행
export const env = validateEnvironment();

// 개발/프로덕션 환경 확인
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// 환경변수 상태 로깅 (개발 환경에서만)
if (isDevelopment) {
  console.log('🔧 Environment Status:');
  console.log(`- Mode: ${import.meta.env.MODE}`);
  console.log(`- Supabase URL: ${env.VITE_SUPABASE_URL.substring(0, 30)}...`);
  console.log(`- OpenAI API Key: ${env.VITE_OPENAI_API_KEY.substring(0, 10)}...`);
  console.log('✅ All environment variables are valid');
}