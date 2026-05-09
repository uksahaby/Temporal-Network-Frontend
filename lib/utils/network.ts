/**
 * Network analysis utilities for temporal network visualization
 */

// Use a relative import so this module works in both the main bundle and
// Web Worker bundles (path aliases can be fragile in workers).
import { NetworkNode, NetworkEdge } from "../api/client";

const METRICS_LIMITS = {
  // Above these thresholds we skip expensive O(n^2)/O(n*m) metrics.
  maxNodesForFullMetrics: 180,
  maxEdgesForFullMetrics: 2000,
};

function makeZeroMetricRecord(nodeIds: string[]): Record<string, number> {
  const record: Record<string, number> = {};
  for (const id of nodeIds) record[id] = 0;
  return record;
}

function coerceNodesFromIds(nodeIds: string[]): NetworkNode[] {
  return nodeIds.map((id) => ({ id }) as NetworkNode);
}

function collectNodeIds(nodes: NetworkNode[], edges: NetworkEdge[]): string[] {
  const ids = new Set<string>();
  nodes.forEach((n) => ids.add(n.id));
  edges.forEach((e) => {
    ids.add(e.source);
    ids.add(e.target);
  });
  return Array.from(ids);
}

function buildAdjList(
  nodeIds: string[],
  edges: NetworkEdge[],
): Record<string, string[]> {
  const adjList: Record<string, string[]> = {};
  nodeIds.forEach((id) => {
    adjList[id] = [];
  });

  edges.forEach((edge) => {
    if (!adjList[edge.source]) adjList[edge.source] = [];
    if (!adjList[edge.target]) adjList[edge.target] = [];
    adjList[edge.source].push(edge.target);
    adjList[edge.target].push(edge.source);
  });

  return adjList;
}

/**
 * Calculate degree centrality for all nodes
 */
export function calculateDegreeCentrality(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): Record<string, number> {
  const centrality: Record<string, number> = {};

  // Initialize all nodes with degree 0
  nodes.forEach((node) => {
    centrality[node.id] = 0;
  });

  // Count edges for each node
  edges.forEach((edge) => {
    centrality[edge.source] = (centrality[edge.source] || 0) + 1;
    centrality[edge.target] = (centrality[edge.target] || 0) + 1;
  });

  // Normalize by maximum possible degree
  const maxDegree = nodes.length - 1;
  if (maxDegree > 0) {
    Object.keys(centrality).forEach((nodeId) => {
      centrality[nodeId] /= maxDegree;
    });
  }

  return centrality;
}

/**
 * Calculate betweenness centrality (approximation for large networks)
 */
export function calculateBetweennessCentrality(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  sampleSize: number = 100,
): Record<string, number> {
  const centrality: Record<string, number> = {};
  const nodeIds = collectNodeIds(nodes, edges);

  // Initialize centrality scores
  nodeIds.forEach((id) => {
    centrality[id] = 0;
  });

  // For large networks, sample shortest paths
  const sampledPairs = sampleNodePairs(nodeIds, sampleSize);

  const adjList = buildAdjList(nodeIds, edges);

  // Calculate shortest paths for sampled pairs
  sampledPairs.forEach(([source, target]) => {
    const { paths, distances } = bfsShortestPaths(adjList, source);

    const distanceToTarget = distances[target];
    if (distanceToTarget === undefined || distanceToTarget === Infinity) {
      return;
    }

    // Count node appearances in shortest paths.
    // Defensive: graphs can be disconnected; avoid infinite loops when no path exists.
    const pathNodes = new Set<string>();
    let current: string | undefined = target;
    let guard = 0;
    while (current !== source) {
      if (!current) return;
      pathNodes.add(current);
      const nextNode: string | undefined = paths[current];
      if (!nextNode) return;
      current = nextNode;
      guard++;
      if (guard > 100_000) return;
    }

    pathNodes.forEach((nodeId) => {
      centrality[nodeId] = (centrality[nodeId] || 0) + 1;
    });
  });

  // Normalize centrality scores
  const maxCentrality = Math.max(...Object.values(centrality));
  if (maxCentrality > 0) {
    Object.keys(centrality).forEach((nodeId) => {
      centrality[nodeId] /= maxCentrality;
    });
  }

  return centrality;
}

