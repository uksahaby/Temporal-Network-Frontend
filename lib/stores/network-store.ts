// import { create } from "zustand";
// import type {
//   AnalysisState,
//   TemporalNetwork,
//   TimeWindow,
//   Node,
//   Edge,
// } from "@/lib/types";

// export interface FilterState {
//   nodeId: string;
//   minDegree: number;
//   maxDegree: number;
//   minWeight: number;
//   maxWeight: number;
//   timeWindow: [number, number];
//   showIsolated: boolean;
//   showLabels: boolean;
//   communityFilter: string[];
// }

// export interface NetworkStats {
//   filteredNodes: number;
//   totalNodes: number;
//   totalEdges: number;
//   maxDegree: number;
//   maxWeight: number;
//   timeRange: { start: number; end: number } | null;
//   warnings: string[];
// }

// export interface AnimationStateUpdate {
//   isPlaying?: boolean;
//   speed?: number;
//   direction?: "forward" | "backward";
//   targetTime?: number;
// }

// export interface NetworkStore extends AnalysisState {
//   timeRange: { start: number; end: number } | null;
//   currentTime: number;
//   nodes: Node[];
//   edges: Edge[];
//   filters: FilterState;
//   networkStats: NetworkStats | null;
//   selectedNode: Node | null;
//   playbackDirection: "forward" | "backward";

//   setFile: (file: File) => void;
//   setFileId: (fileId: string) => void;
//   setTaskId: (taskId: string) => void;
//   setStatus: (status: AnalysisState["status"]) => void;
//   setData: (data: TemporalNetwork) => void;
//   setTimeWindows: (windows: TimeWindow[]) => void;
//   setCurrentTimeIndex: (index: number | ((prev: number) => number)) => void;
//   setIsPlaying: (playing: boolean) => void;
//   setPlaybackSpeed: (speed: number) => void;
//   setError: (error: string | null) => void;
//   setFilters: (filters: FilterState) => void;
//   setSelectedNode: (node: Node | null) => void;
//   setAnimationState: (update: AnimationStateUpdate) => void;
//   setTime: (time: number) => void;
//   reset: () => void;

//   getCurrentTimeWindow: () => TimeWindow | null;
//   getActiveNodes: () => Node[];
//   getActiveEdges: () => Edge[];
//   getNodeMetrics: (nodeId: string) => Record<string, number> | null;
// }

// const defaultFilters = (): FilterState => ({
//   nodeId: "",
//   minDegree: 0,
//   maxDegree: 100,
//   minWeight: 0,
//   maxWeight: 1000,
//   timeWindow: [0, Date.now()],
//   showIsolated: true,
//   showLabels: true,
//   communityFilter: [],
// });

// const parseTime = (value: string | number | Date | null | undefined) => {
//   if (typeof value === "number") return value;
//   if (value instanceof Date) return value.getTime();
//   if (typeof value === "string") {
//     const parsed = Date.parse(value);
//     return Number.isNaN(parsed) ? null : parsed;
//   }
//   return null;
// };

// const computeNetworkStats = (
//   nodes: Node[],
//   edges: Edge[],
//   timeRange: { start: number; end: number } | null,
// ): NetworkStats => {
//   const nodeDegree = new Map<string, number>();
//   edges.forEach((edge) => {
//     nodeDegree.set(edge.source, (nodeDegree.get(edge.source) ?? 0) + 1);
//     nodeDegree.set(edge.target, (nodeDegree.get(edge.target) ?? 0) + 1);
//   });

//   const maxDegree = nodeDegree.size
//     ? Math.max(...Array.from(nodeDegree.values()))
//     : 0;
//   const maxWeight = edges.length
//     ? Math.max(...edges.map((edge) => edge.weight ?? 1))
//     : 0;

//   return {
//     filteredNodes: nodes.length,
//     totalNodes: nodes.length,
//     totalEdges: edges.length,
//     maxDegree,
//     maxWeight,
//     timeRange,
//     warnings: [],
//   };
// };

// const deriveFromTimeWindows = (
//   timeWindows: TimeWindow[],
//   currentTimeIndex: number,
// ) => {
//   const window = timeWindows[currentTimeIndex];
//   const nodes = window?.nodes ?? [];
//   const edges = window?.edges ?? [];

