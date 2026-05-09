"use client";
import React, { useEffect, useState } from "react";

type Community = {
  communityId: number;
  size: number;
  sampleMembers?: string[];
};

export default function CommunityOverview({
  initialFileId,
}: {
  initialFileId?: string;
}) {
  const [fileId, setFileId] = useState(initialFileId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [topN, setTopN] = useState(50);
  const [selected, setSelected] = useState<Community | null>(null);
  const [sampleMembers, setSampleMembers] = useState<string[]>([]);

  useEffect(() => {
    if (fileId) fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, topN]);

  async function fetchSummary() {
    setLoading(true);
    setError(null);
    setCommunities([]);
    try {
      const res = await fetch(`/api/file/${fileId}/global/communities`);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const data = await res.json();
      const list = (data.communities || []).map((c: any) => ({
        communityId: c.communityId,
        size: c.size,
        sampleMembers: c.sampleMembers,
      }));
      list.sort((a: Community, b: Community) => b.size - a.size);
      setCommunities(list.slice(0, Math.max(10, topN)));
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function downloadCSV() {
    const url = `/api/file/${fileId}/global/node_communities.csv`;
    window.open(url, "_blank");
  }

  async function onSelect(comm: Community) {
    setSelected(comm);
    setSampleMembers([]);
    try {
      // Download CSV and sample lines for the selected community (server serves full CSV)
      const res = await fetch(
        `/api/file/${fileId}/global/node_communities.csv`,
      );
      if (!res.ok) throw new Error("Failed to fetch CSV");
      const text = await res.text();
      const lines = text.split("\n");
      const members: string[] = [];
      for (let i = 1; i < lines.length && members.length < 200; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [node, commId] = line.split(",");
        if (Number(commId) === comm.communityId) members.push(node);
      }
      setSampleMembers(members);
    } catch (e) {
      setError("Failed to load sample members");
    }
  }

  const maxSize = communities.length
    ? Math.max(...communities.map((c) => c.size))
    : 1;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>File ID:</label>
        <input
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          style={{ width: 340 }}
        />
        <button onClick={fetchSummary} style={{ marginLeft: 8 }}>
          Load
        </button>
        <button onClick={downloadCSV} style={{ marginLeft: 8 }}>
          Download CSV
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Top N:</label>
        <input
          type="number"
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value || 10))}
          style={{ width: 80, marginLeft: 8 }}
        />
      </div>

      {loading && <div>Loading summary...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3>Top Communities (by size)</h3>
          <svg width="700" height={Math.max(200, communities.length * 22)}>
            {communities.map((c, i) => {
              const w = (c.size / maxSize) * 600;
              return (
                <g key={c.communityId} transform={`translate(0, ${i * 22})`}>
                  <rect
                    x={120}
                    y={2}
                    width={Math.max(1, w)}
                    height={16}
                    fill="#3b82f6"
                  />
                  <text x={8} y={14} fontSize={12}>
                    {c.communityId}
                  </text>
                  <text x={740} y={14} fontSize={12}>
                    {c.size.toLocaleString()}
                  </text>
                  <rect
                    x={120 + Math.max(1, w)}
                    y={2}
                    width={8}
                    height={16}
                    fill="#1e293b"
                    onClick={() => onSelect(c)}
                    style={{ cursor: "pointer" }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ width: 420 }}>
          <h3>Selected Community</h3>
          {selected ? (
            <div>
              <div>Community: {selected.communityId}</div>
              <div>Size: {selected.size.toLocaleString()}</div>
              <div style={{ marginTop: 8 }}>
                <strong>Sample members (first 200):</strong>
                <div
                  style={{
                    maxHeight: 400,
                    overflow: "auto",
                    border: "1px solid #eee",
                    padding: 8,
                  }}
                >
                  {sampleMembers.length ? (
                    sampleMembers.map((m) => <div key={m}>{m}</div>)
                  ) : (
                    <div>
                      Click the small box at the end of a bar to load sample
                      members.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>No community selected. Click the small box to drill down.</div>
          )}
        </div>
      </div>
    </div>
  );
}
