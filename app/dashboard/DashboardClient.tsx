// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useSearchParams } from "next/navigation";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Progress } from "@/components/ui/progress";
// import { Badge } from "@/components/ui/badge";
// import { Root as Separator } from "@radix-ui/react-separator";
// import {
//   ArrowLeft,
//   BarChart3,
//   CheckCircle,
//   Clock,
//   Loader2,
//   AlertCircle,
//   Network,
//   Activity,
//   Layers,
//   PieChart,
//   TrendingUp,
// } from "lucide-react";
// import Link from "next/link";

// // Components
// import TemporalNetworkGraph from "@/components/visualization/TemporalNetworkGraph";
// import TimeSeriesChart from "@/components/visualization/TimeSeriesChart";
// import { MetricsDashboard } from "@/components/metrics/MetricsDashboard";
// import FileUpload from "@/components/controls/FileUpload";

// // Store and API
// import { useNetworkStore } from "@/lib/stores/network-store";
// import { api } from "@/lib/api/client";
// import type { TimeWindow } from "@/lib/types";
// import { TimeControls } from "@/components/controls/TimeControls";

// export default function DashboardClient() {
//   const searchParams = useSearchParams();
//   const fileId = searchParams.get("file_id");

//   const analysisStartedForFileIdRef = useRef<string | null>(null);
//   const analysisAbortRef = useRef<AbortController | null>(null);
//   const analysisRunIdRef = useRef(0);

//   const {
//     status,
//     fileId: storeFileId,
//     currentFile,
//     timeWindows,
//     currentTimeIndex,
//     isPlaying,
//     playbackSpeed,
//     playbackDirection,
//     reset,
//     setFileId,
//     setStatus,
//     setTaskId,
//     setTimeWindows,
//     setCurrentTimeIndex,
//   } = useNetworkStore();

//   const [analysisError, setAnalysisError] = useState<string | null>(null);
//   const [analysisResult, setAnalysisResult] = useState<any>(null);
//   const [processingProgress, setProcessingProgress] = useState(0);

//   const yieldToBrowser = () =>
//     new Promise<void>((resolve) => setTimeout(resolve, 0));

//   const buildTimeWindowsChunked = async (result: any, signal?: AbortSignal) => {
//     const windows = result?.data?.time_windows ?? [];
//     const metricsTimeline = result?.data?.metrics_timeline ?? [];

//     const built: TimeWindow[] = [];

//     for (let index = 0; index < windows.length; index += 1) {
//       if (signal?.aborted) {
//         throw new Error("Analysis cancelled");
//       }

//       const window: any = windows[index];
//       const timeline = metricsTimeline[index];
//       const nodeCount = window.nodes?.length ?? 0;
//       const edgeCount = window.edges?.length ?? 0;
//       const averageDegree = nodeCount ? (edgeCount * 2) / nodeCount : 0;

//       built.push({
//         start: window.start,
//         end: window.end,
//         nodes: (window.nodes ?? []).map((node: any) => ({
//           id: node.id,
//           label: node.label,
//           group: node.group,
//           size: node.degree ?? 1,
//           degree: node.degree ?? 0,
//           centrality: node.centrality ?? 0,
//           betweenness: node.betweenness ?? 0,
//           closeness: node.closeness ?? 0,
//           pagerank: node.pagerank ?? 0,
//           activeStart: window.start,
//           activeEnd: window.end,
//           color: node.color,
//           x: node.x,
//           y: node.y,
//         })),
//         edges: (window.edges ?? []).map((edge: any, edgeIndex: number) => ({
//           id: edge.id ?? `${edge.source}-${edge.target}-${edgeIndex}`,
//           source: edge.source,
//           target: edge.target,
//           weight: edge.weight ?? 1,
//           timestamp: window.start,
//           type: edge.type,
//           active: true,
//         })),
//         metrics: {
//           density: timeline?.density ?? 0,
//           averageDegree,
//           diameter: timeline?.diameter,
//           clusteringCoefficient: timeline?.clustering ?? 0,
//           connectedComponents: timeline?.components ?? 0,
//           degreeCentrality: {},
//           betweennessCentrality: {},
//           closenessCentrality: {},
//           pagerank: {},
//         },
//       });

//       if (index % 5 === 0 && windows.length > 0) {
//         const pct = 90 + Math.min(9, Math.floor((index / windows.length) * 10));
//         setProcessingProgress(pct);
//         await yieldToBrowser();
//       }
//     }

//     return built;
//   };

//   const startAnalysis = async (id: string) => {
//     analysisAbortRef.current?.abort();
//     const controller = new AbortController();
//     analysisAbortRef.current = controller;
//     const { signal } = controller;
//     analysisRunIdRef.current += 1;
//     const runId = analysisRunIdRef.current;

//     reset();
//     setFileId(id);
//     setStatus("processing");
//     setAnalysisError(null);
//     setAnalysisResult(null);
//     setProcessingProgress(10);

//     try {
//       const fileSize = currentFile?.size ?? 0;
//       const sampling_rate =
//         fileSize > 200 * 1024 * 1024
//           ? 200
//           : fileSize > 50 * 1024 * 1024
//             ? 50
//             : fileSize > 10 * 1024 * 1024
//               ? 10
//               : undefined;

//       const request = {
//         file_id: id,
//         time_resolution: "hour" as const,
//         sampling_rate,
//         metrics_to_compute: ["degree", "betweenness", "closeness", "pagerank"],
//       };

//       const response = await api.analyzeNetwork(request, { signal });
//       setTaskId(response.task_id ?? "");

//       // Validate task_id before polling
//       if (typeof response.task_id !== "string" || !response.task_id) {
//         setAnalysisError(
//           "Analysis failed: missing or invalid task ID returned from backend.",
//         );
//         setStatus("failed");
//         setProcessingProgress(0);
//         return;
//       }

//       const result = await api.pollAnalysis(response.task_id, { signal });

//       if (signal.aborted || runId !== analysisRunIdRef.current) return;

//       if (result.status === "failed") {
//         throw new Error(
//           result.error || result.message || "Analysis failed (backend)",
//         );
//       }

//       if (!result.data) {
//         throw new Error("Analysis completed but returned no data");
//       }

//       setAnalysisResult({
//         status: result.status,
//         task_id: result.task_id,
//         data: {
//           metrics_timeline: result.data.metrics_timeline,
//           summary: result.data.summary,
//         },
//       });

//       setProcessingProgress(90);
//       const windows = await buildTimeWindowsChunked(result, signal);

//       if (signal.aborted || runId !== analysisRunIdRef.current) return;

//       setTimeWindows(windows);
//       setCurrentTimeIndex(0);
//       setStatus("completed");
//       setProcessingProgress(100);
//     } catch (error: any) {
//       if (controller.signal.aborted) {
//         return;
//       }
//       console.error("Analysis failed:", error);
//       setAnalysisError(error.message);
//       setStatus("failed");
//       setProcessingProgress(0);
//     }
//   };

//   useEffect(() => {
//     return () => {
//       analysisAbortRef.current?.abort();
//     };
//   }, []);

