import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { parse } from "csv-parse";
import zlib from "zlib";
import readline from "readline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function envInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const LIMITS = {
  maxWindows: envInt("ANALYZE_MAX_WINDOWS", 2000),
  maxEdgesPerWindow: envInt("ANALYZE_MAX_EDGES_PER_WINDOW", 2500),
  maxEdgesStoredTotal: envInt("ANALYZE_MAX_EDGES_STORED_TOTAL", 250_000),
  maxNodesPerWindow: envInt("ANALYZE_MAX_NODES_PER_WINDOW", 2000),
  maxUniqueNodesTracked: envInt("ANALYZE_MAX_UNIQUE_NODES_TRACKED", 200_000),
};

type TimeResolution = "minute" | "hour" | "day";

type ColumnMap = {
  source: number;
  target: number;
  timestamp: number;
  weight?: number;
  id?: number;
  type?: number;
};

type VisualizationData = {
  time_windows: Array<{
    start: string;
    end: string;
    nodes: Array<{
      id: string;
      label?: string;
      degree?: number;
      group?: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight?: number;
      id?: string;
    }>;
    window_key?: string;
  }>;
  metrics_timeline: Array<{
    time: string;
    density: number;
    nodes: number;
    edges: number;
    components: number;
    clustering: number;
  }>;
  summary: {
    total_time_windows?: number;
    total_unique_nodes: number;
    total_edges: number;
    time_span: { start: string; end: string };
  };
};

type AnalysisStatus = {
  status: "processing" | "completed" | "failed";
  task_id: string;
  message?: string;
  data?: VisualizationData;
  error?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __analysisTasks: Map<string, unknown> | undefined;
}

function taskStore(): Map<string, AnalysisStatus> {
  if (!globalThis.__analysisTasks) globalThis.__analysisTasks = new Map();
  return globalThis.__analysisTasks as Map<string, AnalysisStatus>;
}

function normalizeHeaderValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES: Record<keyof ColumnMap, string[]> = {
  source: [
    "source",
    "src",
    "srcid",
    "sourceid",
    "sourcenode",
    "sourcesubreddit",
    "fromsubreddit",
    "from",
    "origin",
    "start",
    "node1",
    "nodefrom",
    "sender",
  ],
  target: [
    "target",
    "dst",
    "dstid",
    "targetid",
    "targetnode",
    "targetsubreddit",
    "tosubreddit",
    "to",
    "dest",
    "end",
    "node2",
    "nodeto",
    "receiver",
  ],
  timestamp: ["timestamp", "time", "datetime", "date", "ts", "eventtime"],
  weight: ["weight", "value", "w", "strength", "count"],
  id: ["id", "edgeid", "interactionid", "eventid"],
  type: ["type", "kind", "category"],
};

function createInputStream(filePath: string, gzip: boolean) {
  const base = fs.createReadStream(filePath);
  return gzip ? base.pipe(zlib.createGunzip()) : base;
}

async function readMagicBytes(filePath: string, length: number) {
  const fd = await fs.promises.open(filePath, "r");
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fd.read(buf, 0, length, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fd.close();
  }
}

async function isGzipFile(filePath: string) {
  const magic = await readMagicBytes(filePath, 2);
  return magic.length === 2 && magic[0] === 0x1f && magic[1] === 0x8b;
}

async function isZipFile(filePath: string) {
  const magic = await readMagicBytes(filePath, 4);
  return (
    magic.length === 4 &&
    magic[0] === 0x50 &&
    magic[1] === 0x4b &&
    magic[2] === 0x03 &&
    magic[3] === 0x04
  );
}

async function sniffDelimiterFromTextStream(
  stream: NodeJS.ReadableStream,
  maxBytes = 64 * 1024,
) {
  return new Promise<string>((resolve, reject) => {
    let buf = Buffer.alloc(0);

    const cleanup = () => {
      stream.off("data", onData);
      stream.off("error", onError);
      stream.off("end", onEnd);
      try {
        (stream as any).destroy?.();
      } catch {
        // ignore
      }
    };

    const decide = () => {
      const text = buf.toString("utf8");
      const line = text.split(/\r?\n/)[0] ?? "";
      const tabCount = (line.match(/\t/g) ?? []).length;
      const commaCount = (line.match(/,/g) ?? []).length;
      const semicolonCount = (line.match(/;/g) ?? []).length;
      if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0)
        return resolve("\t");
      if (
        semicolonCount >= commaCount &&
        semicolonCount >= tabCount &&
        semicolonCount > 0
      )
        return resolve(";");
      return resolve(",");
    };

    const onData = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length >= maxBytes || buf.includes(0x0a)) {
        cleanup();
        decide();
      }
    };
    const onError = (e: unknown) => {
      cleanup();
      reject(e);
    };
    const onEnd = () => {
      cleanup();
      decide();
    };

    stream.on("data", onData);
    stream.on("error", onError);
    stream.on("end", onEnd);
  });
}

