import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';

export interface GraphNode {
  id: string;
  title: string;
  node_type: string;
  tags?: string[];
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  relationship_type: string;
  weight: number;
}

interface Props {
  nodes: GraphNode[];
  relationships: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
  onNodeDoubleClick?: (node: GraphNode) => void;
  width?: number;
  height?: number;
  className?: string;
  showLabels?: boolean;
  showLinkLabels?: boolean;
  layoutMode?: 'force' | 'radial' | 'hierarchical';
  colorScheme?: 'default' | 'dark' | 'pastel';
}

export const KnowledgeGraph = React.memo(function KnowledgeGraph({
  nodes,
  relationships,
  onNodeClick,
  onNodeDoubleClick,
  width = 800,
  height = 600,
  className = '',
  showLabels = true,
  showLinkLabels = false,
  layoutMode = 'force',
  colorScheme = 'default'
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [simulation, setSimulation] = useState<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // 성능 최적화: 색상 구성표 메모이제이션
  const colorSchemes = useMemo(() => ({
    default: {
      nodeTypes: {
        'Knowledge': '#3B82F6', 'Concept': '#10B981', 'Fact': '#F59E0B',
        'Question': '#EF4444', 'Idea': '#8B5CF6', 'Project': '#F97316',
        'Resource': '#06B6D4', 'Note': '#84CC16'
      },
      relationships: {
        'related_to': '#6B7280', 'depends_on': '#EF4444', 'supports': '#10B981',
        'contradicts': '#F59E0B', 'similar_to': '#8B5CF6', 'part_of': '#F97316',
        'example_of': '#06B6D4', 'causes': '#EC4899', 'result_of': '#84CC16'
      }
    },
    dark: {
      nodeTypes: {
        'Knowledge': '#60A5FA', 'Concept': '#34D399', 'Fact': '#FBBF24',
        'Question': '#F87171', 'Idea': '#A78BFA', 'Project': '#FB923C',
        'Resource': '#22D3EE', 'Note': '#A3E635'
      },
      relationships: {
        'related_to': '#9CA3AF', 'depends_on': '#F87171', 'supports': '#34D399',
        'contradicts': '#FBBF24', 'similar_to': '#A78BFA', 'part_of': '#FB923C',
        'example_of': '#22D3EE', 'causes': '#F472B6', 'result_of': '#A3E635'
      }
    },
    pastel: {
      nodeTypes: {
        'Knowledge': '#BFDBFE', 'Concept': '#A7F3D0', 'Fact': '#FEF3C7',
        'Question': '#FECACA', 'Idea': '#E9D5FF', 'Project': '#FED7AA',
        'Resource': '#A5F3FC', 'Note': '#D9F99D'
      },
      relationships: {
        'related_to': '#D1D5DB', 'depends_on': '#FECACA', 'supports': '#A7F3D0',
        'contradicts': '#FEF3C7', 'similar_to': '#E9D5FF', 'part_of': '#FED7AA',
        'example_of': '#A5F3FC', 'causes': '#F9A8D4', 'result_of': '#D9F99D'
      }
    }
  }), []);

  // 성능 최적화: 현재 색상 구성표 메모이제이션
  const { nodeTypeColors, relationshipColors } = useMemo(() => ({
    nodeTypeColors: colorSchemes[colorScheme].nodeTypes,
    relationshipColors: colorSchemes[colorScheme].relationships
  }), [colorSchemes, colorScheme]);

  // 성능 최적화: 노드 클릭 핸들러 메모이제이션
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    onNodeClick?.(node);
  }, [onNodeClick]);

  // 성능 최적화: 노드 더블클릭 핸들러 메모이제이션
  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    onNodeDoubleClick?.(node);
  }, [onNodeDoubleClick]);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    const container = svg.append('g');

    // 메모이제이션된 색상 구성표 사용

    // Create different layout simulations based on layout mode
    let currentSimulation: d3.Simulation<GraphNode, GraphLink>;

    switch (layoutMode) {
      case 'radial':
        // Radial layout: central nodes with others radiating outward
        const centralNodes = nodes.filter(n =>
          relationships.some(r => r.source === n.id || r.target === n.id)
        );
        const radius = Math.min(width, height) * 0.3;

        currentSimulation = d3.forceSimulation<GraphNode>(nodes)
          .force('link', d3.forceLink<GraphNode, GraphLink>(relationships)
            .id((d: GraphNode) => d.id)
            .distance(120)
            .strength(0.3)
          )
          .force('charge', d3.forceManyBody().strength(-200))
          .force('radial', d3.forceRadial(radius, width / 2, height / 2).strength(0.1))
          .force('collision', d3.forceCollide().radius(35));
        break;

      case 'hierarchical':
        // Hierarchical layout: levels based on node connections
        const levels = new Map<string, number>();
        const visited = new Set<string>();

        // Simple BFS to assign levels
        const queue: { node: GraphNode; level: number }[] = [];
        if (nodes.length > 0) {
          queue.push({ node: nodes[0], level: 0 });
          levels.set(nodes[0].id, 0);
        }

        while (queue.length > 0) {
          const { node, level } = queue.shift()!;
          if (visited.has(node.id)) continue;
          visited.add(node.id);

          relationships
            .filter(r => r.source === node.id || r.target === node.id)
            .forEach(r => {
              const nextId = r.source === node.id ? r.target : r.source;
              const nextNode = nodes.find(n => n.id === nextId);
              if (nextNode && !levels.has(nextId)) {
                levels.set(nextId, level + 1);
                queue.push({ node: nextNode, level: level + 1 });
              }
            });
        }

        currentSimulation = d3.forceSimulation<GraphNode>(nodes)
          .force('link', d3.forceLink<GraphNode, GraphLink>(relationships)
            .id((d: GraphNode) => d.id)
            .distance(80)
            .strength(0.5)
          )
          .force('charge', d3.forceManyBody().strength(-250))
          .force('y', d3.forceY((d: GraphNode) => {
            const level = levels.get(d.id) || 0;
            return height * 0.15 + (level * height * 0.2);
          }).strength(0.7))
          .force('collision', d3.forceCollide().radius(30));
        break;

      case 'force':
      default:
        // Default force-directed layout
        currentSimulation = d3.forceSimulation<GraphNode>(nodes)
          .force('link', d3.forceLink<GraphNode, GraphLink>(relationships)
            .id((d: GraphNode) => d.id)
            .distance((d) => 100 - (d.weight * 20))
            .strength(0.5)
          )
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(30));
        break;
    }

    setSimulation(currentSimulation);

    // Create arrow markers for directed relationships
    const defs = container.append('defs');

    Object.entries(relationshipColors).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrowhead-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Create links
    const link = container.selectAll<SVGLineElement, GraphLink>('.link')
      .data(relationships)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', (d) => relationshipColors[d.relationship_type] || '#6B7280')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', (d) => Math.max(1, d.weight * 2))
      .attr('marker-end', (d) => `url(#arrowhead-${d.relationship_type})`);

    // Create link labels (conditionally shown)
    const linkLabel = container.selectAll<SVGTextElement, GraphLink>('.link-label')
      .data(showLinkLabels ? relationships : [])
      .enter().append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', colorScheme === 'dark' ? '#D1D5DB' : '#6B7280')
      .attr('text-anchor', 'middle')
      .attr('dy', '-2px')
      .style('pointer-events', 'none')
      .text((d) => d.relationship_type.replace('_', ' '));

    // Create node groups
    const nodeGroup = container.selectAll<SVGGElement, GraphNode>('.node-group')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer');

    // Add nodes (circles)
    const node = nodeGroup.append('circle')
      .attr('class', 'node')
      .attr('r', 12)
      .attr('fill', (d) => nodeTypeColors[d.node_type] || '#6B7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);

        // Highlight connected nodes
        const connectedNodes = new Set<string>();
        connectedNodes.add(d.id);

        relationships.forEach(r => {
          if (r.source === d.id) connectedNodes.add(r.target);
          if (r.target === d.id) connectedNodes.add(r.source);
        });

        setHighlightedNodes(connectedNodes);
        onNodeClick?.(d);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        onNodeDoubleClick?.(d);
      })
      .on('mouseover', function(event, d) {
        // Highlight node on hover
        d3.select(this)
          .attr('r', 15)
          .attr('stroke-width', 3)
          .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.25))');

        // Show connected links
        link.style('opacity', (linkData: any) => {
          return (linkData.source.id === d.id || linkData.target.id === d.id) ? 1 : 0.3;
        });

        // Show tooltip
        const tooltip = d3.select('body').selectAll('.graph-tooltip')
          .data([d]);

        tooltip.enter()
          .append('div')
          .attr('class', 'graph-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0,0,0,0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .merge(tooltip)
          .html(`<strong>${d.title}</strong><br/>Type: ${d.node_type}${d.tags ? '<br/>Tags: ' + d.tags.slice(0, 3).join(', ') : ''}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        if (selectedNode?.id !== d.id) {
          d3.select(this)
            .attr('r', 12)
            .attr('stroke-width', 2)
            .attr('filter', 'none');
        }

        // Reset link opacity
        link.style('opacity', 0.8);

        // Remove tooltip
        d3.select('body').selectAll('.graph-tooltip').remove();
      });

    // Add node labels (conditionally shown)
    const label = nodeGroup.append('text')
      .attr('class', 'node-label')
      .attr('dx', 18)
      .attr('dy', 4)
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', colorScheme === 'dark' ? '#F3F4F6' : '#374151')
      .style('pointer-events', 'none')
      .style('display', showLabels ? 'block' : 'none')
      .text((d) => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title);

    // Add node type indicators
    nodeGroup.append('text')
      .attr('class', 'node-type')
      .attr('x', 0)
      .attr('y', 4)
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('pointer-events', 'none')
      .text((d) => d.node_type.charAt(0));

    // Add drag behavior
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) currentSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) currentSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag);

    // Update positions on tick
    currentSimulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      nodeGroup
        .attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Handle node selection and highlighting styling
    if (selectedNode || highlightedNodes.size > 0) {
      node
        .attr('r', (d) => {
          if (d.id === selectedNode?.id) return 15;
          if (highlightedNodes.has(d.id)) return 13;
          return 12;
        })
        .attr('stroke-width', (d) => {
          if (d.id === selectedNode?.id) return 3;
          if (highlightedNodes.has(d.id)) return 2.5;
          return 2;
        })
        .attr('opacity', (d) => {
          if (highlightedNodes.size === 0) return 1;
          return highlightedNodes.has(d.id) ? 1 : 0.3;
        });

      link
        .attr('opacity', (d: any) => {
          if (highlightedNodes.size === 0) return 0.8;
          return (highlightedNodes.has(d.source.id) && highlightedNodes.has(d.target.id)) ? 1 : 0.1;
        })
        .attr('stroke-width', (d: any) => {
          if (highlightedNodes.size === 0) return Math.max(1, d.weight * 2);
          return (highlightedNodes.has(d.source.id) && highlightedNodes.has(d.target.id))
            ? Math.max(2, d.weight * 3) : Math.max(1, d.weight * 2);
        });

      label
        .attr('opacity', (d) => {
          if (highlightedNodes.size === 0) return 1;
          return highlightedNodes.has(d.id) ? 1 : 0.3;
        });
    }

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 150}, 20)`);

    const nodeTypes = Object.entries(nodeTypeColors);
    legend.selectAll('.legend-item')
      .data(nodeTypes)
      .enter().append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .each(function([type, color]) {
        const item = d3.select(this);
        item.append('circle')
          .attr('r', 6)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);

        item.append('text')
          .attr('x', 12)
          .attr('y', 0)
          .attr('dy', '0.35em')
          .attr('font-size', '10px')
          .attr('fill', '#374151')
          .text(type);
      });

    // Cleanup
    return () => {
      currentSimulation.stop();
      d3.select('body').selectAll('.graph-tooltip').remove();
    };
  }, [nodes, relationships, selectedNode, highlightedNodes, width, height, showLabels, showLinkLabels, layoutMode, colorScheme]);

  // Handle click outside to deselect
  const handleSvgClick = () => {
    setSelectedNode(null);
    setHighlightedNodes(new Set());
  };

  return (
    <div className={`relative bg-white border rounded-lg overflow-hidden ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onClick={handleSvgClick}
        className="cursor-move"
      />

      {/* Enhanced Controls */}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-3 space-y-2 min-w-[160px]">
        <div className="text-xs font-medium text-gray-700 mb-2">그래프 컨트롤</div>

        <button
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(750).call(
              // @ts-ignore
              svg.node().__zoom.transform,
              d3.zoomIdentity
            );
          }}
          className="block w-full px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
        >
          🔍 뷰 리셋
        </button>

        <button
          onClick={() => {
            if (simulation) {
              simulation.alpha(0.3).restart();
            }
          }}
          className="block w-full px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded"
        >
          🔄 레이아웃 재시작
        </button>

        <button
          onClick={() => {
            setSelectedNode(null);
            setHighlightedNodes(new Set());
          }}
          className="block w-full px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
        >
          ❌ 선택 해제
        </button>

        <div className="border-t border-gray-200 pt-2 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>노드:</span>
            <span className="font-medium">{nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>링크:</span>
            <span className="font-medium">{relationships.length}</span>
          </div>
          <div className="flex justify-between">
            <span>레이아웃:</span>
            <span className="font-medium capitalize">{layoutMode}</span>
          </div>
          <div className="flex justify-between">
            <span>컬러:</span>
            <span className="font-medium capitalize">{colorScheme}</span>
          </div>
        </div>
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-3 max-w-xs">
          <h3 className="font-medium text-sm mb-1">{selectedNode.title}</h3>
          <p className="text-xs text-gray-600 mb-2">Type: {selectedNode.node_type}</p>
          {selectedNode.tags && selectedNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedNode.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// 성능 최적화를 위한 React.memo 적용
KnowledgeGraph.displayName = 'KnowledgeGraph';