import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  PlusIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  TagIcon,
  DocumentTextIcon,
  ShareIcon,
  SparklesIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  BookOpenIcon as BookOpenSolidIcon,
  PlusIcon as PlusSolidIcon,
  ChartBarIcon as ChartBarSolidIcon,
  Cog6ToothIcon as Cog6ToothSolidIcon,
  TagIcon as TagSolidIcon,
  DocumentTextIcon as DocumentTextSolidIcon,
  ShareIcon as ShareSolidIcon,
  SparklesIcon as SparklesSolidIcon,
  AcademicCapIcon as AcademicCapSolidIcon
} from '@heroicons/react/24/solid';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  activeIcon: any;
  count?: number;
}

const navigation: NavigationItem[] = [
  {
    name: '대시보드',
    href: '/app/dashboard',
    icon: HomeIcon,
    activeIcon: HomeSolidIcon,
  },
  {
    name: 'AI 채팅',
    href: '/app/ai-chat',
    icon: SparklesIcon,
    activeIcon: SparklesSolidIcon,
  },
  {
    name: '지식 노드',
    href: '/app/knowledge',
    icon: BookOpenIcon,
    activeIcon: BookOpenSolidIcon,
  },
  {
    name: '새 노드 생성',
    href: '/app/knowledge/create',
    icon: PlusIcon,
    activeIcon: PlusSolidIcon,
  },
  {
    name: '지식 그래프',
    href: '/app/graph',
    icon: ShareIcon,
    activeIcon: ShareSolidIcon,
  },
  {
    name: '검색',
    href: '/app/search',
    icon: MagnifyingGlassIcon,
    activeIcon: MagnifyingGlassSolidIcon,
  },
  {
    name: '학습 활동',
    href: '/app/study',
    icon: AcademicCapIcon,
    activeIcon: AcademicCapSolidIcon,
  },
];

const secondaryNavigation: NavigationItem[] = [
  {
    name: '태그 관리',
    href: '/app/tags',
    icon: TagIcon,
    activeIcon: TagSolidIcon,
  },
  {
    name: '통계',
    href: '/app/stats',
    icon: ChartBarIcon,
    activeIcon: ChartBarSolidIcon,
  },
  {
    name: '설정',
    href: '/app/settings',
    icon: Cog6ToothIcon,
    activeIcon: Cog6ToothSolidIcon,
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/app/dashboard') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-72 glass-effect border-r border-white/10 pt-20 backdrop-blur-xl">
      <div className="flex flex-col h-full bg-gradient-to-b from-white/50 to-white/30">
        {/* Primary navigation */}
        <nav className="flex-1 px-6 py-8 space-y-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              const Icon = active ? item.activeIcon : item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    active
                      ? 'bg-gradient-to-r from-primary-500 to-knowledge-500 text-white shadow-glow transform scale-105'
                      : 'text-neutral-700 hover:text-neutral-900 hover:bg-white/60',
                    'group flex items-center px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-300 hover:transform hover:scale-105 hover:shadow-medium backdrop-blur-sm relative overflow-hidden'
                  )}
                >
                  <div className={classNames(
                    active ? 'bg-white/20' : 'bg-primary-100 group-hover:bg-primary-200',
                    'p-2 rounded-xl mr-4 transition-all duration-200'
                  )}>
                    <Icon
                      className={classNames(
                        active ? 'text-white' : 'text-primary-600 group-hover:text-primary-700',
                        'h-5 w-5 transition-colors duration-200'
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="truncate flex-1">{item.name}</span>
                  {item.count && (
                    <span
                      className={classNames(
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200',
                        'ml-2 inline-block py-1 px-2.5 text-xs font-bold rounded-full'
                      )}
                    >
                      {item.count}
                    </span>
                  )}

                  {/* Active indicator */}
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="border-t border-gradient-to-r from-transparent via-neutral-300 to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="px-3 bg-white/50 backdrop-blur-sm">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">도구</span>
              </div>
            </div>
          </div>

          {/* Secondary navigation */}
          <div className="space-y-1">
            {secondaryNavigation.map((item) => {
              const active = isActive(item.href);
              const Icon = active ? item.activeIcon : item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    active
                      ? 'bg-gradient-to-r from-ai-500 to-ai-600 text-white shadow-glow-ai transform scale-105'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50',
                    'group flex items-center px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300 hover:transform hover:scale-105 hover:shadow-medium relative overflow-hidden'
                  )}
                >
                  <div className={classNames(
                    active ? 'bg-white/20' : 'bg-ai-100 group-hover:bg-ai-200',
                    'p-1.5 rounded-lg mr-3 transition-all duration-200'
                  )}>
                    <Icon
                      className={classNames(
                        active ? 'text-white' : 'text-ai-600 group-hover:text-ai-700',
                        'h-4 w-4 transition-colors duration-200'
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="truncate">{item.name}</span>

                  {/* Active indicator */}
                  {active && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-l-full"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-6 py-6 border-t border-white/20">
          <div className="relative overflow-hidden bg-gradient-to-br from-knowledge-500 via-primary-600 to-ai-500 rounded-3xl p-6 text-white shadow-strong">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <div className="flex items-start space-x-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <DocumentTextIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">지식 가이드</p>
                  <p className="text-xs opacity-90 leading-relaxed">
                    AI와 함께하는 스마트한<br />
                    지식 관리 여정을 시작하세요
                  </p>
                </div>
              </div>

              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-bold py-3 px-4 rounded-2xl transition-all duration-300 hover:transform hover:scale-105 hover:shadow-glow flex items-center justify-center space-x-2 group">
                <span>가이드 보기</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Usage stats */}
          <div className="mt-4 p-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">이번 달 지식 노드</span>
              <span className="text-primary-600 font-bold">127개</span>
            </div>
            <div className="mt-2 bg-neutral-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-primary-500 to-knowledge-500 h-2 rounded-full" style={{ width: '68%' }}></div>
            </div>
            <div className="mt-1 text-xs text-neutral-500">목표까지 32개 남음</div>
          </div>
        </div>
      </div>
    </div>
  );
};