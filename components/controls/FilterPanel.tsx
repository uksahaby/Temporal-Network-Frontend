"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Filter,
  Users,
  Link as LinkIcon,
  BarChart3,
  Eye,
  EyeOff,
  X,
  RefreshCw,
} from "lucide-react";
import { useNetworkStore } from "@/lib/stores/network-store";

interface FilterState {
  nodeId: string;
  minDegree: number;
  maxDegree: number;
  minWeight: number;
  maxWeight: number;
  timeWindow: [number, number];
  showIsolated: boolean;
  showLabels: boolean;
  communityFilter: string[];
}

export function FilterPanel() {
  const { filters, setFilters, timeRange, networkStats } = useNetworkStore();
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleApplyFilters = useCallback(() => {
    setFilters(localFilters);
    // Update active filters based on non-default values
    const newActiveFilters: string[] = [];
    if (localFilters.nodeId) newActiveFilters.push("Node ID");
    if (localFilters.minDegree > 0) newActiveFilters.push("Min Degree");
    if (localFilters.maxDegree < 100) newActiveFilters.push("Max Degree");
    if (localFilters.minWeight > 0) newActiveFilters.push("Min Weight");
    if (!localFilters.showIsolated) newActiveFilters.push("Hide Isolated");
    if (!localFilters.showLabels) newActiveFilters.push("Hide Labels");
    setActiveFilters(newActiveFilters);
  }, [localFilters, setFilters]);

  const handleResetFilters = useCallback(() => {
    const defaultFilters: FilterState = {
      nodeId: "",
      minDegree: 0,
      maxDegree: 100,
      minWeight: 0,
      maxWeight: 1000,
      timeWindow: timeRange
        ? [timeRange.start, timeRange.end]
        : [0, Date.now()],
      showIsolated: true,
      showLabels: true,
      communityFilter: [],
    };
    setLocalFilters(defaultFilters);
    setFilters(defaultFilters);
    setActiveFilters([]);
  }, [timeRange, setFilters]);

  const removeFilter = useCallback((filterName: string) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filterName));
    // Reset the corresponding filter
    if (filterName === "Node ID") {
      setLocalFilters((prev) => ({ ...prev, nodeId: "" }));
    } else if (filterName === "Min Degree") {
      setLocalFilters((prev) => ({ ...prev, minDegree: 0 }));
    } else if (filterName === "Max Degree") {
      setLocalFilters((prev) => ({ ...prev, maxDegree: 100 }));
    } else if (filterName === "Min Weight") {
      setLocalFilters((prev) => ({ ...prev, minWeight: 0 }));
    } else if (filterName === "Hide Isolated") {
      setLocalFilters((prev) => ({ ...prev, showIsolated: true }));
    } else if (filterName === "Hide Labels") {
      setLocalFilters((prev) => ({ ...prev, showLabels: true }));
    }
  }, []);

  if (!timeRange || !networkStats) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Settings</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Active Filters</div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {filter}
                  <button
                    onClick={() => removeFilter(filter)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Node Filters */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            <span>Node Filters</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">Node ID</label>
              <Input
                placeholder="Filter by node ID..."
                value={localFilters.nodeId}
                onChange={(e: { target: { value: any } }) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    nodeId: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-gray-600">Degree Range</label>
                <span className="text-xs font-medium">
                  {localFilters.minDegree} - {localFilters.maxDegree}
                </span>
              </div>
              <Slider
                value={[localFilters.minDegree, localFilters.maxDegree]}
                onValueChange={([min, max]) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    minDegree: min,
                    maxDegree: max,
                  }))
                }
                min={0}
                max={networkStats.maxDegree || 100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Edge Filters */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <LinkIcon className="h-4 w-4" />
            <span>Edge Filters</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-gray-600">
                  Weight Threshold
                </label>
                <span className="text-xs font-medium">
                  ≥ {localFilters.minWeight}
                </span>
              </div>
              <Slider
                value={[localFilters.minWeight]}
                onValueChange={([value]) =>
                  setLocalFilters((prev) => ({ ...prev, minWeight: value }))
                }
                min={0}
                max={networkStats.maxWeight || 1000}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-gray-600">Time Window</label>
                <span className="text-xs font-medium">
                  {Math.round(
                    (localFilters.timeWindow[1] - localFilters.timeWindow[0]) /
                      86400000,
                  )}{" "}
                  days
                </span>
              </div>
              <Slider
                value={[
                  ((localFilters.timeWindow[0] - timeRange.start) /
                    (timeRange.end - timeRange.start)) *
                    100,
                  ((localFilters.timeWindow[1] - timeRange.start) /
                    (timeRange.end - timeRange.start)) *
                    100,
                ]}
                onValueChange={([start, end]) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    timeWindow: [
                      timeRange.start +
                        (start / 100) * (timeRange.end - timeRange.start),
                      timeRange.start +
                        (end / 100) * (timeRange.end - timeRange.start),
                    ],
                  }))
                }
                min={0}
                max={100}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <Eye className="h-4 w-4" />
            <span>Display Settings</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm">Show Isolated Nodes</label>
                <p className="text-xs text-gray-600">
                  Display nodes with no connections
                </p>
              </div>
              <Switch
                checked={localFilters.showIsolated}
                onCheckedChange={(checked: any) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    showIsolated: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm">Show Node Labels</label>
                <p className="text-xs text-gray-600">
                  Display node IDs on the graph
                </p>
              </div>
              <Switch
                checked={localFilters.showLabels}
                onCheckedChange={(checked: any) =>
                  setLocalFilters((prev) => ({ ...prev, showLabels: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm">Community Coloring</label>
                <p className="text-xs text-gray-600">
                  Color nodes by detected communities
                </p>
              </div>
              <Switch
                checked={localFilters.communityFilter.length > 0}
                onCheckedChange={(checked: any) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    communityFilter: checked ? ["all"] : [],
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center space-x-2 text-sm font-medium mb-3">
            <BarChart3 className="h-4 w-4" />
            <span>Filter Impact</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">Nodes Visible</div>
              <div className="font-semibold">
                {Math.round(
                  ((networkStats.filteredNodes || networkStats.totalNodes) /
                    (networkStats.totalNodes || 1)) *
                    100,
                )}
                %
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">Edges Visible</div>
              <div className="font-semibold">
                {Math.round(
                  ((networkStats.filteredNodes || networkStats.totalEdges) /
                    (networkStats.totalEdges || 1)) *
                    100,
                )}
                %
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleResetFilters}
          >
            Reset All
          </Button>
          <Button className="flex-1" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
