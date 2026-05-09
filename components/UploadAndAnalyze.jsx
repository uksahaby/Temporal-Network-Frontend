import React, { useState, useRef } from "react";

export default function UploadAndAnalyze() {
  const [file, setFile] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [fileId, setFileId] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [analysis, setAnalysis] = useState(null);
  const [communities, setCommunities] = useState(null);
  const abortCtrl = useRef(null);

  const API_BASE = "http://127.0.0.1:8000/api";

  function handleFile(e) {
    setFile(e.target.files[0]);
  }

  async function upload() {
    if (!file) return alert("pick a file");
    setStatus("uploading");
    setUploadPct(0);

    // Basic fetch FormData upload. For very large files prefer chunked/resumable uploads.
    const fd = new FormData();
    fd.append("file", file);

    try {
      const resp = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: fd,
      });
      const j = await resp.json();
      if (!resp.ok) {
        throw new Error(j.detail || JSON.stringify(j));
      }
      setFileId(j.file_id);
      setStatus("uploaded");
      return j;
    } catch (err) {
      setStatus("error");
      console.error("upload failed", err);
      alert("Upload failed: " + err.message);
    }
  }

  async function startAnalysis({ compute_communities = false } = {}) {
    if (!fileId) return alert("No file_id available; upload first");
    setStatus("starting_analysis");
    try {
      const body = { file_id: fileId, compute_communities };
      const resp = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(j));
      setTaskId(j.task_id);
      setStatus("processing");
      pollAnalysis(j.task_id);
    } catch (err) {
      setStatus("error");
      console.error("analysis start failed", err);
      alert("Start analysis failed: " + err.message);
    }
  }

  async function pollAnalysis(tid) {
    let tries = 0;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    while (true) {
      tries++;
      try {
        const resp = await fetch(`${API_BASE}/analysis/${tid}`);
        const j = await resp.json();
        if (resp.status === 404) {
          setStatus("not_found");
          return;
        }
        if (j.status === "processing") {
          setStatus(`processing: ${j.progress || "working"}`);
        } else if (j.status === "failed") {
          setStatus("failed");
          alert("Analysis failed: " + (j.error || j.message || "unknown"));
          return;
        } else if (j.status === "completed") {
          setStatus("completed");
          setAnalysis(j.data || j);
          // try fetch communities (may be 202 Processing)
          await fetchCommunities(tid);
          return;
        }
      } catch (err) {
        console.warn("poll error", err);
      }
      // backoff
      await wait(Math.min(3000 + tries * 1000, 10000));
    }
  }

  async function fetchCommunities(tid) {
    try {
      const resp = await fetch(`${API_BASE}/analysis/${tid}/communities`);
      if (resp.status === 202) {
        setStatus("communities_processing");
        // Poll again after delay
        setTimeout(() => fetchCommunities(tid), 3000);
        return;
      }
      const j = await resp.json();
      if (!resp.ok) {
        console.error("communities error", j);
        return;
      }
      setCommunities(j);
      setStatus("communities_ready");
    } catch (err) {
      console.error("fetch communities failed", err);
      setTimeout(() => fetchCommunities(tid), 3000);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h3>Upload & Analyze</h3>
      <input type="file" onChange={handleFile} />
      <div style={{ marginTop: 8 }}>
        <button onClick={upload} disabled={!file}>
          Upload
        </button>
        <button
          onClick={() => startAnalysis({ compute_communities: false })}
          disabled={!fileId}
        >
          Analyze (fast)
        </button>
        <button
          onClick={() => startAnalysis({ compute_communities: true })}
          disabled={!fileId}
        >
          Analyze (with communities)
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Status:</b> {status}
      </div>
      {fileId && (
        <div>
          <b>file_id:</b> {fileId}
        </div>
      )}
      {taskId && (
        <div>
          <b>task_id:</b> {taskId}
        </div>
      )}

      {analysis && (
        <div style={{ marginTop: 12 }}>
          <h4>Analysis (sample)</h4>
          <div>
            Windows:{" "}
            {(analysis.time_windows && analysis.time_windows.length) ||
              analysis.num_windows}
          </div>
          <pre
            style={{
              maxHeight: 200,
              overflow: "auto",
              background: "#f6f6f6",
              padding: 8,
            }}
          >
            {JSON.stringify(
              analysis.time_windows
                ? analysis.time_windows.slice(0, 2)
                : analysis,
              null,
              2,
            )}
          </pre>
        </div>
      )}

      {communities && (
        <div style={{ marginTop: 12 }}>
          <h4>Community summary (sample)</h4>
          <div>Time windows: {communities.time_windows.length}</div>
          <pre
            style={{
              maxHeight: 300,
              overflow: "auto",
              background: "#fff8dc",
              padding: 8,
            }}
          >
            {JSON.stringify(communities.time_windows.slice(0, 1), null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: 16, color: "#666", fontSize: 13 }}>
        Tips: For very large files use chunked uploads; call analyze with
        compute_communities:false for quick UX, then poll communities endpoint.
      </div>
    </div>
  );
}