//   const startTimes = timeWindows
//     .map((w) => parseTime(w.start))
//     .filter((value): value is number => value !== null);
//   const endTimes = timeWindows
//     .map((w) => parseTime(w.end))
//     .filter((value): value is number => value !== null);

//   const timeRange =
//     startTimes.length && endTimes.length
//       ? { start: Math.min(...startTimes), end: Math.max(...endTimes) }
//       : null;

//   const currentTime = parseTime(window?.start) ?? Date.now();

//   return {
//     nodes,
//     edges,
//     currentTime,
//     timeRange,
//     networkStats: computeNetworkStats(nodes, edges, timeRange),
//   };
// };

// const findClosestTimeWindowIndex = (
//   timeWindows: TimeWindow[],
//   targetTime: number,
// ) => {
//   if (timeWindows.length === 0) return 0;

//   let bestIndex = 0;
//   let bestDistance = Number.POSITIVE_INFINITY;

//   for (let index = 0; index < timeWindows.length; index += 1) {
//     const start = parseTime(timeWindows[index]?.start);
//     if (start === null) continue;
//     const distance = Math.abs(start - targetTime);
//     if (distance < bestDistance) {
//       bestDistance = distance;
//       bestIndex = index;
//     }
//   }

//   return bestIndex;
// };

// export const useNetworkStore = create<NetworkStore>((set, get) => ({
//   status: "idle",
//   currentFile: null,
//   fileId: null,
//   taskId: null,
//   data: null,
//   timeWindows: [],
//   currentTimeIndex: 0,
//   isPlaying: false,
//   playbackSpeed: 1,
//   error: null,

//   timeRange: null,
//   currentTime: Date.now(),
//   nodes: [],
//   edges: [],
//   filters: defaultFilters(),
//   networkStats: null,
//   selectedNode: null,
//   playbackDirection: "forward",

//   setFile: (file) => set({ currentFile: file }),
//   setFileId: (fileId) => set({ fileId }),
//   setTaskId: (taskId) => set({ taskId }),
//   setStatus: (status) => set({ status }),
//   setData: (data) => {
//     const start = parseTime(data.timeRange?.start);
//     const end = parseTime(data.timeRange?.end);
//     const timeRange = start !== null && end !== null ? { start, end } : null;

//     set({
//       data,
//       nodes: data.nodes,
//       edges: data.edges,
//       timeRange,
//       currentTime: start ?? Date.now(),
//       networkStats: computeNetworkStats(data.nodes, data.edges, timeRange),
//     });
//   },
//   setTimeWindows: (timeWindows) => {
//     const derived = deriveFromTimeWindows(timeWindows, 0);
//     set((state) => ({
//       timeWindows,
//       currentTimeIndex: 0,
//       nodes: derived.nodes,
//       edges: derived.edges,
//       currentTime: derived.currentTime,
//       timeRange: derived.timeRange,
//       networkStats: derived.networkStats,
//       filters: {
//         ...state.filters,
//         timeWindow: derived.timeRange
//           ? [derived.timeRange.start, derived.timeRange.end]
//           : state.filters.timeWindow,
//       },
//     }));
//   },
//   setCurrentTimeIndex: (index) => {
//     const nextIndex =
//       typeof index === "function" ? index(get().currentTimeIndex) : index;
//     const derived = deriveFromTimeWindows(get().timeWindows, nextIndex);

//     set({
//       currentTimeIndex: nextIndex,
//       nodes: derived.nodes,
//       edges: derived.edges,
//       currentTime: derived.currentTime,
//       timeRange: derived.timeRange,
//       networkStats: derived.networkStats,
//     });
//   },
//   setIsPlaying: (isPlaying) => set({ isPlaying }),
//   setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
//   setError: (error) => set({ error }),
//   setFilters: (filters) => set({ filters }),
//   setSelectedNode: (selectedNode) => set({ selectedNode }),
//   setAnimationState: (update) => {
//     set((state) => ({
//       isPlaying:
//         typeof update.isPlaying === "boolean"
//           ? update.isPlaying
//           : state.isPlaying,
//       playbackSpeed:
//         typeof update.speed === "number" ? update.speed : state.playbackSpeed,
//       playbackDirection: update.direction ?? state.playbackDirection,
//     }));

