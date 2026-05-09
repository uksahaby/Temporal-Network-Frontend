"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
type SeparatorProps = {
  orientation?: "horizontal" | "vertical";
  className?: string;
};

const Separator = ({
  orientation = "horizontal",
  className = "",
}: SeparatorProps) => (
  <div
    role="separator"
    aria-orientation={orientation}
    className={`${orientation === "vertical" ? "w-px h-full" : "h-px w-full"} bg-gray-200 dark:bg-gray-800 ${className}`}
  />
);
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Database,
  X,
  HardDrive,
  Calendar,
  FileType,
  Code,
  Sparkles,
  ArrowRight,
  Clock,
  Grid,
  TrendingUp,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { api, type UploadResponse } from "@/lib/api/client";
import { useNetworkStore } from "@/lib/stores/network-store";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setFile: setStoreFile, setFileId, setStatus } = useNetworkStore();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
      setError("File size must be less than 2GB");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploadResult(null);
    setUploadProgress(0);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    validateAndSetFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setStatus("uploading");

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const result = await api.uploadFile(file);
      const resultFileId = result.file_id;

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(result);

      setStoreFile(file);
      if (resultFileId) {
        setFileId(resultFileId);
      }
      setStatus("idle");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Upload failed. Please check your backend connection.";

      setError(message);
      setStatus("failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = () => {
    if (uploadResult) {
      const id = uploadResult.file_id;
      if (typeof id === "string" && id.length > 0) {
        router.push(`/dashboard?file_id=${encodeURIComponent(id)}`);
      } else {
        setError("Analysis cannot start: missing or invalid file ID.");
      }
    } else {
      setError("Analysis cannot start: upload result missing.");
    }
  };

  const handleClear = useCallback(() => {
    setFile(null);
    setUploadProgress(0);
    setError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen gradient-mesh">
      <div className="max-w-6xl mx-auto p-5 md:p-7">
        {/* Header - Larger Text */}
        <div className="mb-8 fade-in-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="default"
                  className="h-10 px-3 -ml-3 text-muted-foreground hover:text-foreground group"
                >
                  <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gradient">
                  Upload Data
                </h1>
                <p className="text-base text-muted-foreground mt-1">
                  Upload any file format for temporal network analysis
                </p>
              </div>
            </div>

            {uploadResult && (
              <Badge
                variant="outline"
                className="glass glow-success border-green-500/30 text-green-700 dark:text-green-300 text-sm px-4 py-2"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Ready for Analysis
              </Badge>
            )}
          </div>
        </div>
        {/* Stats Bar - New */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 stagger-children">
          <div className="glass hover-lift rounded-xl p-4 border border-white/20 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  File Size
                </p>
                <p className="text-xl font-bold text-gradient">Up to 2GB</p>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="glass hover-lift rounded-xl p-4 border border-white/20 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Time Windows
                </p>
                <p className="text-xl font-bold text-gradient">Unlimited</p>
              </div>
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </div>
          <div className="glass hover-lift rounded-xl p-4 border border-white/20 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Network Size
                </p>
                <p className="text-xl font-bold text-gradient">1M+ nodes</p>
              </div>
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <GitBranch className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </div>
          <div className="glass hover-lift rounded-xl p-4 border border-white/20 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Metrics
                </p>
                <p className="text-xl font-bold text-gradient">4+ algorithms</p>
              </div>
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section - Main */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass border-white/20 dark:border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5 border-b border-white/10 dark:border-white/5">
                <CardTitle className="text-base font-medium flex items-center">
                  <div className="p-2 bg-primary/10 rounded-lg mr-3">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  File Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-5">
                  {/* Drop Zone - Larger */}
                  <div
                    className={`
                      relative overflow-hidden transition-all duration-300 cursor-pointer
                      border-2 border-dashed rounded-2xl
                      ${
                        isDragging
                          ? "border-primary bg-primary/5 scale-[0.99] glow-primary"
                          : file
                            ? "border-green-400/50 bg-green-500/5 glow-success"
                            : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
                      }
                      ${isUploading ? "opacity-70 pointer-events-none" : ""}
                    `}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() =>
                      !isUploading && !file && fileInputRef.current?.click()
                    }
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                    />

                    <div className="flex flex-col items-center text-center p-10">
                      {isDragging && (
                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                      )}

                      <div
                        className={`
                        p-5 rounded-2xl mb-4 transition-all duration-300
                        ${
                          isDragging
                            ? "bg-primary/20 scale-110 rotate-3"
                            : file
                              ? "bg-green-500/10"
                              : "bg-muted/50 group-hover:bg-primary/10"
                        }
                      `}
                      >
                        {file ? (
                          <FileText
                            className={`
                            h-10 w-10
                            ${isDragging ? "text-primary" : "text-green-500"}
                          `}
                          />
                        ) : (
                          <Upload
                            className={`
                            h-10 w-10 transition-all duration-300
                            ${
                              isDragging
                                ? "text-primary -translate-y-1"
                                : "text-muted-foreground"
                            }
                          `}
                          />
                        )}
                      </div>

                      <p className="text-lg font-semibold mb-2">
                        {file ? (
                          <span className="text-green-600 dark:text-green-400">
                            {file.name}
                          </span>
                        ) : isDragging ? (
                          <span className="text-primary">
                            Drop file to upload
                          </span>
                        ) : (
                          "Click to select or drag and drop"
                        )}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {file
                          ? `${formatFileSize(file.size)} • Ready to upload`
                          : "Any file format accepted • Up to 2GB"}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar - Larger */}
                  {isUploading && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                          <Upload className="h-4 w-4 mr-2 text-blue-500 animate-pulse" />
                          Uploading file...
                        </span>
                        <Badge variant="outline" className="text-xs px-3 py-1">
                          {uploadProgress}%
                        </Badge>
                      </div>
                      <Progress
                        value={uploadProgress}
                        className="h-2.5 [&>div]:bg-linear-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500"
                      />
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file!.size)} total •{" "}
                        {Math.round(
                          ((uploadProgress / 100) * file!.size) / (1024 * 1024),
                        )}{" "}
                        MB uploaded
                      </p>
                    </div>
                  )}

                  {/* Error Message - Larger */}
                  {error && (
                    <div className="bg-linear-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start">
                        <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-full mr-3">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-sm text-red-700 dark:text-red-300 flex-1 pt-0.5">
                          {error}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 -mt-1 -mr-1"
                          onClick={() => setError(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Success Message - Larger */}
                  {uploadProgress === 100 && !isUploading && !error && (
                    <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-full mr-3">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-medium text-green-700 dark:text-green-300 flex-1">
                          Upload complete! Ready for analysis
                        </span>
                      </div>
                    </div>
                  )}

                  {/* File Details - Larger */}
                  {file && !isUploading && uploadProgress !== 100 && (
                    <div className="bg-gray-50/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-200 dark:border-gray-800 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <span className="text-base font-medium text-gray-800 dark:text-gray-200 block">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              Ready to upload
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-600"
                          onClick={handleClear}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm bg-white/50 dark:bg-gray-900/30 rounded-lg p-3">
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                          <HardDrive className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                          <FileType className="h-4 w-4 mr-2 text-gray-500" />
                          <span>
                            {file.name
                              .substring(file.name.lastIndexOf("."))
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span>
                            {new Date(file.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        size="default"
                        className="w-full mt-4 h-11 text-base bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        <Upload className="h-5 w-5 mr-2" />
                        Upload & Process File
                      </Button>
                    </div>
                  )}

                  {/* Empty State Upload Button */}
                  {!file && !isUploading && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full h-12 text-base border-2 border-dashed border-gray-300 dark:border-gray-700"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Select File to Upload
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upload Results - Inline when available */}
            {uploadResult && (
              <Card className="border-none shadow-md overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                <CardHeader className="pb-3 pt-4 px-5 border-b border-gray-100 dark:border-gray-800">
                  <CardTitle className="text-base font-medium flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                    Upload Successful
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          File ID
                        </p>
                        <code className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {uploadResult.file_id?.slice(0, 16)}...
                        </code>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          Rows Detected
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {(uploadResult.rows ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          Columns
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {uploadResult.columns?.length ?? 0} columns detected
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleAnalyze}
                      size="lg"
                      className="w-full h-12 text-base bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      Analyze Temporal Network
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Instructions & Info - Larger Text */}
          <div className="space-y-6">
            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-base font-medium flex items-center">
                  <Database className="h-5 w-5 mr-2 text-emerald-600" />
                  Data Format Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center">
                      <Code className="h-4 w-4 mr-1.5 text-blue-500" />
                      Recommended Columns
                    </h4>
                    <div className="space-y-2.5">
                      {[
                        {
                          name: "source",
                          desc: "Source node ID",
                          color: "blue",
                        },
                        {
                          name: "target",
                          desc: "Target node ID",
                          color: "blue",
                        },
                        {
                          name: "timestamp",
                          desc: "Interaction time",
                          color: "blue",
                        },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center text-sm"
                        >
                          <div
                            className={`w-2 h-2 rounded-full bg-${item.color}-500 mr-2.5`}
                          />
                          <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                            {item.name}
                          </code>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            {item.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center">
                      <Grid className="h-4 w-4 mr-1.5 text-green-500" />
                      Optional Columns
                    </h4>
                    <div className="space-y-2.5">
                      {[
                        {
                          name: "weight",
                          desc: "Edge weight (default: 1)",
                          color: "green",
                        },
                        {
                          name: "type",
                          desc: "Interaction category",
                          color: "green",
                        },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center text-sm"
                        >
                          <div
                            className={`w-2 h-2 rounded-full bg-${item.color}-500 mr-2.5`}
                          />
                          <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                            {item.name}
                          </code>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            {item.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-xl p-4 mt-3">
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Any file format accepted
                        </p>
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                          CSV, Excel, JSON, Parquet, and more. Our system
                          automatically detects temporal patterns.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tip - Larger */}
            <Card className="border-none shadow-md bg-linear-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
              <CardContent className="p-5">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-purple-800 dark:text-purple-300">
                      Need help getting started?
                    </h4>
                    <p className="text-sm text-purple-700/80 dark:text-purple-400/80 mt-1">
                      Upload any file — we'll automatically detect network
                      structures and temporal patterns. No specific format
                      required.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Stats Preview */}
            {file && (
              <Card className="border-none shadow-md bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      File Preview
                    </h4>
                    <Badge
                      variant="outline"
                      className="bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs"
                    >
                      Ready
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-700/80 dark:text-amber-400/80">
                        Format
                      </span>
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        {file.name
                          .substring(file.name.lastIndexOf("."))
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-700/80 dark:text-amber-400/80">
                        Size
                      </span>
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-700/80 dark:text-amber-400/80">
                        Modified
                      </span>
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        {new Date(file.lastModified).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