/**
 * Calculate closeness centrality
 */
export function calculateClosenessCentrality(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): Record<string, number> {
  const centrality: Record<string, number> = {};
  const nodeIds = collectNodeIds(nodes, edges);
  const adjList = buildAdjList(nodeIds, edges);

  // Calculate closeness for each node
  nodeIds.forEach((source) => {
    const distances = bfsDistances(adjList, source);
    const reachableNodes = Object.values(distances).filter(
      (d) => d !== Infinity,
    );

    if (reachableNodes.length > 1) {
      const totalDistance = reachableNodes.reduce((sum, d) => sum + d, 0);
      centrality[source] = (reachableNodes.length - 1) / totalDistance;
    } else {
      centrality[source] = 0;
    }
  });

  // Normalize
  const maxCentrality = Math.max(...Object.values(centrality));
  if (maxCentrality > 0) {
    Object.keys(centrality).forEach((nodeId) => {
      centrality[nodeId] /= maxCentrality;
    });
  }

  return centrality;
}

/**
 * Calculate eigenvector centrality (power iteration method)
 */
export function calculateEigenvectorCentrality(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  maxIterations: number = 100,
  tolerance: number = 1e-6,
): Record<string, number> {
  const nodeIds = nodes.map((node) => node.id);
  const n = nodeIds.length;
  const idToIndex: Record<string, number> = {};
  const indexToId: string[] = [];

  // Create mapping between node IDs and matrix indices
  nodeIds.forEach((id, index) => {
    idToIndex[id] = index;
    indexToId[index] = id;
  });

  // Build adjacency matrix
  const A: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  edges.forEach((edge) => {
    const i = idToIndex[edge.source];
    const j = idToIndex[edge.target];
    if (i !== undefined && j !== undefined) {
      A[i][j] = 1;
      A[j][i] = 1;
    }
  });

  // Power iteration
  let x: number[] = Array(n).fill(1 / Math.sqrt(n));
  let lambda = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Multiply: y = A * x
    const y: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        y[i] += A[i][j] * x[j];
      }
    }

    // Calculate new eigenvalue
    const newLambda = Math.sqrt(y.reduce((sum, val) => sum + val * val, 0));

    // Normalize eigenvector
    x = y.map((val) => val / newLambda);

    // Check convergence
    if (Math.abs(newLambda - lambda) < tolerance) {
      break;
    }

    lambda = newLambda;
  }

  // Convert to record
  const centrality: Record<string, number> = {};
  indexToId.forEach((id, index) => {
    centrality[id] = x[index];
  });

  // Normalize
  const maxCentrality = Math.max(...Object.values(centrality));
  if (maxCentrality > 0) {
    Object.keys(centrality).forEach((nodeId) => {
      centrality[nodeId] /= maxCentrality;
    });
  }

  return centrality;
}

/**
 * Calculate temporal activity metrics
 */
export function calculateTemporalActivity(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  timeWindow: number = 86400000, // 1 day in ms
): Record<string, number> {
  const activity: Record<string, number> = {};

  // Initialize activity scores
  nodes.forEach((node) => {
    activity[node.id] = 0;
  });

  // Group edges by time windows
  const timeBins: Record<number, NetworkEdge[]> = {};

  edges.forEach((edge) => {
    if (edge.timestamp) {
      const bin = Math.floor(edge.timestamp / timeWindow);
      if (!timeBins[bin]) {
        timeBins[bin] = [];
      }
      timeBins[bin].push(edge);
    }
  });

  // Calculate activity per node per time window
  Object.values(timeBins).forEach((binEdges) => {
    const nodeActivity: Record<string, number> = {};

    binEdges.forEach((edge) => {
      nodeActivity[edge.source] = (nodeActivity[edge.source] || 0) + 1;
      nodeActivity[edge.target] = (nodeActivity[edge.target] || 0) + 1;
    });

    // Update overall activity (weighted by recency)
    Object.entries(nodeActivity).forEach(([nodeId, act]) => {
      activity[nodeId] = (activity[nodeId] || 0) + act;
    });
  });

  // Normalize activity scores
  const maxActivity = Math.max(...Object.values(activity));
  if (maxActivity > 0) {
    Object.keys(activity).forEach((nodeId) => {
      activity[nodeId] /= maxActivity;
    });
  }

  return activity;
}

