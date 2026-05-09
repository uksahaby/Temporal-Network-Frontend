import axios, { AxiosInstance, AxiosError } from "axios";

export interface NetworkNode {
  id: string;
  label?: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  timestamp?: number;
  startTime?: number;
  endTime?: number;
}

// UploadResponse interface definition
export interface UploadResponse {
  status: string;
  file_id: string;
  filename: string;
  columns: string[];
  rows: number;
  has_processed_data: boolean;
  suggested_mapping: Record<string, string>;
  upload_time?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AnalysisRequest {
  file_id: string;
  time_resolution: "minute" | "hour" | "day" | "week" | string;
  sampling_rate?: number;
  metrics_to_compute?: string[];
  column_mapping?: Record<string, string>;
  generate_missing?: boolean;
}

export interface AnalysisStatus {
  status: "processing" | "completed" | "failed" | "needs_mapping";
  task_id?: string;
  file_id?: string;
  message?: string;
  error?: string;
  progress?: string;
  submitted_at?: string;
  completed_at?: string;
  failed_at?: string;
  data?: VisualizationData;
  summary?: {
    num_windows: number;
    total_nodes: number;
    total_edges: number;
    time_range: {
      start: string;
      end: string;
      duration_days: number;
    };
    columns_used?: {
      source: boolean;
      target: boolean;
      timestamp: boolean;
      weight: boolean;
    };
    timestamp_inferred?: boolean;
  };
  available_columns?: string[];
  suggested_mapping?: Record<string, string>;
  required_columns?: string[];
  optional_columns?: string[];
}

export interface VisualizationData {
  time_windows: Array<{
    start: string;
    end: string;
    nodes: Array<{
      id: string;
      label?: string;
      degree?: number;
      centrality?: number;
      group?: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight?: number;
      id?: string;
    }>;
    window_key?: string;
    truncated?: boolean;
    original_counts?: {
      nodes: number;
      edges: number;
    };
  }>;
  metrics_timeline: Array<{
    time: string;
    density: number;
    nodes: number;
    edges: number;
    components: number;
    clustering?: number;
    giant_component?: number;
    max_degree?: number;
  }>;
  summary: {
    total_time_windows?: number;
    total_unique_nodes: number;
    total_edges: number;
    time_span: {
      start: string | null;
      end: string | null;
    };
  };
}

export interface FileInfo {
  file_id: string;
  filename: string;
  columns: string[];
  rows: number;
  has_processed_data: boolean;
  suggested_mapping: Record<string, string>;
  processed_summary?: {
    total_edges: number;
    unique_nodes: number;
    time_range: {
      start: string;
      end: string;
      duration_days: number;
    };
    columns_used: {
      source: boolean;
      target: boolean;
      timestamp: boolean;
      weight: boolean;
    };
  };
}

export interface FilesListResponse {
  files: Array<{
    file_id: string;
    filename: string;
    size: number;
    rows: number;
    columns: string[];
    has_processed_data: boolean;
    upload_time: string;
  }>;
}

export interface DeleteFileResponse {
  status: string;
  file_id: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  active_tasks: number;
}

class NetworkApiClient {
  private client: AxiosInstance;