function decideTextFormatFromSample(
  sample: string,
): { kind: "delimited"; delimiter: string } | { kind: "whitespace" } {
  const line = (sample.split(/\r?\n/)[0] ?? "").trim();
  if (!line) return { kind: "delimited", delimiter: "," };

  const tabCount = (line.match(/\t/g) ?? []).length;
  const commaCount = (line.match(/,/g) ?? []).length;
  const semicolonCount = (line.match(/;/g) ?? []).length;

  if (tabCount === 0 && commaCount === 0 && semicolonCount === 0) {
    // Likely an edge list like: "1 2 0.5 2009"
    if (/^\S+\s+\S+/.test(line)) return { kind: "whitespace" };
  }

  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0)
    return { kind: "delimited", delimiter: "\t" };
  if (
    semicolonCount >= commaCount &&
    semicolonCount >= tabCount &&
    semicolonCount > 0
  )
    return { kind: "delimited", delimiter: ";" };

  return { kind: "delimited", delimiter: "," };
}

async function sniffTextFormatFromStream(
  stream: NodeJS.ReadableStream,
  maxBytes = 64 * 1024,
) {
  return new Promise<
    { kind: "delimited"; delimiter: string } | { kind: "whitespace" }
  >((resolve, reject) => {
    let buf = Buffer.alloc(0);

    const cleanup = () => {
      stream.off("data", onData);
      stream.off("error", onError);
      stream.off("end", onEnd);
      try {
        (stream as any).destroy?.();
      } catch {
        // ignore
      }
    };

    const decide = () => {
      const sample = buf.toString("utf8");
      resolve(decideTextFormatFromSample(sample));
    };

    const onData = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length >= maxBytes || buf.includes(0x0a)) {
        cleanup();
        decide();
      }
    };
    const onError = (e: unknown) => {
      cleanup();
      reject(e);
    };
    const onEnd = () => {
      cleanup();
      decide();
    };

    stream.on("data", onData);
    stream.on("error", onError);
    stream.on("end", onEnd);
  });
}

function inferColumnMapFromHeaderRow(row: unknown[]): ColumnMap | null {
  const normalized = row.map(normalizeHeaderValue);

  const findIndex = (aliases: string[]) => {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const sourceIdx = findIndex(HEADER_ALIASES.source);
  const targetIdx = findIndex(HEADER_ALIASES.target);
  const timestampIdx = findIndex(HEADER_ALIASES.timestamp);

  if (sourceIdx === -1 || targetIdx === -1 || timestampIdx === -1) {
    return null;
  }

  const weightIdx = findIndex(HEADER_ALIASES.weight);
  const idIdx = findIndex(HEADER_ALIASES.id);
  const typeIdx = findIndex(HEADER_ALIASES.type);

  return {
    source: sourceIdx,
    target: targetIdx,
    timestamp: timestampIdx,
    weight: weightIdx === -1 ? undefined : weightIdx,
    id: idIdx === -1 ? undefined : idIdx,
    type: typeIdx === -1 ? undefined : typeIdx,
  };
}

function defaultColumnMap(): ColumnMap {
  return { source: 0, target: 1, timestamp: 2, weight: 3 };
}

function parseTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const s = String(value).trim();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    // Special-case 4-digit years commonly used as timestamps.
    if (s.length === 4 && n >= 1900 && n <= 2100) {
      return Date.UTC(n, 0, 1);
    }
    return n < 1e12 ? n * 1000 : n;
  }

  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseWeight(value: unknown): number {
  if (value === null || value === undefined) return 1;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : 1;
}

function getWindowKey(ts: number, resolution: TimeResolution): string {
  const startMs = getWindowStartMs(ts, resolution);
  const iso = new Date(startMs).toISOString();
  switch (resolution) {
    case "minute":
      return iso.slice(0, 16); // YYYY-MM-DDTHH:mm
    case "day":
      return iso.slice(0, 10); // YYYY-MM-DD
    case "hour":
    default:
      return iso.slice(0, 13); // YYYY-MM-DDTHH
  }
}

