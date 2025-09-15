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
  SparklesIcon
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
  SparklesIcon as SparklesSolidIcon
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
    <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 pt-16">
      <div className="flex flex-col h-full">
        {/* Primary navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
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
                      ? 'bg-primary-50 border-r-2 border-primary-600 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-l-md border-r-2 border-transparent transition-all duration-200'
                  )}
                >
                  <Icon
                    className={classNames(
                      active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600',
                      'mr-3 h-5 w-5 transition-colors duration-200'
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                  {item.count && (
                    <span
                      className={classNames(
                        active
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200',
                        'ml-auto inline-block py-0.5 px-2 text-xs rounded-full'
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Secondary navigation */}
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              도구
            </h3>
            {secondaryNavigation.map((item) => {
              const active = isActive(item.href);
              const Icon = active ? item.activeIcon : item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    active
                      ? 'bg-primary-50 border-r-2 border-primary-600 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-l-md border-r-2 border-transparent transition-all duration-200'
                  )}
                >
                  <Icon
                    className={classNames(
                      active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600',
                      'mr-3 h-5 w-5 transition-colors duration-200'
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="bg-gradient-primary rounded-lg p-4 text-white">
            <div className="flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2" />
              <div className="flex-1">
                <p className="text-sm font-medium">지식 가이드</p>
                <p className="text-xs opacity-90">효율적인 지식 관리 팁</p>
              </div>
            </div>
            <button className="mt-3 w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-200">
              보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};