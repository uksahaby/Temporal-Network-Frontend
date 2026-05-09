/// <reference lib="webworker" />

import { calculateNetworkMetrics } from "../utils/network";
import type { NetworkEdge, NetworkNode } from "../api/client";

type MetricsRequest = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  currentTime: number;
};

type MetricsResponse = {
  metrics: unknown;
};

self.addEventListener("message", (event: MessageEvent<MetricsRequest>) => {
  try {
    const { nodes, edges, currentTime } = event.data;
    const metrics = calculateNetworkMetrics(nodes, edges, currentTime);
    const response: MetricsResponse = { metrics };
    // Structured-clone safe payload.
    self.postMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker error";
    self.postMessage({ error: message });
  }
});
