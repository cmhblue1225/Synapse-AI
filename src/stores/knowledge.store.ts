import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { KnowledgeNode, CreateKnowledgeNodeRequest, UpdateKnowledgeNodeRequest } from '../types/api';
import { knowledgeService } from '../services/knowledge.service';

interface KnowledgeState {
  // State
  nodes: KnowledgeNode[];
  currentNode: KnowledgeNode | null;
  totalNodes: number;
  isLoading: boolean;
  error: string | null;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;

  // Filters
  filters: {
    nodeType?: string;
    contentType?: string;
    sortBy: 'createdAt' | 'updatedAt' | 'title';
    sortOrder: 'ASC' | 'DESC';
  };

  // Actions
  fetchNodes: (options?: { page?: number; limit?: number }) => Promise<void>;
  fetchNode: (nodeId: string) => Promise<void>;
  createNode: (nodeData: CreateKnowledgeNodeRequest) => Promise<KnowledgeNode>;
  updateNode: (nodeId: string, nodeData: UpdateKnowledgeNodeRequest) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  bulkCreateNodes: (nodesData: CreateKnowledgeNodeRequest[]) => Promise<void>;
  linkNodes: (sourceId: string, targetId: string, relationshipData: any) => Promise<void>;
  setFilters: (filters: Partial<KnowledgeState['filters']>) => void;
  setCurrentPage: (page: number) => void;
  clearError: () => void;
  reset: () => void;
}

export const useKnowledgeStore = create<KnowledgeState>()(
  devtools(
    (set, get) => ({
      // Initial state
      nodes: [],
      currentNode: null,
      totalNodes: 0,
      isLoading: false,
      error: null,
      currentPage: 1,
      pageSize: 20,
      totalPages: 1,
      filters: {
        sortBy: 'updatedAt',
        sortOrder: 'DESC',
      },

      // Fetch nodes with pagination
      fetchNodes: async (options = {}) => {
        const { currentPage, pageSize } = get();
        const page = options.page || currentPage;
        const limit = options.limit || pageSize;

        set({ isLoading: true, error: null });

        try {
          const response = await knowledgeService.getUserNodes({ limit });

          set({
            nodes: response.nodes,
            totalNodes: response.totalNodes,
            totalPages: Math.ceil(response.totalNodes / limit),
            currentPage: page,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Failed to fetch nodes',
          });
        }
      },

      // Fetch single node
      fetchNode: async (nodeId: string) => {
        set({ isLoading: true, error: null });

        try {
          const node = await knowledgeService.getNode(nodeId);
          
          set({
            currentNode: node,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Failed to fetch node',
          });
        }
      },

      // Create new node
      createNode: async (nodeData: CreateKnowledgeNodeRequest) => {
        set({ isLoading: true, error: null });

        try {
          const newNode = await knowledgeService.createNode(nodeData);
          
          // Add to the beginning of nodes list
          set((state) => ({
            nodes: [newNode, ...state.nodes],
            totalNodes: state.totalNodes + 1,
            isLoading: false,
            error: null,
          }));

          return newNode;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Failed to create node',
          });
          throw error;
        }
      },

      // Update existing node
      updateNode: async (nodeId: string, nodeData: UpdateKnowledgeNodeRequest) => {
        set({ isLoading: true, error: null });

        try {
          const updatedNode = await knowledgeService.updateNode(nodeId, nodeData);
          
          set((state) => ({
            nodes: state.nodes.map(node => 
              node.id === nodeId ? updatedNode : node
            ),
            currentNode: state.currentNode?.id === nodeId ? updatedNode : state.currentNode,
            isLoading: false,
            error: null,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Failed to update node',
          });
          throw error;
        }
      },

      // Delete node
      deleteNode: async (nodeId: string) => {
        set({ isLoading: true, error: null });

        try {
          await knowledgeService.deleteNode(nodeId);
          
          set((state) => ({
            nodes: state.nodes.filter(node => node.id !== nodeId),
            totalNodes: state.totalNodes - 1,
            currentNode: state.currentNode?.id === nodeId ? null : state.currentNode,
            isLoading: false,
            error: null,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Failed to delete node',
          });
          throw error;
        }
      },

      // Bulk create nodes
      bulkCreateNodes: async (nodesData: CreateKnowledgeNodeRequest[]) => {
        set({ isLoading: true, error: null });

        try {
          // Create nodes one by one (since we don't have bulk create in service yet)
          const newNodes = [];
          for (const nodeData of nodesData) {
            const newNode = await knowledgeService.createNode(nodeData);
            newNodes.push(newNode);
          }

          set((state) => ({
            nodes: [...newNodes, ...state.nodes],
            totalNodes: state.totalNodes + newNodes.length,
            isLoading: false,
            error: null,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Failed to create nodes',
          });
          throw error;
        }
      },

      // Link nodes
      linkNodes: async (sourceId: string, targetId: string, relationshipData: any) => {
        set({ isLoading: true, error: null });

        try {
          await knowledgeService.createRelationship({
            source_node_id: sourceId,
            target_node_id: targetId,
            relationship_type: relationshipData.type || 'related_to',
            weight: relationshipData.weight || 1.0,
            metadata: relationshipData.metadata || {}
          });

          // Refresh nodes to show updated relationships
          await get().fetchNodes();

          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Failed to link nodes',
          });
          throw error;
        }
      },

      // Set filters
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          currentPage: 1, // Reset to first page when filters change
        }));
        
        // Refresh nodes with new filters
        get().fetchNodes();
      },

      // Set current page
      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().fetchNodes({ page });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set({
          nodes: [],
          currentNode: null,
          totalNodes: 0,
          isLoading: false,
          error: null,
          currentPage: 1,
          totalPages: 1,
          filters: {
            sortBy: 'updatedAt',
            sortOrder: 'DESC',
          },
        });
      },
    }),
    {
      name: 'knowledge-store',
    }
  )
);