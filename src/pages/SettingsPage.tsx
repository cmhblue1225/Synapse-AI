import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  KeyIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/auth.store';
import { authService } from '../services/auth.service';
import { settingsService } from '../services/settings.service';
import type {
  ProfileSettings,
  NotificationSettings,
  ThemeSettings,
  PrivacySettings
} from '../services/settings.service';


export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'theme' | 'privacy' | 'data' | 'advanced'>('profile');
  const [isLoading, setIsLoading] = useState(false);

  // Profile Settings State
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    avatar: ''
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    nodeCreated: true,
    relationshipCreated: true,
    nodeShared: true,
    commentAdded: true,
    systemUpdates: true,
    weeklyDigest: false
  });

  // Theme Settings State
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    theme: 'system',
    primaryColor: '#3B82F6',
    fontSize: 'md'
  });

  // Privacy Settings State
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profilePublic: false,
    allowSearchIndexing: true,
    shareAnalytics: false
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log('🔧 사용자 설정 로드 중...');
        const settings = await settingsService.getAllSettings();

        if (settings.profile) {
          setProfileSettings(settings.profile);
        }
        if (settings.notifications) {
          setNotificationSettings(settings.notifications);
        }
        if (settings.theme) {
          setThemeSettings(settings.theme);
        }
        if (settings.privacy) {
          setPrivacySettings(settings.privacy);
        }

        console.log('✅ 설정 로드 완료:', settings);
      } catch (error) {
        console.error('❌ 설정 로드 실패:', error);
        toast.error('설정을 불러오는데 실패했습니다.');
      }
    };

    if (user) {
      loadSettings();
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      await settingsService.updateProfileSettings(profileSettings);
      toast.success('프로필이 업데이트되었습니다.');
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      toast.error('프로필 업데이트에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      await settingsService.updatePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('비밀번호가 변경되었습니다.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      toast.error('비밀번호 변경에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const handleNotificationUpdate = async () => {
    setIsLoading(true);
    try {
      await settingsService.updateNotificationSettings(notificationSettings);
      toast.success('알림 설정이 업데이트되었습니다.');
    } catch (error) {
      console.error('알림 설정 업데이트 오류:', error);
      toast.error('알림 설정 업데이트에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const handleThemeUpdate = async () => {
    setIsLoading(true);
    try {
      await settingsService.updateThemeSettings(themeSettings);
      toast.success('테마 설정이 업데이트되었습니다.');
    } catch (error) {
      console.error('테마 설정 업데이트 오류:', error);
      toast.error('테마 설정 업데이트에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const handlePrivacyUpdate = async () => {
    setIsLoading(true);
    try {
      await settingsService.updatePrivacySettings(privacySettings);
      toast.success('개인정보 설정이 업데이트되었습니다.');
    } catch (error) {
      console.error('개인정보 설정 업데이트 오류:', error);
      toast.error('개인정보 설정 업데이트에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const handleDataExport = async () => {
    setIsLoading(true);
    try {
      const dataBlob = await settingsService.exportUserData();

      // 파일 다운로드
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `synapse-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('데이터 내보내기가 완료되었습니다. 다운로드가 시작됩니다.');
    } catch (error) {
      console.error('데이터 내보내기 오류:', error);
      toast.error('데이터 내보내기에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const handleCacheClear = async () => {
    setIsLoading(true);
    try {
      await settingsService.clearCache();
      toast.success('캐시가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('캐시 삭제 오류:', error);
      toast.error('캐시 삭제에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const handleAccountDelete = async () => {
    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    const confirmText = prompt('계정을 삭제하려면 "DELETE"를 입력하세요:');
    if (confirmText !== 'DELETE') {
      toast.error('삭제가 취소되었습니다.');
      return;
    }

    setIsLoading(true);
    try {
      await settingsService.deleteAccount();
      toast.success('계정이 삭제되었습니다.');
      // 로그아웃 처리
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      toast.error('계정 삭제에 실패했습니다.');
    }
    setIsLoading(false);
  };

  const tabs = [
    { key: 'profile', label: '프로필', icon: UserIcon },
    { key: 'notifications', label: '알림', icon: BellIcon },
    { key: 'theme', label: '테마', icon: PaintBrushIcon },
    { key: 'privacy', label: '개인정보', icon: ShieldCheckIcon },
    { key: 'data', label: '데이터', icon: ArrowDownTrayIcon },
    { key: 'advanced', label: '고급', icon: Cog6ToothIcon }
  ];

  const primaryColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Red', value: '#EF4444' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Cog6ToothIcon className="h-8 w-8 mr-3 text-primary-600" />
          설정
        </h1>
        <p className="mt-2 text-gray-600">계정 및 애플리케이션 설정을 관리하세요.</p>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">프로필 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이름</label>
                    <input
                      type="text"
                      value={profileSettings.firstName}
                      onChange={(e) => setProfileSettings({ ...profileSettings, firstName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">성</label>
                    <input
                      type="text"
                      value={profileSettings.lastName}
                      onChange={(e) => setProfileSettings({ ...profileSettings, lastName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">이메일</label>
                  <input
                    type="email"
                    value={profileSettings.email}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">이메일 변경은 고객 지원팀에 문의하세요.</p>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">자기소개</label>
                  <textarea
                    value={profileSettings.bio}
                    onChange={(e) => setProfileSettings({ ...profileSettings, bio: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="자신에 대해 간단히 소개해주세요..."
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleProfileUpdate}
                    disabled={isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isLoading ? '업데이트 중...' : '프로필 업데이트'}
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">비밀번호 변경</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">현재 비밀번호</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">새 비밀번호</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <button
                    onClick={handlePasswordChange}
                    disabled={isLoading}
                    className="inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <KeyIcon className="h-4 w-4 mr-2" />
                    {isLoading ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">알림 설정</h3>
                <div className="space-y-4">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {key === 'nodeCreated' && '노드 생성 알림'}
                          {key === 'relationshipCreated' && '관계 생성 알림'}
                          {key === 'nodeShared' && '노드 공유 알림'}
                          {key === 'commentAdded' && '댓글 추가 알림'}
                          {key === 'systemUpdates' && '시스템 업데이트 알림'}
                          {key === 'weeklyDigest' && '주간 요약 이메일'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {key === 'nodeCreated' && '새로운 지식 노드가 생성될 때 알림을 받습니다.'}
                          {key === 'relationshipCreated' && '노드 간 관계가 생성될 때 알림을 받습니다.'}
                          {key === 'nodeShared' && '다른 사용자가 노드를 공유할 때 알림을 받습니다.'}
                          {key === 'commentAdded' && '노드에 댓글이 추가될 때 알림을 받습니다.'}
                          {key === 'systemUpdates' && '시스템 업데이트 및 공지사항을 받습니다.'}
                          {key === 'weeklyDigest' && '매주 활동 요약을 이메일로 받습니다.'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={value}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            [key]: e.target.checked
                          })}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleNotificationUpdate}
                    disabled={isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isLoading ? '업데이트 중...' : '알림 설정 저장'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">테마 설정</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">테마 모드</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'light', label: '라이트', icon: SunIcon },
                        { key: 'dark', label: '다크', icon: MoonIcon },
                        { key: 'system', label: '시스템', icon: ComputerDesktopIcon }
                      ].map((theme) => (
                        <button
                          key={theme.key}
                          onClick={() => setThemeSettings({ ...themeSettings, theme: theme.key as any })}
                          className={`flex flex-col items-center p-4 border-2 rounded-lg ${
                            themeSettings.theme === theme.key
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <theme.icon className="h-6 w-6 mb-2" />
                          <span className="text-sm font-medium">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">기본 색상</label>
                    <div className="grid grid-cols-6 gap-3">
                      {primaryColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setThemeSettings({ ...themeSettings, primaryColor: color.value })}
                          className={`w-12 h-12 rounded-lg border-2 ${
                            themeSettings.primaryColor === color.value
                              ? 'border-gray-800'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">폰트 크기</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'sm', label: '작게', size: '14px' },
                        { key: 'md', label: '보통', size: '16px' },
                        { key: 'lg', label: '크게', size: '18px' }
                      ].map((size) => (
                        <button
                          key={size.key}
                          onClick={() => setThemeSettings({ ...themeSettings, fontSize: size.key as any })}
                          className={`p-3 border-2 rounded-lg text-center ${
                            themeSettings.fontSize === size.key
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ fontSize: size.size }}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleThemeUpdate}
                    disabled={isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isLoading ? '업데이트 중...' : '테마 설정 저장'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">개인정보 설정</h3>
                <div className="space-y-4">
                  {Object.entries(privacySettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {key === 'profilePublic' && '프로필 공개'}
                          {key === 'allowSearchIndexing' && '검색 엔진 색인 허용'}
                          {key === 'shareAnalytics' && '분석 데이터 공유'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {key === 'profilePublic' && '다른 사용자가 내 프로필을 볼 수 있습니다.'}
                          {key === 'allowSearchIndexing' && '검색 엔진이 내 공개 콘텐츠를 색인할 수 있습니다.'}
                          {key === 'shareAnalytics' && '서비스 개선을 위한 익명화된 사용 데이터를 공유합니다.'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={value}
                          onChange={(e) => setPrivacySettings({
                            ...privacySettings,
                            [key]: e.target.checked
                          })}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    onClick={handlePrivacyUpdate}
                    disabled={isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isLoading ? '업데이트 중...' : '개인정보 설정 저장'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">데이터 관리</h3>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">데이터 내보내기</h4>
                        <p className="text-xs text-gray-500">모든 지식 노드와 관계를 JSON 형식으로 다운로드합니다.</p>
                      </div>
                      <button
                        onClick={handleDataExport}
                        disabled={isLoading}
                        className="inline-flex items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        {isLoading ? '내보내는 중...' : '데이터 내보내기'}
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">데이터 가져오기</h4>
                        <p className="text-xs text-gray-500">JSON 파일에서 지식 노드를 가져옵니다.</p>
                      </div>
                      <label className="inline-flex items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                        데이터 가져오기
                        <input type="file" accept=".json" className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">캐시 삭제</h4>
                        <p className="text-xs text-gray-500">저장된 캐시 데이터를 삭제하여 공간을 확보합니다.</p>
                      </div>
                      <button
                        onClick={handleCacheClear}
                        disabled={isLoading}
                        className="inline-flex items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        {isLoading ? '삭제 중...' : '캐시 삭제'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">고급 설정</h3>

                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">실험적 기능</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50" />
                        <span className="ml-2 text-sm text-gray-700">AI 기반 자동 태그 제안</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50" />
                        <span className="ml-2 text-sm text-gray-700">고급 그래프 레이아웃</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50" />
                        <span className="ml-2 text-sm text-gray-700">실시간 협업 편집</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h4 className="text-sm font-medium text-red-900 mb-2">위험 구역</h4>
                    <p className="text-xs text-red-700 mb-4">
                      아래 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
                    </p>
                    <button
                      onClick={handleAccountDelete}
                      disabled={isLoading}
                      className="inline-flex items-center py-2 px-4 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      {isLoading ? '삭제 중...' : '계정 삭제'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};