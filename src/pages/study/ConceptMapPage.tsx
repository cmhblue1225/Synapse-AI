import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, PlusIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { LightBulbIcon, ShareIcon, PuzzlePieceIcon } from '@heroicons/react/24/solid';
import * as d3 from 'd3';
import { studyService } from '../../services/study.service';
import { knowledgeService, type KnowledgeNode } from '../../services/knowledge.service';

interface ConceptNode {
  id: string;
  label: string;
  type: 'main' | 'sub' | 'detail';
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  color: string;
  size: number;
  sourceNodeId?: string;
}

interface ConceptLink {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'hierarchy' | 'association' | 'dependency' | 'similarity';
  strength: number;
}

interface ConceptMap {
  id: string;
  title: string;
  description: string;
  nodes: ConceptNode[];
  links: ConceptLink[];
  layout: 'hierarchical' | 'radial' | 'force' | 'circular';
  metadata: {
    created_by: 'user' | 'ai';
    complexity_level: 'simple' | 'medium' | 'complex';
    learning_objectives: string[];
  };
}

export const ConceptMapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const nodeIds = searchParams.get('nodes')?.split(',') || [];

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNodes, setSelectedNodes] = useState<KnowledgeNode[]>([]);
  const [conceptMap, setConceptMap] = useState<ConceptMap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<ConceptMap['layout']>('force');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedConceptNode, setSelectedConceptNode] = useState<ConceptNode | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkSource, setLinkSource] = useState<ConceptNode | null>(null);

  useEffect(() => {
    loadSelectedNodes();
  }, []);

  useEffect(() => {
    if (conceptMap) {
      renderConceptMap();
    }
  }, [conceptMap, selectedLayout]);

  const loadSelectedNodes = async () => {
    if (nodeIds.length > 0) {
      setIsLoading(true);
      try {
        const nodes = await Promise.all(
          nodeIds.map(id => knowledgeService.getNode(id))
        );
        setSelectedNodes(nodes.filter(Boolean));
      } catch (error) {
        console.error('Failed to load nodes:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const generateConceptMap = async () => {
    if (selectedNodes.length === 0) return;

    setIsGenerating(true);
    try {
      // Create study session
      const session = await studyService.createStudySession({
        session_type: 'concept_map',
        title: `개념 지도 - ${selectedNodes.map(n => n.title).join(', ')}`,
        description: 'AI가 생성한 개념 지도',
        node_ids: selectedNodes.map(n => n.id),
        session_data: {
          map_settings: {
            layout: selectedLayout,
            complexity: 'medium',
            include_relationships: true,
            auto_cluster: true
          }
        },
        progress: 0
      });

      setSessionId(session.id);

      // Generate concept map using AI
      const generatedMap = await generateConceptMapWithAI(selectedNodes);
      setConceptMap(generatedMap);

    } catch (error) {
      console.error('Failed to generate concept map:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateConceptMapWithAI = async (nodes: KnowledgeNode[]): Promise<ConceptMap> => {
    const conceptNodes: ConceptNode[] = [];
    const conceptLinks: ConceptLink[] = [];

    // Create main concept nodes from knowledge nodes
    nodes.forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / nodes.length;
      const radius = 200;

      conceptNodes.push({
        id: `main-${node.id}`,
        label: node.title,
        type: 'main',
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
        color: '#3B82F6',
        size: 20,
        sourceNodeId: node.id
      });

      // Extract key concepts from content
      const concepts = extractKeyConceptsFromContent(node.content || '');
      concepts.forEach((concept, conceptIndex) => {
        const subAngle = angle + (conceptIndex - concepts.length / 2) * 0.5;
        const subRadius = 100;

        const subNodeId = `sub-${node.id}-${conceptIndex}`;
        conceptNodes.push({
          id: subNodeId,
          label: concept,
          type: 'sub',
          x: 400 + radius * Math.cos(angle) + subRadius * Math.cos(subAngle),
          y: 300 + radius * Math.sin(angle) + subRadius * Math.sin(subAngle),
          color: '#10B981',
          size: 12,
          sourceNodeId: node.id
        });

        // Link main node to sub concept
        conceptLinks.push({
          id: `link-${node.id}-${conceptIndex}`,
          source: `main-${node.id}`,
          target: subNodeId,
          label: 'contains',
          type: 'hierarchy',
          strength: 1
        });
      });
    });

    // Create inter-node relationships
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        // Simple relationship detection based on common tags
        const commonTags = node1.tags?.filter(tag => node2.tags?.includes(tag)) || [];

        if (commonTags.length > 0) {
          conceptLinks.push({
            id: `rel-${node1.id}-${node2.id}`,
            source: `main-${node1.id}`,
            target: `main-${node2.id}`,
            label: commonTags[0],
            type: 'association',
            strength: 0.5
          });
        }
      }
    }

    return {
      id: crypto.randomUUID(),
      title: `개념 지도 - ${nodes.map(n => n.title).join(', ')}`,
      description: 'AI가 생성한 개념 지도입니다.',
      nodes: conceptNodes,
      links: conceptLinks,
      layout: selectedLayout,
      metadata: {
        created_by: 'ai',
        complexity_level: 'medium',
        learning_objectives: [
          '핵심 개념 이해',
          '개념 간 관계 파악',
          '지식 구조 시각화'
        ]
      }
    };
  };

  const extractKeyConceptsFromContent = (content: string): string[] => {
    // Simple keyword extraction
    const words = content.toLowerCase().split(/\W+/);
    const stopWords = new Set(['은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '으로', '로', '에서', '부터', '까지', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      if (word.length > 2 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };

  const renderConceptMap = () => {
    if (!conceptMap || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;

    const g = svg.append("g");

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create simulation based on layout
    let simulation: d3.Simulation<ConceptNode, ConceptLink>;

    switch (selectedLayout) {
      case 'force':
        simulation = d3.forceSimulation(conceptMap.nodes)
          .force("link", d3.forceLink<ConceptNode, ConceptLink>(conceptMap.links)
            .id(d => d.id)
            .strength(d => d.strength))
          .force("charge", d3.forceManyBody().strength(-300))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide().radius(d => d.size + 5));
        break;

      case 'hierarchical':
        simulation = d3.forceSimulation(conceptMap.nodes)
          .force("link", d3.forceLink<ConceptNode, ConceptLink>(conceptMap.links)
            .id(d => d.id)
            .strength(0.8))
          .force("charge", d3.forceManyBody().strength(-200))
          .force("y", d3.forceY().strength(d => d.type === 'main' ? 0.3 : 0.1))
          .force("center", d3.forceCenter(width / 2, height / 2));
        break;

      case 'radial':
        conceptMap.nodes.forEach((node, i) => {
          if (node.type === 'main') {
            const angle = (i * 2 * Math.PI) / conceptMap.nodes.filter(n => n.type === 'main').length;
            const radius = 150;
            node.fx = width / 2 + radius * Math.cos(angle);
            node.fy = height / 2 + radius * Math.sin(angle);
          }
        });

        simulation = d3.forceSimulation(conceptMap.nodes)
          .force("link", d3.forceLink<ConceptNode, ConceptLink>(conceptMap.links)
            .id(d => d.id)
            .strength(0.5))
          .force("charge", d3.forceManyBody().strength(-100))
          .force("collision", d3.forceCollide().radius(d => d.size + 3));
        break;

      default:
        simulation = d3.forceSimulation(conceptMap.nodes)
          .force("link", d3.forceLink<ConceptNode, ConceptLink>(conceptMap.links)
            .id(d => d.id))
          .force("charge", d3.forceManyBody().strength(-300))
          .force("center", d3.forceCenter(width / 2, height / 2));
    }

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(conceptMap.links)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => d.strength * 3)
      .attr("marker-end", "url(#arrowhead)");

    // Create link labels
    const linkLabel = g.append("g")
      .selectAll("text")
      .data(conceptMap.links)
      .enter().append("text")
      .attr("font-size", "10px")
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .text(d => d.label);

    // Create arrow markers
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 13)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 13)
      .attr("markerHeight", 13)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#999")
      .style("stroke", "none");

    // Create nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(conceptMap.nodes)
      .enter().append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", isEditMode ? "pointer" : "default")
      .call(d3.drag<SVGCircleElement, ConceptNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          if (!isEditMode) {
            d.fx = null;
            d.fy = null;
          }
        }))
      .on("click", (event, d) => {
        if (isEditMode) {
          setSelectedConceptNode(d);
        }
      });

    // Create node labels
    const nodeLabel = g.append("g")
      .selectAll("text")
      .data(conceptMap.nodes)
      .enter().append("text")
      .attr("font-size", d => d.type === 'main' ? "14px" : "12px")
      .attr("font-weight", d => d.type === 'main' ? "bold" : "normal")
      .attr("text-anchor", "middle")
      .attr("fill", "#333")
      .attr("dy", d => d.size + 15)
      .text(d => d.label)
      .style("pointer-events", "none");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as ConceptNode).x)
        .attr("y1", d => (d.source as ConceptNode).y)
        .attr("x2", d => (d.target as ConceptNode).x)
        .attr("y2", d => (d.target as ConceptNode).y);

      linkLabel
        .attr("x", d => ((d.source as ConceptNode).x + (d.target as ConceptNode).x) / 2)
        .attr("y", d => ((d.source as ConceptNode).y + (d.target as ConceptNode).y) / 2);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      nodeLabel
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
  };

  const saveConceptMap = async () => {
    if (!conceptMap || !sessionId) return;

    try {
      await studyService.updateStudySession(sessionId, {
        progress: 100,
        completed_at: new Date().toISOString(),
        session_data: {
          concept_map: conceptMap,
          layout: selectedLayout
        }
      });
    } catch (error) {
      console.error('Failed to save concept map:', error);
    }
  };

  const exportConceptMap = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `concept-map-${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">개념 지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/app/study"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              학습 활동으로 돌아가기
            </Link>
          </div>

          {conceptMap && (
            <div className="flex items-center space-x-2">
              <select
                value={selectedLayout}
                onChange={(e) => setSelectedLayout(e.target.value as ConceptMap['layout'])}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="force">자유 배치</option>
                <option value="hierarchical">계층형</option>
                <option value="radial">방사형</option>
                <option value="circular">원형</option>
              </select>

              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  isEditMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                편집 모드
              </button>

              <button
                onClick={exportConceptMap}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
              >
                <PhotoIcon className="h-4 w-4 inline mr-1" />
                내보내기
              </button>

              <button
                onClick={saveConceptMap}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                저장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!conceptMap && !isGenerating ? (
        <div className="text-center py-12">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">개념 지도 생성</h3>
          <p className="text-gray-600 mb-6">선택한 지식 노드들 사이의 관계를 시각적으로 표현합니다.</p>

          {selectedNodes.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">선택된 노드 ({selectedNodes.length}개)</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedNodes.map(node => (
                  <span
                    key={node.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {node.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">레이아웃 선택</label>
            <select
              value={selectedLayout}
              onChange={(e) => setSelectedLayout(e.target.value as ConceptMap['layout'])}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="force">자유 배치 (Force-directed)</option>
              <option value="hierarchical">계층형 (Hierarchical)</option>
              <option value="radial">방사형 (Radial)</option>
              <option value="circular">원형 (Circular)</option>
            </select>
          </div>

          <button
            onClick={generateConceptMap}
            disabled={selectedNodes.length === 0 || isGenerating}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                개념 지도 생성 중...
              </>
            ) : (
              '개념 지도 생성하기'
            )}
          </button>
        </div>
      ) : conceptMap ? (
        <div>
          {/* Concept Map Title and Description */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{conceptMap.title}</h2>
            <p className="text-gray-600 mb-4">{conceptMap.description}</p>

            {/* Learning Objectives */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">학습 목표:</h4>
              <div className="flex flex-wrap gap-2">
                {conceptMap.metadata.learning_objectives.map((objective, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800"
                  >
                    <LightBulbIcon className="h-3 w-3 mr-1" />
                    {objective}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SVG Container */}
          <div className="bg-white rounded-lg shadow border">
            <svg
              ref={svgRef}
              width="800"
              height="600"
              className="w-full h-auto border rounded-lg"
            />
          </div>

          {/* Edit Panel */}
          {isEditMode && selectedConceptNode && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-medium mb-4">노드 편집: {selectedConceptNode.label}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">레이블</label>
                  <input
                    type="text"
                    value={newNodeLabel || selectedConceptNode.label}
                    onChange={(e) => setNewNodeLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">타입</label>
                  <select
                    value={selectedConceptNode.type}
                    onChange={(e) => {
                      const updatedMap = { ...conceptMap };
                      const node = updatedMap.nodes.find(n => n.id === selectedConceptNode.id);
                      if (node) {
                        node.type = e.target.value as ConceptNode['type'];
                        setConceptMap(updatedMap);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="main">메인 개념</option>
                    <option value="sub">하위 개념</option>
                    <option value="detail">세부 사항</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => {
                    const updatedMap = { ...conceptMap };
                    const node = updatedMap.nodes.find(n => n.id === selectedConceptNode.id);
                    if (node && newNodeLabel) {
                      node.label = newNodeLabel;
                      setConceptMap(updatedMap);
                      setNewNodeLabel('');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  업데이트
                </button>
                <button
                  onClick={() => setSelectedConceptNode(null)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md text-sm font-medium"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* Map Statistics */}
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{conceptMap.nodes.length}</div>
              <div className="text-sm text-blue-600">개념 노드</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{conceptMap.links.length}</div>
              <div className="text-sm text-green-600">관계 링크</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">{conceptMap.metadata.complexity_level}</div>
              <div className="text-sm text-purple-600">복잡도 수준</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};