//   useEffect(() => {
//     if (status !== "processing") {
//       if (status === "idle") setProcessingProgress(0);
//       return;
//     }

//     const interval = setInterval(() => {
//       setProcessingProgress((prev) => {
//         if (prev >= 90) return 90;
//         const next = prev + Math.max(1, Math.round((90 - prev) * 0.07));
//         return Math.min(90, next);
//       });
//     }, 400);

//     return () => clearInterval(interval);
//   }, [status]);

//   useEffect(() => {
//     if (!fileId) {
//       analysisStartedForFileIdRef.current = null;
//       return;
//     }

//     if (analysisStartedForFileIdRef.current === fileId) return;

//     const shouldStart =
//       status === "idle" ||
//       status === "uploading" ||
//       status === "failed" ||
//       storeFileId !== fileId;

//     if (shouldStart) {
//       analysisStartedForFileIdRef.current = fileId;
//       setTimeout(() => {
//         void startAnalysis(fileId);
//       }, 0);
//     }
//   }, [fileId, storeFileId, status]);

//   useEffect(() => {
//     let interval: NodeJS.Timeout | null = null;

//     if (isPlaying && timeWindows.length > 0) {
//       const speed = Number.isFinite(playbackSpeed) ? playbackSpeed : 1;
//       const safeSpeed = Math.max(0.1, speed);
//       const tickMs = Math.max(50, Math.round(1000 / safeSpeed));
//       const step = playbackDirection === "backward" ? -1 : 1;

//       interval = setInterval(() => {
//         setCurrentTimeIndex((prev) => {
//           const next = prev + step;
//           if (next >= timeWindows.length) return 0;
//           if (next < 0) return timeWindows.length - 1;
//           return next;
//         });
//       }, tickMs);
//     }

//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [
//     isPlaying,
//     timeWindows.length,
//     playbackSpeed,
//     playbackDirection,
//     setCurrentTimeIndex,
//   ]);

//   const currentWindow = timeWindows[currentTimeIndex];
//   const currentWindowTime =
//     currentWindow && typeof currentWindow.start === "string"
//       ? (() => {
//           const start = Date.parse(currentWindow.start);
//           if (Number.isFinite(start)) return start;
//           const end = Date.parse(currentWindow.end);
//           return Number.isFinite(end) ? end : 0;
//         })()
//       : 0;

//   return (
//     <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900 p-3 md:p-4">
//       <div className="max-w-7xl mx-auto">
//         {/* Header - Compact */}
//         <div className="mb-4">
//           <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
//             <div className="flex items-center space-x-3">
//               <Link href="/">
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   className="h-8 px-2 -ml-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
//                 >
//                   <ArrowLeft className="h-4 w-4 mr-1" />
//                   Back
//                 </Button>
//               </Link>
//               <Separator orientation="vertical" className="h-6" />

//               <div>
//                 <h1 className="text-xl md:text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
//                   Temporal Network Dashboard
//                 </h1>
//                 <p className="text-xs text-gray-500 dark:text-gray-400">
//                   Interactive visualization and analysis
//                 </p>
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               {/* Status Badge */}
//               {status === "processing" && (
//                 <Badge
//                   variant="outline"
//                   className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
//                 >
//                   <Loader2 className="h-3 w-3 mr-1 animate-spin" />
//                   Analyzing
//                 </Badge>
//               )}
//               {status === "completed" && (
//                 <Badge
//                   variant="outline"
//                   className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
//                 >
//                   <CheckCircle className="h-3 w-3 mr-1" />
//                   Complete
//                 </Badge>
//               )}
//               {status === "failed" && (
//                 <Badge
//                   variant="outline"
//                   className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
//                 >
//                   <AlertCircle className="h-3 w-3 mr-1" />
//                   Failed
//                 </Badge>
//               )}

//               <Link href="/upload">
//                 <Button variant="outline" size="sm" className="h-8 text-xs">
//                   <Activity className="h-3.5 w-3.5 mr-1.5" />
//                   New Analysis
//                 </Button>
//               </Link>
//             </div>
//           </div>
//         </div>

//         {/* KPI Cards - Compact Grid */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
//           <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
//             <CardContent className="p-3">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs text-gray-500 dark:text-gray-400">
//                     Time Windows
//                   </p>
//                   <div className="flex items-baseline space-x-1">
//                     <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
//                       {timeWindows.length}
//                     </p>
//                     <span className="text-[10px] text-gray-500">total</span>
//                   </div>
//                 </div>
//                 <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
//                   <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
//             <CardContent className="p-3">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs text-gray-500 dark:text-gray-400">
//                     Current Window
//                   </p>
//                   <div className="flex items-baseline space-x-1">
//                     <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
//                       {currentTimeIndex + 1}
//                     </p>
//                     <span className="text-[10px] text-gray-500">
//                       of {timeWindows.length}
//                     </span>
//                   </div>
//                 </div>
//                 <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
//                   <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
//             <CardContent className="p-3">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs text-gray-500 dark:text-gray-400">
//                     Active Nodes
//                   </p>
//                   <div className="flex items-baseline space-x-1">
//                     <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
//                       {currentWindow?.nodes?.length || 0}
//                     </p>
//                     <span className="text-[10px] text-gray-500">entities</span>
//                   </div>
//                 </div>
//                 <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
//                   <Network className="h-5 w-5 text-purple-600 dark:text-purple-400" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
//             <CardContent className="p-3">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs text-gray-500 dark:text-gray-400">
//                     Active Edges
//                   </p>
//                   <div className="flex items-baseline space-x-1">
//                     <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
//                       {currentWindow?.edges?.length || 0}
//                     </p>
//                     <span className="text-[10px] text-gray-500">
//                       connections
//                     </span>
//                   </div>
//                 </div>
//                 <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
//                   <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Main Content Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
//           {/* Left Sidebar */}
//           <div className="lg:col-span-1 space-y-4">
//             <TimeControls />

//             {status === "idle" && (
//               <Card className="border-none shadow-sm">
//                 <CardHeader className="pb-2 pt-3 px-3">
//                   <CardTitle className="text-sm font-medium flex items-center">
//                     <Activity className="h-4 w-4 mr-2 text-blue-600" />
//                     Start Analysis
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="p-3">
//                   <FileUpload
//                     onUploadComplete={(result) => {
//                       if (result?.backend?.attempted && !result?.backend?.ok) {
//                         setAnalysisError(
//                           `Backend upload failed (${result.backend.status ?? "unknown"}). ` +
//                             (result.backend.error ?? ""),
//                         );
//                         setStatus("failed");
//                         return;
//                       }

//                       if (result.file_id) startAnalysis(result.file_id);
//                     }}
//                   />
//                 </CardContent>
//               </Card>
//             )}

//             {status === "processing" && (
//               <Card className="border-none shadow-sm">
//                 <CardHeader className="pb-2 pt-3 px-3">
//                   <CardTitle className="text-sm font-medium flex items-center">
//                     <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-600" />
//                     Analysis Progress
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="p-3 space-y-3">
//                   <div className="flex items-center text-xs">
//                     <div className="flex items-center text-green-600">
//                       <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
//                       Processing data...
//                     </div>
//                   </div>
//                   <Progress value={processingProgress} className="h-1.5" />
//                   <p className="text-[10px] text-gray-500">
//                     {processingProgress < 90
//                       ? "Analyzing temporal patterns..."
//                       : "Building visualization..."}
//                   </p>
//                 </CardContent>
//               </Card>
//             )}