function getWindowStartMs(ts: number, resolution: TimeResolution): number {
  const d = new Date(ts);
  if (resolution === "day") {
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (resolution === "hour") {
    d.setUTCMinutes(0, 0, 0);
    return d.getTime();
  }
  // minute
  d.setUTCSeconds(0, 0);
  return d.getTime();
}

function addResolutionMs(resolution: TimeResolution): number {
  switch (resolution) {
    case "minute":
      return 60_000;
    case "day":
      return 86_400_000;
    case "hour":
    default:
      return 3_600_000;
  }
}

async function analyzeCsvFile(
  filePath: string,
  resolution: TimeResolution,
  samplingRate = 1,
  delimiter: string = ",",
  gzip: boolean = false,
) {
  const windows = new Map<
    string,
    {
      start: string;
      end: string;
      nodeDegree: Map<string, number>;
      edges: Array<{
        source: string;
        target: string;
        weight: number;
        id?: string;
      }>;
      edgeCount: number;
    }
  >();

  const allNodes = new Set<string>();
  let totalEdges = 0;
  let minTs: number | null = null;
  let maxTs: number | null = null;
  let storedEdgesTotal = 0;

  const parser = createInputStream(filePath, gzip).pipe(
    parse({
      columns: false,
      delimiter,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }),
  );

  let columnMap: ColumnMap | null = null;
  let headerChecked = false;
  let dataRow = 0;
  let yieldCounter = 0;
  let validRows = 0;

  for await (const record of parser as AsyncIterable<unknown>) {
    if (!Array.isArray(record)) continue;

    if (!headerChecked) {
      headerChecked = true;
      const inferred = inferColumnMapFromHeaderRow(record);
      if (inferred) {
        columnMap = inferred;
        continue; // skip header row
      }
      columnMap = defaultColumnMap();
    }

    dataRow += 1;
    if (samplingRate > 1 && dataRow % samplingRate !== 0) {
      continue;
    }

    yieldCounter += 1;
    if (yieldCounter % 5000 === 0) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    const map = columnMap ?? defaultColumnMap();
    const sourceRaw = record[map.source];
    const targetRaw = record[map.target];
    const tsRaw = record[map.timestamp];

    if (!sourceRaw || !targetRaw) continue;
    const ts = parseTimestamp(tsRaw);
    if (ts === null) continue;

    validRows += 1;

    const source = String(sourceRaw);
    const target = String(targetRaw);
    const weight =
      map.weight !== undefined ? parseWeight(record[map.weight]) : 1;
    const edgeId = map.id !== undefined ? String(record[map.id] ?? "") : "";

    const key = getWindowKey(ts, resolution);

    if (!windows.has(key) && windows.size >= LIMITS.maxWindows) {
      // Avoid unbounded memory from pathological timestamps.
      continue;
    }

    if (!windows.has(key)) {
      const startMs = getWindowStartMs(ts, resolution);
      const endMs = startMs + addResolutionMs(resolution);
      windows.set(key, {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        nodeDegree: new Map(),
        edges: [],
        edgeCount: 0,
      });
    }

    const win = windows.get(key)!;
    win.edgeCount += 1;
    if (
      storedEdgesTotal < LIMITS.maxEdgesStoredTotal &&
      win.edges.length < LIMITS.maxEdgesPerWindow
    ) {
      win.edges.push({
        source,
        target,
        weight,
        id: edgeId || undefined,
      });
      storedEdgesTotal += 1;
    }

    win.nodeDegree.set(source, (win.nodeDegree.get(source) ?? 0) + 1);
    win.nodeDegree.set(target, (win.nodeDegree.get(target) ?? 0) + 1);

    if (allNodes.size < LIMITS.maxUniqueNodesTracked) {
      allNodes.add(source);
      allNodes.add(target);
    }
    totalEdges += 1;

    minTs = minTs === null ? ts : Math.min(minTs, ts);
    maxTs = maxTs === null ? ts : Math.max(maxTs, ts);
  }

  // If mapping could not be inferred and no valid data rows were parsed, throw error
  if (validRows === 0) {
    throw new Error(
      columnMap && columnMap !== defaultColumnMap()
        ? "Column mapping failed: no valid data rows parsed."
        : "Column mapping could not be inferred from header. Please check your file or provide manual mapping.",
    );
  }

  const sortedKeys = Array.from(windows.keys()).sort();

  const time_windows: VisualizationData["time_windows"] = [];
  const metrics_timeline: VisualizationData["metrics_timeline"] = [];

  for (const key of sortedKeys) {
    const win = windows.get(key)!;
    const nodeEntries = Array.from(win.nodeDegree.entries());
    nodeEntries.sort((a, b) => b[1] - a[1]);
    const nodes = nodeEntries
      .slice(0, LIMITS.maxNodesPerWindow)
      .map(([id, degree]) => ({
        id,
        label: id,
        degree,
      }));

    const edges = win.edges.map((e, idx) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      id: e.id ?? `${e.source}-${e.target}-${idx}`,
    }));

    const n = nodes.length;
    const m = win.edgeCount;
    const density = n > 1 ? m / (n * (n - 1)) : 0;

    time_windows.push({
      start: win.start,
      end: win.end,
      nodes,
      edges,
      window_key: key,
    });

    metrics_timeline.push({
      time: win.start,
      density,
      nodes: n,
      edges: m,
      components: n > 0 ? 1 : 0,
      clustering: 0,
    });
  }

  const spanStart = minTs
    ? new Date(minTs).toISOString()
    : new Date().toISOString();
  const spanEnd = maxTs ? new Date(maxTs).toISOString() : spanStart;

  const data: VisualizationData = {
    time_windows,
    metrics_timeline,
    summary: {
      total_time_windows: time_windows.length,
      total_unique_nodes: allNodes.size,
      total_edges: totalEdges,
      time_span: { start: spanStart, end: spanEnd },
    },
  };

  return data;
}

type WhitespaceEdgeSchema = {
  sourceIndex: number;
  targetIndex: number;
  tsIndex: number; // -1 means no timestamp column
  weightIndex?: number;
};

