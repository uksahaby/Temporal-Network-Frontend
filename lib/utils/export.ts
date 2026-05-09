/**
 * Export utilities for analysis data, charts, and visualizations
 */

import * as XLSX from "xlsx";

// ============================================================================
// TYPES
// ============================================================================

export interface ExportAnalysisData {
  summary: {
    totalNodes: number;
    totalEdges: number;
    timeWindows: number;
    timeSpan: { start: string; end: string };
    fileName?: string;
    analyzedAt: string;
  };
  timeWindows: Array<{
    index: number;
    start: string;
    end: string;
    nodes: number;
    edges: number;
    density?: number;
    clustering?: number;
  }>;
  nodes?: Array<{
    id: string;
    label?: string;
    degree?: number;
    community?: number;
    degreeCentrality?: number;
    betweennessCentrality?: number;
    closenessCentrality?: number;
    eigenvectorCentrality?: number;
    pagerank?: number;
  }>;
  edges?: Array<{
    source: string;
    target: string;
    weight?: number;
    timestamp?: string | number;
  }>;
  communities?: Array<{
    id: number;
    nodeCount: number;
    avgDegree?: number;
    density?: number;
  }>;
  metrics?: {
    structural?: {
      density?: number;
      clustering?: number;
      diameter?: number;
      avgPathLength?: number;
    };
    centrality?: Record<string, Record<string, number>>;
    temporal?: Record<string, Record<string, number>>;
  };
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Download an Excel workbook
 */
export function downloadWorkbook(
  workbook: XLSX.WorkBook,
  filename: string,
): void {
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

/**
 * Export full analysis data to Excel with multiple sheets
 */
export function exportAnalysisToExcel(data: ExportAnalysisData): void {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ["Analysis Summary"],
    [""],
    ["Generated At", data.summary.analyzedAt],
    ["File Name", data.summary.fileName || "N/A"],
    [""],
    ["Network Statistics"],
    ["Total Nodes", data.summary.totalNodes],
    ["Total Edges", data.summary.totalEdges],
    ["Time Windows", data.summary.timeWindows],
    [""],
    ["Time Span"],
    ["Start", data.summary.timeSpan.start],
    ["End", data.summary.timeSpan.end],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryData),
    "Summary",
  );

  // Time Windows Sheet
  if (data.timeWindows.length > 0) {
    const windowsSheet = XLSX.utils.json_to_sheet(
      data.timeWindows.map((w) => ({
        "Window #": w.index + 1,
        Start: w.start,
        End: w.end,
        Nodes: w.nodes,
        Edges: w.edges,
        Density: w.density?.toFixed(6) || "",
        Clustering: w.clustering?.toFixed(6) || "",
      })),
    );
    XLSX.utils.book_append_sheet(wb, windowsSheet, "Time Windows");
  }

  // Nodes Sheet
  if (data.nodes && data.nodes.length > 0) {
    const nodesSheet = XLSX.utils.json_to_sheet(
      data.nodes.map((n) => ({
        "Node ID": n.id,
        Label: n.label || n.id,
        Degree: n.degree || 0,
        Community: n.community ?? "N/A",
        "Degree Centrality": n.degreeCentrality?.toFixed(6) || "",
        "Betweenness Centrality": n.betweennessCentrality?.toFixed(6) || "",
        "Closeness Centrality": n.closenessCentrality?.toFixed(6) || "",
        "Eigenvector Centrality": n.eigenvectorCentrality?.toFixed(6) || "",
        PageRank: n.pagerank?.toFixed(6) || "",
      })),
    );
    XLSX.utils.book_append_sheet(wb, nodesSheet, "Nodes");
  }

  // Edges Sheet
  if (data.edges && data.edges.length > 0) {
    // Limit to 100k edges to avoid memory issues
    const edgesToExport = data.edges.slice(0, 100000);
    const edgesSheet = XLSX.utils.json_to_sheet(
      edgesToExport.map((e, idx) => ({
        "#": idx + 1,
        Source: e.source,
        Target: e.target,
        Weight: e.weight || 1,
        Timestamp: e.timestamp || "",
      })),
    );
    XLSX.utils.book_append_sheet(wb, edgesSheet, "Edges");

    if (data.edges.length > 100000) {
      // Add note about truncation
      const noteSheet = XLSX.utils.aoa_to_sheet([
        ["Note: Edge list truncated to first 100,000 edges"],
        [`Total edges in network: ${data.edges.length}`],
      ]);
      XLSX.utils.book_append_sheet(wb, noteSheet, "Edges Note");
    }
  }

  // Communities Sheet
  if (data.communities && data.communities.length > 0) {
    const communitiesSheet = XLSX.utils.json_to_sheet(
      data.communities.map((c) => ({
        "Community ID": c.id,
        "Node Count": c.nodeCount,
        "Avg Degree": c.avgDegree?.toFixed(4) || "",
        Density: c.density?.toFixed(6) || "",
      })),
    );
    XLSX.utils.book_append_sheet(wb, communitiesSheet, "Communities");
  }

  // Structural Metrics Sheet
  if (data.metrics?.structural) {
    const structuralData = [
      ["Structural Metrics"],
      [""],
      ["Density", data.metrics.structural.density?.toFixed(6) || "N/A"],
      [
        "Clustering Coefficient",
        data.metrics.structural.clustering?.toFixed(6) || "N/A",
      ],
      ["Diameter", data.metrics.structural.diameter || "N/A"],
      [
        "Average Path Length",
        data.metrics.structural.avgPathLength?.toFixed(4) || "N/A",
      ],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(structuralData),
      "Structural Metrics",
    );
  }

