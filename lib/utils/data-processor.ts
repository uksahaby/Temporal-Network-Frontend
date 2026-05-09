// lib/utils/data-processor.ts
import _ from "lodash";

export interface RawDataRow {
  timestamp: string;
  source: string;
  target: string;
  weight: number;
  [key: string]: unknown;
}

export interface AggregatedData {
  timestamp: string;
  count: number;
  uniqueNodes: number;
  uniqueEdges: number;
  totalWeight: number;
  avgWeight: number;
}

// Smart sampling strategy
export function smartSample<T>(data: T[], targetSize: number): T[] {
  if (data.length <= targetSize) return data;

  const sampled: T[] = [];

  // Strategy 1: Take first N (important for time series)
  const firstN = Math.floor(targetSize * 0.3);
  sampled.push(...data.slice(0, firstN));

  // Strategy 2: Take last N (recent data)
  const lastN = Math.floor(targetSize * 0.3);
  sampled.push(...data.slice(-lastN));

  // Strategy 3: Random sample from middle
  const remaining = targetSize - sampled.length;
  const middleData = data.slice(firstN, -lastN);
  const randomSample = _.sampleSize(middleData, remaining);
  sampled.push(...randomSample);

  return sampled;
}

// Aggregate by time window
export function aggregateByTimeWindow(
  data: RawDataRow[],
  windowSize: "1h" | "1d" | "1w" = "1h",
): AggregatedData[] {
  const grouped = _.groupBy(data, (row) => {
    const date = new Date(row.timestamp);
    switch (windowSize) {
      case "1h":
        return date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      case "1d":
        return date.toISOString().slice(0, 10); // YYYY-MM-DD
      case "1w":
        // Get start of week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().slice(0, 10);
      default:
        return date.toISOString().slice(0, 10);
    }
  });

  return Object.entries(grouped).map(([timestamp, group]) => {
    const uniqueSources = new Set(group.map((g) => g.source));
    const uniqueTargets = new Set(group.map((g) => g.target));
    const uniqueEdges = new Set(group.map((g) => `${g.source}-${g.target}`));

    return {
      timestamp,
      count: group.length,
      uniqueNodes: uniqueSources.size + uniqueTargets.size,
      uniqueEdges: uniqueEdges.size,
      totalWeight: _.sumBy(group, "weight"),
      avgWeight: _.meanBy(group, "weight"),
    };
  });
}

// Optimize for network visualization (reduce nodes/edges)
export function optimizeNetworkData<
  NodeType extends { id: string },
  EdgeType extends { source: string; target: string },
>(
  nodes: NodeType[],
  edges: EdgeType[],
  maxNodes = 1000,
  maxEdges = 2000,
): { nodes: NodeType[]; edges: EdgeType[] } {
  // Keep most connected nodes
  const nodeDegree = new Map();
  edges.forEach((edge) => {
    nodeDegree.set(edge.source, (nodeDegree.get(edge.source) || 0) + 1);
    nodeDegree.set(edge.target, (nodeDegree.get(edge.target) || 0) + 1);
  });

  // Sort nodes by degree (most connected first)
  const sortedNodes = Array.from(nodeDegree.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxNodes)
    .map(([id]) => id);

  // Filter nodes and edges
  const nodeSet = new Set(sortedNodes);
  const filteredNodes = nodes.filter((node) => nodeSet.has(node.id));

  const filteredEdges = edges
    .filter((edge) => nodeSet.has(edge.source) && nodeSet.has(edge.target))
    .slice(0, maxEdges);

  return { nodes: filteredNodes, edges: filteredEdges };
}