function evaluateWhitespaceSchema(
  samples: string[][],
  schema: WhitespaceEdgeSchema,
) {
  let tsOk = 0;
  let weightOk = 0;
  const nodeSet = new Set<string>();

  let tsMin = Number.POSITIVE_INFINITY;
  let tsMax = Number.NEGATIVE_INFINITY;
  let tsPrev: number | null = null;
  let tsParsedCount = 0;
  let tsNonDecreasing = 0;

  const timeLikeScoreForIndex = (index: number) => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let prev: number | null = null;
    let parsed = 0;
    let nonDecreasing = 0;

    for (const parts of samples) {
      if (parts.length <= index) continue;
      const v = parseTimestamp(parts[index]);
      if (v === null) continue;
      parsed += 1;
      if (prev !== null && v >= prev) nonDecreasing += 1;
      prev = v;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }

    const range = parsed > 0 ? max - min : 0;
    const ratio = parsed > 1 ? nonDecreasing / (parsed - 1) : 0;
    return { parsed, range, ratio };
  };

  for (const parts of samples) {
    const source = parts[schema.sourceIndex];
    const target = parts[schema.targetIndex];
    if (source !== undefined && target !== undefined) {
      if (nodeSet.size < 50_000) {
        nodeSet.add(String(source));
        nodeSet.add(String(target));
      }
    }

    if (schema.tsIndex >= 0) {
      const tsToken = parts[schema.tsIndex];
      const parsed = tsToken !== undefined ? parseTimestamp(tsToken) : null;
      if (parsed !== null) {
        tsOk += 1;
        tsParsedCount += 1;
        if (tsPrev !== null && parsed >= tsPrev) tsNonDecreasing += 1;
        tsPrev = parsed;
        tsMin = Math.min(tsMin, parsed);
        tsMax = Math.max(tsMax, parsed);
      }
    }

    if (schema.weightIndex === undefined) {
      weightOk += 1;
    } else {
      const wToken = parts[schema.weightIndex];
      if (wToken === undefined) continue;
      const w = parseWeight(wToken);
      if (Number.isFinite(w) && Math.abs(w) <= 1_000_000) weightOk += 1;
    }
  }

  const tsRangeMs = tsParsedCount > 0 ? tsMax - tsMin : 0;
  const tsNonDecreasingRatio =
    tsParsedCount > 1 ? tsNonDecreasing / (tsParsedCount - 1) : 0;

  // Penalize schemas where the chosen node columns look like time (monotonic + wide range).
  const sourceTimeLike = timeLikeScoreForIndex(schema.sourceIndex);
  const targetTimeLike = timeLikeScoreForIndex(schema.targetIndex);
  const nodeTimeLikePenalty =
    (sourceTimeLike.range > 3_600_000 && sourceTimeLike.ratio > 0.9 ? 1 : 0) +
    (targetTimeLike.range > 3_600_000 && targetTimeLike.ratio > 0.9 ? 1 : 0);

  return {
    tsOk,
    tsRangeMs,
    tsNonDecreasingRatio,
    weightOk,
    nodeDistinct: nodeSet.size,
    nodeTimeLikePenalty,
  };
}

function inferSocioPatternsSchema(
  samples: string[][],
): WhitespaceEdgeSchema | null {
  const rows = samples.filter((p) => p.length >= 3);
  if (rows.length < 20) return null;

  const evalTimeColumn = (index: number) => {
    let ok = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let prev: number | null = null;
    let nonDecreasing = 0;

    for (const parts of rows) {
      const v = parseTimestamp(parts[index]);
      if (v === null) continue;
      ok += 1;
      if (prev !== null && v >= prev) nonDecreasing += 1;
      prev = v;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }

    const range = ok > 0 ? max - min : 0;
    const ratio = ok > 1 ? nonDecreasing / (ok - 1) : 0;
    return { ok, range, ratio };
  };

  const distinctAt = (index: number, limit = 10_000) => {
    const s = new Set<string>();
    for (const parts of rows) {
      if (parts.length <= index) continue;
      s.add(parts[index]);
      if (s.size >= limit) break;
    }
    return s.size;
  };

  // Detect: t i j [w]
  const t0 = evalTimeColumn(0);
  if (
    t0.ok >= Math.floor(rows.length * 0.8) &&
    t0.range >= 3_600_000 &&
    t0.ratio >= 0.9 &&
    distinctAt(1) <= 5000 &&
    distinctAt(2) <= 5000
  ) {
    let weightIndex: number | undefined;
    const hasFourth = rows.some((p) => p.length >= 4);
    if (hasFourth) {
      let okW = 0;
      let total = 0;
      for (const parts of rows) {
        if (parts.length < 4) continue;
        total += 1;
        const w = Number(parts[3]);
        if (Number.isFinite(w)) okW += 1;
      }
      if (total > 0 && okW / total >= 0.6) weightIndex = 3;
    }

    return { sourceIndex: 1, targetIndex: 2, tsIndex: 0, weightIndex };
  }

  // Detect: i j t [w]
  const t2 = evalTimeColumn(2);
  if (
    t2.ok >= Math.floor(rows.length * 0.8) &&
    t2.range >= 3_600_000 &&
    t2.ratio >= 0.9 &&
    distinctAt(0) <= 5000 &&
    distinctAt(1) <= 5000
  ) {
    return { sourceIndex: 0, targetIndex: 1, tsIndex: 2 };
  }

  return null;
}

