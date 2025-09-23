import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellIcon,
  BookOpenIcon,
  ShareIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/auth.store';
import { notificationService, type NotificationWithSender } from '../services/notification.service';
import { toast } from 'react-toastify';


interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // 알림 조회 쿼리
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationService.getUserNotifications(user!.id, 20),
    enabled: !!user?.id && isOpen,
    refetchInterval: 30000, // 30초마다 갱신
  });

  // 읽지 않은 알림 개수 조회
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: () => notificationService.getUnreadCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // 알림 읽음 처리 뮤테이션
  const markAsReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
    onError: (error) => {
      console.error('알림 읽음 처리 실패:', error);
      toast.error('알림 읽음 처리에 실패했습니다.');
    },
  });

  // 모든 알림 읽음 처리 뮤테이션
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
      toast.success('모든 알림을 읽음으로 처리했습니다.');
    },
    onError: (error) => {
      console.error('모든 알림 읽음 처리 실패:', error);
      toast.error('알림 읽음 처리에 실패했습니다.');
    },
  });

  // 알림 삭제 뮤테이션
  const deleteNotificationMutation = useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
    onError: (error) => {
      console.error('알림 삭제 실패:', error);
      toast.error('알림 삭제에 실패했습니다.');
    },
  });

  // 실시간 알림 구독
  useEffect(() => {
    if (!user?.id || !isOpen) return;

    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        // 새 알림이 오면 쿼리 무효화하여 최신 데이터 가져오기
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });

        // 토스트 알림 표시
        toast.info(`새 알림: ${newNotification.title}`);
      }
    );

    return unsubscribe;
  }, [user?.id, isOpen, queryClient]);

  // 알림 아이콘 가져오기
  const getNotificationIcon = (type: NotificationWithSender['type']) => {
    const iconProps = { className: "h-5 w-5" };

    switch (type) {
      case 'node_shared':
        return <ShareIcon {...iconProps} className="h-5 w-5 text-blue-500" />;
      case 'comment_added':
        return <ChatBubbleLeftIcon {...iconProps} className="h-5 w-5 text-green-500" />;
      case 'node_liked':
        return <BookOpenIcon {...iconProps} className="h-5 w-5 text-red-500" />;
      case 'relationship_created':
        return <ShareIcon {...iconProps} className="h-5 w-5 text-purple-500" />;
      case 'mention':
        return <ChatBubbleLeftIcon {...iconProps} className="h-5 w-5 text-orange-500" />;
      case 'system_update':
        return <ExclamationTriangleIcon {...iconProps} className="h-5 w-5 text-yellow-500" />;
      default:
        return <BellIcon {...iconProps} className="h-5 w-5 text-gray-500" />;
    }
  };

  // 알림 클릭 처리
  const handleNotificationClick = (notification: NotificationWithSender) => {
    // 읽음 처리
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // 관련 페이지로 이동
    if (notification.related_node_id) {
      navigate(`/app/knowledge/${notification.related_node_id}`);
      onClose();
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  // 알림 삭제
  const handleDeleteNotification = (notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    return `${Math.floor(diffInSeconds / 86400)}일 전`;
  };

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BellIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">
              알림 {unreadCount > 0 && `(${unreadCount})`}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
              >
                {markAllAsReadMutation.isPending ? '처리 중...' : '모두 읽음'}
              </button>
            )}
            <Link
              to="/app/settings"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </Link>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          // 로딩 상태
          <div className="px-4 py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">알림을 불러오는 중...</p>
          </div>
        ) : error ? (
          // 에러 상태
          <div className="px-4 py-8 text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">알림을 불러올 수 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              잠시 후 다시 시도해주세요.
            </p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm ${!notification.is_read ? 'font-medium text-gray-900' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-xs mt-1 ${!notification.is_read ? 'text-gray-700' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                          {notification.sender && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {notification.sender.first_name || notification.sender.last_name
                                  ? `${notification.sender.first_name || ''} ${notification.sender.last_name || ''}`.trim()
                                  : '익명'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          disabled={deleteNotificationMutation.isPending}
                          className="mt-1 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">알림이 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              새로운 활동이 있을 때 여기에 표시됩니다.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <Link
            to="/app/settings"
            onClick={onClose}
            className="block w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            알림 설정 관리
          </Link>
        </div>
      )}
    </div>
  );
};