import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import { notificationService } from './notification.service'

export type KnowledgeNode = Database['public']['Tables']['knowledge_nodes']['Row']
export type InsertKnowledgeNode = Database['public']['Tables']['knowledge_nodes']['Insert']
export type UpdateKnowledgeNode = Database['public']['Tables']['knowledge_nodes']['Update']
export type KnowledgeRelationship = Database['public']['Tables']['knowledge_relationships']['Row']
export type InsertKnowledgeRelationship = Database['public']['Tables']['knowledge_relationships']['Insert']

export class KnowledgeService {
  // Knowledge Nodes CRUD
  async getNodes(userId?: string): Promise<KnowledgeNode[]> {
    let query = supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async getUserNodes(options?: { limit?: number, userId?: string }): Promise<{ nodes: KnowledgeNode[], totalNodes: number }> {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = options?.userId || user?.id

    console.log('getUserNodes called with:', {
      currentUser: user?.email,
      currentUserId: user?.id,
      targetUserId,
      options
    })

    if (!targetUserId) {
      throw new Error('Not authenticated')
    }

    let query = supabase
      .from('knowledge_nodes')
      .select('*', { count: 'exact' })
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error, count } = await query

    console.log('getUserNodes result:', { data, error, count })

    if (error) throw error

    return {
      nodes: data || [],
      totalNodes: count || 0
    }
  }

  // 디버깅용 - 모든 노드 조회 (임시)
  async getAllNodesForDebug(limit?: number): Promise<{ nodes: KnowledgeNode[], totalNodes: number }> {
    console.log('getAllNodesForDebug called with limit:', limit)

    let query = supabase
      .from('knowledge_nodes')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error, count } = await query

    console.log('getAllNodesForDebug result:', { data, error, count })

    if (error) throw error