async function inferWhitespaceSchema(filePath: string, gzip: boolean) {
  const samples: string[][] = [];
  const input = createInputStream(filePath, gzip);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  try {
    for await (const line of rl) {
      const trimmed = String(line).trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("#")) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;
      samples.push(parts);
      if (samples.length >= 200) break;
    }
  } finally {
    try {
      rl.close();
    } catch {
      // ignore
    }
    try {
      (input as any).destroy?.();
    } catch {
      // ignore
    }
  }

  // Sensible defaults if we couldn't sample.
  if (samples.length === 0) {
    return {
      sourceIndex: 0,
      targetIndex: 1,
      tsIndex: -1,
    } satisfies WhitespaceEdgeSchema;
  }

  const socio = inferSocioPatternsSchema(samples);
  if (socio) return socio;

  const candidates: WhitespaceEdgeSchema[] = [
    // src dst [weight] [timestamp]
    { sourceIndex: 0, targetIndex: 1, tsIndex: 3, weightIndex: 2 },
    // timestamp src dst [weight]
    { sourceIndex: 1, targetIndex: 2, tsIndex: 0, weightIndex: 3 },
    // src dst timestamp
    { sourceIndex: 0, targetIndex: 1, tsIndex: 2 },
    // timestamp src dst
    { sourceIndex: 1, targetIndex: 2, tsIndex: 0 },
    // src dst weight (no timestamp)
    { sourceIndex: 0, targetIndex: 1, tsIndex: -1, weightIndex: 2 },
    // src dst (no timestamp)
    { sourceIndex: 0, targetIndex: 1, tsIndex: -1 },
  ];

  const scored = candidates
    .map((schema) => ({
      schema,
      score: evaluateWhitespaceSchema(samples, schema),
    }))
    .filter(({ schema }) =>
      // Must have valid indices for the observed column counts
      samples.some(
        (parts) =>
          parts.length > Math.max(schema.sourceIndex, schema.targetIndex) &&
          (schema.tsIndex < 0 || parts.length > schema.tsIndex) &&
          (schema.weightIndex === undefined ||
            parts.length > schema.weightIndex),
      ),
    );

  // Pick best by: timestamps that look like timestamps (range + monotonicity),
  // then weight plausibility, then avoid node columns that look like time.
  scored.sort((a, b) => {
    if (b.score.tsOk !== a.score.tsOk) return b.score.tsOk - a.score.tsOk;
    if (b.score.tsRangeMs !== a.score.tsRangeMs)
      return b.score.tsRangeMs - a.score.tsRangeMs;
    if (b.score.tsNonDecreasingRatio !== a.score.tsNonDecreasingRatio)
      return b.score.tsNonDecreasingRatio - a.score.tsNonDecreasingRatio;
    if (a.score.nodeTimeLikePenalty !== b.score.nodeTimeLikePenalty)
      return a.score.nodeTimeLikePenalty - b.score.nodeTimeLikePenalty;
    if (b.score.weightOk !== a.score.weightOk)
      return b.score.weightOk - a.score.weightOk;
    return a.score.nodeDistinct - b.score.nodeDistinct;
  });

  const best = scored[0];
  if (!best) {
    return {
      sourceIndex: 0,
      targetIndex: 1,
      tsIndex: -1,
    } satisfies WhitespaceEdgeSchema;
  }

  // If no schema can reliably parse timestamps, fall back to no-timestamp.
  const minTsOk = Math.max(3, Math.floor(samples.length * 0.2));
  if (best.schema.tsIndex >= 0 && best.score.tsOk < minTsOk) {
    // Prefer weight if 3rd column looks numeric.
    const hasThird = samples.some((p) => p.length >= 3);
    if (hasThird) {
      return {
        sourceIndex: 0,
        targetIndex: 1,
        tsIndex: -1,
        weightIndex: 2,
      } satisfies WhitespaceEdgeSchema;
    }
    return {
      sourceIndex: 0,
      targetIndex: 1,
      tsIndex: -1,
    } satisfies WhitespaceEdgeSchema;
  }

  return best.schema;
}