//             {analysisError && (
//               <Card className="border-none shadow-sm">
//                 <CardHeader className="pb-2 pt-3 px-3">
//                   <CardTitle className="text-sm font-medium flex items-center text-red-600">
//                     <AlertCircle className="h-4 w-4 mr-2" />
//                     Analysis Error
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="p-3">
//                   <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg p-2.5">
//                     <div className="flex items-start">
//                       <AlertCircle className="h-3.5 w-3.5 text-red-500 mr-1.5 mt-0.5 shrink-0" />
//                       <span className="text-xs text-red-700 dark:text-red-400">
//                         {analysisError}
//                       </span>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             )}
//           </div>

//           {/* Main Content Area */}
//           <div className="lg:col-span-3 space-y-4">
//             {/* Network Visualization */}
//             <Card className="border-none shadow-sm overflow-hidden">
//               <CardHeader className="pb-2 pt-3 px-4 border-b border-gray-100 dark:border-gray-800">
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-sm font-medium flex items-center">
//                     <Network className="h-4 w-4 mr-2 text-blue-600" />
//                     Temporal Network Evolution
//                   </CardTitle>
//                   {currentWindow && (
//                     <Badge
//                       variant="secondary"
//                       className="text-[10px] px-2 py-0 h-5"
//                     >
//                       <Clock className="h-3 w-3 mr-1" />
//                       {new Date(currentWindow.start).toLocaleTimeString()}
//                     </Badge>
//                   )}
//                 </div>
//                 {/* Legend - Compact */}
//                 <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-600 dark:text-gray-400 mt-1">
//                   <span className="font-medium">Node Types:</span>
//                   <span className="inline-flex items-center gap-1">
//                     <span className="h-2 w-2 rounded-full bg-red-500" />
//                     Hubs
//                   </span>
//                   <span className="inline-flex items-center gap-1">
//                     <span className="h-2 w-2 rounded-full bg-blue-500" />
//                     Connectors
//                   </span>
//                   <span className="inline-flex items-center gap-1">
//                     <span className="h-2 w-2 rounded-full bg-green-500" />
//                     Peripheral
//                   </span>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0" style={{ height: "440px" }}>
//                 {currentWindow ? (
//                   <TemporalNetworkGraph
//                     nodes={currentWindow.nodes}
//                     edges={currentWindow.edges}
//                   />
//                 ) : status === "processing" ? (
//                   <div className="h-full flex items-center justify-center">
//                     <div className="text-center">
//                       <div className="relative">
//                         <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
//                         <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full" />
//                       </div>
//                       <p className="text-sm text-gray-500 mt-3">
//                         Building visualization...
//                       </p>
//                     </div>
//                   </div>
//                 ) : status === "completed" && timeWindows.length === 0 ? (
//                   <div className="h-full flex items-center justify-center">
//                     <div className="text-center max-w-xs">
//                       <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
//                         <Network className="h-6 w-6 text-gray-400" />
//                       </div>
//                       <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
//                         No visualization data
//                       </p>
//                       <p className="text-xs text-gray-500 mt-1">
//                         The analysis completed but produced 0 time windows
//                       </p>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="h-full flex items-center justify-center">
//                     <div className="text-center max-w-xs">
//                       <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
//                         <PieChart className="h-6 w-6 text-gray-400" />
//                       </div>
//                       <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
//                         No network loaded
//                       </p>
//                       <p className="text-xs text-gray-500 mt-1">
//                         Upload a file to visualize temporal network evolution
//                       </p>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Tabs Section */}
//             <Tabs defaultValue="metrics" className="w-full">
//               <TabsList className="grid w-full grid-cols-3 h-9 p-0.5">
//                 <TabsTrigger value="metrics" className="text-xs">
//                   <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
//                   Metrics
//                 </TabsTrigger>
//                 <TabsTrigger value="timeline" className="text-xs">
//                   <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
//                   Time Series
//                 </TabsTrigger>
//                 <TabsTrigger value="analysis" className="text-xs">
//                   <Activity className="h-3.5 w-3.5 mr-1.5" />
//                   Advanced
//                 </TabsTrigger>
//               </TabsList>

//               <TabsContent value="metrics" className="mt-3">
//                 {analysisResult?.data?.metrics_timeline && currentWindow ? (
//                   <MetricsDashboard
//                     nodes={currentWindow.nodes}
//                     edges={currentWindow.edges}
//                     currentTime={currentWindowTime}
//                     isPlaying={isPlaying}
//                   />
//                 ) : (
//                   <Card className="border-none shadow-sm">
//                     <CardContent className="p-6 flex items-center justify-center text-gray-500">
//                       <div className="text-center">
//                         <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
//                         <p className="text-sm">
//                           Complete analysis to view metrics
//                         </p>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 )}
//               </TabsContent>

//               <TabsContent value="timeline" className="mt-3">
//                 {analysisResult?.data?.metrics_timeline ? (
//                   <Card className="border-none shadow-sm p-3">
//                     <TimeSeriesChart
//                       data={analysisResult.data.metrics_timeline.map(
//                         (item: any) => ({
//                           date: new Date(item.time),
//                           density: item.density,
//                           nodes: item.nodes,
//                           edges: item.edges,
//                           clustering: item.clustering,
//                         }),
//                       )}
//                       width={800}
//                       height={250}
//                     />
//                   </Card>
//                 ) : (
//                   <Card className="border-none shadow-sm">
//                     <CardContent className="p-6 flex items-center justify-center text-gray-500">
//                       <div className="text-center">
//                         <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
//                         <p className="text-sm">
//                           Complete analysis to view time series
//                         </p>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 )}
//               </TabsContent>

