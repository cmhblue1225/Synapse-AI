import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  },
  optimizeDeps: {
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      'd3',
      '@supabase/supabase-js',
      'openai',
      'zustand',
      '@tanstack/react-query'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 프로덕션에서 소스맵 비활성화로 빌드 사이즈 감소
    minify: 'esbuild', // 더 빠른 minification
    target: 'esnext', // 최신 브라우저 대상으로 더 작은 번들
    rollupOptions: {
      output: {
        manualChunks: {
          // 핵심 React 라이브러리
          vendor: ['react', 'react-dom'],

          // 라우팅
          router: ['react-router-dom'],

          // 백엔드 서비스들
          supabase: ['@supabase/supabase-js', '@supabase/auth-ui-react'],

          // AI 서비스
          ai: ['openai'],

          // 상태 관리
          state: ['zustand', '@tanstack/react-query'],

          // UI 라이브러리들
          ui: ['@heroicons/react', 'react-toastify', '@headlessui/react'],

          // 텍스트 에디터
          editor: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link'],

          // 데이터 시각화
          visualization: ['d3'],

          // 폼 관리
          forms: ['react-hook-form', '@hookform/resolvers', 'zod']
        },
        // 더 나은 캐싱을 위한 파일명 해싱
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash].css'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    // gzip 압축으로 더 작은 번들
    reportCompressedSize: true,
    // 큰 청크에 대한 경고 임계값 증가
    chunkSizeWarningLimit: 1000
  }
})