async function analyzeWhitespaceFile(
  filePath: string,
  resolution: TimeResolution,
  samplingRate = 1,
  gzip: boolean = false,
  schema?: WhitespaceEdgeSchema,
) {
  const windows = new Map<
    string,
    {
      start: string;
      end: string;
      nodeDegree: Map<string, number>;
      edges: Array<{
        source: string;
        target: string;
        weight: number;
        id?: string;
      }>;
      edgeCount: number;
    }
  >();

  const allNodes = new Set<string>();
  let totalEdges = 0;
  let minTs: number | null = null;
  let maxTs: number | null = null;
  let storedEdgesTotal = 0;

  const selectedSchema =
    schema ?? (await inferWhitespaceSchema(filePath, gzip));

  const input = createInputStream(filePath, gzip);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let row = 0;
  let yieldCounter = 0;
  for await (const line of rl) {
    const trimmed = String(line).trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;

    row += 1;
    if (samplingRate > 1 && row % samplingRate !== 0) continue;

    yieldCounter += 1;
    if (yieldCounter % 5000 === 0) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    const parts = trimmed.split(/\s+/);
    if (
      parts.length <=
      Math.max(selectedSchema.sourceIndex, selectedSchema.targetIndex)
    )
      continue;

    const source = String(parts[selectedSchema.sourceIndex]);
    const target = String(parts[selectedSchema.targetIndex]);

    const weight =
      selectedSchema.weightIndex !== undefined &&
      parts.length > selectedSchema.weightIndex
        ? parseWeight(parts[selectedSchema.weightIndex])
        : 1;

    let timestamp = Date.now();
    if (selectedSchema.tsIndex >= 0) {
      const tsToken = parts[selectedSchema.tsIndex];
      const ts = parseTimestamp(tsToken);
      if (ts === null) continue;
      timestamp = ts;
    }

    const key = getWindowKey(timestamp, resolution);
    if (!windows.has(key) && windows.size >= LIMITS.maxWindows) continue;

    if (!windows.has(key)) {
      const startMs = getWindowStartMs(timestamp, resolution);
      const endMs = startMs + addResolutionMs(resolution);
      windows.set(key, {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        nodeDegree: new Map(),
        edges: [],
        edgeCount: 0,
      });
    }

    const win = windows.get(key)!;
    win.edgeCount += 1;
    if (
      storedEdgesTotal < LIMITS.maxEdgesStoredTotal &&
      win.edges.length < LIMITS.maxEdgesPerWindow
    ) {
      win.edges.push({ source, target, weight });
      storedEdgesTotal += 1;
    }
    win.nodeDegree.set(source, (win.nodeDegree.get(source) ?? 0) + 1);
    win.nodeDegree.set(target, (win.nodeDegree.get(target) ?? 0) + 1);

    if (allNodes.size < LIMITS.maxUniqueNodesTracked) {
      allNodes.add(source);
      allNodes.add(target);
    }
    totalEdges += 1;
    minTs = minTs === null ? timestamp : Math.min(minTs, timestamp);
    maxTs = maxTs === null ? timestamp : Math.max(maxTs, timestamp);
  }

  const sortedKeys = Array.from(windows.keys()).sort();
  const time_windows: VisualizationData["time_windows"] = [];
  const metrics_timeline: VisualizationData["metrics_timeline"] = [];

  for (const key of sortedKeys) {
    const win = windows.get(key)!;
    const nodeEntries = Array.from(win.nodeDegree.entries());
    nodeEntries.sort((a, b) => b[1] - a[1]);
    const nodes = nodeEntries
      .slice(0, LIMITS.maxNodesPerWindow)
      .map(([id, degree]) => ({
        id,
        label: id,
        degree,
      }));

    const edges = win.edges.map((e, idx) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      id: e.id ?? `${e.source}-${e.target}-${idx}`,
    }));

    const n = nodes.length;
    const m = win.edgeCount;
    const density = n > 1 ? m / (n * (n - 1)) : 0;

    time_windows.push({
      start: win.start,
      end: win.end,
      nodes,
      edges,
      window_key: key,
    });
    metrics_timeline.push({
      time: win.start,
      density,
      nodes: n,
      edges: m,
      components: n > 0 ? 1 : 0,
      clustering: 0,
    });
  }

  const spanStart = minTs
    ? new Date(minTs).toISOString()
    : new Date().toISOString();
  const spanEnd = maxTs ? new Date(maxTs).toISOString() : spanStart;

  return {
    time_windows,
    metrics_timeline,
    summary: {
      total_time_windows: time_windows.length,
      total_unique_nodes: allNodes.size,
      total_edges: totalEdges,
      time_span: { start: spanStart, end: spanEnd },
    },
  } satisfies VisualizationData;
}

