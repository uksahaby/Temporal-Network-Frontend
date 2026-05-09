// "use client";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// interface MetricsPoint {
//   time: string;
//   density: number;
//   nodes: number;
//   edges: number;
//   components: number;
//   clustering: number;
// }

// interface MetricsDashboardProps {
//   metricsTimeline: MetricsPoint[];
//   currentWindow: number;
// }

// function formatNumber(value: number) {
//   return Number.isFinite(value) ? value.toLocaleString() : "-";
// }

// function formatFloat(value: number) {
//   return Number.isFinite(value) ? value.toFixed(3) : "-";
// }

// export default function MetricsDashboard({
//   metricsTimeline,
//   currentWindow,
// }: MetricsDashboardProps) {
//   const current = metricsTimeline[currentWindow] || metricsTimeline[0];

//   if (!current) {
//     return (
//       <Card>
//         <CardHeader>
//           <CardTitle>Network Metrics</CardTitle>
//         </CardHeader>
//         <CardContent className="text-sm text-gray-500">
//           No metrics available yet.
//         </CardContent>
//       </Card>
//     );
//   }

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//       <Card>
//         <CardHeader>
//           <CardTitle>Density</CardTitle>
//         </CardHeader>
//         <CardContent className="text-2xl font-semibold">
//           {formatFloat(current.density)}
//         </CardContent>
//       </Card>
//       <Card>
//         <CardHeader>
//           <CardTitle>Nodes</CardTitle>
//         </CardHeader>
//         <CardContent className="text-2xl font-semibold">
//           {formatNumber(current.nodes)}
//         </CardContent>
//       </Card>
//       <Card>
//         <CardHeader>
//           <CardTitle>Edges</CardTitle>
//         </CardHeader>
//         <CardContent className="text-2xl font-semibold">
//           {formatNumber(current.edges)}
//         </CardContent>
//       </Card>
//       <Card>
//         <CardHeader>
//           <CardTitle>Clustering</CardTitle>
//         </CardHeader>
//         <CardContent className="text-2xl font-semibold">
//           {formatFloat(current.clustering)}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  TrendingUp,
  Users,
  Link as LinkIcon,
  Clock,
  Target,
  Zap,
  Download,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useNetworkStore } from "@/lib/stores/network-store";
import { calculateNetworkMetrics } from "@/lib/utils/network";
import { formatNumber } from "@/lib/utils/formatters";
import type { NetworkEdge, NetworkNode } from "@/lib/api/client";
import * as XLSX from "xlsx";

function toTimestampNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return undefined;
    if (/^\d+(?:\.\d+)?$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return undefined;
      return n < 1e12 ? n * 1000 : n;
    }
    const parsed = Date.parse(s);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

interface NetworkMetrics {
  centrality: {
    degree: Record<string, number>;
    betweenness: Record<string, number>;
    closeness: Record<string, number>;
    eigenvector: Record<string, number>;
  };
  temporal: {
    activity: Record<string, number>;
    stability: Record<string, number>;
    burstiness: Record<string, number>;
  };
  structural: {
    density: number;
    clustering: number;
    diameter: number;
    avgPathLength: number;
  };
  community: {
    modularity: number;
    communities: number;
    sizes: number[];
  };
}

export type MetricsDashboardProps = {
  nodes?: Array<{
    id: string;
    label?: string;
    x?: number;
    y?: number;
    size?: number;
    color?: string;
    community?: number;
    centrality?: number;
    properties?: Record<string, unknown>;
  }>;
  edges?: Array<{
    id?: string;
    source: string;
    target: string;
    weight?: number;
    timestamp?: number | string;
    startTime?: number;
    endTime?: number;
  }>;
  currentTime?: number;
  isPlaying?: boolean;
};

function computeTimeRangeFromEdges(
  edges: Array<{ timestamp?: number | string }>,
): { start: number; end: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const edge of edges) {
    const ts = toTimestampNumber(edge.timestamp);
    if (typeof ts !== "number") continue;
    if (ts < min) min = ts;
    if (ts > max) max = ts;
  }

  return Number.isFinite(min) && Number.isFinite(max)
    ? { start: min, end: max }
    : null;
}

