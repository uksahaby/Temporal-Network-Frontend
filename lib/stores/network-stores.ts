// // // lib/stores/network-store.ts
// // import { create } from "zustand";
// // import { AnalysisState, TemporalNetwork, TimeWindow } from "@/lib/types";

// // interface NetworkStore extends AnalysisState {
// //   // Actions
// //   setFile: (file: File) => void;
// //   setFileId: (fileId: string) => void;
// //   setTaskId: (taskId: string) => void;
// //   setStatus: (status: AnalysisState["status"]) => void;
// //   setData: (data: TemporalNetwork) => void;
// //   setTimeWindows: (windows: TimeWindow[]) => void;
// //   setCurrentTimeIndex: (index: number) => void;
// //   setIsPlaying: (playing: boolean) => void;
// //   setPlaybackSpeed: (speed: number) => void;
// //   setError: (error: string | null) => void;
// //   reset: () => void;

// //   // Derived data
// //   getCurrentTimeWindow: () => TimeWindow | null;
// //   getActiveNodes: () => any[];
// //   getActiveEdges: () => any[];
// // }

// // export const useNetworkStore = create<NetworkStore>((set, get) => ({
// //   // Initial state
// //   status: "idle",
// //   currentFile: null,
// //   fileId: null,
// //   taskId: null,
// //   data: null,
// //   timeWindows: [],
// //   currentTimeIndex: 0,
// //   isPlaying: false,
// //   playbackSpeed: 1,
// //   error: null,

// //   // Actions
// //   setFile: (file) => set({ currentFile: file }),
// //   setFileId: (fileId) => set({ fileId }),
// //   setTaskId: (taskId) => set({ taskId }),
// //   setStatus: (status) => set({ status }),
// //   setData: (data) => set({ data }),
// //   setTimeWindows: (timeWindows) => set({ timeWindows }),
// //   setCurrentTimeIndex: (currentTimeIndex) => set({ currentTimeIndex }),
// //   setIsPlaying: (isPlaying) => set({ isPlaying }),
// //   setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
// //   setError: (error) => set({ error }),
// //   reset: () =>
// //     set({
// //       status: "idle",
// //       currentFile: null,
// //       fileId: null,
// //       taskId: null,
// //       data: null,
// //       timeWindows: [],
// //       currentTimeIndex: 0,
// //       isPlaying: false,
// //       playbackSpeed: 1,
// //       error: null,
// //     }),

// //   // Derived data
// //   getCurrentTimeWindow: () => {
// //     const { timeWindows, currentTimeIndex } = get();
// //     return timeWindows[currentTimeIndex] || null;
// //   },

// //   getActiveNodes: () => {
// //     const { data, currentTimeIndex, timeWindows } = get();
// //     if (!timeWindows[currentTimeIndex]) return [];
// //     return timeWindows[currentTimeIndex].nodes;
// //   },

// //   getActiveEdges: () => {
// //     const { data, currentTimeIndex, timeWindows } = get();
// //     if (!timeWindows[currentTimeIndex]) return [];
// //     return timeWindows[currentTimeIndex].edges;
// //   },
// // }));

// import { create } from "zustand";
// import { immer } from "zustand/middleware/immer";
// import {
//   apiClient,
//   type NetworkData,
//   type NetworkNode,
//   type NetworkEdge,
//   type FilterOptions,
// } from "@/lib/api/client";

// export interface NetworkState {
//   // Network data
//   networkId: string | null;
//   nodes: NetworkNode[];
//   edges: NetworkEdge[];
//   metadata: any | null;

//   // Time state
//   currentTime: number;
//   timeRange: { start: number; end: number } | null;
//   isPlaying: boolean;
//   playbackSpeed: number;
//   playbackDirection: "forward" | "backward";

//   // View state
//   selectedNodeId: string | null;
//   selectedEdgeId: string | null;
//   hoveredNodeId: string | null;
//   hoveredEdgeId: string | null;
//   viewport: {
//     x: number;
//     y: number;
//     scale: number;
//   };

//   // Filters
//   filters: FilterOptions;
//   filteredNodes: NetworkNode[];
//   filteredEdges: NetworkEdge[];

