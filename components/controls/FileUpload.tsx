"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  FileUp,
  HardDrive,
  Calendar,
  FileType,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface FileUploadProps {
  onUploadComplete: (result: any) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [columnMapping, setColumnMapping] = useState<
    Record<string, string> | undefined
  >(undefined);
  const [mappingSuggestion, setMappingSuggestion] = useState<any>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [forceMapping, setForceMapping] = useState(false);

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
    // Validate file size (max 2GB)
    if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
      setError("File size must be less than 2GB");
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;
      validateAndSetFile(selectedFile);
    },
    [],
  );

  // Auto-map columns if possible
  const autoMapColumns = useCallback((suggestion: any) => {
    // Use keys of suggested_mapping as required columns if required_columns is not present
    const required = suggestion.suggested_mapping
      ? Object.keys(suggestion.suggested_mapping)
      : [];
    const available = suggestion.available_columns || [];
    const suggested = suggestion.suggested_mapping || {};
    const mapping: Record<string, string> = {};
    for (const col of required) {
      // Prefer backend suggestion, else try exact match, else empty
      if (suggested[col]) {
        mapping[col] = suggested[col];
      } else if (available.includes(col)) {
        mapping[col] = col;
      } else {
        mapping[col] = "";
      }
    }
    return mapping;
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress for large files
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Upload to backend
      let response;
      try {
        response = await api.uploadFile(file);
      } catch (err: any) {
        // Show backend error for missing timestamp mapping
        setError(err?.message || "Upload failed");
        setIsUploading(false);
        clearInterval(progressInterval);
        return;
      }

      clearInterval(progressInterval);
      setProgress(100);

      // If backend suggests column mapping, show mapping UI
      if (response.status === "needs_mapping" || response.suggested_mapping) {
        setMappingSuggestion(response);
        // Auto-map columns
        const mapping = autoMapColumns(response);
        setColumnMapping(mapping);
        // If all required columns are mapped, submit automatically
        // Use keys of suggested_mapping as required columns if required_columns is not present
        const required = response.suggested_mapping
          ? Object.keys(response.suggested_mapping)
          : [];
        const allMapped = required.every(
          (col: string) => mapping[col] && mapping[col] !== "",
        );
        if (allMapped) {
          // Submit mapping automatically
          setShowMapping(false);
          setIsUploading(true);
          setError(null);
          try {
            const analysisResponse = await api.analyzeNetwork({
              file_id: response.file_id,
              column_mapping: mapping,
              time_resolution: "hour",
            });
            onUploadComplete(analysisResponse);
          } catch (err: any) {
            setError(err?.message || "Column mapping failed");
          } finally {
            setIsUploading(false);
          }
        } else {
          setShowMapping(true);
        }
        setIsUploading(false);
        return;
      }

      // Notify parent component
      onUploadComplete(response);

      // Reset progress after showing success
      setTimeout(() => {
        setProgress(0);
      }, 2000);
    } catch (err: any) {
      setError((err as any).message || "Upload failed");
      setIsUploading(false);
    }
  }, [file, onUploadComplete, autoMapColumns]);

  // Fallback: Use first 3 columns as mapping
  const getFirstThreeMapping = useCallback((suggestion: any) => {
    const available = suggestion.available_columns || [];
    const required = suggestion.required_columns || [
      "source",
      "target",
      "timestamp",
    ];
    const mapping: Record<string, string> = {};
    for (let i = 0; i < required.length; i++) {
      mapping[required[i]] = available[i] || "";
    }
    return mapping;
  }, []);

  const handleMappingSubmit = async (
    e?: React.FormEvent,
    useForce?: boolean,
  ) => {
    if (e) e.preventDefault();
    if (!mappingSuggestion) return;
    let mapping = columnMapping ?? undefined;
    if (useForce) {
      mapping = getFirstThreeMapping(mappingSuggestion);
      setColumnMapping(mapping);
    }
    // Validate required columns
    const required =
      mappingSuggestion.required_columns ||
      (mappingSuggestion.suggested_mapping
        ? Object.keys(mappingSuggestion.suggested_mapping)
        : ["source", "target", "timestamp"]);
    for (const col of required) {
      if (!mapping || !mapping[col] || mapping[col] === "") {
        setError(`Please map the required column: ${col}`);
        return;
      }
    }
    setIsUploading(true);
    setError(null);
    try {
      const response = await api.analyzeNetwork({
        file_id: mappingSuggestion.file_id,
        column_mapping: mapping === null ? undefined : mapping,
        time_resolution: "hour",
      });
      setShowMapping(false);
      onUploadComplete(response);
    } catch (err: any) {
      // Show backend error for missing/invalid mapping or analysis errors
      setError(err?.message || "Column mapping or analysis failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = useCallback(() => {
    setFile(null);
    setProgress(0);
    setError(null);
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
    <div className="space-y-3">
      {/* Column Mapping UI */}
      {showMapping && mappingSuggestion && (
        <form
          onSubmit={handleMappingSubmit}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4"
        >
          <div className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            Column Mapping Required
          </div>
          <div className="mb-2 text-xs text-yellow-700 dark:text-yellow-300">
            Please map the required columns to your file headers:
          </div>
          {(
            mappingSuggestion.required_columns || [
              "source",
              "target",
              "timestamp",
            ]
          ).map((col: string) => (
            <div key={col} className="mb-2">
              <label className="block text-xs font-medium mb-1">{col}</label>
              <select
                className="w-full border rounded p-1 text-xs"
                value={columnMapping?.[col] ?? ""}
                onChange={(e) =>
                  setColumnMapping((prev) => ({
                    ...prev,
                    [col]: e.target.value,
                  }))
                }
                required
              >
                <option value="">Select column</option>
                {mappingSuggestion.available_columns?.map((header: string) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <Button type="submit" size="sm" className="mt-2">
            Submit Mapping
          </Button>
          <Button
            type="button"
            size="sm"
            className="mt-2 ml-2"
            variant="outline"
            onClick={() => handleMappingSubmit(undefined, true)}
          >
            Force Mapping (First 3 Columns)
          </Button>
        </form>
      )}
      {/* Drop Zone */}
      <div
        className={`
          relative overflow-hidden transition-all duration-200
          border-2 border-dashed rounded-lg p-6
          ${
            isDragging
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99]"
              : file
                ? "border-green-300 bg-green-50/30 dark:bg-green-950/10"
                : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
          }
          ${isUploading ? "opacity-70 pointer-events-none" : ""}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center text-center">
          {/* Animated Background on Drag */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
          )}

          {/* Icon */}
          <div
            className={`
            p-3 rounded-full mb-2 transition-all
            ${
              isDragging
                ? "bg-blue-100 dark:bg-blue-900/30 scale-110"
                : file
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-gray-100 dark:bg-gray-800"
            }
          `}
          >
            {file ? (
              <FileText
                className={`
                h-6 w-6
                ${
                  isDragging
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-green-600 dark:text-green-400"
                }
              `}
              />
            ) : (
              <Upload
                className={`
                h-6 w-6
                ${
                  isDragging
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }
              `}
              />
            )}
          </div>

          {/* Text */}
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {file ? (
              <>
                <span className="text-green-600 dark:text-green-400">✓ </span>
                {file.name}
              </>
            ) : isDragging ? (
              "Drop file to upload"
            ) : (
              "Click to select or drag and drop"
            )}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-500">
            {file
              ? `${formatFileSize(file.size)} • Ready to upload`
              : "Supports any file format up to 2GB"}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 flex items-center">
              <FileUp className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              Uploading...
            </span>
            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">
              {progress}%
            </Badge>
          </div>
          <div className="relative">
            <Progress
              value={progress}
              className="h-1.5 [&>div]:bg-linear-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500"
            />
            <div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ transform: `translateX(${progress - 100}%)` }}
            />
          </div>
        </div>
      )}

      {/* Success Message - Compact */}
      {progress === 100 && !isUploading && (
        <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center">
            <div className="p-1 bg-green-100 dark:bg-green-900/50 rounded-full mr-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-green-700 dark:text-green-300 flex-1">
              Upload complete! Ready for analysis
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setProgress(0)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Error Message - Compact */}
      {error && (
        <div className="bg-linear-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start">
            <div className="p-1 bg-red-100 dark:bg-red-900/50 rounded-full mr-2 mt-0.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs text-red-700 dark:text-red-300 flex-1">
              {error}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={() => setError(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* File Details - Compact */}
      {file && !isUploading && progress !== 100 && (
        <div className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 border border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/50 rounded">
                <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                {file.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-500 hover:text-red-600"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <HardDrive className="h-3 w-3 mr-1" />
              {formatFileSize(file.size)}
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <FileType className="h-3 w-3 mr-1" />
              {file.name.substring(file.name.lastIndexOf(".")).toUpperCase()}
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(file.lastModified).toLocaleDateString()}
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            size="sm"
            className="w-full mt-2 h-7 text-xs bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload & Process
          </Button>
        </div>
      )}

      {/* Empty State Upload Button */}
      {!file && !isUploading && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs border-dashed"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Select File
        </Button>
      )}
    </div>
  );
}