//               <TabsContent value="analysis" className="mt-3">
//                 <Card className="border-none shadow-sm">
//                   <CardHeader className="pb-2 pt-3 px-4">
//                     <CardTitle className="text-sm font-medium">
//                       Advanced Pattern Detection
//                     </CardTitle>
//                   </CardHeader>
//                   <CardContent className="p-4">
//                     {analysisResult?.patterns ? (
//                       <div className="grid grid-cols-2 gap-3">
//                         <div className="bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-3 rounded-lg">
//                           <div className="flex items-center justify-between">
//                             <div>
//                               <p className="text-[10px] text-blue-700 dark:text-blue-300 uppercase tracking-wider">
//                                 Events
//                               </p>
//                               <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
//                                 {analysisResult.patterns.events?.length || 0}
//                               </p>
//                             </div>
//                             <div className="p-2 bg-white/50 dark:bg-blue-950/50 rounded-full">
//                               <Activity className="h-4 w-4 text-blue-600" />
//                             </div>
//                           </div>
//                         </div>
//                         <div className="bg-linear-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 p-3 rounded-lg">
//                           <div className="flex items-center justify-between">
//                             <div>
//                               <p className="text-[10px] text-orange-700 dark:text-orange-300 uppercase tracking-wider">
//                                 Anomalies
//                               </p>
//                               <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
//                                 {analysisResult.patterns.anomalies?.length || 0}
//                               </p>
//                             </div>
//                             <div className="p-2 bg-white/50 dark:bg-orange-950/50 rounded-full">
//                               <AlertCircle className="h-4 w-4 text-orange-600" />
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     ) : (
//                       <div className="text-center py-6">
//                         <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
//                         <p className="text-sm text-gray-500">
//                           Run analysis to detect patterns and anomalies
//                         </p>
//                       </div>
//                     )}
//                   </CardContent>
//                 </Card>
//               </TabsContent>
//             </Tabs>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Root as Separator } from "@radix-ui/react-separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Network,
  Activity,
  Layers,
  PieChart,
  TrendingUp,
  Table2,
  X,
  HelpCircle,
  InfoIcon,
  Users,
  GitFork,
  Download,
  FileSpreadsheet,
  Image,
  Camera,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Components
import TemporalNetworkGraph from "@/components/visualization/TemporalNetworkGraph";
import TimeSeriesChart from "@/components/visualization/TimeSeriesChart";
import { MetricsDashboard } from "@/components/metrics/MetricsDashboard";
import FileUpload from "@/components/controls/FileUpload";
import { TimeControls } from "@/components/controls/TimeControls";
import Header from "@/components/dashboard/Header";

// Export utilities
import {
  exportAnalysisToExcel,
  exportElementAsPng,
  exportTimeSeriesCSV,
  type ExportAnalysisData,
} from "@/lib/utils/export";

// Store and API
import {
  useNetworkStore,
  useFetchCommunityData,
} from "@/lib/stores/network-store";
import { api } from "@/lib/api/client";
import type { TimeWindow, Community } from "@/lib/types";

export default function DashboardClient() {
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any>(null);
  const searchParams = useSearchParams();
  const fileId = searchParams!.get("file_id");

  const analysisStartedForFileIdRef = useRef<string | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const analysisRunIdRef = useRef(0);

  const {
    status,
    fileId: storeFileId,
    currentFile,
    timeWindows,
    currentTimeIndex,
    isPlaying,
    playbackSpeed,
    playbackDirection,
    reset,
    setFileId,
    setStatus,
    setTaskId,
    setTimeWindows,
    setCurrentTimeIndex,
    setIsPlaying,
    setPlaybackSpeed,
    setAnimationState,
    timeRange,
    currentTime,
    communities,
    communityEdges,
    selectedCommunity,
    setSelectedCommunity,
    viewMode,
    setViewMode,
    currentWindowMeta,
  } = useNetworkStore();

  // Fetch community data automatically
  const taskId = useNetworkStore((state) => state.taskId);
  const { isLoading: communitiesLoading, error: communitiesError } =
    useFetchCommunityData(taskId);

  // Log community data changes
  useEffect(() => {
    console.log("🏠 DashboardClient - Communities updated:", {
      count: communities.length,
      firstCommunity: communities[0],
      edgesCount: communityEdges.length,
      viewMode,
      status,
    });
  }, [communities, communityEdges, viewMode, status]);

  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // --- Dashboard State Persistence ---
  const DASHBOARD_STATE_KEY = "dashboard_state_v1";

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.status === "completed" && parsed.fileId) {
          setUploadedFileInfo(parsed.uploadedFileInfo || null);
        }
      }
    } catch (e) {}
  }, []);

  // Save state to localStorage when analysis completes
  useEffect(() => {
    if (status === "completed" && fileId && uploadedFileInfo) {
      const state = {
        status,
        fileId,
        uploadedFileInfo,
      };
      localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
    }
  }, [status, fileId, uploadedFileInfo]);

  // Clear state on new upload or analysis
  const clearDashboardState = useCallback(() => {
    localStorage.removeItem(DASHBOARD_STATE_KEY);
  }, []);

  // Refs for export
  const networkGraphRef = useRef<HTMLDivElement>(null);
  const timeSeriesRef = useRef<HTMLDivElement>(null);

  // Column mapping states
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [pendingFileId, setPendingFileId] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [suggestedMapping, setSuggestedMapping] = useState<
    Record<string, string>
  >({});
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [mappingErrors, setMappingErrors] = useState<Record<string, string>>(
    {},
  );
  // (moved above for use in hooks)

  const requiredColumns = ["source", "target", "timestamp"];
  const optionalColumns = ["weight"];

  // Handle community click
  const handleCommunityClick = (community: Community) => {
    setSelectedCommunity(community);
  };

  // Export handlers
  const handleExportExcel = useCallback(() => {
    if (!analysisResult || timeWindows.length === 0) return;
    setIsExporting(true);

    try {
      const summary = analysisResult?.data?.summary;
      const allNodes: any[] = [];
      const allEdges: any[] = [];

      timeWindows.forEach((w) => {
        if (w.nodes) {
          w.nodes.forEach((n) => {
            if (!allNodes.find((existing) => existing.id === n.id)) {
              allNodes.push(n);
            }
          });
        }
        if (w.edges) {
          w.edges.forEach((e) => {
            allEdges.push(e);
          });
        }
      });

      const exportData: ExportAnalysisData = {
        summary: {
          totalNodes: summary?.total_nodes || allNodes.length,
          totalEdges: summary?.total_edges || allEdges.length,
          timeWindows: timeWindows.length,
          timeSpan: {
            start: String(timeWindows[0]?.start || "N/A"),
            end: String(timeWindows[timeWindows.length - 1]?.end || "N/A"),
          },
          fileName: uploadedFileInfo?.filename,
          analyzedAt: new Date().toISOString(),
        },
        timeWindows: timeWindows.map((w, idx) => ({
          index: idx,
          start: String(w.start),
          end: String(w.end),
          nodes: w.nodes?.length || 0,
          edges: w.edges?.length || 0,
        })),
        nodes: allNodes.map((n) => ({
          id: n.id,
          label: n.label || n.id,
          degree: n.degree,
          degreeCentrality: n.centrality,
          betweennessCentrality: n.betweenness,
          closenessCentrality: n.closeness,
          pagerank: n.pagerank,
        })),
        edges: allEdges.slice(0, 100000).map((e) => ({
          source: e.source,
          target: e.target,
          weight: e.weight,
        })),
        communities: communities.map((c, idx) => ({
          id: idx,
          nodeCount: c.nodeCount,
          avgDegree: c.avgDegree,
        })),
      };

      exportAnalysisToExcel(exportData);
    } catch (error) {
      console.error("Excel export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [analysisResult, timeWindows, communities, uploadedFileInfo]);

  const handleExportNetworkImage = useCallback(async () => {
    if (!networkGraphRef.current) return;
    setIsExporting(true);

    try {
      await exportElementAsPng(
        networkGraphRef.current,
        `network-graph-${new Date().toISOString().split("T")[0]}.png`,
        { backgroundColor: "#1a1a2e" },
      );
    } catch (error) {
      console.error("Network export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleExportTimeSeriesImage = useCallback(async () => {
    if (!timeSeriesRef.current) return;
    setIsExporting(true);

    try {
      await exportElementAsPng(
        timeSeriesRef.current,
        `time-series-${new Date().toISOString().split("T")[0]}.png`,
        { backgroundColor: "white" },
      );
    } catch (error) {
      console.error("Time series image export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleExportTimeSeriesCSV = useCallback(() => {
    if (!analysisResult?.data?.metrics_timeline) return;
    setIsExporting(true);

    try {
      const data = analysisResult.data.metrics_timeline.map((item: any) => ({
        date: new Date(item.time),
        density: item.density,
        nodes: item.nodes,
        edges: item.edges,
        clustering: item.clustering,
      }));
      exportTimeSeriesCSV(
        data,
        `time-series-${new Date().toISOString().split("T")[0]}.csv`,
      );
    } catch (error) {
      console.error("CSV export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [analysisResult]);

  const yieldToBrowser = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 0));

  const buildTimeWindowsChunked = async (result: any, signal?: AbortSignal) => {
    const windows = result?.data?.time_windows ?? [];
    const metricsTimeline = result?.data?.metrics_timeline ?? [];

    const built: TimeWindow[] = [];

    for (let index = 0; index < windows.length; index += 1) {
      if (signal?.aborted) {
        throw new Error("Analysis cancelled");
      }

      const window: any = windows[index];
      const timeline = metricsTimeline[index];
      const nodeCount = window.nodes?.length ?? 0;
      const edgeCount = window.edges?.length ?? 0;
      const averageDegree = nodeCount ? (edgeCount * 2) / nodeCount : 0;

      built.push({
        start: window.start,
        end: window.end,
        nodes: (window.nodes ?? []).map((node: any) => ({
          id: node.id,
          label: node.label,
          group: node.group,
          size: node.degree ?? 1,
          degree: node.degree ?? 0,
          centrality: node.centrality ?? 0,
          betweenness: node.betweenness ?? 0,
          closeness: node.closeness ?? 0,
          pagerank: node.pagerank ?? 0,
          activeStart: window.start,
          activeEnd: window.end,
          color: node.color,
          x: node.x,
          y: node.y,
        })),
        edges: (window.edges ?? []).map((edge: any, edgeIndex: number) => ({
          id: edge.id ?? `${edge.source}-${edge.target}-${edgeIndex}`,
          source: edge.source,
          target: edge.target,
          weight: edge.weight ?? 1,
          timestamp: window.start,
          type: edge.type,
          active: true,
        })),
        density: timeline?.density ?? 0,
        averageDegree,
        diameter: timeline?.diameter,
        clusteringCoefficient: timeline?.clustering ?? 0,
        connectedComponents: timeline?.components ?? 0,
      } as TimeWindow);

      if (index % 5 === 0 && windows.length > 0) {
        const pct = 90 + Math.min(9, Math.floor((index / windows.length) * 10));
        setProcessingProgress(pct);
        await yieldToBrowser();
      }
    }

    return built;
  };

  const validateColumnMapping = (): boolean => {
    const errors: Record<string, string> = {};

    for (const col of requiredColumns) {
      if (
        !columnMapping[col] ||
        columnMapping[col] === "" ||
        columnMapping[col] === "none"
      ) {
        errors[col] = `${col} column is required`;
      }
    }

    const usedColumns = Object.values(columnMapping).filter(
      (v) => v && v !== "" && v !== "none",
    );
    const duplicates = usedColumns.filter(
      (col, index) => usedColumns.indexOf(col) !== index,
    );

    if (duplicates.length > 0) {
      errors.general = `Cannot map multiple fields to the same column: ${duplicates.join(", ")}`;
    }

    setMappingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleColumnMappingChange = (column: string, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [column]: value }));

    if (mappingErrors[column]) {
      setMappingErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[column];
        return newErrors;
      });
    }
  };

  const handleColumnMappingSubmit = async () => {
    if (!validateColumnMapping()) {
      return;
    }

    setShowColumnMapping(false);
    if (pendingFileId) {
      await startAnalysis(pendingFileId, columnMapping);
    }
  };

  const startAnalysis = async (
    id: string,
    mapping?: Record<string, string>,
    _autoMapTried = false,
  ) => {
    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    const { signal } = controller;
    analysisRunIdRef.current += 1;
    const runId = analysisRunIdRef.current;

    reset();
    setFileId(id);
    setStatus("processing");
    setAnalysisError(null);
    setAnalysisResult(null);
    setProcessingProgress(10);

    try {
      const fileSize = currentFile?.size ?? 0;
      const sampling_rate =
        fileSize > 200 * 1024 * 1024
          ? 200
          : fileSize > 50 * 1024 * 1024
            ? 50
            : fileSize > 10 * 1024 * 1024
              ? 10
              : undefined;

      const request = {
        file_id: id,
        time_resolution: "hour" as const,
        sampling_rate,
        metrics_to_compute: ["degree", "betweenness", "closeness", "pagerank"],
        column_mapping: mapping,
        generate_missing: true,
      };

      const response = await api.analyzeNetwork(request, { signal });

      if (response.status === "needs_mapping") {
        if (
          !_autoMapTried &&
          response.available_columns &&
          response.available_columns.length > 0
        ) {
          const autoMapping: Record<string, string> = {};
          const lowerCols = response.available_columns.map((c) =>
            c.toLowerCase(),
          );
          const findCol = (aliases: string[]) => {
            for (const alias of aliases) {
              const idx = lowerCols.findIndex((c) => c === alias);
              if (response.available_columns && idx !== -1)
                return response.available_columns[idx];
            }
            for (const alias of aliases) {
              const idx = lowerCols.findIndex((c) => c.includes(alias));
              if (response.available_columns && idx !== -1)
                return response.available_columns[idx];
            }
            return "none";
          };
          autoMapping.source = findCol([
            "source",
            "src",
            "from",
            "node1",
            "sender",
          ]);
          autoMapping.target = findCol([
            "target",
            "dst",
            "to",
            "node2",
            "receiver",
          ]);
          autoMapping.timestamp = findCol([
            "timestamp",
            "time",
            "date",
            "datetime",
            "ts",
          ]);
          autoMapping.weight = findCol([
            "weight",
            "value",
            "w",
            "strength",
            "count",
          ]);
          if (!response.available_columns.includes(autoMapping.weight))
            delete autoMapping.weight;
          if (
            autoMapping.source !== "none" &&
            autoMapping.target !== "none" &&
            autoMapping.timestamp !== "none"
          ) {
            await startAnalysis(id, autoMapping, true);
            return;
          }
        }
        setPendingFileId(id);
        setAvailableColumns(response.available_columns || []);

        const initialMapping: Record<string, string> = {};
        if (response.suggested_mapping) {
          Object.assign(initialMapping, response.suggested_mapping);
        }

        requiredColumns.forEach((col) => {
          if (!initialMapping[col]) initialMapping[col] = "none";
        });
        optionalColumns.forEach((col) => {
          if (!initialMapping[col]) initialMapping[col] = "none";
        });

        setColumnMapping(initialMapping);
        setSuggestedMapping(response.suggested_mapping || {});
        setShowColumnMapping(true);
        setStatus("idle");
        setProcessingProgress(0);
        return;
      }

      setTaskId(response.task_id ?? "");

      if (typeof response.task_id !== "string" || !response.task_id) {
        setAnalysisError(
          "Analysis failed: missing or invalid task ID returned from backend.",
        );
        setStatus("failed");
        setProcessingProgress(0);
        return;
      }

      const result = await api.pollAnalysis(response.task_id, { signal });

      if (signal.aborted || runId !== analysisRunIdRef.current) return;

      if (result.status === "failed") {
        throw new Error(
          result.error || result.message || "Analysis failed (backend)",
        );
      }

      if (!result.data) {
        throw new Error("Analysis completed but returned no data");
      }

      setAnalysisResult({
        status: result.status,
        task_id: result.task_id,
        data: {
          metrics_timeline: result.data.metrics_timeline,
          summary: result.data.summary,
        },
      });

      setProcessingProgress(90);
      const windows = await buildTimeWindowsChunked(result, signal);

      if (signal.aborted || runId !== analysisRunIdRef.current) return;

      setTimeWindows(windows);
      setCurrentTimeIndex(0);
      setStatus("completed");
      setProcessingProgress(100);
    } catch (error: any) {
      if (controller.signal.aborted) {
        return;
      }
      let backendMsg = "";
      // Try to extract backend error message from fetch/axios/response
      if (error?.response && typeof error.response.json === "function") {
        try {
          const data = await error.response.json();
          backendMsg = data?.detail || data?.error || JSON.stringify(data);
        } catch {}
      } else if (error?.body && typeof error.body === "string") {
        backendMsg = error.body;
      } else if (error?.message) {
        backendMsg = error.message;
      }
      setAnalysisError(
        backendMsg
          ? `Analysis failed: ${backendMsg}`
          : "Analysis failed. Please check your data and try again.",
      );
      setStatus("failed");
      setProcessingProgress(0);
      console.error("Analysis failed:", error);
    }
  };

  const handleUploadComplete = (result: any) => {
    clearDashboardState();
    if (result?.backend?.attempted && !result?.backend?.ok) {
      setAnalysisError(
        `Backend upload failed (${result.backend.status ?? "unknown"}). ` +
          (result.backend.error ?? ""),
      );
      setStatus("failed");
      return;
    }

    setUploadedFileInfo(result);

    if (result.file_id) {
      if (
        result.columns_used?.source &&
        result.columns_used?.target &&
        result.columns_used?.timestamp
      ) {
        startAnalysis(result.file_id);
      } else {
        setPendingFileId(result.file_id);
        setAvailableColumns(result.columns || []);

        const initialMapping: Record<string, string> = {};

        if (result.columns.length > 0)
          initialMapping.source = result.columns[0];
        else initialMapping.source = "none";

        if (result.columns.length > 1)
          initialMapping.target = result.columns[1];
        else initialMapping.target = "none";

        if (result.columns.length > 2)
          initialMapping.timestamp = result.columns[2];
        else initialMapping.timestamp = "none";

        optionalColumns.forEach((col) => {
          initialMapping[col] = "none";
        });

        setColumnMapping(initialMapping);
        setSuggestedMapping({
          source: result.columns[0] || "",
          target: result.columns[1] || "",
          timestamp: result.columns[2] || "",
        });
        setShowColumnMapping(true);
      }
    }
  };

  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (status !== "processing") {
      if (status === "idle") setProcessingProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 90) return 90;
        const next = prev + Math.max(1, Math.round((90 - prev) * 0.07));
        return Math.min(90, next);
      });
    }, 400);

    return () => clearInterval(interval);
  }, [status]);

  // --- Removed auto-restart analysis effect ---
  // (No effect here; user must click to start analysis after refresh)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying && timeWindows.length > 0) {
      const speed = Number.isFinite(playbackSpeed) ? playbackSpeed : 1;
      const safeSpeed = Math.max(0.1, speed);
      const tickMs = Math.max(50, Math.round(1000 / safeSpeed));
      const step = playbackDirection === "backward" ? -1 : 1;

      interval = setInterval(() => {
        setCurrentTimeIndex((prev) => {
          const next = prev + step;
          if (next >= timeWindows.length) return 0;
          if (next < 0) return timeWindows.length - 1;
          return next;
        });
      }, tickMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isPlaying,
    timeWindows.length,
    playbackSpeed,
    playbackDirection,
    setCurrentTimeIndex,
  ]);

  const currentWindow = timeWindows[currentTimeIndex];
  const summary = analysisResult?.data?.summary;

  // Total nodes across entire dataset (from analysis summary)
  let totalNodes = 0;
  if (summary?.total_nodes && summary.total_nodes > 0) {
    totalNodes = summary.total_nodes;
  } else if (
    summary?.original_total_nodes &&
    summary.original_total_nodes > 0
  ) {
    totalNodes = summary.original_total_nodes;
  } else if (timeWindows.length > 0) {
    const nodeSet = new Set<string>();
    for (const win of timeWindows) {
      if (win.nodes) {
        for (const n of win.nodes) nodeSet.add(n.id);
      }
    }
    totalNodes = nodeSet.size;
  }

  const totalEdges = summary?.total_edges ?? 0;

  // Active nodes/edges: use per-window community meta when available (large datasets),
  // fall back to current window's node/edge arrays (small datasets)
  const activeNodes =
    currentWindowMeta?.totalNodes ?? currentWindow?.nodes?.length ?? 0;
  const activeEdges =
    currentWindowMeta?.totalEdges ?? currentWindow?.edges?.length ?? 0;
  const inactiveNodes =
    totalNodes > 0 ? Math.max(0, totalNodes - activeNodes) : 0;
  const currentWindowTime =
    currentWindow && typeof currentWindow.start === "string"
      ? (() => {
          const start = Date.parse(currentWindow.start);
          if (Number.isFinite(start)) return start;
          const end =
            typeof currentWindow.end === "number"
              ? currentWindow.end
              : Date.parse(currentWindow.end);
          return Number.isFinite(end) ? end : 0;
        })()
      : 0;

  // Check if toggle should show
  const showToggle = status === "completed" && communities.length > 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900">
      <Header />
      <div className="p-3 md:p-4">
        {/* ===== DEBUG OVERLAY - Uncomment when needed =====
        <div className="fixed top-20 right-4 z-50 bg-black text-white p-4 rounded-lg shadow-lg text-xs font-mono max-w-xs border border-gray-700">
          <h3 className="font-bold text-yellow-300 mb-2">🔍 DEBUG INFO</h3>
          <div className="space-y-1">
            <div>
              Status: <span className="text-green-300">{status}</span>
            </div>
            <div>
              Task ID: <span className="text-blue-300">{taskId || "none"}</span>
            </div>
            <div>
              Communities:{" "}
              <span className="text-purple-300">{communities.length}</span>
            </div>
            <div>
              Community Edges:{" "}
              <span className="text-orange-300">{communityEdges.length}</span>
            </div>
            <div>
              Loading:{" "}
              <span className="text-yellow-300">
                {communitiesLoading ? "YES" : "NO"}
              </span>
            </div>
            <div>
              View Mode: <span className="text-pink-300">{viewMode}</span>
            </div>
            <div className="pt-2 border-t border-gray-600 mt-2">
              <div>
                Toggle Should Show:
                <span
                  className={`ml-2 font-bold ${showToggle ? "text-green-300" : "text-red-300"}`}
                >
                  {showToggle ? "YES" : "NO"}
                </span>
              </div>
              <div className="ml-2 text-gray-400 text-[10px]">
                • status === "completed": {status === "completed" ? "✅" : "❌"}
                <br />• communities.length &gt; 0:{" "}
                {communities.length > 0 ? "✅" : "❌"}
              </div>
            </div>
            {communitiesError && (
              <div className="text-red-300 bg-red-900/30 p-2 rounded mt-2">
                Error: {communitiesError}
              </div>
            )}
          </div>
        </div>
        ===== END DEBUG OVERLAY ===== */}

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 -ml-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </Link>
                <Separator orientation="vertical" className="h-6" />

                <div>
                  <h1 className="text-xl md:text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                    Temporal Network Dashboard
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Interactive visualization and analysis
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle - always visible */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mr-2">
                  <Button
                    variant={viewMode === "communities" ? "default" : "ghost"}
                    size="sm"
                    className={`h-7 px-3 text-xs ${
                      viewMode === "communities"
                        ? "bg-blue-500 text-white"
                        : "text-gray-600"
                    }`}
                    onClick={() => setViewMode("communities")}
                  >
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Communities
                  </Button>
                  <Button
                    variant={viewMode === "nodes" ? "default" : "ghost"}
                    size="sm"
                    className={`h-7 px-3 text-xs ${
                      viewMode === "nodes"
                        ? "bg-blue-500 text-white"
                        : "text-gray-600"
                    }`}
                    onClick={() => setViewMode("nodes")}
                  >
                    <Network className="h-3.5 w-3.5 mr-1" />
                    Nodes
                  </Button>
                </div>

                {/* Status Badge */}
                {status === "processing" && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Analyzing
                  </Badge>
                )}
                {status === "completed" && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
                {status === "failed" && (
                  <Badge
                    variant="outline"
                    className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}

                <Link href="/upload">
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Activity className="h-3.5 w-3.5 mr-1.5" />
                    New Analysis
                  </Button>
                </Link>

                {/* Export Dropdown */}
                {status === "completed" && timeWindows.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export to Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleExportNetworkImage}>
                        <Image className="h-4 w-4 mr-2" />
                        Network Graph (PNG)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportTimeSeriesImage}>
                        <Image className="h-4 w-4 mr-2" />
                        Time Series (PNG)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleExportTimeSeriesCSV}>
                        <FileText className="h-4 w-4 mr-2" />
                        Time Series (CSV)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Uploaded File Info */}
            {uploadedFileInfo && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>{uploadedFileInfo.filename}</span>
                <span>•</span>
                <span>{uploadedFileInfo.rows.toLocaleString()} rows</span>
                <span>•</span>
                <span>{uploadedFileInfo.columns.length} columns</span>
                {uploadedFileInfo.timestamp_inferred && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    Timestamps auto-generated
                  </Badge>
                )}
              </div>
            )}

            {/* Community Stats - always visible */}
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
              >
                <Users className="h-3 w-3 mr-1" />
                {communities.length} Communities
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
              >
                <GitFork className="h-3 w-3 mr-1" />
                {communityEdges.length} Community Connections
              </Badge>
            </div>
          </div>

          {/* Column Mapping Dialog */}
          <Dialog open={showColumnMapping} onOpenChange={setShowColumnMapping}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  Map Your Columns
                </DialogTitle>
                <DialogDescription>
                  We couldn't automatically detect the required columns. Please
                  map your data columns to the required fields.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>File Information</AlertTitle>
                  <AlertDescription>
                    File ID: {pendingFileId} • Available columns:{" "}
                    {availableColumns.length}
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-1 mb-2">
                  {availableColumns.map((col) => (
                    <Badge key={col} variant="outline" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-medium">Required Columns</div>

                  {requiredColumns.map((col) => (
                    <div
                      key={col}
                      className="grid grid-cols-4 items-center gap-4"
                    >
                      <Label htmlFor={col} className="text-right capitalize">
                        {col} <span className="text-red-500">*</span>
                      </Label>
                      <div className="col-span-3">
                        <Select
                          value={columnMapping[col] || "none"}
                          onValueChange={(value) =>
                            handleColumnMappingChange(col, value)
                          }
                        >
                          <SelectTrigger
                            className={
                              mappingErrors[col] ? "border-red-500" : ""
                            }
                          >
                            <SelectValue placeholder={`Select ${col} column`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {availableColumns.map((availCol) => (
                              <SelectItem key={availCol} value={availCol}>
                                {availCol}
                              </SelectItem>
                            ))}
                            {col === "timestamp" && (
                              <SelectItem value="__generate__">
                                🔄 Auto-generate timestamps
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {mappingErrors[col] && (
                          <p className="text-xs text-red-500 mt-1">
                            {mappingErrors[col]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="text-sm font-medium mt-4">
                    Optional Columns
                  </div>

                  {optionalColumns.map((col) => (
                    <div
                      key={col}
                      className="grid grid-cols-4 items-center gap-4"
                    >
                      <Label htmlFor={col} className="text-right capitalize">
                        {col}
                      </Label>
                      <div className="col-span-3">
                        <Select
                          value={columnMapping[col] || "none"}
                          onValueChange={(value) =>
                            handleColumnMappingChange(col, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={`Select ${col} column (optional)`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              None (use default)
                            </SelectItem>
                            {availableColumns.map((availCol) => (
                              <SelectItem key={availCol} value={availCol}>
                                {availCol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>

                {mappingErrors.general && (
                  <Alert variant="destructive">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Mapping Error</AlertTitle>
                    <AlertDescription>{mappingErrors.general}</AlertDescription>
                  </Alert>
                )}

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Data Format Example:
                  </p>
                  <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                    source,target,timestamp,weight{"\n"}
                    node1,node2,2024-01-01 10:00:00,1.5{"\n"}
                    node2,node3,2024-01-01 10:05:00,2.0
                  </pre>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowColumnMapping(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleColumnMappingSubmit}>
                  Start Analysis
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* KPI Cards - Compact */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 mb-2"
            style={{ contain: "layout" }}
          >
            <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Time Windows
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {timeWindows.length}
                    </p>
                  </div>
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-md shrink-0">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Total Nodes
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {totalNodes.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-1.5 bg-purple-50 dark:bg-purple-950/30 rounded-md shrink-0">
                    <Network className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Active Nodes
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {activeNodes.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-1.5 bg-green-50 dark:bg-green-950/30 rounded-md shrink-0">
                    <Network className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Inactive Nodes
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {inactiveNodes.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md shrink-0">
                    <Network className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Current Window
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {currentTimeIndex + 1}
                      <span className="text-[10px] font-normal text-gray-400">
                        {" "}
                        of {timeWindows.length}
                      </span>
                    </p>
                  </div>
                  <div className="p-1.5 bg-green-50 dark:bg-green-950/30 rounded-md shrink-0">
                    <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Active Edges
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {activeEdges.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-md shrink-0">
                    <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div
            className="grid grid-cols-1 lg:grid-cols-4 gap-4"
            style={{ contain: "layout" }}
          >
            {/* Left Sidebar */}
            <div
              className="lg:col-span-1 space-y-4"
              style={{ contain: "layout" }}
            >
              <TimeControls
                isPlaying={isPlaying}
                onPlayPause={(playing) => setIsPlaying(playing)}
                onTimeChange={(time) => {
                  setAnimationState({ targetTime: time });
                }}
                onSpeedChange={(speed) => setPlaybackSpeed(speed)}
              />

              {status === "idle" && !pendingFileId && (
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-blue-600" />
                      Start Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <FileUpload onUploadComplete={handleUploadComplete} />
                  </CardContent>
                </Card>
              )}

              {status === "processing" && (
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-600" />
                      Analysis Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center text-xs">
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Processing data...
                      </div>
                    </div>
                    <Progress value={processingProgress} className="h-1.5" />
                    <p className="text-[10px] text-gray-500">
                      {processingProgress < 90
                        ? "Analyzing temporal patterns..."
                        : "Building visualization..."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {analysisError && (
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm font-medium flex items-center text-red-600">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Analysis Error
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg p-2.5">
                      <div className="flex items-start">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 mr-1.5 mt-0.5 shrink-0" />
                        <span className="text-xs text-red-700 dark:text-red-400">
                          {analysisError}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Community Info Panel - Show when community selected */}
              {selectedCommunity && (
                <Card className="border-none shadow-sm bg-purple-50/50 dark:bg-purple-950/20">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-purple-600" />
                        Selected Community
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setSelectedCommunity(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nodes:</span>
                        <span className="font-medium">
                          {selectedCommunity.nodeCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium capitalize">
                          {selectedCommunity.dominantGroup}
                          {selectedCommunity.isMixed && " (mixed)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Internal Edges:</span>
                        <span className="font-medium">
                          {selectedCommunity.internalEdges.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Avg Degree:</span>
                        <span className="font-medium">
                          {selectedCommunity.avgDegree.toFixed(2)}
                        </span>
                      </div>
                      {(selectedCommunity as any).degreeCentrality !==
                        undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Degree Centrality:
                          </span>
                          <span className="font-medium">
                            {(
                              (selectedCommunity as any)
                                .degreeCentrality as number
                            ).toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Main Content Area */}
            <div
              className="lg:col-span-3 space-y-4"
              style={{ contain: "layout" }}
            >
              {/* Network Visualization */}
              <Card
                className="border-none shadow-sm overflow-hidden"
                style={{ contain: "layout paint" }}
              >
                <CardHeader className="pb-2 pt-1 px-4 border-b border-gray-100 dark:border-gray-800 dark:p-1 dark:pb-1 dark:pt-0 dark:px-2">
                  <div className="flex items-center justify-between min-h-[20px]">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Network className="h-4 w-4 mr-2 text-blue-600" />
                      Temporal Network Evolution
                      {viewMode === "communities" && communities.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          <Users className="h-3 w-3 mr-1" />
                          Community View
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {currentWindow && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={handleExportNetworkImage}
                          title="Export Graph Image"
                        >
                          <Camera className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      )}
                      {currentWindow && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0 h-5"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(currentWindow.start).toLocaleTimeString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-600 dark:text-gray-400 mt-0 mb-1">
                    <span className="font-medium">Node Types:</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Hubs
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Connectors
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Peripheral
                    </span>
                  </div>
                </CardHeader>
                <CardContent
                  className="p-0 dark:p-0"
                  style={{
                    height: "550px",
                    contain: "layout",
                    ...(typeof window !== "undefined" &&
                    window.matchMedia &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? { height: "450px" }
                      : {}),
                  }}
                >
                  {currentWindow ? (
                    <div ref={networkGraphRef} className="h-full w-full">
                      <TemporalNetworkGraph
                        nodes={currentWindow.nodes}
                        edges={currentWindow.edges}
                        isLoading={communitiesLoading}
                      />
                    </div>
                  ) : status === "processing" ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                          <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full" />
                        </div>
                        <p className="text-sm text-gray-500 mt-3">
                          Building visualization...
                        </p>
                      </div>
                    </div>
                  ) : status === "completed" && timeWindows.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-xs">
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                          <Network className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          No visualization data
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          The analysis completed but produced 0 time windows
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-xs">
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                          <PieChart className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          No network loaded
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Upload a file to visualize temporal network evolution
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs Section */}
              <Tabs defaultValue="metrics" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-9 p-0.5">
                  <TabsTrigger value="metrics" className="text-xs">
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    Metrics
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    Time Series
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="text-xs">
                    <Activity className="h-3.5 w-3.5 mr-1.5" />
                    Advanced
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="metrics" className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                      Metrics
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startAnalysis(fileId ?? storeFileId ?? "")}
                    >
                      <BarChart3 className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                  </div>
                  {analysisResult?.data?.metrics_timeline && currentWindow ? (
                    <MetricsDashboard
                      nodes={currentWindow.nodes}
                      edges={currentWindow.edges}
                      currentTime={currentWindowTime}
                      isPlaying={isPlaying}
                    />
                  ) : (
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-6 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">
                            Complete analysis to view metrics
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                      Time Series
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startAnalysis(fileId ?? storeFileId ?? "")}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                  </div>
                  {analysisResult?.data?.metrics_timeline ? (
                    <Card className="border-none shadow-sm p-3">
                      <div ref={timeSeriesRef}>
                        <TimeSeriesChart
                          data={analysisResult.data.metrics_timeline.map(
                            (item: any) => ({
                              date: new Date(item.time),
                              density: item.density,
                              nodes: item.nodes,
                              edges: item.edges,
                              clustering: item.clustering,
                            }),
                          )}
                          width={800}
                          height={250}
                        />
                      </div>
                    </Card>
                  ) : (
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-6 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">
                            Complete analysis to view time series
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="analysis" className="mt-3">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm font-medium">
                        Advanced Pattern Detection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {analysisResult?.patterns ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                                  Events
                                </p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                  {analysisResult.patterns.events?.length || 0}
                                </p>
                              </div>
                              <div className="p-2 bg-white/50 dark:bg-blue-950/50 rounded-full">
                                <Activity className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                          </div>
                          <div className="bg-linear-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-orange-700 dark:text-orange-300 uppercase tracking-wider">
                                  Anomalies
                                </p>
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                  {analysisResult.patterns.anomalies?.length ||
                                    0}
                                </p>
                              </div>
                              <div className="p-2 bg-white/50 dark:bg-orange-950/50 rounded-full">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm text-gray-500">
                            Run analysis to detect patterns and anomalies
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
