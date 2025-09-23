import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type InsertNotification = Database['public']['Tables']['notifications']['Insert'];
export type UpdateNotification = Database['public']['Tables']['notifications']['Update'];

export interface NotificationWithSender extends Notification {
  sender?: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  related_node?: {
    id: string;
    title: string;
  };
}

export class NotificationService {
  /**
   * 사용자의 알림 목록 조회 (최신순)
   */
  async getUserNotifications(
    userId: string,
    limit: number = 20
  ): Promise<NotificationWithSender[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:sender_id(
            id,
            first_name,
            last_name,
            avatar_url
          ),
          related_node:related_node_id(
            id,
            title
          )
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('알림 조회 실패:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('getUserNotifications 실패:', error);
      throw error;
    }
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('읽지 않은 알림 개수 조회 실패:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('getUnreadCount 실패:', error);
      return 0;
    }
  }

  /**
   * 특정 알림을 읽음으로 처리
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('알림 읽음 처리 실패:', error);
        throw error;
      }
    } catch (error) {
      console.error('markAsRead 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자의 모든 알림을 읽음으로 처리
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('모든 알림 읽음 처리 실패:', error);
        throw error;
      }
    } catch (error) {
      console.error('markAllAsRead 실패:', error);
      throw error;
    }
  }

  /**
   * 알림 삭제
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('알림 삭제 실패:', error);
        throw error;
      }
    } catch (error) {
      console.error('deleteNotification 실패:', error);
      throw error;
    }
  }

  /**
   * 새 알림 생성
   */
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();

      if (error) {
        console.error('알림 생성 실패:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('createNotification 실패:', error);
      throw error;
    }
  }

  /**
   * 노드 공유 알림 생성
   */
  async createNodeShareNotification(
    recipientId: string,
    senderId: string,
    nodeId: string,
    nodeTitle: string
  ): Promise<void> {
    try {
      await this.createNotification({
        recipient_id: recipientId,
        sender_id: senderId,
        type: 'node_shared',
        title: '새 노드가 공유되었습니다',
        message: `"${nodeTitle}" 노드가 공유되었습니다.`,
        related_node_id: nodeId,
        is_read: false
      });
    } catch (error) {
      console.error('노드 공유 알림 생성 실패:', error);
      // 알림 생성 실패는 주 기능에 영향을 주지 않도록 조용히 처리
    }
  }

  /**
   * 댓글 추가 알림 생성
   */
  async createCommentNotification(
    recipientId: string,
    senderId: string,
    nodeId: string,
    nodeTitle: string,
    commentId: string
  ): Promise<void> {
    try {
      await this.createNotification({
        recipient_id: recipientId,
        sender_id: senderId,
        type: 'comment_added',
        title: '새 댓글이 추가되었습니다',
        message: `"${nodeTitle}" 노드에 새 댓글이 있습니다.`,
        related_node_id: nodeId,
        related_comment_id: commentId,
        is_read: false
      });
    } catch (error) {
      console.error('댓글 알림 생성 실패:', error);
    }
  }

  /**
   * 노드 관계 생성 알림
   */
  async createRelationshipNotification(
    recipientId: string,
    senderId: string,
    sourceNodeId: string,
    targetNodeId: string,
    sourceTitle: string,
    targetTitle: string
  ): Promise<void> {
    try {
      await this.createNotification({
        recipient_id: recipientId,
        sender_id: senderId,
        type: 'relationship_created',
        title: '새 관계가 생성되었습니다',
        message: `"${sourceTitle}"과 "${targetTitle}" 노드가 연결되었습니다.`,
        related_node_id: sourceNodeId,
        metadata: { target_node_id: targetNodeId },
        is_read: false
      });
    } catch (error) {
      console.error('관계 생성 알림 실패:', error);
    }
  }

  /**
   * 시스템 알림 생성
   */
  async createSystemNotification(
    recipientId: string,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.createNotification({
        recipient_id: recipientId,
        type: 'system_update',
        title,
        message,
        metadata: metadata || {},
        is_read: false
      });
    } catch (error) {
      console.error('시스템 알림 생성 실패:', error);
    }
  }

  /**
   * 실시간 알림 구독
   */
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ) {
    try {
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`
          },
          (payload) => {
            console.log('새 알림 수신:', payload.new);
            onNotification(payload.new as Notification);
          }
        )
        .subscribe();

      // 구독 해제 함수 반환
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('알림 구독 실패:', error);
      return () => {}; // 빈 함수 반환
    }
  }

  /**
   * 오래된 알림 정리 (30일 이상)
   */
  async cleanupOldNotifications(userId: string): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', userId)
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('오래된 알림 정리 실패:', error);
        throw error;
      }
    } catch (error) {
      console.error('cleanupOldNotifications 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 생성
export const notificationService = new NotificationService();