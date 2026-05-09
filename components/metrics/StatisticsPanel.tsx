"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Link as LinkIcon,
  Clock,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
} from "lucide-react";
import { useNetworkStore } from "@/lib/stores/network-store";
import { formatNumber, formatBytes } from "@/lib/utils/formatters";

interface Statistics {
  nodes: {
    total: number;
    active: number;
    isolated: number;
    communities: number;
    degreeDistribution: number[];
  };
  edges: {
    total: number;
    active: number;
    temporal: number;
    weightDistribution: number[];
  };
  temporal: {
    timespan: number;
    avgEventsPerDay: number;
    peakActivity: Date;
    burstiness: number;
  };
  quality: {
    completeness: number;
    consistency: number;
    warnings: string[];
  };
}

export function StatisticsPanel() {
  const { nodes, edges, networkStats, currentTime } = useNetworkStore();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);

  const toTimestamp = (value?: number | string) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  useEffect(() => {
    if (nodes.length > 0) {
      calculateStatistics();
    }
  }, [nodes, edges, currentTime]);

  const calculateStatistics = () => {
    setLoading(true);
    try {
      const calculatedStats: Statistics = {
        nodes: {
          total: nodes.length,
          active: nodes.filter((node) => {
            const lastActive = toTimestamp(node.lastActive);
            return lastActive !== null && currentTime - lastActive < 86400000;
          }).length,
          isolated: nodes.filter(
            (n) =>
              edges.filter((e) => e.source === n.id || e.target === n.id)
                .length === 0,
          ).length,
          communities: new Set(nodes.map((n) => n.community || 0)).size,
          degreeDistribution: calculateDegreeDistribution(),
        },
        edges: {
          total: edges.length,
          active: edges.filter((edge) => {
            const timestamp = toTimestamp(edge.timestamp);
            return timestamp !== null && currentTime - timestamp < 86400000;
          }).length,
          temporal: edges.filter(
            (edge) =>
              typeof edge.startTime === "number" &&
              typeof edge.endTime === "number",
          ).length,
          weightDistribution: calculateWeightDistribution(),
        },
        temporal: {
          timespan: networkStats?.timeRange
            ? networkStats.timeRange.end - networkStats.timeRange.start
            : 0,
          avgEventsPerDay:
            edges.length /
            (networkStats?.timeRange
              ? (networkStats.timeRange.end - networkStats.timeRange.start) /
                86400000
              : 1),
          peakActivity: new Date(),
          burstiness: calculateBurstiness(),
        },
        quality: {
          completeness: calculateCompleteness(),
          consistency: calculateConsistency(),
          warnings: networkStats?.warnings || [],
        },
      };
      setStats(calculatedStats);
    } catch (error) {
      console.error("Failed to calculate statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDegreeDistribution = (): number[] => {
    const distribution = Array(10).fill(0);
    nodes.forEach((node) => {
      const degree = edges.filter(
        (e) => e.source === node.id || e.target === node.id,
      ).length;
      const bin = Math.min(Math.floor(degree / 10), 9);
      distribution[bin]++;
    });
    return distribution;
  };

  const calculateWeightDistribution = (): number[] => {
    const distribution = Array(5).fill(0);
    edges.forEach((edge) => {
      const weight = edge.weight || 1;
      const bin = Math.min(Math.floor(weight / 2), 4);
      distribution[bin]++;
    });
    return distribution;
  };

  const calculateBurstiness = (): number => {
    if (edges.length < 2) return 0;

    const timestamps = edges
      .map((edge) => toTimestamp(edge.timestamp))
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);

    if (timestamps.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const std = Math.sqrt(
      intervals.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) /
        intervals.length,
    );

    return (std - mean) / (std + mean);
  };

  const calculateCompleteness = (): number => {
    const totalFields = nodes.length * 3 + edges.length * 4; // Approximate
    const filledFields =
      nodes.filter((n) => n.id && n.label).length * 3 +
      edges.filter((e) => e.id && e.source && e.target).length * 4;
    return (filledFields / totalFields) * 100;
  };

  const calculateConsistency = (): number => {
    let consistent = 0;

    // Check node consistency
    consistent += nodes.filter((n) => n.id && typeof n.id === "string").length;

    // Check edge consistency
    consistent += edges.filter(
      (e) =>
        e.source &&
        e.target &&
        nodes.some((n) => n.id === e.source) &&
        nodes.some((n) => n.id === e.target),
    ).length;

    return (consistent / (nodes.length + edges.length)) * 100;
  };

  const handleExportStats = () => {
    if (!stats) return;

    const csvContent = Object.entries(stats)
      .flatMap(([category, data]) =>
        Object.entries(data).map(
          ([key, value]) =>
            `${category}.${key},${typeof value === "number" ? value.toFixed(2) : value}`,
        ),
      )
      .join("\n");

    const blob = new Blob([`Statistic,Value\n${csvContent}`], {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-statistics-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!stats) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Load network data to view statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-6 w-6" />
            <span>Network Statistics</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={calculateStatistics}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportStats}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Node Statistics */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <div className="font-medium">Node Statistics</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatNumber(stats.nodes.total)}
              </div>
              <div className="text-sm text-gray-600">Total Nodes</div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatNumber(stats.nodes.active)}
              </div>
              <div className="text-sm text-gray-600">Active (24h)</div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatNumber(stats.nodes.isolated)}
              </div>
              <div className="text-sm text-gray-600">Isolated Nodes</div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatNumber(stats.nodes.communities)}
              </div>
              <div className="text-sm text-gray-600">Communities</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Degree Distribution</span>
              <Badge variant="outline">Most nodes: 1-10 connections</Badge>
            </div>
            <div className="h-4 flex gap-1">
              {stats.nodes.degreeDistribution.map((count, index) => (
                <div
                  key={index}
                  className="bg-blue-500 rounded"
                  style={{
                    width: `${(count / Math.max(...stats.nodes.degreeDistribution)) * 100}%`,
                    opacity: 0.7 + index * 0.03,
                  }}
                  title={`${index * 10}-${(index + 1) * 10 - 1}: ${count} nodes`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Edge Statistics */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5" />
            <div className="font-medium">Edge Statistics</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatNumber(stats.edges.total)}
              </div>
              <div className="text-sm text-gray-600">Total Edges</div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatNumber(stats.edges.active)}
              </div>
              <div className="text-sm text-gray-600">Active (24h)</div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatNumber(stats.edges.temporal)}
              </div>
              <div className="text-sm text-gray-600">Temporal Edges</div>
            </div>
          </div>
        </div>

        {/* Temporal Statistics */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <div className="font-medium">Temporal Analysis</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {Math.round(stats.temporal.timespan / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-sm text-gray-600">Days of Data</div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatNumber(stats.temporal.avgEventsPerDay)}
              </div>
              <div className="text-sm text-gray-600">Avg Events/Day</div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {stats.temporal.peakActivity.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-sm text-gray-600">Peak Activity</div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {stats.temporal.burstiness.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Burstiness Index</div>
            </div>
          </div>
        </div>

        {/* Data Quality */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <div className="font-medium">Data Quality</div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Completeness</span>
                <span className="font-semibold">
                  {stats.quality.completeness.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.quality.completeness} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Consistency</span>
                <span className="font-semibold">
                  {stats.quality.consistency.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.quality.consistency} className="h-2" />
            </div>

            {stats.quality.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-medium text-yellow-800">
                      Data Quality Warnings
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {stats.quality.warnings
                        .slice(0, 3)
                        .map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      {stats.quality.warnings.length > 3 && (
                        <li className="text-yellow-600">
                          ...and {stats.quality.warnings.length - 3} more
                          warnings
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {stats.quality.completeness > 90 &&
              stats.quality.consistency > 90 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="font-medium text-green-800">
                      Excellent Data Quality
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