//     if (typeof update.targetTime === "number") {
//       get().setTime(update.targetTime);
//     }
//   },
//   setTime: (targetTime) => {
//     const { timeWindows } = get();
//     if (!timeWindows.length) {
//       set({ currentTime: targetTime });
//       return;
//     }

//     const nextIndex = findClosestTimeWindowIndex(timeWindows, targetTime);
//     const derived = deriveFromTimeWindows(timeWindows, nextIndex);

//     set({
//       currentTimeIndex: nextIndex,
//       nodes: derived.nodes,
//       edges: derived.edges,
//       currentTime: derived.currentTime,
//       timeRange: derived.timeRange,
//       networkStats: derived.networkStats,
//     });
//   },
//   reset: () =>
//     set({
//       status: "idle",
//       currentFile: null,
//       fileId: null,
//       taskId: null,
//       data: null,
//       timeWindows: [],
//       currentTimeIndex: 0,
//       isPlaying: false,
//       playbackSpeed: 1,
//       error: null,
//       timeRange: null,
//       currentTime: Date.now(),
//       nodes: [],
//       edges: [],
//       filters: defaultFilters(),
//       networkStats: null,
//       selectedNode: null,
//       playbackDirection: "forward",
//     }),

//   getCurrentTimeWindow: () => {
//     const { timeWindows, currentTimeIndex } = get();
//     return timeWindows[currentTimeIndex] || null;
//   },
//   getActiveNodes: () => {
//     const { timeWindows, currentTimeIndex } = get();
//     return timeWindows[currentTimeIndex]?.nodes ?? [];
//   },
//   getActiveEdges: () => {
//     const { timeWindows, currentTimeIndex } = get();
//     return timeWindows[currentTimeIndex]?.edges ?? [];
//   },
//   getNodeMetrics: (nodeId) => {
//     const { nodes, edges } = get();
//     const node = nodes.find((item) => item.id === nodeId);
//     if (!node) return null;

//     const connections = edges.filter(
//       (edge) => edge.source === nodeId || edge.target === nodeId,
//     );
//     return {
//       degree: connections.length,
//       incoming: connections.filter((edge) => edge.target === nodeId).length,
//       outgoing: connections.filter((edge) => edge.source === nodeId).length,
//     };
//   },
// }));

import { create } from "zustand";
import { useState, useEffect, useCallback } from "react";
import type {
  AnalysisState,
  TemporalNetwork,
  TimeWindow,
  Node,
  Edge,
  Community,
  CommunityEdge,
} from "@/lib/types";

export interface FilterState {
  nodeId: string;
  minDegree: number;
  maxDegree: number;
  minWeight: number;
  maxWeight: number;
  timeWindow: [number, number];
  showIsolated: boolean;
  showLabels: boolean;
  communityFilter: string[];
}

export interface NetworkStats {
  filteredNodes: number;
  totalNodes: number;
  totalEdges: number;
  maxDegree: number;
  maxWeight: number;
  timeRange: { start: number; end: number } | null;
  warnings: string[];
  totalCommunities?: number;
  avgCommunitySize?: number;
  largestCommunity?: number;
}

export interface AnimationStateUpdate {
  isPlaying?: boolean;
  speed?: number;
  direction?: "forward" | "backward";
  targetTime?: number;
}

export interface WindowMeta {
  totalNodes: number;
  totalEdges: number;
  totalCommunities: number;
}

export interface NetworkStore extends AnalysisState {
  timeRange: { start: number; end: number } | null;
  currentTime: number;
  nodes: Node[];
  edges: Edge[];
  communities: Community[];
  communityEdges: CommunityEdge[];
  selectedCommunity: Community | null;
  viewMode: "nodes" | "communities";
  filters: FilterState;
  networkStats: NetworkStats | null;
  selectedNode: Node | null;
  playbackDirection: "forward" | "backward";
  currentWindowMeta: WindowMeta | null;

