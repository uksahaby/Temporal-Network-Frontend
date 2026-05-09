import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import { PassThrough, Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import busboy from "busboy";
import FormData from "form-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ensureUploadDir() {
  const dir = path.join(process.cwd(), ".uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx) : "";
}

function guessDelimiter(line: string): "," | "\t" | ";" | " " {
  const tabCount = (line.match(/\t/g) ?? []).length;
  const commaCount = (line.match(/,/g) ?? []).length;
  const semicolonCount = (line.match(/;/g) ?? []).length;
  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0)
    return "\t";
  if (
    semicolonCount >= commaCount &&
    semicolonCount >= tabCount &&
    semicolonCount > 0
  )
    return ";";
  if (commaCount > 0) return ",";
  return " ";
}

async function sniffLocalTextMetadata(filePath: string): Promise<{
  rows: number;
  columns: string[];
}> {
  // Keep this cheap: users can upload multi-GB files.
  // We count up to MAX_LINES and infer columns from the first usable line.
  const MAX_BYTES = 256 * 1024;
  const MAX_LINES = 200_000;

  const fd = await fs.promises.open(filePath, "r");
  try {
    const buf = Buffer.alloc(MAX_BYTES);
    const { bytesRead } = await fd.read(buf, 0, MAX_BYTES, 0);
    const sample = buf.subarray(0, bytesRead).toString("utf8");
    const lines = sample.split(/\r?\n/);

    // Find first non-empty, non-comment line.
    let headerLine: string | null = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      // MatrixMarket comments/headers begin with '%'
      if (line.startsWith("%")) continue;
      headerLine = line;
      break;
    }

    const delimiter = headerLine ? guessDelimiter(headerLine) : ",";
    const headerParts = headerLine
      ? delimiter === " "
        ? headerLine.split(/\s+/g)
        : headerLine.split(delimiter)
      : [];

    // If it looks like a header row (contains any non-numeric tokens), treat as column names.
    const looksLikeHeader = headerParts.some((p) => /[a-zA-Z_]/.test(p));
    const columns = looksLikeHeader
      ? headerParts.map((p) => p.trim()).filter(Boolean)
      : headerParts.length
        ? headerParts.map((_, i) => `col_${i + 1}`)
        : [];

    // Count lines with a streaming pass, but cap to avoid long upload latency.
    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    let rowCount = 0;
    let carry = "";

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: string | Buffer) => {
        const text =
          carry + (typeof chunk === "string" ? chunk : chunk.toString("utf8"));
        const parts = text.split(/\r?\n/);
        carry = parts.pop() ?? "";
        for (const raw of parts) {
          const line = raw.trim();
          if (!line) continue;
          if (line.startsWith("%")) continue;
          rowCount++;
          if (rowCount >= MAX_LINES) {
            stream.destroy();
            break;
          }
        }
      });
      stream.on("error", reject);
      stream.on("close", () => resolve());
      stream.on("end", () => resolve());
    });

    // If we used a header line as column names, don't count it as a data row.
    const rows =
      looksLikeHeader && rowCount > 0 ? Math.max(0, rowCount - 1) : rowCount;
    return { rows, columns };
  } finally {
    await fd.close();
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!request.body) {
      return NextResponse.json(
        { detail: "Missing request body" },
        { status: 400 },
      );
    }

    const backendBase = process.env.NEXT_PUBLIC_API_URL;
    const shouldStreamToBackend = Boolean(backendBase);
    const uploadDir = shouldStreamToBackend ? null : ensureUploadDir();

    const localId = crypto.randomUUID();
    let fileId: string = localId;
    let originalFilename = "upload.bin";
    let mimeType = "application/octet-stream";
    let storedName: string | null = shouldStreamToBackend
      ? null
      : `${localId}.bin`;
    let storedPath: string | null = null;
    if (!shouldStreamToBackend && uploadDir && storedName) {
      storedPath = path.join(uploadDir, storedName);
    }
    let bytes = 0;
    let fileSeen = false;
    let writeDone: Promise<void> | null = null;
    let backendUploadPromise: Promise<unknown> | null = null;
    let backendPayload: unknown = null;

    const backend: {
      attempted: boolean;
      ok: boolean;
      status?: number;
      error?: string;
    } = { attempted: false, ok: false };

    await new Promise<void>((resolve, reject) => {
      const headers = Object.fromEntries(request.headers.entries());
      const bb = busboy({ headers });

      bb.on(
        "file",
        (
          field: string,
          file: Readable,
          info: { filename: string; mimeType: string },
        ) => {
          if (field !== "file") {
            file.resume();
            return;
          }
          fileSeen = true;

          originalFilename = info.filename || originalFilename;
          mimeType = info.mimeType || mimeType;

          if (shouldStreamToBackend) {
            backend.attempted = true;
            try {
              const forwarded = new FormData();
              const pass = new PassThrough();
              forwarded.append("file", pass, {
                filename: originalFilename,
                contentType: mimeType,
              });

              backendUploadPromise = axios
                .post(
                  `${backendBase!.replace(/\/$/, "")}/api/upload`,
                  forwarded,
                  {
                    headers: forwarded.getHeaders(),
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                    timeout: 0,
                    validateStatus: () => true,
                  },
                )
                .then((res) => {
                  backend.status = res.status;
                  backendPayload = res.data;

                  if (res.status >= 200 && res.status < 300 && res.data) {
                    const maybeId =
                      (res.data as Record<string, unknown>).file_id ??
                      (res.data as Record<string, unknown>).fileId;
                    if (typeof maybeId === "string" && maybeId.length > 0) {
                      fileId = maybeId;
                    }
                    backend.ok = true;
                    return res.data;
                  }

                  backend.error =
                    typeof res.data === "string"
                      ? res.data
                      : JSON.stringify(res.data);
                  return res.data;
                })
                .catch((e) => {
                  backend.error = e instanceof Error ? e.message : String(e);
                  throw e;
                });

              file.on("error", (err: unknown) => {
                const error =
                  err instanceof Error ? err : new Error(String(err));
                pass.destroy(error);
                reject(err);
              });
              pass.on("error", (err: unknown) => reject(err));
              file.pipe(pass);
            } catch (err) {
              backend.error = err instanceof Error ? err.message : String(err);
              file.resume();
            }
          } else {
            const ext = getFileExtension(originalFilename) || ".bin";
            storedName = `${localId}${ext}`;
            storedPath = path.join(uploadDir!, storedName);

            const out = fs.createWriteStream(storedPath);
            writeDone = new Promise<void>((res, rej) => {
              out.on("finish", () => res());
              out.on("error", (err) => rej(err));
            });

            file.on("error", (err: unknown) => reject(err));
            out.on("error", (err: unknown) => reject(err));
            file.pipe(out);
          }

          file.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
          });
        },
      );

      bb.on("error", (err: unknown) => reject(err));
      bb.on("finish", () => resolve());

      const nodeStream = Readable.fromWeb(
        request.body as unknown as NodeReadableStream<Uint8Array>,
      );
      nodeStream.on("error", (err: unknown) => reject(err));
      nodeStream.pipe(bb);
    });

    if (!fileSeen) {
      return NextResponse.json(
        { detail: "Missing file field" },
        { status: 400 },
      );
    }

    if (shouldStreamToBackend) {
      try {
        await backendUploadPromise;
      } catch {
        // backend.error already captured
      }

      if (!backend.ok) {
        return NextResponse.json(
          {
            detail: "Backend upload failed; local storage disabled",
            backend,
          },
          { status: backend.status ?? 502 },
        );
      }

      // For backend mode, do not store locally.
      const now = new Date().toISOString();

      const payload =
        backendPayload && typeof backendPayload === "object"
          ? (backendPayload as Record<string, unknown>)
          : null;

      const rows =
        typeof payload?.rows === "number" && Number.isFinite(payload.rows)
          ? payload.rows
          : 0;
      const columns = Array.isArray(payload?.columns)
        ? (payload!.columns as unknown[]).filter(
            (c): c is string => typeof c === "string",
          )
        : [];
      const size =
        typeof payload?.size === "number" && Number.isFinite(payload.size)
          ? payload.size
          : bytes;
      const time_range =
        payload?.time_range && typeof payload.time_range === "object"
          ? (payload.time_range as any)
          : { start: now, end: now };

      return NextResponse.json({
        file_id: fileId,
        fileId,
        filename: originalFilename,
        size,
        bytes,
        rows,
        columns,
        time_range,
        parsing_error:
          typeof payload?.parsing_error === "string"
            ? payload.parsing_error
            : undefined,
        uploaded_at:
          typeof payload?.uploaded_at === "string" ? payload.uploaded_at : now,
        stored_as: null,
        backend,
      });
    }

    // Local-only mode (no backend configured)
    if (writeDone) {
      await writeDone;
    }

    let rows = 0;
    let columns: string[] = [];
    if (storedPath) {
      try {
        const ext = (getFileExtension(originalFilename) || "").toLowerCase();
        // Only sniff plain-text-like uploads; binary formats will stay unknown.
        const sniffable =
          ext === ".csv" ||
          ext === ".tsv" ||
          ext === ".txt" ||
          ext === ".mtx" ||
          ext === ".log";
        if (sniffable) {
          const meta = await sniffLocalTextMetadata(storedPath);
          rows = meta.rows;
          columns = meta.columns;
        }
      } catch (e) {
        console.warn("Failed to sniff local upload metadata:", e);
      }
    }

    const now = new Date().toISOString();
    return NextResponse.json({
      file_id: fileId,
      fileId,
      filename: originalFilename,
      size: bytes,
      bytes,
      rows,
      columns,
      time_range: { start: now, end: now },
      stored_as: storedName,
      backend,
    });
  } catch (e) {
    console.error("Upload failed:", e);
    return NextResponse.json({ detail: "Upload failed" }, { status: 500 });
  }
}