/**
 * Calculate community structure using Louvain algorithm
 */
export function detectCommunities(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): {
  communities: number;
  modularity: number;
  sizes: number[];
  assignment: Record<string, number>;
} {
  const nodeIds = nodes.map((node) => node.id);
  const assignment: Record<string, number> = {};

  // Simple community detection for demonstration
  // In production, use a proper community detection library

  // Assign communities based on node degree (simplified)
  const degrees: Record<string, number> = {};
  nodes.forEach((node) => {
    const degree = edges.filter(
      (e) => e.source === node.id || e.target === node.id,
    ).length;
    degrees[node.id] = degree;
  });

  // Sort nodes by degree and assign communities
  const sortedNodes = [...nodeIds].sort((a, b) => degrees[b] - degrees[a]);
  let communityId = 0;
  const communitySize = Math.max(1, Math.floor(sortedNodes.length / 10));

  sortedNodes.forEach((nodeId, index) => {
    assignment[nodeId] = Math.floor(index / communitySize);
  });

  // Calculate modularity (simplified)
  const m = edges.length;
  let modularity = 0;

  if (m > 0) {
    edges.forEach((edge) => {
      const sameCommunity = assignment[edge.source] === assignment[edge.target];
      const expected = (degrees[edge.source] * degrees[edge.target]) / (2 * m);
      modularity += (sameCommunity ? 1 : 0) - expected;
    });

    modularity /= 2 * m;
  }

  const uniqueCommunities = new Set(Object.values(assignment)).size;

  const sizeByCommunity = new Map<number, number>();
  Object.values(assignment).forEach((community) => {
    sizeByCommunity.set(community, (sizeByCommunity.get(community) ?? 0) + 1);
  });

  const sizes = Array.from(sizeByCommunity.entries())
    .sort(([a], [b]) => a - b)
    .map(([, size]) => size);

  return {
    communities: uniqueCommunities,
    modularity,
    sizes,
    assignment,
  };
}

/**
 * Calculate network metrics at specific time
 */
export function calculateNetworkMetrics(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  currentTime: number,
) {
  // Filter edges by time (within last day for demo)
  const recentEdges = edges.filter(
    (edge) =>
      !edge.timestamp || Math.abs(edge.timestamp - currentTime) < 86400000,
  );

  // Guardrail: a handful of metrics are quadratic/cubic in practice and can
  // freeze the UI for moderately large graphs (especially when recomputed on
  // every time window change). For those cases, return a "lite" metrics set.
  const largeGraph =
    nodes.length > METRICS_LIMITS.maxNodesForFullMetrics ||
    recentEdges.length > METRICS_LIMITS.maxEdgesForFullMetrics;

  if (largeGraph) {
    const nodeIds = collectNodeIds(nodes, recentEdges);
    const normalizedNodes = coerceNodesFromIds(nodeIds);
    const zeros = makeZeroMetricRecord(nodeIds);

    return {
      centrality: {
        degree: calculateDegreeCentrality(normalizedNodes, recentEdges),
        betweenness: calculateBetweennessCentrality(
          normalizedNodes,
          recentEdges,
          30,
        ),
        closeness: zeros,
        eigenvector: zeros,
      },
      temporal: {
        activity: calculateTemporalActivity(normalizedNodes, edges),
        stability: zeros,
        burstiness: zeros,
      },
      structural: {
        density: calculateDensity(normalizedNodes, recentEdges),
        clustering: 0,
        diameter: 0,
        avgPathLength: 0,
      },
      community: {
        modularity: 0,
        communities: 0,
        sizes: [0],
        assignment: {},
      },
      _mode: "lite" as const,
    };
  }

  return {
    centrality: {
      degree: calculateDegreeCentrality(nodes, recentEdges),
      betweenness: calculateBetweennessCentrality(nodes, recentEdges, 50),
      closeness: calculateClosenessCentrality(nodes, recentEdges),
      eigenvector: calculateEigenvectorCentrality(nodes, recentEdges),
    },
    temporal: {
      activity: calculateTemporalActivity(nodes, edges),
      stability: calculateNodeStability(nodes, edges),
      burstiness: calculateBurstiness(nodes, edges),
    },
    structural: {
      density: calculateDensity(nodes, recentEdges),
      clustering: calculateClustering(nodes, recentEdges),
      diameter: calculateDiameter(nodes, recentEdges),
      avgPathLength: calculateAveragePathLength(nodes, recentEdges),
    },
    community: detectCommunities(nodes, recentEdges),
  };
}