  setFile: (file: File) => void;
  setFileId: (fileId: string) => void;
  setTaskId: (taskId: string) => void;
  setStatus: (status: AnalysisState["status"]) => void;
  setData: (data: TemporalNetwork) => void;
  setTimeWindows: (windows: TimeWindow[]) => void;
  setCommunityData: (
    windowIndex: number,
    communities: Community[],
    communityEdges: CommunityEdge[],
  ) => void;
  setCurrentCommunityData: (
    communities: Community[],
    communityEdges: CommunityEdge[],
  ) => void;
  setCurrentTimeIndex: (index: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: FilterState) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedCommunity: (community: Community | null) => void;
  setViewMode: (mode: "nodes" | "communities") => void;
  setAnimationState: (update: AnimationStateUpdate) => void;
  setTime: (time: number) => void;
  setCurrentWindowMeta: (meta: WindowMeta | null) => void;
  reset: () => void;

  getCurrentTimeWindow: () => TimeWindow | null;
  getActiveNodes: () => Node[];
  getActiveEdges: () => Edge[];
  getCurrentCommunities: () => Community[];
  getCurrentCommunityEdges: () => CommunityEdge[];
  getNodeMetrics: (nodeId: string) => Record<string, number> | null;
  getCommunityMetrics: (communityId: string) => {
    nodeCount: number;
    internalEdges: number;
    externalEdges: number;
    density: number;
  } | null;
}

const defaultFilters = (): FilterState => ({
  nodeId: "",
  minDegree: 0,
  maxDegree: 100,
  minWeight: 0,
  maxWeight: 1000,
  timeWindow: [0, Date.now()],
  showIsolated: true,
  showLabels: true,
  communityFilter: [],
});

