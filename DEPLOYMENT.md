# 🚀 Synapse AI 배포 가이드

이 문서는 Synapse AI 지식 관리 시스템의 배포 과정과 해결한 기술적 도전들을 상세히 기록합니다.

## 📋 목차

1. [현재 배포 현황](#현재-배포-현황)
2. [배포 아키텍처](#배포-아키텍처)
3. [배포 과정에서 해결한 문제들](#배포-과정에서-해결한-문제들)
4. [Netlify 배포 설정](#netlify-배포-설정)
5. [환경 변수 관리](#환경-변수-관리)
6. [성능 최적화](#성능-최적화)
7. [모니터링 및 유지보수](#모니터링-및-유지보수)

---

## 🌐 현재 배포 현황

### 프로덕션 서비스 정보
- **URL**: https://synapse-doc.netlify.app
- **배포 플랫폼**: Netlify
- **배포 상태**: ✅ 성공적으로 배포 완료
- **배포 일시**: 2025-01-15
- **자동 배포**: GitHub 연동으로 코드 푸시 시 자동 배포
- **SSL 인증서**: 자동 제공 및 갱신

### 기술 스펙
- **Node.js 버전**: 20.x
- **빌드 도구**: Vite 7.x
- **번들 크기**: 총 ~1.6MB (gzip 압축 시 ~350KB)
- **빌드 시간**: 평균 2분
- **CDN**: Netlify Global CDN (전 세계 엣지 서버)

---

## 🔧 배포 과정에서 해결한 문제들

### 1단계: 의존성 충돌 해결
**문제**: OpenAI 패키지와 zod v4 버전 충돌
**해결**: zod 버전을 v4에서 v3.23.8로 다운그레이드

### 2단계: Node.js 버전 호환성
**문제**: Vite 7.x와 React Router 7.x가 Node.js 20+ 요구
**해결**: netlify.toml에서 Node.js 버전을 20으로 설정

### 3단계: 프로덕션 빌드 도구 누락
**문제**: NODE_ENV=production에서 devDependencies 설치 안됨
**해결**: 빌드에 필요한 도구들을 dependencies로 이동

---

## 📝 Netlify 배포 설정

```toml
[build]
  command = "npm ci --legacy-peer-deps && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
```

---

**마지막 업데이트**: 2025-01-15
**배포 상태**: ✅ https://synapse-doc.netlify.app
