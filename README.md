# Synapse AI - 지능형 지식 관리 시스템 🧠

개인 지식을 구조화하고 관리하는 차세대 AI 기반 지식 관리 시스템입니다. PDF 자동 처리부터 AI 요약까지, 완전히 자동화된 지식 관리 경험을 제공합니다.

## ✨ 핵심 혁신 기능

### 🔥 **NEW! AI 기반 개별 파일 요약**
- **자동 PDF 텍스트 추출**: Supabase Edge Functions를 통한 서버사이드 처리
- **AI 자동 요약 생성**: 파일 업로드 즉시 GPT-4o-mini가 200단어 요약 생성
- **실시간 요약 표시**: 토글 방식의 직관적인 요약 내용 확인
- **수동 재생성**: 기존 파일도 언제든 AI 요약 재생성 가능

### 🚀 **핵심 기능들**
- **지식 노드 관리**: 다양한 타입의 지식을 체계적으로 저장하고 관리
- **AI 기반 관계 발견**: OpenAI를 활용한 지식 간 관계 자동 발견
- **인터랙티브 그래프**: D3.js 기반 동적 지식 그래프 시각화
- **벡터 의미 검색**: pgvector를 활용한 AI 기반 의미 검색
- **실시간 AI 채팅**: 개인 지식 저장소 기반 맞춤형 질의응답
- **완전 자동화**: 파일 업로드부터 요약 생성까지 모든 과정 자동화

## 🛠 기술 스택

### Frontend
- **React 19**: 최신 React 버전의 성능 개선과 새로운 기능 활용
- **TypeScript**: 완전한 타입 안전성과 개발 생산성 향상
- **Vite**: 빠른 빌드와 HMR(Hot Module Replacement)
- **TailwindCSS**: 유틸리티 우선 CSS 프레임워크로 빠른 스타일링

### Backend & Database
- **Supabase**: 완전 관리형 백엔드 서비스
  - **PostgreSQL**: 관계형 데이터베이스
  - **pgvector**: AI 벡터 임베딩 저장 및 검색
  - **Auth**: 사용자 인증 및 세션 관리
  - **Realtime**: 실시간 데이터 동기화
  - **Storage**: 파일 업로드 및 관리
  - **Edge Functions**: 서버사이드 로직 실행

### AI & 데이터 처리
- **OpenAI API**: GPT-4o-mini 텍스트 요약, text-embedding-3-small 벡터화
- **pdf-parse**: PDF 텍스트 추출 라이브러리
- **D3.js**: 인터랙티브 지식 그래프 시각화

### 상태 관리 & 네트워킹
- **Zustand**: 경량 상태 관리 라이브러리
- **React Query**: 서버 상태 캐싱 및 동기화
- **Axios**: HTTP 클라이언트

## 🚦 로컬 개발 환경 설정

### 1. 프로젝트 클론 및 설치

```bash
git clone <repository-url>
cd synapse-supabase
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 값들을 설정하세요:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

### 3. Supabase 설정

1. Supabase 프로젝트를 생성하세요
2. `SUPABASE_MIGRATION.sql` 파일을 실행하여 데이터베이스 스키마를 설정하세요
3. pgvector extension을 활성화하세요:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 4. 개발 서버 실행

```bash
npm run dev
```

애플리케이션이 `http://localhost:5173`에서 실행됩니다.

## 📦 배포

### Render.com 배포

1. GitHub에 코드를 푸시합니다
2. Render.com에서 새 Static Site를 생성합니다
3. 빌드 명령어: `npm ci && npm run build`
4. 게시 디렉토리: `dist`
5. 환경 변수를 설정합니다:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`

### 빌드 명령어

```bash
# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📋 주요 페이지

- `/` - 홈페이지
- `/auth/login` - 로그인
- `/auth/register` - 회원가입
- `/app/dashboard` - 대시보드
- `/app/knowledge` - 지식 노드 목록
- `/app/knowledge/create` - 새 노드 생성
- `/app/knowledge/:id` - 노드 상세보기
- `/app/graph` - 지식 그래프 시각화
- `/app/search` - 검색
- `/app/ai-chat` - AI 채팅

## 🎯 핵심 컴포넌트

### 시각화 컴포넌트
- **`KnowledgeGraph`**: D3.js 기반 인터랙티브 지식 그래프 시각화
- **`NodeCard`**: 지식 노드 카드 컴포넌트 (요약 토글 포함)
- **`SearchInterface`**: 통합 검색 인터페이스 (텍스트 + 벡터 검색)

### 편집 컴포넌트
- **`NodeEditor`**: 지식 노드 편집 인터페이스 (Rich Text Editor)
- **`AddRelationshipModal`**: 노드 간 관계 추가 모달
- **`FileUploadZone`**: 드래그 앤 드롭 파일 업로드 영역

### AI 기능 컴포넌트
- **`SummaryToggle`**: AI 요약 토글 및 재생성 버튼
- **`AIChat`**: 개인 지식 기반 AI 채팅 인터페이스
- **`SmartSuggestions`**: AI 기반 관련 노드 추천

## 📚 데이터베이스 스키마

### 핵심 테이블
- **`profiles`**: 사용자 프로필 및 설정 정보
- **`knowledge_nodes`**: 지식 노드 메타데이터 (제목, 내용, 타입, 태그)
- **`knowledge_relationships`**: 노드 간 관계 및 연결 정보
- **`node_embeddings`**: OpenAI 벡터 임베딩 (1536차원)
- **`files`**: 업로드된 파일 메타데이터
- **`file_summaries`**: AI 생성 파일 요약 정보

### 특별 기능
- **Row Level Security (RLS)**: 모든 테이블에 사용자별 데이터 격리
- **벡터 검색**: pgvector 확장을 통한 의미 검색 지원
- **실시간 동기화**: Supabase Realtime으로 실시간 데이터 업데이트
- **자동 트리거**: 임베딩 생성, 관계 자동 발견, 검색 인덱스 갱신

## ✨ AI 기능 사용법

### 📄 자동 파일 요약
1. **PDF 업로드**: 지식 노드 생성 시 PDF 파일을 첨부
2. **자동 처리**: Supabase Edge Function이 텍스트를 추출하고 GPT-4o-mini가 요약 생성
3. **요약 확인**: 노드 카드에서 "요약 보기" 토글로 200단어 요약 확인
4. **재생성**: 언제든지 "요약 재생성" 버튼으로 새로운 요약 생성 가능

### 🔍 의미 검색
- **벡터 검색**: 검색창에 자연어로 질문하면 의미적으로 유사한 노드를 찾아줌
- **하이브리드 검색**: 키워드 검색과 의미 검색을 결합하여 더 정확한 결과 제공

### 🤖 AI 채팅
- 개인 지식 저장소를 기반으로 한 맞춤형 질의응답
- 저장된 노드와 파일 내용을 참고하여 정확한 답변 생성

## 🔐 보안

### 데이터 보안
- **Row Level Security (RLS)**: 모든 데이터 테이블에 적용된 사용자별 데이터 격리
- **JWT 인증**: Supabase Auth를 통한 안전한 토큰 기반 인증
- **API 키 보안**: 환경 변수를 통한 민감한 정보 관리

### 파일 보안
- **Supabase Storage**: 안전한 파일 저장 및 접근 제어
- **파일 타입 검증**: 업로드 시 허용된 파일 형식만 처리
- **용량 제한**: 파일 크기 제한으로 서비스 남용 방지

## 📄 라이선스

MIT License

## 🤝 기여

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
