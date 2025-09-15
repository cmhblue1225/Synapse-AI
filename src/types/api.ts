// API Base Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Knowledge Node Types (PDF 요구사항에 따른 정확한 타입)
export type NodeType = 'Note' | 'WebClip' | 'Document' | 'Image' | 'Concept'

export type ContentType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'url' | 'code'

// Edge Types (PDF 2장 핵심 요구사항)
export type EdgeType =
  | 'REFERENCES'      // 한 노드가 다른 노드를 인용하거나 참조함
  | 'EXPANDS_ON'      // 한 노드가 다른 노드의 내용을 상세히 설명하거나 확장함
  | 'CONTRADICTS'     // 한 노드가 다른 노드에 대해 반대되는 관점을 제시함
  | 'SUPPORTS'        // 한 노드가 다른 노드에 대한 근거를 제공함
  | 'IS_A'            // 특정 사례가 일반적인 개념에 속함을 나타냄

export interface KnowledgeNodeMetadata {
  files?: AttachedFile[];
  summary?: string; // AI로 생성된 노드 전체 요약
  [key: string]: any; // 기타 메타데이터
}

export interface KnowledgeNode {
  id: string;
  title: string;
  content: string;
  contentType: ContentType;
  nodeType: NodeType;
  userId: string;
  tags: string[];
  metadata: KnowledgeNodeMetadata;
  relatedNodes: RelatedNode[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RelatedNode {
  id: string;
  relationshipType: EdgeType;
  weight: number;
  comment?: string;  // PDF 요구사항: 관계에 대한 사용자 코멘트
  metadata?: Record<string, any>;
}

export interface CreateKnowledgeNodeRequest {
  title: string;
  content: string;
  contentType?: ContentType;
  nodeType?: NodeType;
  tags?: string[];
  metadata?: Record<string, any>;
  relatedNodes?: RelatedNode[];
}

export interface UpdateKnowledgeNodeRequest extends Partial<CreateKnowledgeNodeRequest> {
  isActive?: boolean;
}

export interface BulkCreateNodesRequest {
  nodes: CreateKnowledgeNodeRequest[];
}

// Search Types
export interface SearchQuery {
  query: string;
  nodeTypes?: NodeType[];
  contentTypes?: ContentType[];
  tags?: string[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  contentType: ContentType;
  nodeType: NodeType;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  relevanceScore: number;
  highlights: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  searchTime: number;
  appliedFilters: Record<string, any>;
}

export interface AutocompleteQuery {
  query: string;
  limit?: number;
}

export interface AutocompleteResponse {
  suggestions: string[];
}

export interface PopularTag {
  tag: string;
  count: number;
}

// Graph Types
export interface GraphNode {
  id: string;
  title: string;
  nodeType: NodeType;
  contentType: ContentType;
  tags: string[];
  createdAt: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: EdgeType;
  weight: number;
  comment?: string;  // PDF 요구사항: 엣지에 대한 사용자 코멘트
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// 새로운 관계 생성 인터페이스 (PDF FR-6 요구사항)
export interface CreateRelationshipRequest {
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: EdgeType;
  comment?: string;
  weight?: number;
}

export interface UpdateRelationshipRequest {
  relationshipType?: EdgeType;
  comment?: string;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphQuery {
  nodeId?: string;
  depth?: number;
  relationshipTypes?: string[];
  minWeight?: number;
  maxNodes?: number;
}

// File Attachment Types
export interface AttachedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  summary?: string; // AI로 생성된 파일 요약
}

// Statistics Types
export interface NodeStats {
  totalNodes: number;
  nodeTypeDistribution: Record<NodeType, number>;
  contentTypeDistribution: Record<ContentType, number>;
}

export interface UserActivity {
  date: string;
  nodesCreated: number;
  nodesUpdated: number;
  searchCount: number;
}