//   // Statistics
//   networkStats: {
//     totalNodes: number;
//     totalEdges: number;
//     avgDegree: number;
//     density: number;
//     clustering: number;
//     timeRange: { start: number; end: number };
//     warnings: string[];
//   } | null;

//   // Loading states
//   isLoading: boolean;
//   isProcessing: boolean;
//   progress: number;
//   error: string | null;

//   // Actions
//   setNetworkData: (data: NetworkData) => void;
//   setTime: (time: number) => void;
//   setPlaybackState: (isPlaying: boolean) => void;
//   setPlaybackSpeed: (speed: number) => void;
//   setSelectedNode: (nodeId: string | null) => void;
//   setSelectedEdge: (edgeId: string | null) => void;
//   setHoveredNode: (nodeId: string | null) => void;
//   setHoveredEdge: (edgeId: string | null) => void;
//   setViewport: (viewport: { x: number; y: number; scale: number }) => void;
//   setFilters: (filters: FilterOptions) => void;
//   setLoading: (loading: boolean) => void;
//   setProcessing: (processing: boolean) => void;
//   setProgress: (progress: number) => void;
//   setError: (error: string | null) => void;

//   // Derived actions
//   getNodeById: (id: string) => NetworkNode | undefined;
//   getEdgeById: (id: string) => NetworkEdge | undefined;
//   getNodeMetrics: (nodeId: string) => any;
//   getTimePosition: () => number;
//   applyFilters: () => void;
//   resetFilters: () => void;
//   exportNetwork: (format: "csv" | "json" | "gexf") => Promise<void>;
// }

// export const useNetworkStore = create<NetworkState>()(
//   immer((set, get) => ({
//     // Initial state
//     networkId: null,
//     nodes: [],
//     edges: [],
//     metadata: null,

//     currentTime: Date.now(),
//     timeRange: null,
//     isPlaying: false,
//     playbackSpeed: 1,
//     playbackDirection: "forward",

//     selectedNodeId: null,
//     selectedEdgeId: null,
//     hoveredNodeId: null,
//     hoveredEdgeId: null,
//     viewport: {
//       x: 0,
//       y: 0,
//       scale: 1,
//     },

//     filters: {
//       minDegree: 0,
//       maxDegree: 100,
//       minWeight: 0,
//       maxWeight: 1000,
//       showIsolated: true,
//       community: [],
//     },
//     filteredNodes: [],
//     filteredEdges: [],

//     networkStats: null,

//     isLoading: false,
//     isProcessing: false,
//     progress: 0,
//     error: null,

//     // Actions
//     setNetworkData: (data: NetworkData) => {
//       set((state) => {
//         state.networkId = data.metadata.id;
//         state.nodes = data.nodes;
//         state.edges = data.edges;
//         state.metadata = data.metadata;

//         // Set time range from metadata
//         if (data.metadata.stats.timeRange) {
//           state.timeRange = data.metadata.stats.timeRange;
//           state.currentTime = data.metadata.stats.timeRange.start;
//         }

//         // Initialize filtered arrays
//         state.filteredNodes = data.nodes;
//         state.filteredEdges = data.edges;

//         // Calculate initial statistics
//         const stats = calculateNetworkStats(data.nodes, data.edges);
//         state.networkStats = {
//           totalNodes: data.nodes.length,
//           totalEdges: data.edges.length,
//           avgDegree: stats.avgDegree,
//           density: stats.density,
//           clustering: stats.clustering,
//           timeRange: data.metadata.stats.timeRange,
//           warnings: [],
//         };
//       });
//     },

//     setTime: (time: number) => {
//       set((state) => {
//         if (state.timeRange) {
//           state.currentTime = Math.max(
//             state.timeRange.start,
//             Math.min(state.timeRange.end, time),
//           );
//         } else {
//           state.currentTime = time;
//         }
//       });
//     },

//     setPlaybackState: (isPlaying: boolean) => {
//       set((state) => {
//         state.isPlaying = isPlaying;
//       });
//     },

//     setPlaybackSpeed: (speed: number) => {
//       set((state) => {
//         state.playbackSpeed = Math.max(0.1, Math.min(10, speed));
//       });
//     },

