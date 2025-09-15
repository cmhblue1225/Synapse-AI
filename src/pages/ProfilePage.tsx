import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserCircleIcon,
  CameraIcon,
  PencilIcon,
  CalendarIcon,
  ChartBarIcon,
  BookOpenIcon,
  TagIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/auth.store';
import { knowledgeService } from '../services/knowledge.service';

interface EditableField {
  field: 'firstName' | 'lastName' | 'bio';
  value: string;
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState<EditableField | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // 사용자 노드 데이터 조회
  const { data: nodesData } = useQuery({
    queryKey: ['user-nodes'],
    queryFn: () => knowledgeService.getUserNodes({ limit: 50 }),
  });

  // 그래프 데이터 조회 (관계 정보)
  const { data: graphData } = useQuery({
    queryKey: ['graph-stats'],
    queryFn: () => knowledgeService.getGraphData(),
  });

  const nodes = nodesData?.nodes || [];
  const relationships = graphData?.relationships || [];

  // 통계 계산
  const totalNodes = nodes.length;
  const totalRelationships = relationships.length;

  // 노드 타입별 분포
  const nodeTypeDistribution = nodes.reduce((acc, node) => {
    acc[node.node_type] = (acc[node.node_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 태그 사용 빈도
  const tagDistribution = nodes.reduce((acc, node) => {
    node.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // 최근 활동 (7일 이내)
  const recentActivity = nodes.filter(node => {
    const updatedAt = new Date(node.updated_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return updatedAt > sevenDaysAgo;
  }).length;

  // 편집 시작
  const startEditing = (field: EditableField['field'], currentValue: string) => {
    setIsEditing({ field, value: currentValue });
    setEditingValue(currentValue);
  };

  // 편집 저장
  const saveEdit = async () => {
    // TODO: 실제 API 호출로 프로필 업데이트
    console.log('Saving profile update:', { field: isEditing?.field, value: editingValue });
    setIsEditing(null);
    setEditingValue('');
  };

  // 편집 취소
  const cancelEdit = () => {
    setIsEditing(null);
    setEditingValue('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 프로필 헤더 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">프로필</h1>
          <p className="mt-1 text-gray-600">개인 정보 및 활동 현황을 확인하세요.</p>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
            {/* 프로필 이미지 */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-20 h-20 text-gray-400" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-2 shadow-sm hover:bg-gray-50">
                  <CameraIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="flex-1 mt-6 lg:mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 이름 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                  {isEditing?.field === 'firstName' ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                      <button onClick={cancelEdit} className="text-red-600 hover:text-red-700">
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900">{user?.first_name || '설정되지 않음'}</span>
                      <button
                        onClick={() => startEditing('firstName', user?.first_name || '')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 성 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">성</label>
                  {isEditing?.field === 'lastName' ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                      <button onClick={cancelEdit} className="text-red-600 hover:text-red-700">
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900">{user?.last_name || '설정되지 않음'}</span>
                      <button
                        onClick={() => startEditing('lastName', user?.last_name || '')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 이메일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                  <span className="text-gray-900">{user?.email}</span>
                </div>

                {/* 가입일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">가입일</label>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '정보 없음'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 자기소개 */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">자기소개</label>
                {isEditing?.field === 'bio' ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="자신을 소개해주세요..."
                    />
                    <div className="flex space-x-2">
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                      <button onClick={cancelEdit} className="text-red-600 hover:text-red-700">
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <p className="text-gray-900 flex-1">
                      {user?.bio || '아직 자기소개가 없습니다. 클릭하여 추가해보세요.'}
                    </p>
                    <button
                      onClick={() => startEditing('bio', user?.bio || '')}
                      className="text-gray-400 hover:text-gray-600 mt-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 활동 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-lg p-3 mr-4">
              <BookOpenIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">총 노드 수</p>
              <p className="text-2xl font-semibold text-gray-900">{totalNodes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-lg p-3 mr-4">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">관계 수</p>
              <p className="text-2xl font-semibold text-gray-900">{totalRelationships}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3 mr-4">
              <TagIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">사용 중인 태그</p>
              <p className="text-2xl font-semibold text-gray-900">{Object.keys(tagDistribution).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-orange-500 rounded-lg p-3 mr-4">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">최근 7일 활동</p>
              <p className="text-2xl font-semibold text-gray-900">{recentActivity}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 노드 타입 분포 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">노드 타입 분포</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(nodeTypeDistribution)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{type}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${(count / totalNodes) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 인기 태그 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">인기 태그</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(tagDistribution)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([tag, count]) => (
                <div key={tag} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TagIcon className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">#{tag}</span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {nodes
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .slice(0, 5)
              .map((node) => (
              <div key={node.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {node.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {node.node_type} • {new Date(node.updated_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    업데이트됨
                  </span>
                </div>
              </div>
            ))}

            {nodes.length === 0 && (
              <div className="text-center py-8">
                <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">활동이 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">
                  첫 번째 노드를 생성해보세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};