const parseTime = (value: string | number | Date | null | undefined) => {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const computeNetworkStats = (
  nodes: Node[],
  edges: Edge[],
  communities: Community[] = [],
  timeRange: { start: number; end: number } | null,
): NetworkStats => {
  const nodeDegree = new Map<string, number>();
  edges.forEach((edge) => {
    nodeDegree.set(edge.source, (nodeDegree.get(edge.source) ?? 0) + 1);
    nodeDegree.set(edge.target, (nodeDegree.get(edge.target) ?? 0) + 1);
  });

  const maxDegree = nodeDegree.size
    ? Math.max(...Array.from(nodeDegree.values()))
    : 0;
  const maxWeight = edges.length
    ? Math.max(...edges.map((edge) => edge.weight ?? 1))
    : 0;

  const totalCommunities = communities.length;
  const avgCommunitySize = communities.length
    ? communities.reduce((sum, c) => sum + c.nodeCount, 0) / communities.length
    : undefined;
  const largestCommunity = communities.length
    ? Math.max(...communities.map((c) => c.nodeCount))
    : undefined;

  return {
    filteredNodes: nodes.length,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    maxDegree,
    maxWeight,
    timeRange,
    warnings: [],
    totalCommunities,
    avgCommunitySize,
    largestCommunity,
  };
};

const deriveFromTimeWindows = (
  timeWindows: TimeWindow[],
  currentTimeIndex: number,
) => {
  const window = timeWindows[currentTimeIndex];
  const nodes = window?.nodes ?? [];
  const edges = window?.edges ?? [];

  const startTimes = timeWindows
    .map((w) => parseTime(w.start))
    .filter((value): value is number => value !== null);
  const endTimes = timeWindows
    .map((w) => parseTime(w.end))
    .filter((value): value is number => value !== null);

  const timeRange =
    startTimes.length && endTimes.length
      ? { start: Math.min(...startTimes), end: Math.max(...endTimes) }
      : null;

  const currentTime = parseTime(window?.start) ?? Date.now();

  return {
    nodes,
    edges,
    currentTime,
    timeRange,
    networkStats: computeNetworkStats(nodes, edges, [], timeRange),
  };
};

const findClosestTimeWindowIndex = (
  timeWindows: TimeWindow[],
  targetTime: number,
) => {
  if (timeWindows.length === 0) return 0;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < timeWindows.length; index += 1) {
    const start = parseTime(timeWindows[index]?.start);
    if (start === null) continue;
    const distance = Math.abs(start - targetTime);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
};

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  status: "idle",
  currentFile: null,
  fileId: null,
  taskId: null,
  data: null,
  timeWindows: [],
  currentTimeIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  error: null,

  timeRange: null,
  currentTime: Date.now(),
  nodes: [],
  edges: [],
  communities: [],
  communityEdges: [],
  selectedCommunity: null,
  viewMode: "communities",
  filters: defaultFilters(),
  networkStats: null,
  selectedNode: null,
  playbackDirection: "forward",
  currentWindowMeta: null,

  setFile: (file) => set({ currentFile: file }),
  setFileId: (fileId) => set({ fileId }),
  setTaskId: (taskId) => set({ taskId }),
  setStatus: (status) => set({ status }),
  setData: (data) => {
    const start = parseTime(data.timeRange?.start);
    const end = parseTime(data.timeRange?.end);
    const timeRange = start !== null && end !== null ? { start, end } : null;

    set({
      data,
      nodes: data.nodes,
      edges: data.edges,
      timeRange,
      currentTime: start ?? Date.now(),
      networkStats: computeNetworkStats(data.nodes, data.edges, [], timeRange),
    });
  },
  setTimeWindows: (timeWindows) => {
    const derived = deriveFromTimeWindows(timeWindows, 0);
    set((state) => ({
      timeWindows,
      currentTimeIndex: 0,
      nodes: derived.nodes,
      edges: derived.edges,
      communities: [],
      communityEdges: [],
      currentTime: derived.currentTime,
      timeRange: derived.timeRange,
      networkStats: derived.networkStats,
      filters: {
        ...state.filters,
        timeWindow: derived.timeRange
          ? [derived.timeRange.start, derived.timeRange.end]
          : state.filters.timeWindow,
      },
    }));
  },

  setCommunityData: (windowIndex, communities, communityEdges) => {
    const { currentTimeIndex } = get();
    if (windowIndex === currentTimeIndex) {
      set({
        communities,
        communityEdges,
        networkStats: computeNetworkStats(
          get().nodes,
          get().edges,
          communities,
          get().timeRange,
        ),
      });
    } else {
      console.log(
        `Community data for window ${windowIndex} received but current is ${currentTimeIndex}`,
      );
    }
  },

  setCurrentCommunityData: (communities, communityEdges) => {
    console.log(
      `Setting current community data: ${communities.length} communities`,
    );
    set({
      communities,
      communityEdges,
      networkStats: computeNetworkStats(
        get().nodes,
        get().edges,
        communities,
        get().timeRange,
      ),
    });
  },

  setCurrentTimeIndex: (index) => {
    const nextIndex =
      typeof index === "function" ? index(get().currentTimeIndex) : index;
    const derived = deriveFromTimeWindows(get().timeWindows, nextIndex);

    set({
      currentTimeIndex: nextIndex,
      nodes: derived.nodes,
      edges: derived.edges,
      communities: [],
      communityEdges: [],
      selectedCommunity: null,
      currentTime: derived.currentTime,
      timeRange: derived.timeRange,
      networkStats: derived.networkStats,
    });
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set({ filters }),
  setSelectedNode: (selectedNode) =>
    set({
      selectedNode,
      selectedCommunity: null,
    }),

  setSelectedCommunity: (selectedCommunity) =>
    set({
      selectedCommunity,
      selectedNode: null,
    }),

  setViewMode: (viewMode) => set({ viewMode }),

  setCurrentWindowMeta: (meta) => set({ currentWindowMeta: meta }),

  setAnimationState: (update) => {
    set((state) => ({
      isPlaying:
        typeof update.isPlaying === "boolean"
          ? update.isPlaying
          : state.isPlaying,
      playbackSpeed:
        typeof update.speed === "number" ? update.speed : state.playbackSpeed,
      playbackDirection: update.direction ?? state.playbackDirection,
    }));

    if (typeof update.targetTime === "number") {
      get().setTime(update.targetTime);
    }
  },
  setTime: (targetTime) => {
    const { timeWindows } = get();
    if (!timeWindows.length) {
      set({ currentTime: targetTime });
      return;
    }

    const nextIndex = findClosestTimeWindowIndex(timeWindows, targetTime);
    const derived = deriveFromTimeWindows(timeWindows, nextIndex);

    set({
      currentTimeIndex: nextIndex,
      nodes: derived.nodes,
      edges: derived.edges,
      communities: [],
      communityEdges: [],
      selectedCommunity: null,
      currentTime: derived.currentTime,
      timeRange: derived.timeRange,
      networkStats: derived.networkStats,
    });
  },
  reset: () =>
    set({
      status: "idle",
      currentFile: null,
      fileId: null,
      taskId: null,
      data: null,
      timeWindows: [],
      currentTimeIndex: 0,
      isPlaying: false,
      playbackSpeed: 1,
      error: null,
      timeRange: null,
      currentTime: Date.now(),
      nodes: [],
      edges: [],
      communities: [],
      communityEdges: [],
      selectedCommunity: null,
      viewMode: "communities",
      filters: defaultFilters(),
      networkStats: null,
      selectedNode: null,
      playbackDirection: "forward",
      currentWindowMeta: null,
    }),

  getCurrentTimeWindow: () => {
    const { timeWindows, currentTimeIndex } = get();
    return timeWindows[currentTimeIndex] || null;
  },
  getActiveNodes: () => {
    const { timeWindows, currentTimeIndex } = get();
    return timeWindows[currentTimeIndex]?.nodes ?? [];
  },
  getActiveEdges: () => {
    const { timeWindows, currentTimeIndex } = get();
    return timeWindows[currentTimeIndex]?.edges ?? [];
  },

  getCurrentCommunities: () => {
    return get().communities;
  },

  getCurrentCommunityEdges: () => {
    return get().communityEdges;
  },

  getNodeMetrics: (nodeId) => {
    const { nodes, edges } = get();
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return null;

    const connections = edges.filter(
      (edge) => edge.source === nodeId || edge.target === nodeId,
    );
    return {
      degree: connections.length,
      incoming: connections.filter((edge) => edge.target === nodeId).length,
      outgoing: connections.filter((edge) => edge.source === nodeId).length,
    };
  },

  getCommunityMetrics: (communityId) => {
    const { communities, communityEdges } = get();
    const community = communities.find((c) => c.id === communityId);
    if (!community) return null;

    const externalEdges = communityEdges
      .filter(
        (e) =>
          e.sourceCommunityId.toString() === communityId ||
          e.targetCommunityId.toString() === communityId,
      )
      .reduce((sum, e) => sum + e.edgeCount, 0);

    const possibleInternalEdges =
      (community.nodeCount * (community.nodeCount - 1)) / 2;
    const density =
      possibleInternalEdges > 0
        ? community.internalEdges / possibleInternalEdges
        : 0;

    return {
      nodeCount: community.nodeCount,
      internalEdges: community.internalEdges,
      externalEdges,
      density,
    };
  },
}));

