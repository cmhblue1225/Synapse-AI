# Synapse Knowledge Assistant - 배포 가이드

## 🚀 Render.com 배포 방법

### 1. 사전 준비사항

#### Supabase 설정
1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. `SUPABASE_MIGRATION.sql` 파일의 내용을 Supabase SQL Editor에서 실행
3. Extensions > Vector 활성화
4. Authentication > Settings에서 Site URL 설정

#### OpenAI API 키 준비
1. [OpenAI Platform](https://platform.openai.com)에서 API 키 생성
2. 결제 정보 등록 (사용량에 따른 과금)

### 2. GitHub 저장소 설정

```bash
# Git 초기화 (아직 안 한 경우)
git init

# 원격 저장소 연결
git remote add origin https://github.com/yourusername/synapse-knowledge-assistant.git

# 코드 푸시
git add .
git commit -m "Initial commit: Synapse Knowledge Assistant"
git push -u origin main
```

### 3. Render.com 배포

#### 3.1. 계정 생성 및 연결
1. [Render.com](https://render.com) 계정 생성
2. GitHub 계정 연결

#### 3.2. Static Site 생성
1. Dashboard > "New" 클릭
2. "Static Site" 선택
3. GitHub 저장소 연결
4. 다음 설정 적용:
   - **Name**: `synapse-knowledge-assistant`
   - **Branch**: `main`
   - **Root Directory**: (비워둠)
   - **Build Command**: `npm ci --legacy-peer-deps && npm run build`
   - **Publish Directory**: `dist`

#### 3.3. 환경 변수 설정
Environment 탭에서 다음 환경 변수들을 추가:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENAI_API_KEY=sk-your-openai-api-key
```

#### 3.4. 배포 실행
1. "Create Static Site" 클릭
2. 자동 빌드 및 배포 시작
3. 완료 후 제공된 URL로 접속 확인

### 4. 배포 후 확인사항

#### 4.1. 기능 테스트
- [ ] 회원가입/로그인 정상 작동
- [ ] 지식 노드 생성/편집/삭제
- [ ] 그래프 시각화 표시
- [ ] AI 관계 발견 기능
- [ ] 검색 기능

#### 4.2. 성능 확인
```bash
# 로컬에서 빌드 사이즈 확인
npm run build
du -sh dist/*

# Lighthouse 점수 확인 (Chrome DevTools)
```

### 5. 도메인 설정 (선택사항)

#### 커스텀 도메인 연결
1. Render Dashboard > Settings > Custom Domains
2. 도메인 추가 (예: synapse.yourdomain.com)
3. DNS 설정:
   ```
   CNAME synapse yourdomain.onrender.com
   ```

### 6. 환경별 설정

#### 개발 환경
```bash
# .env.development
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
VITE_OPENAI_API_KEY=sk-your-dev-openai-key
```

#### 프로덕션 환경
- Render.com Environment Variables에서 관리
- Supabase 프로덕션 프로젝트 사용 권장

### 7. CI/CD 최적화

#### 자동 배포 설정
- `main` 브랜치 푸시 시 자동 배포
- Pull Request 시 Preview 배포 (Pro 플랜)

#### 빌드 최적화
```json
// package.json의 scripts 최적화
"scripts": {
  "build:prod": "NODE_ENV=production vite build",
  "build:analyze": "npm run build && npx vite-bundle-analyzer"
}
```

### 8. 모니터링 및 로깅

#### Render 대시보드
- 빌드 로그 확인
- 실시간 메트릭 모니터링
- 에러 로그 추적

#### Supabase 모니터링
- 데이터베이스 사용량
- API 호출 통계
- 인증 사용자 수

### 9. 백업 및 복구

#### 데이터베이스 백업
```sql
-- Supabase에서 정기 백업 설정
-- SQL Editor에서 수동 백업 생성
```

#### 코드 백업
- GitHub 저장소 정기적 업데이트
- 브랜치 전략 활용 (main, develop, feature/*)

### 10. 문제 해결

#### 일반적인 문제들
1. **빌드 실패**:
   - 의존성 버전 충돌 확인
   - `npm ci --legacy-peer-deps` 사용

2. **환경 변수 인식 안됨**:
   - `VITE_` 접두사 확인
   - Render.com에서 환경 변수 재설정

3. **라우팅 404 에러**:
   - `public/_redirects` 파일 확인
   - React Router 설정 검토

4. **CORS 에러**:
   - Supabase Authentication > Settings > Site URL 확인

#### 디버깅 도구
```bash
# 로컬 프로덕션 환경 테스트
npm run build
npm run preview

# 네트워크 요청 분석
# Chrome DevTools > Network 탭 활용
```

### 11. 성능 최적화

#### 번들 사이즈 최적화
- Code splitting 구현
- Tree shaking 활용
- 이미지 최적화

#### 로딩 성능
- Lazy loading 적용
- 캐싱 전략 구현
- CDN 활용

## 📞 지원

배포 중 문제가 발생하면:
1. Render.com 문서 확인
2. Supabase 문서 참조
3. GitHub Issues에 문제 보고

---

**배포 성공을 위한 체크리스트**

- [ ] Supabase 프로젝트 설정 완료
- [ ] 환경 변수 모두 설정
- [ ] 빌드 테스트 성공
- [ ] GitHub 저장소 푸시
- [ ] Render.com 사이트 생성
- [ ] 배포 성공 확인
- [ ] 모든 기능 테스트 완료