  // Centrality Metrics Sheet (all nodes)
  if (data.metrics?.centrality) {
    const centralityTypes = Object.keys(data.metrics.centrality);
    if (centralityTypes.length > 0) {
      const allNodeIds = new Set<string>();
      centralityTypes.forEach((type) => {
        Object.keys(data.metrics!.centrality![type] || {}).forEach((id) =>
          allNodeIds.add(id),
        );
      });

      const centralityRows = Array.from(allNodeIds).map((nodeId) => {
        const row: Record<string, string | number> = { "Node ID": nodeId };
        centralityTypes.forEach((type) => {
          row[type] =
            data.metrics!.centrality![type]?.[nodeId]?.toFixed(6) || "";
        });
        return row;
      });

      if (centralityRows.length > 0) {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(centralityRows),
          "Centrality Details",
        );
      }
    }
  }

  // Download
  const timestamp = new Date().toISOString().split("T")[0];
  downloadWorkbook(wb, `network-analysis-${timestamp}.xlsx`);
}

// ============================================================================
// IMAGE EXPORT
// ============================================================================

/**
 * Convert SVG element to PNG and download
 */
export async function exportSvgAsPng(
  svgElement: SVGSVGElement,
  filename: string,
  scale: number = 2,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      // Get dimensions
      const bbox = svgElement.getBBox();
      const width =
        svgElement.viewBox?.baseVal?.width ||
        svgElement.clientWidth ||
        bbox.width;
      const height =
        svgElement.viewBox?.baseVal?.height ||
        svgElement.clientHeight ||
        bbox.height;

      // Set explicit dimensions on clone
      clonedSvg.setAttribute("width", String(width));
      clonedSvg.setAttribute("height", String(height));

      // Serialize SVG
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);

      // Add XML declaration and namespace if missing
      if (!svgString.includes("xmlns")) {
        svgString = svgString.replace(
          "<svg",
          '<svg xmlns="http://www.w3.org/2000/svg"',
        );
      }

      // Create blob and image
      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Fill with white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scale and draw
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        // Convert to blob and download
        canvas.toBlob((pngBlob) => {
          URL.revokeObjectURL(url);
          if (pngBlob) {
            downloadBlob(pngBlob, filename);
            resolve();
          } else {
            reject(new Error("Failed to create PNG blob"));
          }
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG image"));
      };

      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export canvas element as PNG
 */
export function exportCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, filename);
    }
  }, "image/png");
}

/**
 * Export any HTML element as PNG using html2canvas approach
 * This is a simplified version - for production, install html2canvas
 */
export async function exportElementAsPng(
  element: HTMLElement,
  filename: string,
  options: { scale?: number; backgroundColor?: string } = {},
): Promise<void> {
  const { scale = 2, backgroundColor = "white" } = options;

  // Check if element contains a canvas (like DeckGL)
  const canvas = element.querySelector("canvas");
  if (canvas) {
    // For DeckGL, we can directly export the canvas
    // But we need to capture at the right moment
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width * scale;
    tempCanvas.height = canvas.height * scale;

    const ctx = tempCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Scale and draw original canvas
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);

    exportCanvasAsPng(tempCanvas, filename);
    return;
  }

  // Check if element contains SVG
  const svg = element.querySelector("svg");
  if (svg) {
    await exportSvgAsPng(svg, filename, scale);
    return;
  }

  throw new Error("No canvas or SVG found in element");
}

/**
 * Export DeckGL visualization as PNG
 * Requires the deck instance or canvas reference
 */
export function exportDeckGLAsPng(
  deckCanvas: HTMLCanvasElement,
  filename: string,
  options: { backgroundColor?: string } = {},
): void {
  const { backgroundColor = "#1a1a2e" } = options;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = deckCanvas.width;
  tempCanvas.height = deckCanvas.height;

  const ctx = tempCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Fill background (DeckGL canvas may be transparent)
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // Draw the deck canvas
  ctx.drawImage(deckCanvas, 0, 0);

  exportCanvasAsPng(tempCanvas, filename);
}

// ============================================================================
// TIME SERIES DATA EXPORT
// ============================================================================

export interface TimeSeriesDataPoint {
  date: Date | string;
  density?: number;
  nodes?: number;
  edges?: number;
  clustering?: number;
  [key: string]: any;
}

/**
 * Export time series data to CSV
 */
export function exportTimeSeriesCSV(
  data: TimeSeriesDataPoint[],
  filename: string,
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val instanceof Date) {
            return val.toISOString();
          }
          if (typeof val === "string" && val.includes(",")) {
            return `"${val}"`;
          }
          return val ?? "";
        })
        .join(","),
    ),
  ].join("\n");

  downloadBlob(
    new Blob([csvContent], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}

/**
 * Export time series data to Excel
 */
export function exportTimeSeriesExcel(
  data: TimeSeriesDataPoint[],
  filename: string,
): void {
  const wb = XLSX.utils.book_new();

  const processedData = data.map((row) => ({
    ...row,
    date: row.date instanceof Date ? row.date.toISOString() : row.date,
  }));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(processedData),
    "Time Series",
  );

  downloadWorkbook(wb, filename);
}
