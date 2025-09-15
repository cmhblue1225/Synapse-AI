// 사용자 설정 관리 서비스

import { supabase } from '../lib/supabase';

export interface ProfileSettings {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  avatar?: string;
}

export interface NotificationSettings {
  nodeCreated: boolean;
  relationshipCreated: boolean;
  nodeShared: boolean;
  commentAdded: boolean;
  systemUpdates: boolean;
  weeklyDigest: boolean;
}

export interface ThemeSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  fontSize: 'sm' | 'md' | 'lg';
}

export interface PrivacySettings {
  profilePublic: boolean;
  allowSearchIndexing: boolean;
  shareAnalytics: boolean;
}

export interface ExperimentalSettings {
  aiAutoTagSuggestion: boolean;
  advancedGraphLayout: boolean;
  realtimeCollaboration: boolean;
}

export interface UserSettings {
  profile?: ProfileSettings;
  notifications?: NotificationSettings;
  theme?: ThemeSettings;
  privacy?: PrivacySettings;
  experimental?: ExperimentalSettings;
}

class SettingsService {
  // 현재 사용자의 모든 설정 가져오기
  async getAllSettings(): Promise<UserSettings> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      // profiles 테이블에서 사용자 데이터 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('프로필 조회 오류:', profileError);
      }

      // 기본 설정값 설정
      const defaultSettings: UserSettings = {
        profile: {
          firstName: profile?.first_name || user.user_metadata?.first_name || '',
          lastName: profile?.last_name || user.user_metadata?.last_name || '',
          email: user.email || '',
          bio: profile?.bio || user.user_metadata?.bio || '',
          avatar: profile?.avatar_url || user.user_metadata?.avatar_url || ''
        },
        notifications: {
          nodeCreated: true,
          relationshipCreated: true,
          nodeShared: true,
          commentAdded: true,
          systemUpdates: true,
          weeklyDigest: false
        },
        theme: {
          theme: 'system',
          primaryColor: '#3B82F6',
          fontSize: 'md'
        },
        privacy: {
          profilePublic: false,
          allowSearchIndexing: true,
          shareAnalytics: false
        },
        experimental: {
          aiAutoTagSuggestion: false,
          advancedGraphLayout: false,
          realtimeCollaboration: false
        }
      };

      // 저장된 설정이 있다면 병합
      if (profile?.settings) {
        const savedSettings = typeof profile.settings === 'string'
          ? JSON.parse(profile.settings)
          : profile.settings;

        return {
          ...defaultSettings,
          ...savedSettings,
          profile: {
            ...defaultSettings.profile,
            ...savedSettings.profile
          }
        };
      }

      return defaultSettings;
    } catch (error) {
      console.error('설정 로드 오류:', error);
      throw error;
    }
  }

  // 프로필 설정 업데이트
  async updateProfileSettings(profileSettings: ProfileSettings): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      // 현재 설정 가져오기
      const currentSettings = await this.getAllSettings();

      // 새 설정 병합
      const updatedSettings = {
        ...currentSettings,
        profile: profileSettings
      };

      // profiles 테이블 업데이트 (기본 정보)
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: profileSettings.firstName,
          last_name: profileSettings.lastName,
          bio: profileSettings.bio,
          avatar_url: profileSettings.avatar,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });

      if (profileUpdateError) throw profileUpdateError;

      console.log('✅ 프로필 설정 업데이트 완료');
    } catch (error) {
      console.error('❌ 프로필 설정 업데이트 실패:', error);
      throw error;
    }
  }

  // 비밀번호 변경
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Supabase의 비밀번호 업데이트 메서드 사용
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      console.log('✅ 비밀번호 변경 완료');
    } catch (error) {
      console.error('❌ 비밀번호 변경 실패:', error);
      throw error;
    }
  }

  // 알림 설정 업데이트
  async updateNotificationSettings(notificationSettings: NotificationSettings): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      const currentSettings = await this.getAllSettings();
      const updatedSettings = {
        ...currentSettings,
        notifications: notificationSettings
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log('✅ 알림 설정 업데이트 완료');
    } catch (error) {
      console.error('❌ 알림 설정 업데이트 실패:', error);
      throw error;
    }
  }

  // 테마 설정 업데이트
  async updateThemeSettings(themeSettings: ThemeSettings): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      const currentSettings = await this.getAllSettings();
      const updatedSettings = {
        ...currentSettings,
        theme: themeSettings
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // CSS 변수 적용 (실시간 테마 변경)
      this.applyThemeSettings(themeSettings);

      console.log('✅ 테마 설정 업데이트 완료');
    } catch (error) {
      console.error('❌ 테마 설정 업데이트 실패:', error);
      throw error;
    }
  }

  // 개인정보 설정 업데이트
  async updatePrivacySettings(privacySettings: PrivacySettings): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      const currentSettings = await this.getAllSettings();
      const updatedSettings = {
        ...currentSettings,
        privacy: privacySettings
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log('✅ 개인정보 설정 업데이트 완료');
    } catch (error) {
      console.error('❌ 개인정보 설정 업데이트 실패:', error);
      throw error;
    }
  }

  // 실험적 기능 설정 업데이트
  async updateExperimentalSettings(experimentalSettings: ExperimentalSettings): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      const currentSettings = await this.getAllSettings();
      const updatedSettings = {
        ...currentSettings,
        experimental: experimentalSettings
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log('✅ 실험적 기능 설정 업데이트 완료');
    } catch (error) {
      console.error('❌ 실험적 기능 설정 업데이트 실패:', error);
      throw error;
    }
  }

  // CSS 변수를 통한 실시간 테마 적용
  private applyThemeSettings(themeSettings: ThemeSettings): void {
    const root = document.documentElement;

    // 기본 색상 적용
    root.style.setProperty('--primary-color', themeSettings.primaryColor);

    // 폰트 크기 적용
    const fontSizeMap = {
      sm: '14px',
      md: '16px',
      lg: '18px'
    };
    root.style.setProperty('--base-font-size', fontSizeMap[themeSettings.fontSize]);

    // 테마 모드 적용
    if (themeSettings.theme === 'dark') {
      document.body.classList.add('dark');
    } else if (themeSettings.theme === 'light') {
      document.body.classList.remove('dark');
    } else {
      // 시스템 테마 적용
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
  }

  // 사용자 데이터 내보내기
  async exportUserData(): Promise<Blob> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      // 모든 사용자 데이터 수집
      const [
        { data: profile },
        { data: nodes },
        { data: relationships }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('knowledge_nodes').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('knowledge_relationships').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        export_info: {
          date: new Date().toISOString(),
          user_id: user.id,
          version: '1.0'
        },
        profile,
        knowledge_nodes: nodes || [],
        relationships: relationships || [],
        settings: await this.getAllSettings()
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } catch (error) {
      console.error('❌ 데이터 내보내기 실패:', error);
      throw error;
    }
  }

  // 사용자 데이터 가져오기
  async importUserData(importData: any): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      // 데이터 유효성 검증
      if (!importData.knowledge_nodes || !Array.isArray(importData.knowledge_nodes)) {
        throw new Error('올바르지 않은 데이터 형식입니다.');
      }

      // 지식 노드 가져오기
      const nodesToImport = importData.knowledge_nodes.map((node: any) => ({
        title: node.title,
        content: node.content,
        node_type: node.node_type || 'Knowledge',
        tags: node.tags || [],
        metadata: node.metadata || {},
        user_id: user.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: insertedNodes, error: nodesError } = await supabase
        .from('knowledge_nodes')
        .insert(nodesToImport)
        .select();

      if (nodesError) throw nodesError;

      // 관계 데이터가 있다면 가져오기
      if (importData.relationships && Array.isArray(importData.relationships) && insertedNodes) {
        const relationshipsToImport = importData.relationships.map((rel: any) => ({
          source_node_id: insertedNodes[0].id, // 첫 번째 노드로 임시 설정
          target_node_id: insertedNodes[1]?.id || insertedNodes[0].id,
          relationship_type: rel.relationship_type || 'related',
          user_id: user.id,
          created_at: new Date().toISOString()
        }));

        await supabase
          .from('knowledge_relationships')
          .insert(relationshipsToImport);
      }

      console.log('✅ 데이터 가져오기 완료');
    } catch (error) {
      console.error('❌ 데이터 가져오기 실패:', error);
      throw error;
    }
  }

  // 캐시 삭제
  async clearCache(): Promise<void> {
    try {
      // localStorage 캐시 삭제
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.startsWith('synapse_') || key.startsWith('supabase.')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // sessionStorage 캐시 삭제
      const sessionKeysToRemove = Object.keys(sessionStorage).filter(key =>
        key.startsWith('synapse_')
      );
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      console.log('✅ 캐시 삭제 완료');
    } catch (error) {
      console.error('❌ 캐시 삭제 실패:', error);
      throw error;
    }
  }

  // 계정 삭제 (데이터 소프트 삭제)
  async deleteAccount(): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('사용자 인증이 필요합니다');

      // 모든 지식 노드를 비활성화 (소프트 삭제)
      await supabase
        .from('knowledge_nodes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      // 프로필을 비활성화로 표시
      await supabase
        .from('profiles')
        .update({
          settings: { account_deleted: true, deleted_at: new Date().toISOString() },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      console.log('✅ 계정 삭제 처리 완료');
    } catch (error) {
      console.error('❌ 계정 삭제 실패:', error);
      throw error;
    }
  }

  // 초기 테마 설정 로드 (앱 시작 시)
  async loadAndApplyTheme(): Promise<void> {
    try {
      const settings = await this.getAllSettings();
      if (settings.theme) {
        this.applyThemeSettings(settings.theme);
      }
    } catch (error) {
      console.error('테마 로드 실패:', error);
      // 기본 테마 적용
      this.applyThemeSettings({
        theme: 'system',
        primaryColor: '#3B82F6',
        fontSize: 'md'
      });
    }
  }
}

export const settingsService = new SettingsService();