// "use client";

// import NetworkGraph from "@/components/visualization/NetworkGraph";

// interface TemporalNode {
//   id: string;
//   label?: string;
//   degree?: number;
//   centrality?: number;
//   group?: string;
// }

// interface TemporalEdge {
//   source: string;
//   target: string;
//   weight?: number;
//   id?: string;
// }

// interface TemporalNetworkGraphProps {
//   nodes: TemporalNode[];
//   edges: TemporalEdge[];
//   width?: number;
//   height?: number;
// }

// const DEFAULT_GROUP = "group1";

// function toNodeSize(node: TemporalNode) {
//   const degreeScore = typeof node.degree === "number" ? node.degree * 0.6 : 0;
//   const centralityScore =
//     typeof node.centrality === "number" ? node.centrality * 10 : 0;
//   const size = 6 + degreeScore + centralityScore;
//   return Math.max(5, Math.min(size, 18));
// }

// export default function TemporalNetworkGraph({
//   nodes,
//   edges,
//   width = 800,
//   height = 350,
// }: TemporalNetworkGraphProps) {
//   const mappedNodes = nodes.map((node) => ({
//     id: node.id,
//     group: node.group || DEFAULT_GROUP,
//     size: toNodeSize(node),
//   }));

//   const mappedLinks = edges.map((edge) => ({
//     source: edge.source,
//     target: edge.target,
//     value: edge.weight ?? 1,
//   }));

//   return (
//     <NetworkGraph
//       nodes={mappedNodes}
//       links={mappedLinks}
//       width={width}
//       height={height}
//     />
//   );
// }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useNetworkStore } from "@/lib/stores/network-store";
import type { Node, Edge } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

interface TemporalNetworkGraphProps {
  nodes?: Node[];
  edges?: Edge[];
  width?: number;
  height?: number;
  isLoading?: boolean;
}

// Internal type with validated group
type RenderNode = {
  id: string;
  label: string;
  degree: number;
  group: "hub" | "connector" | "peripheral";
  community?: number;
  x: number;
  y: number;
};

// D3 types - extend SimulationNodeDatum with our properties
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label?: string;
  degree: number;
  group?: string;
  community?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  weight?: number;
}

// Deck.gl types removed

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function toRgba(hex: string, alpha: number): [number, number, number, number] {
  const c = d3.rgb(hex);
  return [c.r, c.g, c.b, alpha];
}

function getNodeColor(
  group: string = "peripheral",
): [number, number, number, number] {
  if (group === "hub") return [239, 68, 68, 200]; // Red
  if (group === "connector") return [59, 130, 246, 200]; // Blue
  if (group === "peripheral") return [16, 185, 129, 200]; // Green
  return [156, 163, 175, 200]; // Gray for unknown
}

function getCommunityColor(
  dominantGroup: string,
  isMixed: boolean = false,
): [number, number, number, number] {
  if (isMixed) return [156, 163, 175, 220]; // Gray for mixed

  if (dominantGroup === "hub") return [239, 68, 68, 220]; // Red
  if (dominantGroup === "connector") return [59, 130, 246, 220]; // Blue
  if (dominantGroup === "peripheral") return [16, 185, 129, 220]; // Green

  return [156, 163, 175, 220]; // Gray
}

// Heatmap color based on community size (nodeCount)
// Uses a gradient from cool (blue/cyan) for small to warm (red/orange) for large
function getCommunitySizeHeatmapColor(
  nodeCount: number,
  minCount: number,
  maxCount: number,
): [number, number, number, number] {
  // Normalize nodeCount to 0-1 range
  const range = maxCount - minCount || 1;
  const normalized = Math.min(1, Math.max(0, (nodeCount - minCount) / range));

  // Heatmap gradient: Blue -> Cyan -> Green -> Yellow -> Orange -> Red
  let r: number, g: number, b: number;

  if (normalized < 0.2) {
    // Blue to Cyan
    const t = normalized / 0.2;
    r = 59;
    g = Math.round(130 + 125 * t);
    b = 246;
  } else if (normalized < 0.4) {
    // Cyan to Green
    const t = (normalized - 0.2) / 0.2;
    r = Math.round(59 - 43 * t);
    g = 255;
    b = Math.round(246 - 117 * t);
  } else if (normalized < 0.6) {
    // Green to Yellow
    const t = (normalized - 0.4) / 0.2;
    r = Math.round(16 + 239 * t);
    g = Math.round(185 + 70 * t);
    b = Math.round(129 - 129 * t);
  } else if (normalized < 0.8) {
    // Yellow to Orange
    const t = (normalized - 0.6) / 0.2;
    r = 255;
    g = Math.round(255 - 90 * t);
    b = 0;
  } else {
    // Orange to Red
    const t = (normalized - 0.8) / 0.2;
    r = 255;
    g = Math.round(165 - 97 * t);
    b = 0;
  }

  return [r, g, b, 220];
}

