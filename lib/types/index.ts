// lib/types.ts

// Make Node fields optional since they might come from different sources
// lib/types.ts

export interface Node {
  id: string;
  label?: string;
  degree?: number;
  centrality?: number;
  betweenness?: number;
  closeness?: number;
  pagerank?: number;
  // Make group accept string from API, but we'll cast it
  group?: string | "hub" | "connector" | "peripheral";
  community?: number;
  x?: number;
  y?: number;
  size?: number;
  type?: string;
  properties?: Record<string, unknown>;
  firstSeen?: string | number;
  lastActive?: string | number;
}

export interface Edge {
  source: string;
  target: string;
  id?: string;
  weight?: number;
  timestamp?: number | string;
  active?: boolean;
  startTime?: number;
  endTime?: number;
}

// ============================================================================
// Community Types
// ============================================================================
export interface Community {
  id: string;
  communityId: number;
  nodeCount: number; // Number of nodes in this community
  size: number; // For circle sizing
  avgDegree: number;
  dominantGroup: "hub" | "connector" | "peripheral" | "mixed";
  isMixed: boolean;
  centroidX: number;
  centroidY: number;
  internalEdges: number;
  memberNodeIds: string[]; // Sample of node IDs for drill-down
  memberCount: number;
}

export interface CommunityEdge {
  sourceCommunityId: number;
  targetCommunityId: number;
  edgeCount: number;
  sourceCentroid: [number, number];
  targetCentroid: [number, number];
  weight: number;
}

export interface CommunityTimeWindow {
  start: string;
  end: string;
  window_key: string;
  communities: Community[];
  communityEdges: CommunityEdge[];
  totalCommunities: number;
  totalNodes: number;
  totalEdges: number;
}

export interface CommunityVisualizationData {
  task_id: string;
  time_windows: CommunityTimeWindow[];
  summary: Record<string, any>;
}

export interface TemporalNetwork {
  nodes: Node[];
  edges: Edge[];
  timeRange?: {
    start: string | number;
    end: string | number;
  };
  metadata?: Record<string, any>;
}

export interface TimeWindow {
  start: string | number;
  end: string | number;
  nodes: Node[];
  edges: Edge[];
  window_key?: string;
  truncated?: boolean;
  original_counts?: {
    nodes: number;
    edges: number;
  };
}

export interface AnalysisState {
  status: "idle" | "uploading" | "processing" | "completed" | "failed";
  currentFile: File | null;
  fileId: string | null;
  taskId: string | null;
  data: TemporalNetwork | null;
  timeWindows: TimeWindow[];
  currentTimeIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  error: string | null;
}

export interface NetworkStore {
  selectedNode: Node | null;
  setSelectedNode: (node: Node | null) => void;
  selectedCommunity: Community | null;
  setSelectedCommunity: (community: Community | null) => void;
  viewMode: "nodes" | "communities";
  setViewMode: (mode: "nodes" | "communities") => void;
}
