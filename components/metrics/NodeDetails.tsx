"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Target,
  Link as LinkIcon,
  Clock,
  Zap,
  Activity,
  TrendingUp,
  MapPin,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { useNetworkStore } from "@/lib/stores/network-store";
import type { Edge, Node } from "@/lib/types";

interface NodeDetailsProps {
  nodeId: string;
  onClose?: () => void;
}

interface NodeDetailsState {
  node: Node;
  edges: Edge[];
  degree: number;
  incoming: number;
  outgoing: number;
}

export function NodeDetails({ nodeId, onClose }: NodeDetailsProps) {
  const { nodes, edges, currentTime, getNodeMetrics } = useNetworkStore();
  const [nodeData, setNodeData] = useState<NodeDetailsState | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (nodeId) {
      const node = nodes.find((n) => n.id === nodeId);
      const nodeEdges = edges.filter(
        (edge) => edge.source === nodeId || edge.target === nodeId,
      );
      const nodeMetrics = getNodeMetrics?.(nodeId);

      if (node) {
        setNodeData({
          node,
          edges: nodeEdges,
          degree: nodeEdges.length,
          incoming: nodeEdges.filter((edge) => edge.target === nodeId).length,
          outgoing: nodeEdges.filter((edge) => edge.source === nodeId).length,
        });
      }
      setMetrics(nodeMetrics);
    }
  }, [nodeId, nodes, edges, currentTime, getNodeMetrics]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(nodeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!nodeData || !nodeData.node) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a node to view details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { node, edges: nodeEdges, degree, incoming, outgoing } = nodeData;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-lg">{node.id}</span>
                  <Badge variant="secondary" className="font-normal">
                    {node.type || "Node"}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {node.label || "No description"}
                </div>
              </div>
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyId}
              title="Copy Node ID"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center space-x-2">
              <LinkIcon className="h-4 w-4 text-blue-500" />
              <div className="text-2xl font-bold">{degree}</div>
            </div>
            <div className="text-xs text-gray-600">Total Degree</div>
          </div>

          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="text-2xl font-bold">{incoming}</div>
            </div>
            <div className="text-xs text-gray-600">Incoming</div>
          </div>

          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center space-x-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <div className="text-2xl font-bold">{outgoing}</div>
            </div>
            <div className="text-xs text-gray-600">Outgoing</div>
          </div>
        </div>

        {/* Connection Details */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <div className="font-medium">Connections</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Direct Connections</span>
              <span className="font-semibold">{nodeEdges.length}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Strength Distribution</span>
                <span>
                  Max: {Math.max(...nodeEdges.map((e) => e.weight || 1))}
                </span>
              </div>
              <Progress
                value={
                  (nodeEdges.filter((e) => (e.weight ?? 0) > 5).length /
                    nodeEdges.length) *
                  100
                }
                className="h-2"
              />
            </div>

            <div className="text-sm">
              <div className="text-gray-600 mb-1">Top Connected Nodes:</div>
              <div className="flex flex-wrap gap-1">
                {nodeEdges.slice(0, 5).map((edge) => (
                  <Badge
                    key={edge.id}
                    variant="outline"
                    className="text-xs font-mono"
                  >
                    {edge.source === nodeId ? edge.target : edge.source}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Temporal Metrics */}
        {metrics && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <div className="font-medium">Temporal Analysis</div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <div className="text-sm font-medium">Activity Score</div>
                  </div>
                  <div className="text-lg font-bold mt-1">
                    {metrics.activity?.toFixed(2) || "N/A"}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <div className="text-sm font-medium">Burstiness</div>
                  </div>
                  <div className="text-lg font-bold mt-1">
                    {metrics.burstiness?.toFixed(2) || "N/A"}
                  </div>
                </div>
              </div>

              <div className="text-sm">
                <div className="text-gray-600 mb-1">Activity Timeline:</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(metrics.activity || 0) * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Node Properties */}
        {node.properties && Object.keys(node.properties).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <div className="font-medium">Properties</div>
            </div>

            <div className="space-y-2">
              {Object.entries(node.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600 capitalize">{key}:</span>
                  <span className="font-mono truncate max-w-50">
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Data */}
        <div className="pt-4 border-t">
          <div className="flex justify-between text-xs text-gray-600">
            <span>First Seen</span>
            <span>
              {node.firstSeen
                ? new Date(node.firstSeen).toLocaleDateString()
                : "Unknown"}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Last Active</span>
            <span>
              {node.lastActive
                ? new Date(node.lastActive).toLocaleDateString()
                : "Unknown"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
