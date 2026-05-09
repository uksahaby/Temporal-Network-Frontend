"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  BarChart3,
  Network,
  Clock,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  TrendingUp,
  Activity,
  Layers,
  Zap,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Image,
  Camera,
} from "lucide-react";

import {
  exportAnalysisToExcel,
  exportElementAsPng,
  exportTimeSeriesCSV,
  type ExportAnalysisData,
} from "@/lib/utils/export";

import FileUpload from "@/components/controls/FileUpload";
import TimeSeriesChart from "@/components/visualization/TimeSeriesChart";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import TemporalNetworkGraph from "@/components/visualization/TemporalNetworkGraph";
import { MetricsDashboard } from "@/components/metrics/MetricsDashboard";

import {
  analyzeNetwork,
  pollAnalysis,
  type AnalysisRequest,
  type UploadResponse,
  type VisualizationData,
} from "@/lib/api/client";

export default function AnalysisDashboard() {
  // State
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [visualizationData, setVisualizationData] =
    useState<VisualizationData | null>(null);
  const [currentTimeWindow, setCurrentTimeWindow] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Refs for export
  const networkGraphRef = useRef<HTMLDivElement>(null);
  const timeSeriesRef = useRef<HTMLDivElement>(null);

  // Export handlers
  const handleExportExcel = useCallback(() => {
    if (!visualizationData) return;
    setIsExporting(true);

    try {
      const exportData: ExportAnalysisData = {
        summary: {
          totalNodes: visualizationData.summary.total_unique_nodes,
          totalEdges: visualizationData.summary.total_edges,
          timeWindows: visualizationData.time_windows.length,
          timeSpan: {
            start: visualizationData.summary.time_span.start || "N/A",
            end: visualizationData.summary.time_span.end || "N/A",
          },
          fileName: uploadedFile?.filename,
          analyzedAt: new Date().toISOString(),
        },
        timeWindows: visualizationData.time_windows.map((w, idx) => ({
          index: idx,
          start: w.start,
          end: w.end,
          nodes: w.nodes.length,
          edges: w.edges.length,
          density: visualizationData.metrics_timeline[idx]?.density,
          clustering: visualizationData.metrics_timeline[idx]?.clustering,
        })),
        nodes: visualizationData.time_windows[currentTimeWindow]?.nodes.map(
          (n) => ({
            id: n.id,
            label: n.label,
            degree: n.degree,
          }),
        ),
        edges: visualizationData.time_windows[currentTimeWindow]?.edges.map(
          (e) => ({
            source: e.source,
            target: e.target,
            weight: e.weight,
          }),
        ),
      };

      exportAnalysisToExcel(exportData);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [visualizationData, uploadedFile, currentTimeWindow]);

  const handleExportNetworkImage = useCallback(async () => {
    if (!networkGraphRef.current) return;
    setIsExporting(true);

    try {
      await exportElementAsPng(
        networkGraphRef.current,
        `network-graph-${Date.now()}.png`,
        { backgroundColor: "#1a1a2e" },
      );
    } catch (error) {
      console.error("Network image export failed:", error);
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
        `time-series-${Date.now()}.png`,
        { backgroundColor: "white" },
      );
    } catch (error) {
      console.error("Time series image export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleExportTimeSeriesCSV = useCallback(() => {
    if (!visualizationData) return;

    const data = visualizationData.metrics_timeline.map((item) => ({
      date: item.time,
      density: item.density,
      nodes: item.nodes,
      edges: item.edges,
      clustering: item.clustering ?? 0,
    }));

    exportTimeSeriesCSV(data, `time-series-data-${Date.now()}.csv`);
  }, [visualizationData]);

  // Handle file upload completion
  const handleUploadComplete = (response: UploadResponse) => {
    setUploadedFile(response);
    const nextFileId = response.file_id;
    if (nextFileId) {
      startAnalysis(nextFileId);
    }
  };

  // Start analysis
  const startAnalysis = async (fileId: string) => {
    setAnalysisStatus("processing");
    setProcessingProgress(10);

    const request: AnalysisRequest = {
      file_id: fileId,
      time_resolution: "hour",
      metrics_to_compute: [
        "degree_centrality",
        "betweenness_centrality",
        "closeness_centrality",
        "pagerank",
      ],
      sampling_rate:
        uploadedFile?.rows && uploadedFile.rows > 100000 ? 100 : undefined,
    };

    try {
      const response = await analyzeNetwork(request);
      setProcessingProgress(30);

      // Poll for completion
      if (typeof response.task_id === "string") {
        await pollAnalysisStatus(response.task_id);
      } else {
        throw new Error("Invalid task_id returned from analysis");
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisStatus("failed");
      setProcessingProgress(0);
    }
  };

  // Poll analysis status
  const pollAnalysisStatus = async (taskId: string) => {
    try {
      const result = await pollAnalysis(taskId);
      setProcessingProgress(80);

      if (result.status === "completed") {
        setProcessingProgress(100);
        setAnalysisStatus("completed");
        setVisualizationData(result.data ?? null);
      }
    } catch (error) {
      console.error("Polling failed:", error);
      setAnalysisStatus("failed");
      setProcessingProgress(0);
    }
  };

  // Simulate progress during processing
  useEffect(() => {
    if (analysisStatus !== "processing") {
      if (analysisStatus === "idle") setProcessingProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 75) return 75;
        return prev + Math.max(1, Math.round((75 - prev) * 0.1));
      });
    }, 500);

    return () => clearInterval(interval);
  }, [analysisStatus]);

  // Time window navigation
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && visualizationData) {
      interval = setInterval(() => {
        setCurrentTimeWindow((prev) => {
          const next = prev + playbackSpeed;
          return next >= visualizationData.time_windows.length ? 0 : next;
        });
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, visualizationData]);

  // Get current time window data
  const currentWindowData = visualizationData?.time_windows[currentTimeWindow];
  const currentWindowTime =
    currentWindowData && typeof currentWindowData.start === "string"
      ? (() => {
          const start = Date.parse(currentWindowData.start);
          if (Number.isFinite(start)) return start;
          const end = Date.parse(currentWindowData.end);
          return Number.isFinite(end) ? end : 0;
        })()
      : 0;

  const totalWindows = visualizationData?.time_windows.length ?? 0;
  const progress =
    totalWindows > 0 ? ((currentTimeWindow + 1) / totalWindows) * 100 : 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900 p-4 md:p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header - Compact */}
        <header className="mb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Temporal Network Analysis
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Upload files and visualize temporal network dynamics
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {analysisStatus === "processing" && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                >
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Processing
                </Badge>
              )}
              {analysisStatus === "completed" && (
                <Badge
                  variant="outline"
                  className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
              {analysisStatus === "failed" && (
                <Badge
                  variant="outline"
                  className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Panel - Upload & Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* File Upload - Compact */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-sm font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                  Upload Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <FileUpload onUploadComplete={handleUploadComplete} />
              </CardContent>
            </Card>

            {/* Analysis Status - Compact */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-purple-600" />
                  Analysis Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {analysisStatus === "idle" && (
                  <div className="text-center py-6">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Upload a file to begin
                    </p>
                  </div>
                )}

                {analysisStatus === "processing" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs">
                        <Loader2 className="h-3.5 w-3.5 text-blue-500 mr-1.5 animate-spin" />
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          Processing data...
                        </span>
                      </div>
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {processingProgress}%
                      </span>
                    </div>
                    <Progress value={processingProgress} className="h-1.5" />
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>Uploaded</span>
                      <span>Analyzing</span>
                      <span>Complete</span>
                    </div>
                    {uploadedFile?.rows && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        Processing {uploadedFile.rows.toLocaleString()} rows
                      </p>
                    )}
                  </div>
                )}

                {analysisStatus === "completed" && (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Analysis Complete
                      </span>
                    </div>

                    {/* Summary Stats - Compact Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2">
                        <p className="text-[9px] text-gray-500 uppercase">
                          Windows
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {visualizationData?.time_windows.length}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2">
                        <p className="text-[9px] text-gray-500 uppercase">
                          Nodes
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {visualizationData?.summary.total_unique_nodes}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2">
                        <p className="text-[9px] text-gray-500 uppercase">
                          Edges
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {visualizationData?.summary.total_edges}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2">
                        <p className="text-[9px] text-gray-500 uppercase">
                          Time Span
                        </p>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                          {visualizationData?.summary.time_span.start
                            ? new Date(
                                visualizationData.summary.time_span.start,
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs"
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Export Results
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleExportExcel}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export to Excel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportNetworkImage}>
                          <Camera className="h-4 w-4 mr-2" />
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
                  </div>
                )}

                {analysisStatus === "failed" && (
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        Analysis Failed
                      </span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-md p-2.5">
                      <p className="text-[10px] text-red-700 dark:text-red-400">
                        An error occurred during processing.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        const retryFileId = uploadedFile?.file_id;
                        if (retryFileId) {
                          startAnalysis(retryFileId);
                        }
                      }}
                    >
                      <Loader2 className="h-3.5 w-3.5 mr-1.5" />
                      Retry Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Controls - Compact */}
            {visualizationData && (
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-4 border-b border-gray-100 dark:border-gray-800">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-amber-600" />
                    Time Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Current Time Display */}
                  <div className="flex items-center justify-between bg-linear-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-md p-2.5">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Current Window
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-200">
                        {currentWindowData &&
                          new Date(
                            currentWindowData.start,
                          ).toLocaleTimeString()}
                      </span>
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 ml-1.5">
                        {currentTimeWindow + 1}/{totalWindows}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>Timeline</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <Slider
                    value={[currentTimeWindow]}
                    onValueChange={(value: number[]) =>
                      setCurrentTimeWindow(value[0] ?? 0)
                    }
                    max={visualizationData.time_windows.length - 1}
                    step={1}
                    className="w-full **:[[role=slider]]:h-3.5 **:[[role=slider]]:w-3.5 **:[[role=slider]]:bg-amber-600"
                  />

                  {/* Playback Controls - Single Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full"
                        onClick={() =>
                          setCurrentTimeWindow((prev) => Math.max(0, prev - 1))
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="default"
                        className="h-8 w-8 rounded-full bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                        onClick={() => setIsPlaying(!isPlaying)}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 ml-0.5" />
                        )}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full"
                        onClick={() =>
                          setCurrentTimeWindow((prev) =>
                            Math.min(
                              visualizationData.time_windows.length - 1,
                              prev + 1,
                            ),
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Speed Controls - Compact */}
                    <div className="flex items-center space-x-1">
                      <Zap className="h-3 w-3 text-gray-400" />
                      <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                        {[1, 2, 5].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-2 py-1 text-[10px] font-medium transition-colors
                              ${
                                playbackSpeed === speed
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                  : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Window Stats */}
                  <div className="flex justify-between text-[9px] text-gray-500 pt-1">
                    <span>{currentWindowData?.nodes.length || 0} nodes</span>
                    <span className="text-gray-300">|</span>
                    <span>{currentWindowData?.edges.length || 0} edges</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Visualizations */}
          <div className="lg:col-span-2 space-y-4">
            {/* Network Visualization */}
            <Card className="border-none shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Network className="h-4 w-4 mr-2 text-blue-600" />
                    Network Evolution
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {currentWindowData && (
                      <>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-2 py-0 h-5"
                        >
                          {new Date(currentWindowData.start).toLocaleString()}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleExportNetworkImage}
                          title="Download network image"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {/* Legend - Ultra Compact */}
                <div className="flex flex-wrap items-center gap-3 text-[9px] text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">Types:</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Hubs
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Connectors
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Peripheral
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0" style={{ height: "650px" }}>
                {currentWindowData ? (
                  <div ref={networkGraphRef} className="h-full w-full">
                    <TemporalNetworkGraph
                      nodes={currentWindowData.nodes}
                      edges={currentWindowData.edges}
                    />
                  </div>
                ) : analysisStatus === "processing" ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                        <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full" />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Building visualization...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-xs">
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                        <Network className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        No network loaded
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Complete analysis to visualize temporal network
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metrics & Charts */}
            <Tabs defaultValue="metrics" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-8 p-0.5">
                <TabsTrigger value="metrics" className="text-[10px]">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-[10px]">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Time Series
                </TabsTrigger>
                <TabsTrigger value="analysis" className="text-[10px]">
                  <Activity className="h-3 w-3 mr-1" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="metrics" className="mt-3">
                {visualizationData && currentWindowData ? (
                  <MetricsDashboard
                    nodes={currentWindowData.nodes}
                    edges={currentWindowData.edges}
                    currentTime={currentWindowTime}
                    isPlaying={isPlaying}
                  />
                ) : (
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-5 flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                        <p className="text-xs text-gray-500">
                          Complete analysis to view metrics
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-3">
                {visualizationData ? (
                  <Card className="border-none shadow-sm p-2">
                    <div className="flex justify-end mb-2 px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={handleExportTimeSeriesImage}
                          >
                            <Image className="h-4 w-4 mr-2" />
                            Save as PNG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportTimeSeriesCSV}>
                            <FileText className="h-4 w-4 mr-2" />
                            Save as CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div ref={timeSeriesRef}>
                      <TimeSeriesChart
                        data={visualizationData.metrics_timeline.map(
                          (item) => ({
                            date: new Date(item.time),
                            density: item.density,
                            nodes: item.nodes,
                            edges: item.edges,
                            clustering:
                              typeof item.clustering === "number"
                                ? item.clustering
                                : 0,
                          }),
                        )}
                        width={800}
                        height={220}
                      />
                    </div>
                  </Card>
                ) : (
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-5 flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                        <p className="text-xs text-gray-500">
                          Complete analysis to view time series
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="analysis" className="mt-3">
                <Card className="border-none shadow-sm">
                  <CardContent className="p-5 flex items-center justify-center">
                    <div className="text-center">
                      <Activity className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs text-gray-500">
                        Advanced analysis coming soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