//     setSelectedNode: (nodeId: string | null) => {
//       set((state) => {
//         state.selectedNodeId = nodeId;
//         state.selectedEdgeId = null; // Clear edge selection when selecting node
//       });
//     },

//     setSelectedEdge: (edgeId: string | null) => {
//       set((state) => {
//         state.selectedEdgeId = edgeId;
//         state.selectedNodeId = null; // Clear node selection when selecting edge
//       });
//     },

//     setHoveredNode: (nodeId: string | null) => {
//       set((state) => {
//         state.hoveredNodeId = nodeId;
//       });
//     },

//     setHoveredEdge: (edgeId: string | null) => {
//       set((state) => {
//         state.hoveredEdgeId = edgeId;
//       });
//     },

//     setViewport: (viewport) => {
//       set((state) => {
//         state.viewport = viewport;
//       });
//     },

//     setFilters: (filters: FilterOptions) => {
//       set((state) => {
//         state.filters = { ...state.filters, ...filters };
//         get().applyFilters();
//       });
//     },

//     setLoading: (loading: boolean) => {
//       set((state) => {
//         state.isLoading = loading;
//         if (loading) {
//           state.error = null;
//         }
//       });
//     },

//     setProcessing: (processing: boolean) => {
//       set((state) => {
//         state.isProcessing = processing;
//       });
//     },

//     setProgress: (progress: number) => {
//       set((state) => {
//         state.progress = Math.max(0, Math.min(100, progress));
//       });
//     },

//     setError: (error: string | null) => {
//       set((state) => {
//         state.error = error;
//       });
//     },

//     // Derived actions
//     getNodeById: (id: string) => {
//       return get().nodes.find((node) => node.id === id);
//     },

//     getEdgeById: (id: string) => {
//       return get().edges.find((edge) => edge.id === id);
//     },

//     getNodeMetrics: (nodeId: string) => {
//       const node = get().getNodeById(nodeId);
//       if (!node) return null;

//       const edges = get().edges.filter(
//         (e) => e.source === nodeId || e.target === nodeId,
//       );
//       const incoming = edges.filter((e) => e.target === nodeId);
//       const outgoing = edges.filter((e) => e.source === nodeId);

//       return {
//         degree: edges.length,
//         incoming: incoming.length,
//         outgoing: outgoing.length,
//         weight: edges.reduce((sum, e) => sum + (e.weight || 1), 0),
//         activity: calculateNodeActivity(nodeId, get().edges),
//         centrality: node.centrality || 0,
//         community: node.community,
//       };
//     },

//     getTimePosition: () => {
//       const { currentTime, timeRange } = get();
//       if (!timeRange) return 0;

//       return (
//         (currentTime - timeRange.start) / (timeRange.end - timeRange.start)
//       );
//     },

//     applyFilters: () => {
//       set((state) => {
//         const { nodes, edges, filters, currentTime } = state;

//         // Filter nodes
//         state.filteredNodes = nodes.filter((node) => {
//           // Degree filter
//           const nodeEdges = edges.filter(
//             (e) => e.source === node.id || e.target === node.id,
//           );
//           const degree = nodeEdges.length;
//           if (degree < (filters.minDegree || 0)) return false;
//           if (degree > (filters.maxDegree || Infinity)) return false;

//           // Node ID filter
//           if (filters.nodeId && !node.id.includes(filters.nodeId)) return false;

//           // Isolated nodes filter
//           if (!filters.showIsolated && degree === 0) return false;

//           // Community filter
//           if (filters.community && filters.community.length > 0) {
//             if (!filters.community.includes(node.community || 0)) return false;
//           }

//           return true;
//         });

//         // Filter edges
//         state.filteredEdges = edges.filter((edge) => {
//           // Weight filter
//           const weight = edge.weight || 1;
//           if (weight < (filters.minWeight || 0)) return false;
//           if (weight > (filters.maxWeight || Infinity)) return false;

//           // Time window filter
//           if (filters.timeWindow) {
//             const edgeTime = edge.timestamp || currentTime;
//             if (
//               edgeTime < filters.timeWindow[0] ||
//               edgeTime > filters.timeWindow[1]
//             ) {
//               return false;
//             }
//           }