// ============================================================================
// FIXED: useFetchCommunityData Hook with better error handling and logging
// ============================================================================
export const useFetchCommunityData = (
  taskId: string | null,
  baseUrl: string = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : "http://localhost:8000/api",
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentCommunityData, setCurrentWindowMeta, currentTimeIndex } =
    useNetworkStore();

  const fetchCommunities = useCallback(async () => {
    if (!taskId) {
      return;
    }

    console.log(`Fetching communities for window ${currentTimeIndex}`);
    setIsLoading(true);
    setError(null);

    try {
      // Fetch SINGLE window on demand (not all windows at once)
      const response = await fetch(
        `${baseUrl}/analysis/${taskId}/communities/${currentTimeIndex}`,
      );

      if (!response.ok) {
        if (response.status === 202) {
          // Still processing
          setError("Analysis still processing...");
          return;
        }
        if (response.status === 404) {
          throw new Error("Community data not found for this window");
        }
        throw new Error(
          `Failed to fetch community data: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data || !data.window) {
        setCurrentCommunityData([], []);
        setCurrentWindowMeta(null);
        return;
      }

      const windowData = data.window;
      const communities = windowData.communities || [];
      const communityEdges = windowData.communityEdges || [];

      console.log(
        `Window ${data.window_index}: ${communities.length} communities, ` +
          `${communityEdges.length} edges, ` +
          `${windowData.totalNodes?.toLocaleString()} nodes`,
      );

      setCurrentCommunityData(communities, communityEdges);
      setCurrentWindowMeta({
        totalNodes: windowData.totalNodes ?? 0,
        totalEdges: windowData.totalEdges ?? 0,
        totalCommunities: windowData.totalCommunities ?? communities.length,
      });
    } catch (err) {
      console.error("Error fetching community data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [
    taskId,
    baseUrl,
    currentTimeIndex,
    setCurrentCommunityData,
    setCurrentWindowMeta,
  ]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  return { isLoading, error, refetch: fetchCommunities };
};