async function analyzeUploadedFile(
  filePath: string,
  resolution: TimeResolution,
  samplingRate: number,
) {
  const ext = path.extname(filePath).toLowerCase();
  const gzip = ext === ".gz" || (await isGzipFile(filePath));

  if (ext === ".edges") {
    return analyzeWhitespaceFile(filePath, resolution, samplingRate, gzip);
  }

  if (ext === ".xlsx" || ext === ".xls" || (await isZipFile(filePath))) {
    const xlsx = await import("xlsx");
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Excel file contains no sheets");
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      blankrows: false,
    }) as unknown[][];
    if (rows.length === 0) throw new Error("Excel file is empty");

    let columnMap: ColumnMap | null = null;
    let headerChecked = false;
    let dataRow = 0;
    let yieldCounter = 0;
    let validRows = 0;

    const windows = new Map<
      string,
      {
        start: string;
        end: string;
        nodeDegree: Map<string, number>;
        edges: Array<{
          source: string;
          target: string;
          weight: number;
          id?: string;
        }>;
        edgeCount: number;
      }
    >();
    const allNodes = new Set<string>();
    let totalEdges = 0;
    let minTs: number | null = null;
    let maxTs: number | null = null;
    let storedEdgesTotal = 0;

    for (const record of rows) {
      if (!Array.isArray(record)) continue;

      if (!headerChecked) {
        headerChecked = true;
        const inferred = inferColumnMapFromHeaderRow(record);
        if (inferred) {
          columnMap = inferred;
          continue;
        }
        columnMap = defaultColumnMap();
      }

      dataRow += 1;
      if (samplingRate > 1 && dataRow % samplingRate !== 0) continue;

      yieldCounter += 1;
      if (yieldCounter % 5000 === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }

      const map = columnMap ?? defaultColumnMap();
      const sourceRaw = record[map.source];
      const targetRaw = record[map.target];
      const tsRaw = record[map.timestamp];

      if (!sourceRaw || !targetRaw) continue;
      const ts = parseTimestamp(tsRaw);
      if (ts === null) continue;

      validRows += 1;

      const source = String(sourceRaw);
      const target = String(targetRaw);
      const weight =
        map.weight !== undefined ? parseWeight(record[map.weight]) : 1;
      const edgeId = map.id !== undefined ? String(record[map.id] ?? "") : "";

      const key = getWindowKey(ts, resolution);
      if (!windows.has(key) && windows.size >= LIMITS.maxWindows) continue;

      if (!windows.has(key)) {
        const startMs = getWindowStartMs(ts, resolution);
        const endMs = startMs + addResolutionMs(resolution);
        windows.set(key, {
          start: new Date(startMs).toISOString(),
          end: new Date(endMs).toISOString(),
          nodeDegree: new Map(),
          edges: [],
          edgeCount: 0,
        });
      }

      const win = windows.get(key)!;
      win.edgeCount += 1;
      if (
        storedEdgesTotal < LIMITS.maxEdgesStoredTotal &&
        win.edges.length < LIMITS.maxEdgesPerWindow
      ) {
        win.edges.push({ source, target, weight, id: edgeId || undefined });
        storedEdgesTotal += 1;
      }
      win.nodeDegree.set(source, (win.nodeDegree.get(source) ?? 0) + 1);
      win.nodeDegree.set(target, (win.nodeDegree.get(target) ?? 0) + 1);

      if (allNodes.size < LIMITS.maxUniqueNodesTracked) {
        allNodes.add(source);
        allNodes.add(target);
      }
      totalEdges += 1;
      minTs = minTs === null ? ts : Math.min(minTs, ts);
      maxTs = maxTs === null ? ts : Math.max(maxTs, ts);
    }

    // If mapping could not be inferred and no valid data rows were parsed, throw error
    if (validRows === 0) {
      throw new Error(
        columnMap && columnMap !== defaultColumnMap()
          ? "Column mapping failed: no valid data rows parsed."
          : "Column mapping could not be inferred from header. Please check your file or provide manual mapping.",
      );
    }

    const sortedKeys = Array.from(windows.keys()).sort();
    const time_windows: VisualizationData["time_windows"] = [];
    const metrics_timeline: VisualizationData["metrics_timeline"] = [];

    for (const key of sortedKeys) {
      const win = windows.get(key)!;
      const nodeEntries = Array.from(win.nodeDegree.entries());
      nodeEntries.sort((a, b) => b[1] - a[1]);
      const nodes = nodeEntries
        .slice(0, LIMITS.maxNodesPerWindow)
        .map(([id, degree]) => ({
          id,
          label: id,
          degree,
        }));

      const edges = win.edges.map((e, idx) => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
        id: e.id ?? `${e.source}-${e.target}-${idx}`,
      }));

      const n = nodes.length;
      const m = win.edgeCount;
      const density = n > 1 ? m / (n * (n - 1)) : 0;

      time_windows.push({
        start: win.start,
        end: win.end,
        nodes,
        edges,
        window_key: key,
      });
      metrics_timeline.push({
        time: win.start,
        density,
        nodes: n,
        edges: m,
        components: n > 0 ? 1 : 0,
        clustering: 0,
      });
    }

    const spanStart = minTs
      ? new Date(minTs).toISOString()
      : new Date().toISOString();
    const spanEnd = maxTs ? new Date(maxTs).toISOString() : spanStart;

    return {
      time_windows,
      metrics_timeline,
      summary: {
        total_time_windows: time_windows.length,
        total_unique_nodes: allNodes.size,
        total_edges: totalEdges,
        time_span: { start: spanStart, end: spanEnd },
      },
    } satisfies VisualizationData;
  }

  // Default: delimited text (csv/tsv) or gzipped delimited text.
  // For .gz we sniff delimiter; if it looks like whitespace edge list, use that parser.
  let delimiter = ext === ".tsv" ? "\t" : ",";

  if (gzip) {
    const sniffStream = createInputStream(filePath, true);
    const inferred = await sniffTextFormatFromStream(sniffStream);
    if (inferred.kind === "whitespace") {
      return analyzeWhitespaceFile(filePath, resolution, samplingRate, true);
    }
    delimiter = inferred.delimiter;
  } else {
    // Non-gz text: infer if it’s TSV/CSV/edge-list regardless of extension.
    const sniffStream = createInputStream(filePath, false);
    const inferred = await sniffTextFormatFromStream(sniffStream);
    if (inferred.kind === "whitespace") {
      return analyzeWhitespaceFile(filePath, resolution, samplingRate, false);
    }
    delimiter = inferred.delimiter;
  }

  return analyzeCsvFile(filePath, resolution, samplingRate, delimiter, gzip);
}

function resolveUploadedFilePath(fileId: string): string | null {
  const uploadDir = path.join(process.cwd(), ".uploads");
  if (!fs.existsSync(uploadDir)) return null;

  // Try to find a file starting with the ID
  const matches = fs
    .readdirSync(uploadDir)
    .filter((name) => name.startsWith(fileId));

  if (matches.length === 0) return null;
  return path.join(uploadDir, matches[0]);
}

