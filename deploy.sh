#!/bin/bash

# Synapse Knowledge Assistant - Render.com 배포 스크립트

echo "🚀 Synapse 지식 관리 시스템 배포 시작..."

# 환경 변수 확인
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL 환경 변수가 설정되지 않았습니다."
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ VITE_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다."
    exit 1
fi

if [ -z "$VITE_OPENAI_API_KEY" ]; then
    echo "❌ VITE_OPENAI_API_KEY 환경 변수가 설정되지 않았습니다."
    exit 1
fi

echo "✅ 환경 변수 확인 완료"

# 의존성 설치
echo "📦 의존성 설치 중..."
npm ci --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "❌ 의존성 설치 실패"
    exit 1
fi

echo "✅ 의존성 설치 완료"

# 린트 검사
echo "🔍 코드 품질 검사 중..."
npm run lint

if [ $? -ne 0 ]; then
    echo "⚠️ 린트 경고가 있지만 계속 진행합니다."
fi

# 프로덕션 빌드
echo "🏗️ 프로덕션 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

echo "✅ 빌드 완료"

# 빌드 결과 확인
if [ ! -d "dist" ]; then
    echo "❌ dist 디렉토리가 생성되지 않았습니다."
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ index.html 파일이 생성되지 않았습니다."
    exit 1
fi

echo "✅ 빌드 결과 확인 완료"

# 빌드 사이즈 정보
echo "📊 빌드 사이즈 정보:"
du -sh dist/*

echo "🎉 배포 준비 완료!"
echo "📂 빌드 결과물: ./dist 디렉토리"
echo "🌐 배포 주소는 Render.com에서 확인하세요."