// Generate distinct colors for communities based on index
function getCommunityDistinctColor(
  index: number,
): [number, number, number, number] {
  // Use golden ratio to spread colors evenly across hue spectrum
  const goldenRatio = 0.618033988749895;
  const hue = (index * goldenRatio) % 1;

  // Convert HSL to RGB (high saturation, medium lightness for visibility)
  const saturation = 0.7;
  const lightness = 0.55;

  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = lightness - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (hue < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (hue < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (hue < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (hue < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (hue < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
    220,
  ];
}

// Helper to validate and normalize node group
function validateGroup(
  group: string | undefined,
): "hub" | "connector" | "peripheral" {
  if (group === "hub") return "hub";
  if (group === "connector") return "connector";
  return "peripheral"; // Default
}

// Helper to ensure nodes have required fields for rendering
function normalizeNodes(nodes: Node[]): RenderNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.label || node.id,
    degree: node.degree || 1,
    group: validateGroup(node.group),
    community: node.community,
    x: node.x || 0,
    y: node.y || 0,
  }));
}

// Helper to get node position safely
function getNodeX(node: string | D3Node): number {
  if (typeof node === "string") return 0;
  return node.x || 0;
}

function getNodeY(node: string | D3Node): number {
  if (typeof node === "string") return 0;
  return node.y || 0;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TemporalNetworkGraph({
  nodes = [],
  edges = [],
  width = 800,
  height = 400,
  isLoading = false,
}: TemporalNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const commSvgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  const {
    selectedNode,
    setSelectedNode,
    communities,
    communityEdges,
    setSelectedCommunity,
  } = useNetworkStore();

  // ============================================================================
  // NORMALIZE NODES
  // ============================================================================

  // Normalize incoming data for rendering
  const normalizedNodes = useMemo(() => normalizeNodes(nodes), [nodes]);

  // Container sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const PADDING = 16;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.floor(rect.width - PADDING * 2));
      const nextHeight = Math.max(0, Math.floor(rect.height - PADDING * 2));

      if (nextWidth < 50 || nextHeight < 50) return;
      setDimensions((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) return prev;
        return { width: nextWidth, height: nextHeight };
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ============================================================================
  // D3 FORCE SIMULATION (for ALL graphs, all sizes)
  // ============================================================================
  useEffect(() => {
    if (!svgRef.current) return;
    if (!normalizedNodes.length || !edges.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    if (width < 10 || height < 10) return;

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Create a main group that will be transformed on zoom
    const mainGroup = svg.append("g").attr("class", "main-group");

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        mainGroup.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Prepare nodes with initial positions - use D3Node type
    const localNodes: D3Node[] = normalizedNodes.map((node, i) => ({
      id: node.id,
      label: node.label,
      degree: node.degree,
      group: node.group,
      community: node.community,
      index: i,
      x: node.x || width / 2 + (Math.random() - 0.5) * 200,
      y: node.y || height / 2 + (Math.random() - 0.5) * 200,
    }));

    const localEdges: D3Link[] = edges.map((edge: any) => ({
      source: edge.source,
      target: edge.target,
      weight: typeof edge.weight === "number" ? edge.weight : 1,
    }));

    // Create force simulation
    const simulation = d3
      .forceSimulation<D3Node>(localNodes)
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(localEdges)
          .id((d) => d.id)
          .distance((d) => 100 / Math.sqrt(d.weight || 1))
          .strength(0.5),
      )
      .force("charge", d3.forceManyBody<D3Node>().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<D3Node>().radius((d) => Math.sqrt(d.degree) * 3),
      )
      .alpha(0.3)
      .alphaDecay(0.02);

    // Draw edges
    const edgeGroup = mainGroup
      .append("g")
      .attr("class", "edges")
      .selectAll("line")
      .data(localEdges)
      .enter()
      .append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", (d) => Math.sqrt(d.weight || 1))
      .attr("stroke-opacity", 0.4);

    // Draw nodes
    const nodeGroup = mainGroup
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(localNodes)
      .enter()
      .append("circle")
      .attr("r", (d) => Math.max(4, Math.sqrt(d.degree) * 2))
      .attr("fill", (d) => {
        if (d.group === "hub") return "#ef4444";
        if (d.group === "connector") return "#3b82f6";
        return "#10b981";
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        const original = nodes.find((n: any) => n.id === d.id) ?? null;
        setSelectedNode(original);
      })
      .call(
        d3
          .drag<SVGCircleElement, D3Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x ?? null;
            d.fy = d.y ?? null;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Add labels for high-degree nodes
    const labelGroup = mainGroup
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(localNodes.filter((d) => d.degree > 10))
      .enter()
      .append("text")
      .text((d) => d.label || d.id)
      .attr("font-size", "10px")
      .attr("dx", 12)
      .attr("dy", 4)
      .attr("fill", "#374151")
      .style("pointer-events", "none");

    // Highlight selected node
    if (selectedNode) {
      nodeGroup
        .filter((d) => d.id === selectedNode.id)
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 3);
    }

    // Update positions on tick
    simulation.on("tick", () => {
      edgeGroup
        .attr("x1", (d) => getNodeX(d.source))
        .attr("y1", (d) => getNodeY(d.source))
        .attr("x2", (d) => getNodeX(d.target))
        .attr("y2", (d) => getNodeY(d.target));

      nodeGroup.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

      labelGroup.attr("x", (d) => d.x || 0).attr("y", (d) => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [
    normalizedNodes,
    edges,
    dimensions,
    selectedNode,
    setSelectedNode,
    nodes,
  ]);

  // DeckGL/auto-fit/community view removed

  // DeckGL community visualization removed

  // DeckGL node visualization removed

  // DeckGL tooltip handler removed

  // ============================================================================
  // RENDER
  // ============================================================================

  // ============================================================================
  // COMMUNITY SVG VIEW (large-file path — no individual node/edge data)
  // ============================================================================

  // Backend community canvas is 1000×600; we use viewBox to scale to viewport
  const COMM_CANVAS_W = 1000;
  const COMM_CANVAS_H = 600;

  const showCommunityView = !normalizedNodes.length && communities.length > 0;

  // Compute min node-count for size scaling
  const minNodeCount = useMemo(
    () =>
      communities.length ? Math.min(...communities.map((c) => c.nodeCount)) : 1,
    [communities],
  );
  const maxNodeCount = useMemo(
    () =>
      communities.length ? Math.max(...communities.map((c) => c.nodeCount)) : 1,
    [communities],
  );

  // ============================================================================
  // RENDER GUARD
  // ============================================================================

  if (!normalizedNodes.length && !showCommunityView) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-lg border bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <p>No network data to display</p>
          <p className="text-sm">
            Upload and analyze data to visualize the network
          </p>
        </div>
      </div>
    );
  }

  // ── Community bubble view ──────────────────────────────────────────────────
  if (showCommunityView) {
    const countRange = Math.max(1, maxNodeCount - minNodeCount);
    const getRadius = (nodeCount: number) =>
      6 + ((nodeCount - minNodeCount) / countRange) * 30;

    return (
      <div
        ref={containerRef}
        className="relative h-full w-full min-h-[340px] rounded-lg border overflow-hidden bg-gray-50 dark:bg-gray-900/50"
        style={{ contain: "layout style" }}
      >
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/30 backdrop-blur-[1px] rounded-lg">
            <div className="text-white text-xs bg-black/60 px-3 py-1.5 rounded-full">
              Loading…
            </div>
          </div>
        )}
        <svg
          ref={commSvgRef}
          viewBox={`0 0 ${COMM_CANVAS_W} ${COMM_CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full h-full"
        >
          {/* Community-to-community edges */}
          <g className="comm-edges">
            {communityEdges.map((ce, idx) => (
              <line
                key={idx}
                x1={ce.sourceCentroid[0]}
                y1={ce.sourceCentroid[1]}
                x2={ce.targetCentroid[0]}
                y2={ce.targetCentroid[1]}
                stroke="#94a3b8"
                strokeWidth={Math.min(4, Math.sqrt(ce.weight || 1))}
                strokeOpacity={0.35}
              />
            ))}
          </g>
          {/* Community bubbles */}
          <g className="comm-nodes">
            {communities.map((c, idx) => {
              const r = getRadius(c.nodeCount);
              // Colour: hue based on community index, saturation by centrality
              const hue = (idx * 137.5) % 360;
              const centrality = (c as any).degreeCentrality ?? 0;
              const sat = Math.round(50 + centrality * 40);
              return (
                <g
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedCommunity(c)}
                >
                  <circle
                    cx={c.centroidX}
                    cy={c.centroidY}
                    r={r}
                    fill={`hsl(${hue},${sat}%,55%)`}
                    fillOpacity={0.82}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                  {r > 12 && (
                    <text
                      x={c.centroidX}
                      y={c.centroidY + 4}
                      textAnchor="middle"
                      fontSize={Math.min(11, r * 0.7)}
                      fill="#fff"
                      fontWeight="600"
                      pointerEvents="none"
                    >
                      {c.nodeCount >= 1000
                        ? `${(c.nodeCount / 1000).toFixed(1)}k`
                        : c.nodeCount}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        {/* Legend */}
        <div className="absolute bottom-2 left-2 text-[10px] text-gray-500 bg-white/70 dark:bg-gray-900/70 rounded px-2 py-1">
          Community view · {communities.length} communities · circle size = node
          count
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full min-h-[340px] rounded-lg border overflow-hidden bg-gray-50 dark:bg-gray-900/50"
      style={{ contain: "layout style", willChange: "contents" }}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/30 backdrop-blur-[1px] rounded-lg">
          <div className="text-white text-xs bg-black/60 px-3 py-1.5 rounded-full">
            Loading…
          </div>
        </div>
      )}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
      />
    </div>
  );
}
