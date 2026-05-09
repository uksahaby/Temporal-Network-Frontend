"use client";
import React from "react";
import CommunityOverview from "../../components/CommunityOverview";

export default function Page() {
  // Default file_id for demo; user can change in the UI
  const defaultFileId = "855c82689571bc2e";
  return (
    <div style={{ padding: 24, fontFamily: "Inter, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Community Overview</h1>
      <p style={{ marginBottom: 12 }}>
        This page fetches the precomputed global community summary and shows an
        aggregated view suitable for large graphs (millions of nodes).
      </p>
      <CommunityOverview initialFileId={defaultFileId} />
    </div>
  );
}