/**
 * Calculate node stability (persistence of connections)
 */
function calculateNodeStability(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): Record<string, number> {
  const stability: Record<string, number> = {};

  nodes.forEach((node) => {
    const nodeEdges = edges.filter(
      (e) => e.source === node.id || e.target === node.id,
    );

    if (nodeEdges.length === 0) {
      stability[node.id] = 0;
      return;
    }

    // Calculate coefficient of variation of inter-event times
    const timestamps = nodeEdges
      .map((e) => e.timestamp)
      .filter((ts): ts is number => ts !== undefined)
      .sort((a, b) => a - b);

    if (timestamps.length < 2) {
      stability[node.id] = 1;
      return;
    }

    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const mean =
      intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      intervals.length;
    const cv = Math.sqrt(variance) / mean;

    // Stability is inverse of coefficient of variation
    stability[node.id] = 1 / (1 + cv);
  });

  return stability;
}

/**
 * Calculate burstiness of node activity
 */
function calculateBurstiness(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): Record<string, number> {
  const burstiness: Record<string, number> = {};

  nodes.forEach((node) => {
    const nodeEdges = edges.filter(
      (e) => e.source === node.id || e.target === node.id,
    );

    if (nodeEdges.length < 2) {
      burstiness[node.id] = 0;
      return;
    }

    const timestamps = nodeEdges
      .map((e) => e.timestamp)
      .filter((ts): ts is number => ts !== undefined)
      .sort((a, b) => a - b);

    if (timestamps.length < 2) {
      burstiness[node.id] = 0;
      return;
    }

    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const mean =
      intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const std = Math.sqrt(
      intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        intervals.length,
    );

    // Burstiness coefficient
    burstiness[node.id] = (std - mean) / (std + mean);
  });

  return burstiness;
}

/**
 * Calculate network density
 */
function calculateDensity(nodes: NetworkNode[], edges: NetworkEdge[]): number {
  const n = nodes.length;
  if (n < 2) return 0;

  const m = edges.length;
  return (2 * m) / (n * (n - 1));
}

/**
 * Calculate average clustering coefficient
 */
function calculateClustering(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): number {
  if (nodes.length === 0) return 0;

  let totalClustering = 0;
  let count = 0;

  nodes.forEach((node) => {
    const neighbors = new Set<string>();

    edges.forEach((edge) => {
      if (edge.source === node.id) neighbors.add(edge.target);
      if (edge.target === node.id) neighbors.add(edge.source);
    });

    const neighborArray = Array.from(neighbors);
    if (neighborArray.length < 2) return;

    let connections = 0;
    for (let i = 0; i < neighborArray.length; i++) {
      for (let j = i + 1; j < neighborArray.length; j++) {
        if (
          edges.some(
            (e) =>
              (e.source === neighborArray[i] &&
                e.target === neighborArray[j]) ||
              (e.source === neighborArray[j] && e.target === neighborArray[i]),
          )
        ) {
          connections++;
        }
      }
    }

    const possibleConnections =
      (neighborArray.length * (neighborArray.length - 1)) / 2;
    if (possibleConnections > 0) {
      totalClustering += connections / possibleConnections;
      count++;
    }
  });

  return count > 0 ? totalClustering / count : 0;
}

