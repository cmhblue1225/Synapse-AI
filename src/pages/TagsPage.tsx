import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  TagIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  BookOpenIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';
import { knowledgeService } from '../services/knowledge.service';
import { searchService } from '../services/search.service';

interface Tag {
  name: string;
  count: number;
  color?: string;
  description?: string;
  nodes?: any[];
}

interface TagFormData {
  name: string;
  color: string;
  description: string;
}

export const TagsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'recent'>('count');
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: '#3B82F6',
    description: ''
  });

  const queryClient = useQueryClient();

  // 모든 노드에서 태그 정보 추출
  const { data: allNodes, isLoading: nodesLoading } = useQuery({
    queryKey: ['all-nodes-for-tags'],
    queryFn: () => knowledgeService.getUserNodes({ limit: 1000 }),
  });

  // 인기 태그 정보 가져오기
  const { data: popularTags, isLoading: tagsLoading } = useQuery({
    queryKey: ['popular-tags'],
    queryFn: () => searchService.getPopularTags(),
  });

  const nodes = allNodes?.nodes || [];

  // 태그별 상세 정보 계산
  const tagDetails: Tag[] = React.useMemo(() => {
    const tagMap = new Map<string, Tag>();

    nodes.forEach(node => {
      node.tags.forEach((tagName: string) => {
        if (!tagMap.has(tagName)) {
          tagMap.set(tagName, {
            name: tagName,
            count: 0,
            color: '#3B82F6',
            description: '',
            nodes: []
          });
        }
        const tag = tagMap.get(tagName)!;
        tag.count++;
        tag.nodes!.push(node);
      });
    });

    return Array.from(tagMap.values())
      .filter(tag =>
        !searchQuery ||
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'count':
            return b.count - a.count;
          case 'recent':
            const aLatest = Math.max(...(a.nodes?.map(n => new Date(n.updated_at).getTime()) || [0]));
            const bLatest = Math.max(...(b.nodes?.map(n => new Date(n.updated_at).getTime()) || [0]));
            return bLatest - aLatest;
          default:
            return 0;
        }
      });
  }, [nodes, searchQuery, sortBy]);

  const handleCreateTag = () => {
    setIsCreating(true);
    setFormData({ name: '', color: '#3B82F6', description: '' });
  };

  const handleEditTag = (tag: Tag) => {
    setSelectedTag(tag);
    setIsEditing(true);
    setFormData({
      name: tag.name,
      color: tag.color || '#3B82F6',
      description: tag.description || ''
    });
  };

  const handleSaveTag = () => {
    if (!formData.name.trim()) {
      toast.error('태그 이름을 입력하세요.');
      return;
    }

    // 실제로는 서버에 저장하는 로직이 필요
    // 현재는 로컬 상태만 업데이트
    toast.success(isCreating ? '태그가 생성되었습니다.' : '태그가 수정되었습니다.');
    setIsCreating(false);
    setIsEditing(false);
    setSelectedTag(null);
  };

  const handleDeleteTag = (tagName: string) => {
    if (confirm(`"${tagName}" 태그를 삭제하시겠습니까?`)) {
      // 실제로는 서버에서 삭제하는 로직이 필요
      toast.success('태그가 삭제되었습니다.');
    }
  };

  const predefinedColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    '#EC4899', '#6366F1', '#14B8A6', '#F472B6'
  ];

  if (nodesLoading || tagsLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <TagIcon className="h-8 w-8 mr-3 text-primary-600" />
              태그 관리
            </h1>
            <p className="mt-2 text-gray-600">
              {tagDetails.length}개의 태그로 {nodes.length}개의 노드를 관리하고 있습니다.
            </p>
          </div>

          <button
            onClick={handleCreateTag}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            새 태그 생성
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="태그 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="count">사용량순</option>
              <option value="name">이름순</option>
              <option value="recent">최근 사용순</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tagDetails.map((tag) => (
            <div key={tag.name} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: tag.color }}
                    ></div>
                    <h3 className="text-lg font-medium text-gray-900 truncate">#{tag.name}</h3>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditTag(tag)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.name)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">사용된 노드</span>
                    <span className="text-lg font-semibold text-primary-600">{tag.count}</span>
                  </div>

                  {tag.description && (
                    <p className="text-sm text-gray-600 truncate">{tag.description}</p>
                  )}

                  <div className="pt-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <BookOpenIcon className="h-3 w-3 mr-1" />
                      <span>최근 사용: {tag.nodes?.length ? new Date(Math.max(...tag.nodes.map(n => new Date(n.updated_at).getTime()))).toLocaleDateString('ko-KR') : '없음'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedTag(tag)}
                    className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    관련 노드 보기 ({tag.count})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="min-w-full divide-y divide-gray-200">
            <div className="bg-gray-50 px-6 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">태그 목록</h3>
              </div>
            </div>
            <div className="bg-white divide-y divide-gray-200">
              {tagDetails.map((tag) => (
                <div key={tag.name} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      ></div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">#{tag.name}</h4>
                        {tag.description && (
                          <p className="text-xs text-gray-500">{tag.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">{tag.count}개 노드</span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditTag(tag)}
                          className="p-1 text-gray-400 hover:text-primary-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {tagDetails.length === 0 && (
        <div className="text-center py-12">
          <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchQuery ? '검색 결과가 없습니다' : '태그가 없습니다'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? '다른 키워드로 검색해보세요.' : '노드에 태그를 추가하여 시작해보세요.'}
          </p>
        </div>
      )}

      {/* Create/Edit Tag Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-4">
                  <SwatchIcon className="h-6 w-6 text-primary-600 mr-2" />
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isCreating ? '새 태그 생성' : '태그 편집'}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="tagName" className="block text-sm font-medium text-gray-700">
                      태그 이름
                    </label>
                    <input
                      type="text"
                      id="tagName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="태그 이름 입력"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      색상 선택
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="tagDescription" className="block text-sm font-medium text-gray-700">
                      설명 (선택사항)
                    </label>
                    <textarea
                      id="tagDescription"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="태그에 대한 설명을 입력하세요"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleSaveTag}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {isCreating ? '생성' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                    setSelectedTag(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Details Modal */}
      {selectedTag && !isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedTag(null)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className="w-5 h-5 rounded-full mr-3"
                      style={{ backgroundColor: selectedTag.color }}
                    ></div>
                    <h3 className="text-xl font-semibold text-gray-900">#{selectedTag.name}</h3>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {selectedTag.count}개 노드
                  </span>
                </div>

                {selectedTag.description && (
                  <p className="text-gray-600 mb-4">{selectedTag.description}</p>
                )}

                <div className="max-h-96 overflow-y-auto">
                  <h4 className="font-medium text-gray-900 mb-3">관련 노드</h4>
                  <div className="space-y-2">
                    {selectedTag.nodes?.map((node) => (
                      <div key={node.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <BookOpenIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900">{node.title}</h5>
                          <p className="text-xs text-gray-500">{node.node_type} • {new Date(node.updated_at).toLocaleDateString('ko-KR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};