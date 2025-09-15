import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  BookOpenIcon,
  SparklesIcon,
  TagIcon,
  ClockIcon,
  ArrowRightIcon,
  CommandLineIcon
} from '@heroicons/react/24/solid';

interface SearchResult {
  id: string;
  title: string;
  type: 'knowledge' | 'ai-chat' | 'recent' | 'tag' | 'command';
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  timestamp?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 모의 검색 결과
  const [results, setResults] = useState<SearchResult[]>([]);

  const mockResults: SearchResult[] = [
    {
      id: '1',
      title: 'React 컴포넌트 설계 패턴',
      type: 'knowledge',
      description: 'React에서 재사용 가능한 컴포넌트를 설계하는 다양한 패턴들',
      icon: BookOpenIcon,
      action: () => console.log('Navigate to knowledge node'),
      timestamp: '2시간 전'
    },
    {
      id: '2',
      title: 'AI와 함께하는 코드 리뷰',
      type: 'ai-chat',
      description: 'AI를 활용한 효율적인 코드 리뷰 방법론',
      icon: SparklesIcon,
      action: () => console.log('Navigate to AI chat'),
      timestamp: '1일 전'
    },
    {
      id: '3',
      title: '#프론트엔드',
      type: 'tag',
      description: '12개 노드',
      icon: TagIcon,
      action: () => console.log('Navigate to tag'),
    },
    {
      id: '4',
      title: '새 노드 생성',
      type: 'command',
      description: 'Cmd+N',
      icon: CommandLineIcon,
      action: () => console.log('Create new node'),
    }
  ];

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // 검색 쿼리에 따른 필터링 로직
      if (query.trim()) {
        const filtered = mockResults.filter(result =>
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.description?.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } else {
        // 빈 쿼리일 때는 최근 항목 표시
        setResults(mockResults.slice(0, 6));
      }
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen, query]);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            results[selectedIndex].action();
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = (type: SearchResult['type']) => {
    switch (type) {
      case 'knowledge':
        return 'text-knowledge-600 bg-knowledge-100';
      case 'ai-chat':
        return 'text-ai-600 bg-ai-100';
      case 'tag':
        return 'text-orange-600 bg-orange-100';
      case 'recent':
        return 'text-neutral-600 bg-neutral-100';
      case 'command':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-neutral-600 bg-neutral-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 검색 모달 */}
      <div className="relative w-full max-w-2xl glass-effect border border-white/20 rounded-2xl shadow-strong animate-slide-down overflow-hidden">
        {/* 검색 헤더 */}
        <div className="flex items-center px-6 py-4 border-b border-white/10">
          <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="지식을 검색하거나 명령어를 입력하세요..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 text-lg text-neutral-900 placeholder-neutral-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 검색 결과 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((result, index) => {
                const Icon = result.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      result.action();
                      onClose();
                    }}
                    className={`w-full flex items-center p-4 rounded-xl transition-all duration-200 group ${
                      isSelected
                        ? 'bg-gradient-to-r from-primary-50 to-knowledge-50 border border-primary-200 shadow-soft'
                        : 'hover:bg-white/40'
                    }`}
                  >
                    {/* 아이콘 */}
                    <div className={`p-2.5 rounded-xl mr-4 ${getTypeStyles(result.type)} transition-all duration-200 ${
                      isSelected ? 'shadow-soft transform scale-110' : ''
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center">
                        <h3 className={`font-semibold transition-colors duration-200 ${
                          isSelected ? 'text-primary-700' : 'text-neutral-900'
                        }`}>
                          {result.title}
                        </h3>
                        {result.timestamp && (
                          <span className="ml-2 flex items-center text-xs text-neutral-500">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {result.timestamp}
                          </span>
                        )}
                      </div>
                      {result.description && (
                        <p className="text-sm text-neutral-600 mt-1">{result.description}</p>
                      )}
                    </div>

                    {/* 화살표 */}
                    <ArrowRightIcon className={`h-4 w-4 transition-all duration-200 ${
                      isSelected
                        ? 'text-primary-600 transform translate-x-1'
                        : 'text-neutral-400 group-hover:text-neutral-600'
                    }`} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <MagnifyingGlassIcon className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 font-medium mb-2">
                {query ? '검색 결과가 없습니다' : '지식을 검색해보세요'}
              </p>
              <p className="text-sm text-neutral-400">
                노드, 태그, AI 채팅 기록을 검색할 수 있습니다
              </p>
            </div>
          )}
        </div>

        {/* 키보드 힌트 */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/30">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <kbd className="px-2 py-1 bg-white/50 border border-neutral-300 rounded text-xs font-semibold">↑↓</kbd>
                <span className="ml-1">탐색</span>
              </span>
              <span className="flex items-center">
                <kbd className="px-2 py-1 bg-white/50 border border-neutral-300 rounded text-xs font-semibold">Enter</kbd>
                <span className="ml-1">선택</span>
              </span>
            </div>
            <span className="flex items-center">
              <kbd className="px-2 py-1 bg-white/50 border border-neutral-300 rounded text-xs font-semibold">Esc</kbd>
              <span className="ml-1">닫기</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};