/**
 * Calculate network diameter (approximation)
 */
function calculateDiameter(nodes: NetworkNode[], edges: NetworkEdge[]): number {
  const nodeIds = collectNodeIds(nodes, edges);
  const adjList = buildAdjList(nodeIds, edges);

  let diameter = 0;

  // Sample nodes for large networks
  const sampleNodes = nodeIds.slice(0, Math.min(50, nodeIds.length));

  sampleNodes.forEach((source) => {
    const distances = bfsDistances(adjList, source);
    const maxDistance = Math.max(
      ...Object.values(distances).filter((d) => d !== Infinity),
    );
    diameter = Math.max(diameter, maxDistance);
  });

  return diameter;
}

/**
 * Calculate average path length
 */
function calculateAveragePathLength(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): number {
  const nodeIds = collectNodeIds(nodes, edges);
  const adjList = buildAdjList(nodeIds, edges);

  let totalDistance = 0;
  let totalPairs = 0;

  // Sample node pairs for large networks
  const samplePairs = sampleNodePairs(
    nodeIds,
    Math.min(100, nodeIds.length * 2),
  );

  samplePairs.forEach(([source, target]) => {
    const distances = bfsDistances(adjList, source);
    const distance = distances[target];

    if (distance !== Infinity) {
      totalDistance += distance;
      totalPairs++;
    }
  });

  return totalPairs > 0 ? totalDistance / totalPairs : 0;
}

/**
 * Helper: BFS for shortest paths
 */
function bfsShortestPaths(
  adjList: Record<string, string[]>,
  source: string,
): { paths: Record<string, string>; distances: Record<string, number> } {
  const paths: Record<string, string> = {};
  const distances: Record<string, number> = {};
  const visited = new Set<string>();
  const queue: string[] = [source];
  let head = 0;

  distances[source] = 0;
  visited.add(source);

  while (head < queue.length) {
    const current = queue[head++]!;

    adjList[current]?.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        distances[neighbor] = (distances[current] || 0) + 1;
        paths[neighbor] = current;
        queue.push(neighbor);
      }
    });
  }

  // Mark unreachable nodes explicitly.
  Object.keys(adjList).forEach((node) => {
    if (!(node in distances)) {
      distances[node] = Infinity;
    }
  });

  return { paths, distances };
}

/**
 * Helper: BFS for distances only
 */
function bfsDistances(
  adjList: Record<string, string[]>,
  source: string,
): Record<string, number> {
  const distances: Record<string, number> = {};
  const visited = new Set<string>();
  const queue: string[] = [source];
  let head = 0;

  distances[source] = 0;
  visited.add(source);

  while (head < queue.length) {
    const current = queue[head++]!;

    adjList[current]?.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        distances[neighbor] = (distances[current] || 0) + 1;
        queue.push(neighbor);
      }
    });
  }

  // Set distance to Infinity for unreachable nodes
  Object.keys(adjList).forEach((node) => {
    if (!(node in distances)) {
      distances[node] = Infinity;
    }
  });

  return distances;
}

/**
 * Helper: Sample random node pairs
 */
function sampleNodePairs(
  nodeIds: string[],
  sampleSize: number,
): [string, string][] {
  const pairs: [string, string][] = [];
  const n = nodeIds.length;

  if (n < 2) return pairs;

  for (let i = 0; i < sampleSize; i++) {
    const sourceIdx = Math.floor(Math.random() * n);
    let targetIdx: number;

    do {
      targetIdx = Math.floor(Math.random() * n);
    } while (targetIdx === sourceIdx);

    pairs.push([nodeIds[sourceIdx], nodeIds[targetIdx]]);
  }

  return pairs;
}
