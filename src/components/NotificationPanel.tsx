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

interface Notification {
  id: string;
  type: 'node_shared' | 'comment_added' | 'node_liked' | 'relationship_created' | 'mention' | 'system_update';
  title: string;
  message: string;
  relatedNodeId?: string;
  relatedCommentId?: string;
  senderId?: string;
  senderName?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Mock notification data - 실제로는 API에서 가져와야 함
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'node_shared',
      title: '새 노드가 공유되었습니다',
      message: '김민수님이 "React 최적화 가이드" 노드를 공유했습니다.',
      relatedNodeId: 'node-123',
      senderId: 'user-456',
      senderName: '김민수',
      isRead: false,
      createdAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      type: 'comment_added',
      title: '새 댓글이 추가되었습니다',
      message: '"JavaScript ES6+ 문법" 노드에 새 댓글이 있습니다.',
      relatedNodeId: 'node-789',
      relatedCommentId: 'comment-111',
      senderId: 'user-222',
      senderName: '이영희',
      isRead: false,
      createdAt: '2024-01-15T09:15:00Z'
    },
    {
      id: '3',
      type: 'relationship_created',
      title: '새 관계가 생성되었습니다',
      message: '"AI 기반 검색"과 "머신러닝" 노드가 연결되었습니다.',
      relatedNodeId: 'node-333',
      isRead: true,
      createdAt: '2024-01-14T16:45:00Z'
    },
    {
      id: '4',
      type: 'system_update',
      title: '시스템 업데이트',
      message: '새로운 AI 기능이 추가되었습니다. 지금 확인해보세요!',
      isRead: true,
      createdAt: '2024-01-14T08:00:00Z'
    },
    {
      id: '5',
      type: 'mention',
      title: '멘션되었습니다',
      message: '박지성님이 "팀 프로젝트 계획"에서 회원님을 언급했습니다.',
      relatedNodeId: 'node-555',
      senderId: 'user-666',
      senderName: '박지성',
      isRead: false,
      createdAt: '2024-01-13T14:20:00Z'
    }
  ];

  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  // 알림 아이콘 가져오기
  const getNotificationIcon = (type: Notification['type']) => {
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
  const handleNotificationClick = (notification: Notification) => {
    // 읽음 처리
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // 관련 페이지로 이동
    if (notification.relatedNodeId) {
      navigate(`/app/knowledge/${notification.relatedNodeId}`);
      onClose();
    }
  };

  // 개별 알림 읽음 처리
  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
    // 실제로는 API 호출 필요
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
    // 실제로는 API 호출 필요
  };

  // 알림 삭제
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
    // 실제로는 API 호출 필요
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
                onClick={markAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                모두 읽음
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
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-blue-50' : ''
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
                        <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-xs mt-1 ${!notification.isRead ? 'text-gray-700' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.createdAt)}
                          </span>
                          {notification.senderName && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {notification.senderName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="mt-1 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
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