//           // Check if both source and target are in filtered nodes
//           const sourceIncluded = state.filteredNodes.some(
//             (n) => n.id === edge.source,
//           );
//           const targetIncluded = state.filteredNodes.some(
//             (n) => n.id === edge.target,
//           );

//           if (!sourceIncluded || !targetIncluded) return false;

//           return true;
//         });
//       });
//     },

//     resetFilters: () => {
//       set((state) => {
//         state.filters = {
//           minDegree: 0,
//           maxDegree: 100,
//           minWeight: 0,
//           maxWeight: 1000,
//           showIsolated: true,
//           community: [],
//         };
//         state.filteredNodes = state.nodes;
//         state.filteredEdges = state.edges;
//       });
//     },

//     exportNetwork: async (format: "csv" | "json" | "gexf") => {
//       const { networkId } = get();
//       if (!networkId) throw new Error("No network loaded");

//       try {
//         const blob = await apiClient.exportNetwork(networkId, format);
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = `network-${networkId}.${format}`;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//         window.URL.revokeObjectURL(url);
//       } catch (error) {
//         console.error("Export failed:", error);
//         throw error;
//       }
//     },
//   })),
// );

// // Helper functions
// function calculateNetworkStats(nodes: NetworkNode[], edges: NetworkEdge[]) {
//   const degrees = nodes.map(
//     (node) =>
//       edges.filter((e) => e.source === node.id || e.target === node.id).length,
//   );
//   const avgDegree = degrees.reduce((a, b) => a + b, 0) / degrees.length;

//   // Simple density calculation (undirected, simple graph)
//   const n = nodes.length;
//   const m = edges.length;
//   const density = m / ((n * (n - 1)) / 2);

//   // Simple clustering coefficient approximation
//   const clustering = calculateAverageClustering(nodes, edges);

//   return { avgDegree, density, clustering };
// }

// function calculateAverageClustering(
//   nodes: NetworkNode[],
//   edges: NetworkEdge[],
// ): number {
//   if (nodes.length === 0) return 0;

//   let totalClustering = 0;
//   let count = 0;

//   for (const node of nodes) {
//     const neighbors = new Set<string>();

//     // Get all neighbors
//     for (const edge of edges) {
//       if (edge.source === node.id) neighbors.add(edge.target);
//       if (edge.target === node.id) neighbors.add(edge.source);
//     }

//     const neighborArray = Array.from(neighbors);
//     if (neighborArray.length < 2) continue;

//     // Count connections between neighbors
//     let connections = 0;
//     for (let i = 0; i < neighborArray.length; i++) {
//       for (let j = i + 1; j < neighborArray.length; j++) {
//         if (
//           edges.some(
//             (e) =>
//               (e.source === neighborArray[i] &&
//                 e.target === neighborArray[j]) ||
//               (e.source === neighborArray[j] && e.target === neighborArray[i]),
//           )
//         ) {
//           connections++;
//         }
//       }
//     }

//     const possibleConnections =
//       (neighborArray.length * (neighborArray.length - 1)) / 2;
//     if (possibleConnections > 0) {
//       totalClustering += connections / possibleConnections;
//       count++;
//     }
//   }

//   return count > 0 ? totalClustering / count : 0;
// }

// function calculateNodeActivity(nodeId: string, edges: NetworkEdge[]): number {
//   const nodeEdges = edges.filter(
//     (e) => e.source === nodeId || e.target === nodeId,
//   );
//   if (nodeEdges.length === 0) return 0;

//   // Calculate activity based on edge timestamps
//   const timestamps = nodeEdges
//     .map((e) => e.timestamp)
//     .filter((ts): ts is number => ts !== undefined)
//     .sort((a, b) => a - b);

//   if (timestamps.length < 2) return 1;

//   // Activity is inversely proportional to time between interactions
//   const timeRange = timestamps[timestamps.length - 1] - timestamps[0];
//   if (timeRange === 0) return 1;

//   return timestamps.length / (timeRange / (1000 * 60 * 60 * 24)); // Interactions per day
// }
