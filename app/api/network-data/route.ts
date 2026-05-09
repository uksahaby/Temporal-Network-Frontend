import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { Transform } from "stream";

export const dynamic = "force-dynamic"; // Important for large datasets

type Interval = "minute" | "hour" | "day";

type ColumnMap = {
  source: number;
  target: number;
  timestamp: number;
  weight?: number;
  id?: number;
  type?: number;
};

function normalizeHeaderValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, "") // strip BOM
    .replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES: Record<keyof ColumnMap, string[]> = {
  source: [
    "source",
    "src",
    "srcid",
    "sourceid",
    "sourcenode",
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
  // If there is no usable header row, infer by position:
  // 0=source, 1=target, 2=timestamp, 3=weight (optional)
  return { source: 0, target: 1, timestamp: 2, weight: 3 };
}

function parseTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = String(value).trim();
  if (!s) return null;

  // epoch seconds or ms
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  return null;
}

function parseWeight(value: unknown): number {
  if (value === null || value === undefined) return 1;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : 1;
}

// Memory-efficient CSV streaming
async function processLargeCSV(
  filePath: string,
  opts: { limit?: number; samplingRate?: number } = {},
) {
  const { limit = 10000, samplingRate = 500 } = opts;

  return new Promise<any[]>((resolve, reject) => {
    const results: any[] = [];
    let rowCount = 0;
    let columnMap: ColumnMap | null = null;
    let headerChecked = false;

    const parser = parse({
      columns: false,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    fs.createReadStream(filePath)
      .pipe(parser)
      .pipe(
        new Transform({
          objectMode: true,
          transform(record: unknown, _encoding, callback) {
            try {
              if (!Array.isArray(record)) {
                callback();
                return;
              }

              if (!headerChecked) {
                headerChecked = true;
                const inferred = inferColumnMapFromHeaderRow(record);
                if (inferred) {
                  columnMap = inferred;
                  callback();
                  return; // skip header row
                }
                columnMap = defaultColumnMap();
              }

              rowCount++;

              // Only take every Nth row (sampling)
              if (rowCount % samplingRate !== 0) {
                callback();
                return;
              }

              const map = columnMap ?? defaultColumnMap();

              const source = record[map.source];
              const target = record[map.target];
              const timestampRaw = record[map.timestamp];
              const timestamp = parseTimestamp(timestampRaw);

              if (!source || !target || !timestamp) {
                callback();
                return;
              }

              const weight =
                map.weight !== undefined ? parseWeight(record[map.weight]) : 1;

              const id = map.id !== undefined ? record[map.id] : undefined;
              const type =
                map.type !== undefined ? record[map.type] : undefined;

              results.push({
                id: id ?? rowCount,
                source: String(source),
                target: String(target),
                timestamp,
                weight,
                type: type ? String(type) : undefined,
              });

              if (results.length >= limit) {
                this.destroy(); // Stop reading
              }

              callback();
            } catch (e) {
              callback(e as Error);
            }
          },
        }),
      )
      .on("data", () => {
        // data handled in transform
      })
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const startTime = searchParams.get("start");
    const endTime = searchParams.get("end");

    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10000"));
    const samplingRate = Math.max(
      1,
      parseInt(searchParams.get("sampling") || "500"),
    );

    const aggregation = (searchParams.get("aggregation") || "hour") as Interval;
    const interval: Interval =
      aggregation === "minute" || aggregation === "day" ? aggregation : "hour";

    // For demo - replace with your actual file path
    const filePath = path.join(process.cwd(), "data", "large_dataset.csv");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Data file not found" },
        { status: 404 },
      );
    }

    const data = await processLargeCSV(filePath, { limit, samplingRate });

    // Optional server-side time filtering
    const filtered = filterByTimeRange(data, startTime, endTime);

    const aggregated = aggregateDataByTime(filtered, interval);

    return NextResponse.json({
      data: aggregated,
      totalRows: filtered.length,
      sampledRows: aggregated.length,
      samplingRate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing data:", error);
    return NextResponse.json(
      { error: "Failed to process data" },
      { status: 500 },
    );
  }
}

function filterByTimeRange(
  data: { timestamp: Date }[],
  startIso: string | null,
  endIso: string | null,
) {
  const start = startIso ? Date.parse(startIso) : null;
  const end = endIso ? Date.parse(endIso) : null;

  if (
    (startIso && Number.isNaN(start ?? NaN)) ||
    (endIso && Number.isNaN(end ?? NaN))
  ) {
    return data;
  }

  return data.filter((item) => {
    const t = item.timestamp.getTime();
    if (start !== null && t < start) return false;
    if (end !== null && t > end) return false;
    return true;
  });
}

// Server-side aggregation function
function aggregateDataByTime(data: any[], interval: Interval) {
  const aggregated: Record<
    string,
    {
      timestamp: string;
      count: number;
      totalWeight: number;
      nodes: Set<string>;
      edges: Set<string>;
    }
  > = {};

  data.forEach((item) => {
    const date = new Date(item.timestamp);
    let key: string;

    switch (interval) {
      case "minute":
        key = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        break;
      case "hour":
        key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        break;
      case "day":
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        break;
      default:
        key = date.toISOString().slice(0, 13);
    }

    if (!aggregated[key]) {
      aggregated[key] = {
        timestamp: key,
        count: 0,
        totalWeight: 0,
        nodes: new Set(),
        edges: new Set(),
      };
    }

    aggregated[key].count++;
    aggregated[key].totalWeight += Number(item.weight) || 1;

    const source = String(item.source);
    const target = String(item.target);
    aggregated[key].nodes.add(source);
    aggregated[key].nodes.add(target);
    aggregated[key].edges.add(`${source}-${target}`);
  });

  return Object.values(aggregated).map((item) => ({
    timestamp: item.timestamp,
    count: item.count,
    uniqueNodes: item.nodes.size,
    uniqueEdges: item.edges.size,
    avgWeight: item.count > 0 ? item.totalWeight / item.count : 0,
  }));
}
