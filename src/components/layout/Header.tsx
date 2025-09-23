import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store';
import { useSearchStore } from '../../stores/search.store';
import { MagnifyingGlassIcon, BellIcon, UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { NotificationPanel } from '../NotificationPanel';
import { notificationService } from '../../services/notification.service';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { quickSearch, suggestions, autocomplete, isLoadingSuggestions } = useSearchStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // 읽지 않은 알림 개수 조회
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: () => notificationService.getUnreadCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000, // 30초마다 갱신
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await quickSearch(searchQuery.trim());
      navigate('/app/search');
      setShowSuggestions(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length > 1) {
      autocomplete(query.trim());
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    quickSearch(suggestion);
    navigate('/app/search');
    setShowSuggestions(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/20 shadow-soft backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and brand */}
        <div className="flex items-center space-x-4">
          <Link to="/app" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow transition-all duration-300 group-hover:shadow-glow group-hover:scale-110">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div className="absolute inset-0 w-10 h-10 gradient-primary rounded-xl opacity-0 group-hover:opacity-20 blur-md transition-all duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-neutral-900 group-hover:text-primary-700 transition-colors duration-200">Synapse</span>
              <span className="text-xs text-neutral-500 font-medium">지식의 비서</span>
            </div>
          </Link>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-2xl mx-8 relative">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-knowledge-500 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-all duration-300"></div>
              <div className="relative bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-2xl shadow-soft group-focus-within:shadow-medium group-focus-within:border-primary-300 transition-all duration-300">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 group-focus-within:text-primary-500 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="지식을 검색하세요... (⌘K)"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={() => searchQuery.trim().length > 1 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full pl-12 pr-4 py-3 bg-transparent border-0 rounded-2xl text-neutral-900 placeholder-neutral-500 font-medium focus:outline-none focus:ring-0"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <kbd className="px-2 py-1 text-xs font-semibold text-neutral-500 bg-neutral-100 border border-neutral-300 rounded-md">⌘K</kbd>
                </div>
              </div>
            </div>

            {/* Search suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 glass-effect border border-white/20 rounded-2xl shadow-strong z-50 animate-slide-down backdrop-blur-xl">
                <div className="p-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-white/50 rounded-xl transition-all duration-200 group"
                    >
                      <span className="flex items-center space-x-3">
                        <div className="p-1.5 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors duration-200">
                          <MagnifyingGlassIcon className="h-4 w-4 text-primary-600" />
                        </div>
                        <span className="text-neutral-900 font-medium">{suggestion}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 group"
            >
              <BellIcon className="h-6 w-6 group-hover:animate-bounce" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-error-500 to-error-600 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-xs font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </div>
              )}
            </button>

            {/* Notification Panel */}
            <NotificationPanel
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 group"
            >
              <div className="relative">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-xl border-2 border-white shadow-soft group-hover:border-primary-300 transition-all duration-200"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-knowledge-500 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow transition-all duration-200">
                    <UserCircleIcon className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold text-neutral-900">{user?.username}</span>
                <span className="text-xs text-neutral-500">온라인</span>
              </div>
              <ChevronDownIcon className="h-4 w-4 group-hover:rotate-180 transition-transform duration-200" />
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-64 glass-effect border border-white/20 rounded-2xl shadow-strong z-50 animate-slide-down backdrop-blur-xl">
                <div className="p-3">
                  {/* User info header */}
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-primary-50 to-knowledge-50 rounded-xl mb-3">
                    <div className="relative">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-12 h-12 rounded-xl border-2 border-white shadow-soft"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-knowledge-500 rounded-xl flex items-center justify-center shadow-soft">
                          <UserCircleIcon className="h-7 w-7 text-white" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-900">{user?.username}</p>
                      <p className="text-xs text-neutral-600">{user?.email}</p>
                      <div className="flex items-center mt-1">
                        <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                        <span className="text-xs text-success-600 font-medium">온라인</span>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="space-y-1">
                    <Link
                      to="/app/profile"
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm text-neutral-700 hover:bg-white/50 rounded-xl transition-all duration-200 group"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <UserCircleIcon className="h-5 w-5 text-neutral-500 group-hover:text-primary-600" />
                      <span className="font-medium">프로필 설정</span>
                    </Link>

                    <Link
                      to="/app/dashboard"
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm text-neutral-700 hover:bg-white/50 rounded-xl transition-all duration-200 group"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="h-5 w-5 text-neutral-500 group-hover:text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="font-medium">대시보드</span>
                    </Link>

                    <Link
                      to="/app/settings"
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm text-neutral-700 hover:bg-white/50 rounded-xl transition-all duration-200 group"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="h-5 w-5 text-neutral-500 group-hover:text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">설정</span>
                    </Link>

                    <div className="border-t border-white/20 my-2"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-error-600 hover:bg-error-50 rounded-xl transition-all duration-200 group"
                    >
                      <svg className="h-5 w-5 text-error-500 group-hover:text-error-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="font-medium">로그아웃</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};