  private async sleep(ms: number, signal?: AbortSignal) {
    if (!signal) {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return;
    }

    if (signal.aborted) {
      throw new Error("Request cancelled");
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        reject(new Error("Request cancelled"));
      };

      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      timeout: 900000, // 15 minutes for very large files/analyses
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const responseData = error.response?.data as unknown;
        const status = error.response?.status;
        const url = error.config?.url;
        const method = error.config?.method;
        const offlineMessage =
          "Unable to reach the server. Please check if the backend is running.";

        // Improved: always extract backend error details and display mapping errors
        let errorData = error.message;
        if (responseData) {
          if (typeof responseData === "string") {
            errorData = responseData;
          } else if (
            typeof responseData === "object" &&
            responseData !== null
          ) {
            const dataObj = responseData as Record<string, any>;
            // FastAPI may return detail as string or object
            if ("detail" in dataObj) {
              const detailVal = dataObj.detail;
              if (typeof detailVal === "string") {
                errorData = detailVal;
              } else if (typeof detailVal === "object" && detailVal !== null) {
                // Mapping error: show mapping UI details
                const mappingMsg =
                  detailVal.message ||
                  "Column mapping required. Please map all required columns.";
                errorData = mappingMsg;
              }
            } else if (
              "message" in dataObj &&
              typeof dataObj.message === "string"
            ) {
              errorData = dataObj.message;
            } else if (
              "error" in dataObj &&
              typeof dataObj.error === "string"
            ) {
              errorData = dataObj.error;
            } else {
              errorData = JSON.stringify(dataObj);
            }
          }
        }

        // Show user-friendly alert for mapping errors
        if (
          typeof responseData === "object" &&
          responseData !== null &&
          "detail" in responseData &&
          typeof (responseData as any).detail === "object" &&
          (responseData as any).detail !== null &&
          (responseData as any).detail.status === "needs_mapping"
        ) {
          // If backend mapping error is empty, show a more helpful message
          const detailObj = (responseData as any).detail;
          if (Object.keys(detailObj).length === 0) {
            alert(
              "Backend returned an empty mapping error. Please check your file headers and ensure they match required columns (source, target, timestamp). If the problem persists, contact backend support.",
            );
            console.error("Backend mapping error: (empty object)", detailObj);
          } else {
            alert(
              detailObj.message ||
                "Column mapping required. Please map all required columns and try again.",
            );
            console.error("Backend mapping error:", detailObj);
          }
        } else if (typeof errorData === "object" && errorData !== null) {
          if (Object.keys(errorData).length === 0) {
            alert(
              "Backend returned an empty error object. You may need to map the columns or check backend response details.",
            );
            console.error("Backend error response: (empty object)", errorData);
          } else {
            alert((errorData as any).message || JSON.stringify(errorData));
            console.error("Backend error response:", errorData);
          }
        } else {
          alert(errorData);
          console.error("API Error Details:", errorData);
        }

        if (!error.response) {
          throw new Error(offlineMessage);
        }

        // Handle different error response formats
        let errorMessage = `Request failed${status ? ` (HTTP ${status})` : ""}`;

        if (responseData) {
          if (typeof responseData === "string") {
            errorMessage = responseData;
          } else if (
            typeof responseData === "object" &&
            responseData !== null
          ) {
            const data = responseData as Record<string, any>;
            errorMessage =
              (data.detail as string) ||
              (data.message as string) ||
              (data.error as string);
            // If errorMessage is empty or just '{}', show a user-friendly message
            if (
              !errorMessage ||
              errorMessage === "{}" ||
              (typeof errorMessage === "string" && errorMessage.trim() === "")
            ) {
              // Special handling for mapping errors (empty object)
              errorMessage =
                "Column mapping required or backend mapping error. Please check your file and try again, or map columns manually if prompted.";
            }
          }
        } else {
          // Try to extract task_id from error.config or responseData
          let taskId = null;
          if (error.config && error.config.url) {
            const match = error.config.url.match(/\/api\/analysis\/(.+)/);
            if (match && match[1]) taskId = match[1];
          }
          if (responseData && typeof responseData === "object") {
            const data = responseData as Record<string, any>;
            if (data.task_id) taskId = data.task_id;
          }
          errorMessage = `Analysis not found for task_id '${taskId ?? "null"}'. Possible reasons: task_id is invalid, analysis was not started, or backend was restarted and cache was cleared.`;
        }

        // Log backend response for debugging
        console.warn("Backend error response:", responseData);

        // Ensure errorMessage is always a string
        let safeErrorMessage = errorMessage;
        if (typeof safeErrorMessage !== "string") {
          safeErrorMessage = JSON.stringify(safeErrorMessage);
        }
        throw new Error(safeErrorMessage);
      },
    );
  }

  /**
   * Upload a CSV/Excel file to the backend
   */
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
    options?: { signal?: AbortSignal },
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.client.post("/api/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percentage);
        }
      },
      signal: options?.signal,
    });

    return response.data;
  }

  /**
   * Start analysis for an uploaded file
   */
  async analyzeNetwork(
    request: AnalysisRequest,
    options?: { signal?: AbortSignal },
  ): Promise<AnalysisStatus> {
    const response = await this.client.post("/api/analyze", request, {
      signal: options?.signal,
    });
    return response.data;
  }

  /**
   * Fetch analysis status/results
   */
  async getAnalysisResults(
    taskId: string,
    options?: { signal?: AbortSignal },
  ): Promise<AnalysisStatus> {
    const response = await this.client.get(`/api/analysis/${taskId}`, {
      signal: options?.signal,
    });
    return response.data;
  }

  /**
   * Get column information for a file
   */
  async getFileColumns(
    fileId: string,
    options?: { signal?: AbortSignal },
  ): Promise<FileInfo> {
    const response = await this.client.get(`/api/file/${fileId}/columns`, {
      signal: options?.signal,
    });
    return response.data;
  }

  /**
   * Poll for analysis completion
   */
  async pollAnalysis(
    taskId: string,
    options?: {
      signal?: AbortSignal;
      interval?: number;
      maxAttempts?: number;
      onProgress?: (status: AnalysisStatus) => void;
    },
  ): Promise<AnalysisStatus> {
    const interval = options?.interval ?? 2000;
    const maxAttempts = options?.maxAttempts ?? 3600; // 2 hours with 2s interval
    let attempts = 0;

    while (attempts < maxAttempts) {
      const result = await this.getAnalysisResults(taskId, {
        signal: options?.signal,
      });

      options?.onProgress?.(result);

      if (
        result.status === "completed" ||
        result.status === "failed" ||
        result.status === "needs_mapping"
      ) {
        return result;
      }

      attempts += 1;
      await this.sleep(interval, options?.signal);
    }

    const waitedMs = attempts * interval;
    throw new Error(
      `Analysis timeout after ${Math.round(waitedMs / 1000)}s (taskId=${taskId})`,
    );
  }

  /**
   * List all uploaded files
   */
  async listFiles(options?: {
    signal?: AbortSignal;
  }): Promise<FilesListResponse> {
    const response = await this.client.get("/api/files", {
      signal: options?.signal,
    });
    return response.data;
  }

  /**
   * Delete a file
   */
  async deleteFile(
    fileId: string,
    options?: { signal?: AbortSignal },
  ): Promise<DeleteFileResponse> {
    const response = await this.client.delete(`/api/file/${fileId}`, {
      signal: options?.signal,
    });
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(options?: {
    signal?: AbortSignal;
  }): Promise<HealthCheckResponse> {
    const response = await this.client.get("/api/health", {
      signal: options?.signal,
    });
    return response.data;
  }

  /**
   * Clear cache (development only)
   */
  async clearCache(options?: {
    signal?: AbortSignal;
  }): Promise<{ status: string }> {
    const response = await this.client.delete("/api/cache", {
      signal: options?.signal,
    });
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new NetworkApiClient();
export const api = apiClient;

// Export individual functions for convenience
export const uploadFile = apiClient.uploadFile.bind(apiClient);
export const analyzeNetwork = apiClient.analyzeNetwork.bind(apiClient);
export const getAnalysisResults = apiClient.getAnalysisResults.bind(apiClient);
export const getFileColumns = apiClient.getFileColumns.bind(apiClient);
export const pollAnalysis = apiClient.pollAnalysis.bind(apiClient);
export const listFiles = apiClient.listFiles.bind(apiClient);
export const deleteFile = apiClient.deleteFile.bind(apiClient);
export const healthCheck = apiClient.healthCheck.bind(apiClient);
export const clearCache = apiClient.clearCache.bind(apiClient);