export function MetricsDashboard(props: MetricsDashboardProps) {
  const store = useNetworkStore();

  type InputNode = NonNullable<MetricsDashboardProps["nodes"]>[number];
  type InputEdge = NonNullable<MetricsDashboardProps["edges"]>[number];

  const usingExternalData =
    typeof props.currentTime === "number" ||
    typeof props.isPlaying === "boolean" ||
    Array.isArray(props.nodes) ||
    Array.isArray(props.edges);

  const nodes: InputNode[] =
    props.nodes ?? (store.nodes as unknown as InputNode[]) ?? [];
  const edges: InputEdge[] =
    props.edges ?? (store.edges as unknown as InputEdge[]) ?? [];
  const currentTime = props.currentTime ?? store.currentTime;
  const isPlaying = props.isPlaying ?? store.isPlaying;
  const storeStats = usingExternalData ? null : store.networkStats;

  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>("centrality");

  const [exportingAll, setExportingAll] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const datasetKey = `${store.fileId ?? ""}|${store.taskId ?? ""}`;
  const lastDatasetKeyRef = useRef<string | null>(null);

  const activeCacheKeyRef = useRef<string | null>(null);
  const lastSeenWindowKeyRef = useRef<number | null>(null);
  const lastAutoAttemptCacheKeyRef = useRef<string | null>(null);
  const lastAutoComputedAtRef = useRef<number>(0);
  const pendingAutoTimerRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const needsAutoRecomputeRef = useRef(false);
  const inFlightRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  const metricsCacheRef = useRef<Map<string, NetworkMetrics>>(new Map());

  const makeCacheKey = useCallback(() => {
    // Include dataset identity so time keys from different uploads don't collide.
    // currentTime is derived from the active window's start time in the store.
    const filePart = store.fileId ?? store.taskId ?? "unknown";
    return `${filePart}:${currentTime}:n=${nodes.length}:e=${edges.length}`;
  }, [store.fileId, store.taskId, currentTime, nodes.length, edges.length]);

  useEffect(() => {
    // If the user uploads/analyses a new file, drop cached metrics.
    if (lastDatasetKeyRef.current === null) {
      lastDatasetKeyRef.current = datasetKey;
      return;
    }
    if (lastDatasetKeyRef.current !== datasetKey) {
      lastDatasetKeyRef.current = datasetKey;
      metricsCacheRef.current.clear();
      lastAutoAttemptCacheKeyRef.current = null;
      lastSeenWindowKeyRef.current = null;
      activeCacheKeyRef.current = null;
      setMetrics(null);
      setMetricsError(null);
    }
  }, [datasetKey]);

  const createMetricsWorker = useCallback((): Worker | null => {
    if (typeof window === "undefined") return null;
    if (typeof Worker === "undefined") return null;

    try {
      return new Worker(
        new URL("../../lib/workers/network-metrics.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch (error) {
      console.warn("Failed to initialize metrics worker; falling back.", error);
      return null;
    }
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);

  const downloadWorkbook = useCallback(
    (workbook: XLSX.WorkBook, filename: string) => {
      const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      downloadBlob(
        new Blob([data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename,
      );
    },
    [downloadBlob],
  );

  const buildWindowWorkbook = useCallback(
    (payload: {
      generatedAt: string;
      window: { time: number; nodes: number; edges: number };
      metrics: NetworkMetrics;
    }) => {
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["generatedAt", payload.generatedAt],
          ["time", payload.window.time],
          ["nodes", payload.window.nodes],
          ["edges", payload.window.edges],
        ]),
        "Window",
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([
          {
            density: payload.metrics.structural.density,
            clustering: payload.metrics.structural.clustering,
            diameter: payload.metrics.structural.diameter,
            avgPathLength: payload.metrics.structural.avgPathLength,
          },
        ]),
        "Structural",
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([
          {
            modularity: payload.metrics.community.modularity,
            communities: payload.metrics.community.communities,
            sizes: payload.metrics.community.sizes.join(","),
          },
        ]),
        "Community",
      );

      const allCentralityNodeIds = Array.from(
        new Set([
          ...Object.keys(payload.metrics.centrality.degree ?? {}),
          ...Object.keys(payload.metrics.centrality.betweenness ?? {}),
          ...Object.keys(payload.metrics.centrality.closeness ?? {}),
          ...Object.keys(payload.metrics.centrality.eigenvector ?? {}),
        ]),
      );

      const centralityRows = allCentralityNodeIds.map((nodeId) => ({
        nodeId,
        degree: payload.metrics.centrality.degree?.[nodeId] ?? 0,
        betweenness: payload.metrics.centrality.betweenness?.[nodeId] ?? 0,
        closeness: payload.metrics.centrality.closeness?.[nodeId] ?? 0,
        eigenvector: payload.metrics.centrality.eigenvector?.[nodeId] ?? 0,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(centralityRows),
        "Centrality",
      );

      const allTemporalNodeIds = Array.from(
        new Set([
          ...Object.keys(payload.metrics.temporal.activity ?? {}),
          ...Object.keys(payload.metrics.temporal.stability ?? {}),
          ...Object.keys(payload.metrics.temporal.burstiness ?? {}),
        ]),
      );
      const temporalRows = allTemporalNodeIds.map((nodeId) => ({
        nodeId,
        activity: payload.metrics.temporal.activity?.[nodeId] ?? 0,
        stability: payload.metrics.temporal.stability?.[nodeId] ?? 0,
        burstiness: payload.metrics.temporal.burstiness?.[nodeId] ?? 0,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(temporalRows),
        "Temporal",
      );

      return wb;
    },
    [],
  );

  const appendLongRowsInChunks = useCallback(
    (
      wb: XLSX.WorkBook,
      baseName: string,
      rows: Array<Record<string, any>>,
      chunkSize = 900_000,
    ) => {
      if (!rows.length) return;
      const totalChunks = Math.ceil(rows.length / chunkSize);
      for (let i = 0; i < totalChunks; i += 1) {
        const start = i * chunkSize;
        const end = Math.min(rows.length, start + chunkSize);
        const name = totalChunks === 1 ? baseName : `${baseName}_${i + 1}`;
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows.slice(start, end)),
          name,
        );
      }
    },
    [],
  );

  const computeMetricsForGraph = useCallback(
    async (
      inputNodes: InputNode[],
      inputEdges: InputEdge[],
      atTime: number,
      worker: Worker | null,
    ): Promise<NetworkMetrics> => {
      if (inputNodes.length === 0 || inputEdges.length === 0) {
        throw new Error("No graph data available for metrics");
      }

      const MAX_EDGES_FOR_METRICS = 3000;
      const stride =
        inputEdges.length > MAX_EDGES_FOR_METRICS
          ? Math.ceil(inputEdges.length / MAX_EDGES_FOR_METRICS)
          : 1;
      const sampledEdges =
        stride === 1
          ? inputEdges
          : (() => {
              const picked: typeof inputEdges = [];
              for (let i = 0; i < inputEdges.length; i += stride) {
                picked.push(inputEdges[i]!);
                if (picked.length >= MAX_EDGES_FOR_METRICS) break;
              }
              return picked;
            })();

      const nodeIdSet = new Set<string>();
      for (const edge of sampledEdges) {
        nodeIdSet.add(edge.source);
        nodeIdSet.add(edge.target);
      }
      const nodesForMetrics = inputNodes.filter((n) => nodeIdSet.has(n.id));

      const normalizeNode = (
        node: { id: string; label?: string } & any,
      ): NetworkNode => ({
        id: node.id,
        label:
          typeof node.label === "string"
            ? node.label.length > 200
              ? node.label.slice(0, 200)
              : node.label
            : undefined,
      });

      const nodesForNetworkMetrics: NetworkNode[] = (
        nodesForMetrics.length ? nodesForMetrics : inputNodes
      ).map(normalizeNode);

      const edgesForMetrics: NetworkEdge[] = sampledEdges.map((edge, i) => ({
        id:
          typeof edge.id === "string" && edge.id.trim()
            ? edge.id
            : `${edge.source}->${edge.target}:${i}`,
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        timestamp: toTimestampNumber((edge as any).timestamp),
        startTime: (edge as any).startTime,
        endTime: (edge as any).endTime,
      }));

      if (!worker) {
        return calculateNetworkMetrics(
          nodesForNetworkMetrics,
          edgesForMetrics,
          atTime,
        );
      }

      const METRICS_TIMEOUT_MS = 30000;
      return await new Promise<NetworkMetrics>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          if (settled) return;
          settled = true;
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
          worker.removeEventListener("messageerror", handleMessageError);
          window.clearTimeout(timeoutHandle);
        };

        const handleMessage = (event: MessageEvent<any>) => {
          cleanup();
          if (event.data?.error) {
            reject(new Error(String(event.data.error)));
            return;
          }
          resolve(event.data?.metrics as NetworkMetrics);
        };
        const handleError = (event: ErrorEvent) => {
          cleanup();
          reject(event.error ?? new Error(event.message));
        };
        const handleMessageError = () => {
          cleanup();
          reject(
            new Error(
              "Failed to receive metrics from worker (message deserialization error)",
            ),
          );
        };

        const timeoutHandle = window.setTimeout(() => {
          cleanup();
          reject(
            new Error(
              `Metrics calculation timed out after ${Math.round(
                METRICS_TIMEOUT_MS / 1000,
              )}s while exporting`,
            ),
          );
        }, METRICS_TIMEOUT_MS);

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);
        worker.addEventListener("messageerror", handleMessageError);

        worker.postMessage({
          nodes: nodesForNetworkMetrics,
          edges: edgesForMetrics,
          currentTime: atTime,
        });
      });
    },
    [],
  );

  useEffect(() => {
    workerRef.current = createMetricsWorker();

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [createMetricsWorker]);

  const derivedNetworkStats = useMemo(() => {
    if (storeStats) return storeStats;
    if (nodes.length === 0 && edges.length === 0) return null;

    const timeRange = computeTimeRangeFromEdges(edges);

    let maxWeight = 0;
    for (const edge of edges) {
      const w = typeof edge.weight === "number" ? edge.weight : 0;
      if (w > maxWeight) maxWeight = w;
    }

    // maxDegree is only used for display; keep it cheap.
    const degree = new Map<string, number>();
    for (const edge of edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
    const maxDegree = degree.size
      ? Math.max(...Array.from(degree.values()))
      : 0;

    return {
      filteredNodes: nodes.length,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxDegree,
      maxWeight,
      timeRange,
      warnings: [],
    };
  }, [storeStats, nodes.length, edges]);

  const calculateMetrics = useCallback(
    async (reason: "auto" | "manual" = "manual") => {
      const cacheKey = makeCacheKey();
      activeCacheKeyRef.current = cacheKey;

      const cached = metricsCacheRef.current.get(cacheKey);
      if (cached) {
        setMetrics(cached);
        setMetricsError(null);
        setLoading(false);
        inFlightRef.current = false;
        return;
      }

      if (inFlightRef.current) {
        if (reason === "auto") needsAutoRecomputeRef.current = true;
        return;
      }
      inFlightRef.current = true;
      setLoading(true);

      let debugSummary: string | null = null;
      let nodesForFallback: NetworkNode[] | null = null;
      let edgesForFallback: NetworkEdge[] | null = null;
      try {
        setMetricsError(null);

        if (nodes.length === 0 || edges.length === 0) {
          throw new Error("No graph data available for metrics");
        }

        // Let React paint the loading state before doing heavy work.
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() => resolve()),
        );
        await new Promise<void>((resolve) => {
          const ric = (window as any).requestIdleCallback as
            | ((cb: () => void, opts?: { timeout: number }) => number)
            | undefined;
          if (ric) {
            ric(() => resolve(), { timeout: 250 });
            return;
          }
          window.setTimeout(() => resolve(), 0);
        });

        // Defensive cap: mapping/copying very large edge arrays can also stall.
        const MAX_EDGES_FOR_METRICS = 3000;
        const stride =
          edges.length > MAX_EDGES_FOR_METRICS
            ? Math.ceil(edges.length / MAX_EDGES_FOR_METRICS)
            : 1;
        const sampledEdges =
          stride === 1
            ? edges
            : (() => {
                const picked: typeof edges = [];
                for (let i = 0; i < edges.length; i += stride) {
                  picked.push(edges[i]!);
                  if (picked.length >= MAX_EDGES_FOR_METRICS) break;
                }
                return picked;
              })();

        // Build a compact node set from the sampled edges. This avoids doing
        // expensive matrix allocations on huge node lists.
        const nodeIdSet = new Set<string>();
        for (const edge of sampledEdges) {
          nodeIdSet.add(edge.source);
          nodeIdSet.add(edge.target);
        }
        const nodesForMetrics = nodes.filter((n) => nodeIdSet.has(n.id));

        const originalNodesHadProperties = nodes.some(
          (n) => (n as any)?.properties != null,
        );

        debugSummary = `nodes=${nodes.length}, edges=${edges.length}, sampledEdges=${sampledEdges.length}, nodesForMetrics=${
          nodesForMetrics.length ? nodesForMetrics.length : nodes.length
        }, stride=${stride}, worker=${Boolean(workerRef.current)}, hadProperties=${originalNodesHadProperties}`;

        const normalizeNode = (
          node: { id: string; label?: string } & any,
        ): NetworkNode => ({
          id: node.id,
          // Metrics computation only needs stable IDs.
          // Avoid sending large/complex payloads (e.g., node.properties) to the worker.
          label:
            typeof node.label === "string"
              ? node.label.length > 200
                ? node.label.slice(0, 200)
                : node.label
              : undefined,
        });

        const nodesForNetworkMetrics: NetworkNode[] = (
          nodesForMetrics.length ? nodesForMetrics : nodes
        ).map(normalizeNode);

        nodesForFallback = nodesForNetworkMetrics;

        // IMPORTANT: map *sampledEdges*; mapping the full list defeats the cap.
        const edgesForMetrics: NetworkEdge[] = sampledEdges.map((edge, i) => ({
          id:
            typeof edge.id === "string" && edge.id.trim()
              ? edge.id
              : `${edge.source}->${edge.target}:${i}`,
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
          timestamp: toTimestampNumber((edge as any).timestamp),
          startTime: (edge as any).startTime,
          endTime: (edge as any).endTime,
        }));

        edgesForFallback = edgesForMetrics;

        const worker = workerRef.current;
        if (worker) {
          const METRICS_TIMEOUT_MS = 20000;

          const calculatedMetrics = await new Promise<any>(
            (resolve, reject) => {
              let settled = false;
              const cleanup = () => {
                if (settled) return;
                settled = true;
                worker.removeEventListener("message", handleMessage);
                worker.removeEventListener("error", handleError);
                worker.removeEventListener("messageerror", handleMessageError);
                window.clearTimeout(timeoutHandle);
              };

              const handleMessage = (event: MessageEvent<any>) => {
                cleanup();
                if (event.data?.error) {
                  reject(new Error(String(event.data.error)));
                  return;
                }
                resolve(event.data?.metrics);
              };
              const handleError = (event: ErrorEvent) => {
                cleanup();
                reject(event.error ?? new Error(event.message));
              };
              const handleMessageError = () => {
                cleanup();
                reject(
                  new Error(
                    "Failed to receive metrics from worker (message deserialization error)",
                  ),
                );
              };

              const timeoutHandle = window.setTimeout(() => {
                cleanup();
                try {
                  worker.terminate();
                } catch {
                  // ignore
                }
                workerRef.current = createMetricsWorker();

                const suffix = debugSummary ? ` (${debugSummary})` : "";
                reject(
                  new Error(
                    `Metrics calculation timed out after ${Math.round(
                      METRICS_TIMEOUT_MS / 1000,
                    )}s. This dataset may be too complex or malformed for the current metric algorithms.${suffix}`,
                  ),
                );
              }, METRICS_TIMEOUT_MS);

              worker.addEventListener("message", handleMessage);
              worker.addEventListener("error", handleError);
              worker.addEventListener("messageerror", handleMessageError);

              const t0 =
                typeof performance !== "undefined" && performance.now
                  ? performance.now()
                  : Date.now();
              worker.postMessage({
                nodes: nodesForNetworkMetrics,
                edges: edgesForMetrics,
                currentTime,
              });
              const t1 =
                typeof performance !== "undefined" && performance.now
                  ? performance.now()
                  : Date.now();
              const postMs = t1 - t0;
              if (postMs > 100) {
                console.debug(
                  `metrics worker postMessage took ~${Math.round(postMs)}ms`,
                  { debugSummary },
                );
              }
            },
          );

          // Cache and apply only if still on the same active window.
          if (calculatedMetrics) {
            metricsCacheRef.current.set(cacheKey, calculatedMetrics);
            // Cap cache size to avoid unbounded growth on very long timelines.
            while (metricsCacheRef.current.size > 300) {
              const firstKey = metricsCacheRef.current.keys().next().value;
              if (typeof firstKey !== "string") break;
              metricsCacheRef.current.delete(firstKey);
            }
          }

          if (activeCacheKeyRef.current === cacheKey) {
            setMetrics(calculatedMetrics);
          }
        } else {
          const calculatedMetrics = calculateNetworkMetrics(
            nodesForNetworkMetrics,
            edgesForMetrics,
            currentTime,
          );

          if (calculatedMetrics) {
            metricsCacheRef.current.set(cacheKey, calculatedMetrics);
            while (metricsCacheRef.current.size > 300) {
              const firstKey = metricsCacheRef.current.keys().next().value;
              if (typeof firstKey !== "string") break;
              metricsCacheRef.current.delete(firstKey);
            }
          }

          if (activeCacheKeyRef.current === cacheKey) {
            setMetrics(calculatedMetrics);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to calculate metrics";

        // If the worker path/runtime is broken, a tiny graph should still be
        // computable on the main thread. This gives the user results instead
        // of repeated timeouts.
        const shouldAttemptFallback =
          Boolean(nodesForFallback?.length) &&
          Boolean(edgesForFallback?.length) &&
          (edgesForFallback?.length ?? 0) <= 5000 &&
          (nodesForFallback?.length ?? 0) <= 500 &&
          /timed out|deserialization|worker/i.test(message);

        if (shouldAttemptFallback) {
          try {
            console.warn("Metrics worker failed; retrying on main thread.", {
              debugSummary,
              message,
            });
            const calculatedMetrics = calculateNetworkMetrics(
              nodesForFallback!,
              edgesForFallback!,
              currentTime,
            );

            // Disable the worker for this session to avoid repeated timeouts.
            try {
              workerRef.current?.terminate();
            } catch {
              // ignore
            }
            workerRef.current = null;

            if (calculatedMetrics) {
              metricsCacheRef.current.set(cacheKey, calculatedMetrics);
            }

            if (activeCacheKeyRef.current === cacheKey) {
              setMetrics(calculatedMetrics);
              setMetricsError(null);
            }
            return;
          } catch (fallbackError) {
            console.error(
              "Main-thread fallback metrics failed:",
              fallbackError,
            );
          }
        }

        console.error(`Failed to calculate metrics (${reason}):`, error);
        try {
          console.error("Metrics debug context:", {
            nodes: nodes.length,
            edges: edges.length,
            currentTime,
            usingWorker: Boolean(workerRef.current),
            debugSummary,
          });
        } catch {
          // ignore
        }

        // Surface a compact context string in the UI to make bug reports actionable.
        const contextSuffix =
          debugSummary && !message.includes(debugSummary)
            ? ` (${debugSummary})`
            : "";
        if (activeCacheKeyRef.current === cacheKey) {
          setMetricsError(`${message}${contextSuffix}`);
        }
      } finally {
        if (activeCacheKeyRef.current === cacheKey) {
          setLoading(false);
        }
        inFlightRef.current = false;

        if (needsAutoRecomputeRef.current && !isPlayingRef.current) {
          needsAutoRecomputeRef.current = false;
          window.setTimeout(() => {
            void calculateMetrics("auto");
          }, 0);
        }
      }
    },
    [currentTime, edges, nodes, createMetricsWorker, makeCacheKey],
  );

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Auto-compute metrics whenever the active window changes (driven by the time
  // slider or playback). During playback we still compute, but we throttle and
  // drop stale results to keep things responsive.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (nodes.length === 0 || edges.length === 0) return;

    const windowKey = currentTime;
    const previousKey = lastSeenWindowKeyRef.current;
    const windowChanged =
      typeof previousKey === "number" && previousKey !== windowKey;
    lastSeenWindowKeyRef.current = windowKey;

    const cacheKey = makeCacheKey();
    activeCacheKeyRef.current = cacheKey;

    const cached = metricsCacheRef.current.get(cacheKey);
    if (cached) {
      setMetrics(cached);
      setMetricsError(null);
      setLoading(false);
      return;
    }

    if (windowChanged && !isPlaying) {
      setMetricsError(null);
    }

    // Throttle auto compute so rapid playback/scrubbing doesn't enqueue work.
    const now = Date.now();
    const MIN_INTERVAL_MS = 250;
    if (now - lastAutoComputedAtRef.current < MIN_INTERVAL_MS) {
      return;
    }

    if (pendingAutoTimerRef.current !== null) {
      window.clearTimeout(pendingAutoTimerRef.current);
      pendingAutoTimerRef.current = null;
    }

    if (lastAutoAttemptCacheKeyRef.current === cacheKey) return;
    lastAutoAttemptCacheKeyRef.current = cacheKey;

    pendingAutoTimerRef.current = window.setTimeout(() => {
      pendingAutoTimerRef.current = null;
      lastAutoComputedAtRef.current = Date.now();
      void calculateMetrics("auto");
    }, 150);

    return () => {
      if (pendingAutoTimerRef.current !== null) {
        window.clearTimeout(pendingAutoTimerRef.current);
        pendingAutoTimerRef.current = null;
      }
    };
  }, [
    currentTime,
    nodes.length,
    edges.length,
    isPlaying,
    calculateMetrics,
    makeCacheKey,
  ]);

  const handleExportCurrentMetrics = useCallback(async () => {
    try {
      const exportMetrics = metrics;
      if (!exportMetrics) {
        // Compute on-demand if not already present.
        const worker = createMetricsWorker();
        const computed = await computeMetricsForGraph(
          nodes,
          edges,
          currentTime,
          worker,
        );
        try {
          worker?.terminate();
        } catch {
          // ignore
        }
        const payload = {
          generatedAt: new Date().toISOString(),
          window: {
            time: currentTime,
            nodes: nodes.length,
            edges: edges.length,
          },
          metrics: computed,
        };
        const wb = buildWindowWorkbook(payload);
        downloadWorkbook(wb, `network-metrics-window-${currentTime}.xlsx`);
        return;
      }

      const payload = {
        generatedAt: new Date().toISOString(),
        window: { time: currentTime, nodes: nodes.length, edges: edges.length },
        metrics: exportMetrics,
      };

      const wb = buildWindowWorkbook(payload);
      downloadWorkbook(wb, `network-metrics-window-${currentTime}.xlsx`);
    } catch (error) {
      console.error("Export current metrics failed:", error);
      setMetricsError(
        error instanceof Error
          ? error.message
          : "Failed to export current metrics",
      );
    }
  }, [
    metrics,
    createMetricsWorker,
    computeMetricsForGraph,
    nodes,
    edges,
    currentTime,
    buildWindowWorkbook,
    downloadWorkbook,
  ]);

  const handleExportAllTimeMetrics = useCallback(async () => {
    if (exportingAll) return;

    const windows = store.timeWindows ?? [];
    if (!windows.length) return;

    setExportingAll(true);
    setExportProgress({ done: 0, total: windows.length });
    setMetricsError(null);

    const exportWorker = createMetricsWorker();

    try {
      const results: Array<{
        index: number;
        start: any;
        end: any;
        time: number;
        nodes: number;
        edges: number;
        metrics?: NetworkMetrics;
        error?: string;
      }> = [];

      for (let index = 0; index < windows.length; index += 1) {
        const w: any = windows[index];
        const startTime =
          typeof w?.start === "string" ? Date.parse(w.start) : undefined;
        const endTime =
          typeof w?.end === "string" ? Date.parse(w.end) : undefined;
        const time =
          typeof startTime === "number" && Number.isFinite(startTime)
            ? startTime
            : typeof endTime === "number" && Number.isFinite(endTime)
              ? endTime
              : 0;

        const wn = (w?.nodes ?? []) as InputNode[];
        const we = (w?.edges ?? []) as InputEdge[];

        try {
          const computed = await computeMetricsForGraph(
            wn,
            we,
            time,
            exportWorker,
          );
          results.push({
            index,
            start: w?.start,
            end: w?.end,
            time,
            nodes: wn.length,
            edges: we.length,
            metrics: computed,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          results.push({
            index,
            start: w?.start,
            end: w?.end,
            time,
            nodes: wn.length,
            edges: we.length,
            error: message,
          });
        }

        if (index % 3 === 0) {
          // Yield to the browser so the UI stays responsive.
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        }

        setExportProgress({ done: index + 1, total: windows.length });
      }

      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["generatedAt", new Date().toISOString()],
          ["fileId", store.fileId ?? ""],
          ["taskId", store.taskId ?? ""],
          ["windows", results.length],
        ]),
        "Info",
      );

      const summaryRows = results.map((r) => ({
        index: r.index,
        start: r.start,
        end: r.end,
        time: r.time,
        nodes: r.nodes,
        edges: r.edges,
        density: r.metrics?.structural?.density,
        clustering: r.metrics?.structural?.clustering,
        diameter: r.metrics?.structural?.diameter,
        avgPathLength: r.metrics?.structural?.avgPathLength,
        modularity: r.metrics?.community?.modularity,
        communities: r.metrics?.community?.communities,
        error: r.error,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(summaryRows),
        "Windows",
      );

      const centralityLongRows: Array<Record<string, any>> = [];
      const temporalLongRows: Array<Record<string, any>> = [];

      for (const r of results) {
        if (!r.metrics) continue;

        const nodeIds = Array.from(
          new Set([
            ...Object.keys(r.metrics.centrality.degree ?? {}),
            ...Object.keys(r.metrics.centrality.betweenness ?? {}),
            ...Object.keys(r.metrics.centrality.closeness ?? {}),
            ...Object.keys(r.metrics.centrality.eigenvector ?? {}),
          ]),
        );
        for (const nodeId of nodeIds) {
          centralityLongRows.push({
            index: r.index,
            time: r.time,
            nodeId,
            degree: r.metrics.centrality.degree?.[nodeId] ?? 0,
            betweenness: r.metrics.centrality.betweenness?.[nodeId] ?? 0,
            closeness: r.metrics.centrality.closeness?.[nodeId] ?? 0,
            eigenvector: r.metrics.centrality.eigenvector?.[nodeId] ?? 0,
          });
        }

        const temporalIds = Array.from(
          new Set([
            ...Object.keys(r.metrics.temporal.activity ?? {}),
            ...Object.keys(r.metrics.temporal.stability ?? {}),
            ...Object.keys(r.metrics.temporal.burstiness ?? {}),
          ]),
        );
        for (const nodeId of temporalIds) {
          temporalLongRows.push({
            index: r.index,
            time: r.time,
            nodeId,
            activity: r.metrics.temporal.activity?.[nodeId] ?? 0,
            stability: r.metrics.temporal.stability?.[nodeId] ?? 0,
            burstiness: r.metrics.temporal.burstiness?.[nodeId] ?? 0,
          });
        }
      }

      appendLongRowsInChunks(wb, "Centrality", centralityLongRows);
      appendLongRowsInChunks(wb, "Temporal", temporalLongRows);

      downloadWorkbook(wb, `network-metrics-all-time-${Date.now()}.xlsx`);
    } finally {
      try {
        exportWorker?.terminate();
      } catch {
        // ignore
      }
      setExportingAll(false);
      setExportProgress(null);
    }
  }, [
    exportingAll,
    store.timeWindows,
    store.fileId,
    store.taskId,
    createMetricsWorker,
    computeMetricsForGraph,
    appendLongRowsInChunks,
    downloadWorkbook,
  ]);

  if (!derivedNetworkStats || nodes.length === 0 || edges.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Load network data to view metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6" />
              <span>Network Metrics</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void calculateMetrics("manual")}
                disabled={loading || isPlaying}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <p>
            Metrics are computed on demand to keep the dashboard responsive.
          </p>
          <p className="mt-2">
            Click refresh to calculate metrics for the current window.
          </p>

          {metricsError && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{metricsError}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const topNodes = Object.entries(metrics.centrality.degree)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <span>Network Metrics</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void calculateMetrics("manual")}
              disabled={loading || exportingAll}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportingAll}
                  aria-label="Download metrics"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleExportCurrentMetrics();
                  }}
                >
                  Download current window (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleExportAllTimeMetrics();
                  }}
                >
                  Download all time windows (Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {exportProgress && (
          <div className="mt-2 text-xs text-gray-600">
            Exporting metrics… {exportProgress.done}/{exportProgress.total}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs
          value={selectedMetric}
          onValueChange={setSelectedMetric}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger
              value="centrality"
              className="flex items-center space-x-2"
            >
              <Target className="h-4 w-4" />
              <span>Centrality</span>
            </TabsTrigger>
            <TabsTrigger
              value="temporal"
              className="flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>Temporal</span>
            </TabsTrigger>
            <TabsTrigger
              value="structural"
              className="flex items-center space-x-2"
            >
              <LinkIcon className="h-4 w-4" />
              <span>Structural</span>
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
          </TabsList>

          {/* Centrality Metrics */}
          <TabsContent value="centrality" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        Top Influential Nodes
                      </div>
                      <Badge variant="outline">Degree</Badge>
                    </div>
                    <div className="space-y-2">
                      {topNodes.map(([nodeId, value], index) => (
                        <div
                          key={nodeId}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">{index + 1}</Badge>
                            <span className="text-sm font-mono">{nodeId}</span>
                          </div>
                          <div className="text-sm font-semibold">
                            {value.toFixed(3)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        Centrality Distribution
                      </div>
                      <Badge variant="outline">Stats</Badge>
                    </div>
                    <div className="space-y-3">
                      {Object.entries({
                        "Max Degree": Math.max(
                          ...Object.values(metrics.centrality.degree),
                        ),
                        "Avg Degree":
                          Object.values(metrics.centrality.degree).reduce(
                            (a, b) => a + b,
                            0,
                          ) / Object.values(metrics.centrality.degree).length,
                        "Betweenness Range": `${Math.min(...Object.values(metrics.centrality.betweenness)).toFixed(3)} - ${Math.max(...Object.values(metrics.centrality.betweenness)).toFixed(3)}`,
                        "Closeness Avg": (
                          Object.values(metrics.centrality.closeness).reduce(
                            (a, b) => a + b,
                            0,
                          ) / Object.values(metrics.centrality.closeness).length
                        ).toFixed(3),
                      }).map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-gray-600">{label}</span>
                          <span className="text-sm font-semibold">
                            {typeof value === "number"
                              ? formatNumber(value)
                              : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Temporal Metrics */}
          <TabsContent value="temporal" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <div className="text-sm font-medium">Activity</div>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(
                        Object.values(metrics.temporal.activity).reduce(
                          (a, b) => a + b,
                          0,
                        ),
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      Total node activities
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <div className="text-sm font-medium">Stability</div>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(
                        Object.values(metrics.temporal.stability).reduce(
                          (a, b) => a + b,
                          0,
                        ) / Object.values(metrics.temporal.stability).length,
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      Avg connection stability
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <div className="text-sm font-medium">Burstiness</div>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(
                        Object.values(metrics.temporal.burstiness).reduce(
                          (a, b) => a + b,
                          0,
                        ) / Object.values(metrics.temporal.burstiness).length,
                      )}
                    </div>
                    <div className="text-xs text-gray-600">Avg burst score</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Structural Metrics */}
          <TabsContent value="structural" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4" />
                      <div className="text-sm font-medium">Connectivity</div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries({
                        Density: metrics.structural.density.toFixed(4),
                        Clustering: metrics.structural.clustering.toFixed(4),
                        Diameter: metrics.structural.diameter,
                        "Avg Path Length":
                          metrics.structural.avgPathLength.toFixed(2),
                      }).map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-gray-600">{label}</span>
                          <span className="text-sm font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <div className="text-sm font-medium">
                        Community Structure
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries({
                        Modularity: metrics.community.modularity.toFixed(4),
                        Communities: metrics.community.communities,
                        "Largest Community": Math.max(
                          ...metrics.community.sizes,
                        ),
                        "Avg Community Size": (
                          metrics.community.sizes.reduce((a, b) => a + b, 0) /
                          metrics.community.sizes.length
                        ).toFixed(1),
                      }).map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-gray-600">{label}</span>
                          <span className="text-sm font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Summary */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-center">
                    <Users className="h-8 w-8 mx-auto text-blue-500" />
                    <div className="text-2xl font-bold">
                      {formatNumber(derivedNetworkStats.totalNodes)}
                    </div>
                    <div className="text-sm text-gray-600">Total Nodes</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-center">
                    <LinkIcon className="h-8 w-8 mx-auto text-green-500" />
                    <div className="text-2xl font-bold">
                      {formatNumber(derivedNetworkStats.totalEdges)}
                    </div>
                    <div className="text-sm text-gray-600">Total Edges</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-center">
                    <Clock className="h-8 w-8 mx-auto text-purple-500" />
                    <div className="text-2xl font-bold">
                      {derivedNetworkStats.timeRange
                        ? Math.round(
                            (derivedNetworkStats.timeRange.end -
                              derivedNetworkStats.timeRange.start) /
                              (1000 * 60 * 60 * 24),
                          )
                        : "-"}
                    </div>
                    <div className="text-sm text-gray-600">Days</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto text-orange-500" />
                    <div className="text-2xl font-bold">
                      {formatNumber(
                        derivedNetworkStats.totalNodes > 0
                          ? (2 * derivedNetworkStats.totalEdges) /
                              derivedNetworkStats.totalNodes
                          : 0,
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Avg Degree</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {derivedNetworkStats.warnings &&
              derivedNetworkStats.warnings.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-medium text-yellow-800">
                          Data Quality Warnings
                        </div>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {derivedNetworkStats.warnings.map(
                            (warning, index) => (
                              <li key={index}>• {warning}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