export async function POST(request: NextRequest) {
  const task_id = crypto.randomUUID();
  const allowLocalFallback = process.env.LOCAL_ANALYSIS_FALLBACK === "1";

  try {
    const backendBase = process.env.NEXT_PUBLIC_API_URL;
    if (backendBase) {
      let payload: {
        file_id?: string;
        time_resolution?: TimeResolution | string;
        sampling_rate?: number;
        metrics_to_compute?: string[] | null;
      };

      try {
        payload = (await request.json()) as typeof payload;
      } catch {
        return NextResponse.json(
          { detail: "Invalid JSON body" },
          { status: 400 },
        );
      }

      let timeoutMs = 300_000;
      try {
        const controller = new AbortController();
        const timeoutMsRaw = process.env.BACKEND_ANALYZE_START_TIMEOUT_MS;
        timeoutMs = (() => {
          const n = timeoutMsRaw ? Number(timeoutMsRaw) : NaN;
          // Default: 5 minutes. Large datasets may take longer than 15s
          // even to schedule/initialize a background task.
          return Number.isFinite(n) && n > 0 ? n : 300_000;
        })();

        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(
          `${backendBase.replace(/\/$/, "")}/api/analyze`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload ?? {}),
            signal: controller.signal,
          },
        );

        clearTimeout(timer);

        const contentType = res.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? await res.json()
          : await res.text();

        if (!res.ok) {
          const backendDetail =
            typeof data === "object" && data !== null
              ? ((data as Record<string, unknown>).detail ??
                (data as Record<string, unknown>).message)
              : null;

          const message =
            typeof data === "string" ? data : JSON.stringify(data ?? {});

          const detail =
            typeof backendDetail === "string" && backendDetail.trim().length > 0
              ? backendDetail
              : message.slice(0, 2000) || "Backend rejected analysis request";

          // Optional local fallback (explicitly enabled only)
          if (allowLocalFallback) {
            const fileId = payload?.file_id;
            const resolution =
              payload?.time_resolution === "minute" ||
              payload?.time_resolution === "day"
                ? (payload.time_resolution as TimeResolution)
                : ("hour" as TimeResolution);
            const samplingRate = Math.max(
              1,
              Number(payload?.sampling_rate ?? 1),
            );

            if (fileId) {
              const filePath = resolveUploadedFilePath(fileId);
              if (filePath) {
                taskStore().set(task_id, { status: "processing", task_id });

                void (async () => {
                  try {
                    const localData = await analyzeUploadedFile(
                      filePath,
                      resolution,
                      samplingRate,
                    );
                    taskStore().set(task_id, {
                      status: "completed",
                      task_id,
                      data: localData,
                      message:
                        "Analysis completed (local fallback: backend rejected request)",
                    });
                  } catch (err) {
                    taskStore().set(task_id, {
                      status: "failed",
                      task_id,
                      error: err instanceof Error ? err.message : String(err),
                    });
                  }
                })();

                return NextResponse.json({ status: "processing", task_id });
              }
            }
          }

          return NextResponse.json(
            {
              status: "failed",
              task_id,
              error: message,
              detail,
              backend_status: res.status,
            },
            { status: res.status },
          );
        }

        return NextResponse.json(data, { status: res.status });
      } catch (e) {
        console.error("Backend analyze proxy failed:", e);
        if (
          e instanceof Error &&
          (e.name === "AbortError" || /aborted/i.test(e.message))
        ) {
          return NextResponse.json(
            {
              status: "failed",
              task_id,
              detail:
                "Backend analysis start timed out (backend may be busy, stuck, or the proxy timeout is too low).",
              timeout_ms: timeoutMs,
            },
            { status: 504 },
          );
        }
        if (allowLocalFallback) {
          const fileId = payload?.file_id;
          const resolution =
            payload?.time_resolution === "minute" ||
            payload?.time_resolution === "day"
              ? (payload.time_resolution as TimeResolution)
              : ("hour" as TimeResolution);
          const samplingRate = Math.max(1, Number(payload?.sampling_rate ?? 1));

          if (fileId) {
            const filePath = resolveUploadedFilePath(fileId);
            if (filePath) {
              taskStore().set(task_id, { status: "processing", task_id });
              void (async () => {
                try {
                  const localData = await analyzeUploadedFile(
                    filePath,
                    resolution,
                    samplingRate,
                  );
                  taskStore().set(task_id, {
                    status: "completed",
                    task_id,
                    data: localData,
                    message:
                      "Analysis completed (local fallback: backend unreachable)",
                  });
                } catch (err) {
                  taskStore().set(task_id, {
                    status: "failed",
                    task_id,
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              })();
              return NextResponse.json({ status: "processing", task_id });
            }
          }
        }

        return NextResponse.json(
          {
            status: "failed",
            task_id,
            detail: `Unable to reach backend at ${backendBase}`,
          },
          { status: 502 },
        );
      }
    }

    const body = (await request.json()) as {
      file_id?: string;
      time_resolution?: TimeResolution | string;
      sampling_rate?: number;
    };

    const fileId = body.file_id;
    if (!fileId) {
      return NextResponse.json({ detail: "Missing file_id" }, { status: 400 });
    }

    const resolution =
      body.time_resolution === "minute" || body.time_resolution === "day"
        ? (body.time_resolution as TimeResolution)
        : ("hour" as TimeResolution);

    const samplingRate = Math.max(1, Number(body.sampling_rate ?? 1));

    const filePath = resolveUploadedFilePath(fileId);
    if (!filePath) {
      return NextResponse.json(
        { detail: "Uploaded file not found" },
        { status: 404 },
      );
    }

    // Store a processing state immediately
    taskStore().set(task_id, { status: "processing", task_id });

    // Run analysis in the background so the API can respond immediately.
    void (async () => {
      try {
        const data = await analyzeUploadedFile(
          filePath,
          resolution,
          samplingRate,
        );
        taskStore().set(task_id, {
          status: "completed",
          task_id,
          data,
          message: "Analysis completed",
        });
      } catch (err) {
        taskStore().set(task_id, {
          status: "failed",
          task_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return NextResponse.json({ status: "processing", task_id });
  } catch (e: any) {
    console.error("Analyze failed:", e);
    taskStore().set(task_id, {
      status: "failed",
      task_id,
      error: e?.message || "Analysis failed",
    });

    return NextResponse.json({ status: "failed", task_id }, { status: 500 });
  }
}