    return {
      nodes: data || [],
      totalNodes: count || 0
    }
  }

  async getNode(nodeId: string): Promise<KnowledgeNode | null> {
    const { data, error } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('id', nodeId)
      .eq('is_active', true)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async getNodeDetails(id: string) {
    const { data, error } = await supabase
      .from('node_details')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async createNode(nodeData: InsertKnowledgeNode): Promise<KnowledgeNode> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('knowledge_nodes')
      .insert({ ...nodeData, user_id: user.id })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async updateNode(nodeId: string, nodeData: UpdateKnowledgeNode): Promise<KnowledgeNode> {
    const { data, error } = await supabase
      .from('knowledge_nodes')
      .update({ ...nodeData, updated_at: new Date().toISOString() })
      .eq('id', nodeId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async deleteNode(nodeId: string): Promise<void> {
    const { error } = await supabase
      .from('knowledge_nodes')
      .update({ is_active: false })
      .eq('id', nodeId)
    
    if (error) throw error
  }

  async toggleNodeVisibility(id: string, isPublic: boolean): Promise<KnowledgeNode> {
    const { data, error } = await supabase
      .from('knowledge_nodes')
      .update({ is_public: isPublic })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Search functionality (최적화된 버전)
  async searchNodes(query: string = '', filters?: {
    nodeTypes?: string[]
    contentTypes?: string[]
    tags?: string[]
    isPublic?: boolean
    userId?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<Array<KnowledgeNode & { relevance_score?: number }>> {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = filters?.userId || user?.id

    if (!targetUserId) throw new Error('Not authenticated')

    // 최적화된 검색 함수 사용
    const { data, error } = await supabase.rpc('search_knowledge_nodes', {
      search_user_id: targetUserId,
      search_query: query || '',
      node_types: filters?.nodeTypes || null,
      content_types: filters?.contentTypes || null,
      tags_filter: filters?.tags || null,
      start_date: filters?.startDate ? new Date(filters.startDate).toISOString() : null,
      end_date: filters?.endDate ? new Date(filters.endDate).toISOString() : null,
      include_public: filters?.isPublic || false,
      limit_count: filters?.limit || 50,
      offset_count: filters?.offset || 0
    })

    if (error) throw error
    return data || []
  }

  async getPopularNodes(limit: number = 10) {
    const { data, error } = await supabase
      .from('popular_nodes')
      .select('*')
      .limit(limit)
    
    if (error) throw error
    return data || []
  }

  // Relationships
  async getNodeRelationships(nodeId: string): Promise<KnowledgeRelationship[]> {
    const { data, error } = await supabase
      .from('knowledge_relationships')
      .select(`
        *,
        source_node:knowledge_nodes!source_node_id(id, title, node_type),
        target_node:knowledge_nodes!target_node_id(id, title, node_type)
      `)
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  async createRelationship(params: {
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: string;
    comment?: string;
    weight?: number;
  }): Promise<KnowledgeRelationship> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log('🔄 Creating relationship:', {
      sourceNodeId: params.sourceNodeId,
      targetNodeId: params.targetNodeId,
      relationshipType: params.relationshipType,
      userId: user.id
    })

    // 먼저 두 노드가 모두 현재 사용자의 것인지 확인
    const { data: sourceNode, error: sourceError } = await supabase
      .from('knowledge_nodes')
      .select('id, user_id, title')
      .eq('id', params.sourceNodeId)
      .single()

    const { data: targetNode, error: targetError } = await supabase
      .from('knowledge_nodes')
      .select('id, user_id, title')
      .eq('id', params.targetNodeId)
      .single()

    console.log('📝 Node ownership check:', {
      sourceNode: sourceNode ? { id: sourceNode.id, userId: sourceNode.user_id, title: sourceNode.title } : null,
      targetNode: targetNode ? { id: targetNode.id, userId: targetNode.user_id, title: targetNode.title } : null,
      currentUserId: user.id,
      sourceError,
      targetError
    })

    if (sourceError || targetError) {
      throw new Error(`노드를 찾을 수 없습니다: ${sourceError?.message || targetError?.message}`)
    }

    if (!sourceNode || !targetNode) {
      throw new Error('노드를 찾을 수 없습니다')
    }

    // 사용자가 최소한 하나의 노드를 소유하고 있는지 확인
    const ownsSource = sourceNode.user_id === user.id
    const ownsTarget = targetNode.user_id === user.id

    console.log('🔐 Ownership validation:', {
      ownsSource,
      ownsTarget,
      canCreateRelationship: ownsSource || ownsTarget
    })

    if (!ownsSource && !ownsTarget) {
      throw new Error('관계를 생성하려면 최소한 하나의 노드를 소유해야 합니다')
    }

    const relationshipData = {
      source_node_id: params.sourceNodeId,
      target_node_id: params.targetNodeId,
      relationship_type: params.relationshipType,
      comment: params.comment,
      weight: params.weight || 1.0,
      created_by: user.id
    }

    console.log('💾 Inserting relationship data:', relationshipData)

    const { data, error } = await supabase
      .from('knowledge_relationships')
      .insert(relationshipData)
      .select()
      .single()

    if (error) {
      console.error('❌ Relationship creation error:', error)
      throw error
    }

    console.log('✅ Relationship created successfully:', data)

    // 관계 생성 알림 생성 (비동기 처리 - 실패해도 메인 기능에 영향 없음)
    try {
      // 노드 소유자들에게 알림 생성 (자기 자신 제외)
      if (sourceNode.user_id !== user.id) {
        await notificationService.createRelationshipNotification(
          sourceNode.user_id,
          user.id,
          params.sourceNodeId,
          params.targetNodeId,
          sourceNode.title,
          targetNode.title
        );
      }

      if (targetNode.user_id !== user.id && targetNode.user_id !== sourceNode.user_id) {
        await notificationService.createRelationshipNotification(
          targetNode.user_id,
          user.id,
          params.sourceNodeId,
          params.targetNodeId,
          sourceNode.title,
          targetNode.title
        );
      }
    } catch (notificationError) {
      console.warn('관계 생성 알림 전송 실패:', notificationError);
      // 알림 실패는 주 기능에 영향을 주지 않으므로 조용히 처리
    }

    return data
  }

  async deleteRelationship(id: string): Promise<void> {
    const { error } = await supabase
      .from('knowledge_relationships')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Tags
  async getUserTags(userId: string) {
    const { data, error } = await supabase
      .from('knowledge_tags')
      .select('*')
      .eq('user_id', userId)
      .order('usage_count', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  async createTag(name: string, color?: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('knowledge_tags')
      .insert({
        user_id: user.id,
        name,
        color: color || '#3B82F6',
        description
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Analytics
  async recordNodeView(nodeId: string, duration?: number, referrer?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('node_views')
      .insert({
        node_id: nodeId,
        viewer_id: user?.id || null,
        view_duration_seconds: duration || 0,
        referrer: referrer || 'direct'
      })
    
    if (error) throw error
  }

  // 최적화된 사용자 통계 조회 (단일 함수 호출)
  async getUserStats(userId?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = userId || user?.id

    if (!targetUserId) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('get_user_statistics', {
      stats_user_id: targetUserId
    })

    if (error) throw error
    return data?.[0] || {
      total_nodes: 0,
      total_relationships: 0,
      total_tags: 0,
      nodes_this_week: 0,
      avg_relationships_per_node: 0,
      most_used_tags: [],
      node_type_distribution: {},
      content_type_distribution: {},
      recent_activity_days: 0
    }
  }

  // Get node statistics for dashboard (getNodeStats를 getUserStats로 통합하고 별칭 제공)
  async getNodeStats() {
    return this.getUserStats()
  }

  // Vector similarity search (AI 기능용)
  async searchSimilarNodes(
    embedding: number[],
    threshold: number = 0.7,
    limit: number = 10,
    userId?: string
  ) {
    const { data, error } = await supabase.rpc('search_similar_nodes', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
      target_user_id: userId
    })

    if (error) throw error
    return data || []
  }

  // Graph visualization data (최적화된 버전)
  async getGraphData(userId?: string, includePublic: boolean = false): Promise<{
    nodes: Array<{
      id: string;
      title: string;
      node_type: string;
      tags: string[];
      created_at: string;
      updated_at: string;
    }>;
    relationships: Array<{
      id: string;
      source: string;
      target: string;
      relationship_type: string;
      weight: number;
      confidence: number;
    }>;
  }> {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = userId || user?.id

    if (!targetUserId) throw new Error('Not authenticated')

    // 최적화된 단일 함수 호출로 그래프 데이터 조회
    const { data, error } = await supabase.rpc('get_graph_data', {
      graph_user_id: targetUserId,
      include_public: includePublic
    })

    if (error) throw error

    // 결과가 null이거나 빈 경우 기본값 반환
    if (!data || data.length === 0) {
      return { nodes: [], relationships: [] }
    }

    const result = data[0]
    return {
      nodes: result.nodes || [],
      relationships: result.relationships || []
    }
  }

  // Get all relationships for the current user
  async getAllRelationships(): Promise<KnowledgeRelationship[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('knowledge_relationships')
      .select(`
        *,
        source_node:knowledge_nodes!source_node_id(id, title, node_type),
        target_node:knowledge_nodes!target_node_id(id, title, node_type)
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Real-time subscriptions
  subscribeToUserNodes(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`user_nodes_${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'knowledge_nodes',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }

  subscribeToNodeUpdates(nodeId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`node_${nodeId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'knowledge_nodes',
          filter: `id=eq.${nodeId}`
        },
        callback
      )
      .subscribe()
  }

  // Advanced graph traversal queries
  async findPathBetweenNodes(
    sourceNodeId: string,
    targetNodeId: string,
    maxDepth: number = 5
  ) {
    const { data, error } = await supabase.rpc('find_path_between_nodes', {
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      max_depth: maxDepth
    })

    if (error) throw error
    return data || []
  }

  async getNodeNeighborhood(
    nodeId: string,
    depth: number = 2,
    relationshipTypes?: string[]
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let query = supabase.rpc('get_node_neighborhood', {
      root_node_id: nodeId,
      max_depth: depth,
      user_id: user.id
    })

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async findSimilarNodesByContent(
    nodeId: string,
    threshold: number = 0.8,
    limit: number = 10
  ) {
    const { data, error } = await supabase.rpc('find_similar_nodes_by_content', {
      node_id: nodeId,
      similarity_threshold: threshold,
      result_limit: limit
    })

    if (error) throw error
    return data || []
  }

  async getNodeInfluence(nodeId: string) {
    const { data, error } = await supabase.rpc('calculate_node_influence', {
      node_id: nodeId
    })

    if (error) throw error
    return data || { inbound_count: 0, outbound_count: 0, influence_score: 0 }
  }

  async findClusters(minClusterSize: number = 3) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('find_knowledge_clusters', {
      user_id: user.id,
      min_cluster_size: minClusterSize
    })

    if (error) throw error
    return data || []
  }

  async getBridgeNodes(userId?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = userId || user?.id

    if (!targetUserId) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('find_bridge_nodes', {
      user_id: targetUserId
    })

    if (error) throw error
    return data || []
  }

  async getShortestPaths(nodeId: string, targetNodes: string[]) {
    const { data, error } = await supabase.rpc('get_shortest_paths', {
      source_node_id: nodeId,
      target_node_ids: targetNodes
    })

    if (error) throw error
    return data || []
  }

  // Helper methods for templates
  static createNoteTemplate(title: string, content: string, tags: string[] = []): InsertKnowledgeNode {
    return {
      title,
      content,
      node_type: 'Note',
      content_type: 'text',
      tags,
      metadata: {
        template: 'note',
        createdFrom: 'frontend',
      },
    };
  }

  static createConceptTemplate(title: string, definition: string, tags: string[] = []): InsertKnowledgeNode {
    return {
      title,
      content: definition,
      node_type: 'Concept',
      content_type: 'text',
      tags: [...tags, 'concept'],
      metadata: {
        template: 'concept',
        createdFrom: 'frontend',
      },
    };
  }

  static createQuestionTemplate(question: string, answer?: string, tags: string[] = []): InsertKnowledgeNode {
    return {
      title: question,
      content: answer || 'No answer provided yet.',
      node_type: answer ? 'Knowledge' : 'Question',
      content_type: 'text',
      tags: [...tags, 'question'],
      metadata: {
        template: 'qa',
        createdFrom: 'frontend',
        hasAnswer: !!answer,
      },
    };
  }
}

export const knowledgeService = new KnowledgeService()