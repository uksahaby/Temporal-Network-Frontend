// lib/hooks/useTemporalData.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export interface UseTemporalDataProps {
  startDate?: Date;
  endDate?: Date;
  samplingRate?: number;
  aggregationLevel?: "minute" | "hour" | "day";
  maxPoints?: number;
}

type RawTemporalPoint = {
  timestamp: string | number | Date;
  count: number;
  uniqueNodes: number;
  uniqueEdges: number;
  avgWeight: number;
};

type NetworkDataResponse = {
  data: RawTemporalPoint[];
  totalRows?: number;
  sampledRows?: number;
  samplingRate?: number;
};

type Metadata = {
  totalRows: number;
  sampledRows: number;
  samplingRate: number;
  processingTime: number;
};

export function useTemporalData({
  startDate,
  endDate,
  samplingRate = 1000,
  aggregationLevel = "hour",
  maxPoints = 10000,
}: UseTemporalDataProps = {}) {
  const [metadata, setMetadata] = useState<Metadata>({
    totalRows: 0,
    sampledRows: 0,
    samplingRate: 1,
    processingTime: 0,
  });

  // Fetch data with React Query
  const {
    data: queryData,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery<RawTemporalPoint[]>({
    queryKey: [
      "temporal-data",
      startDate?.toISOString(),
      endDate?.toISOString(),
      samplingRate,
      aggregationLevel,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("start", startDate.toISOString());
      if (endDate) params.append("end", endDate.toISOString());
      params.append("sampling", samplingRate.toString());
      params.append("limit", maxPoints.toString());
      params.append("aggregation", aggregationLevel);

      const startTime = performance.now();
      const response = await fetch(`/api/network-data?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const result: NetworkDataResponse = await response.json();
      const endTime = performance.now();

      setMetadata({
        totalRows: result.totalRows ?? 0,
        sampledRows: result.sampledRows ?? 0,
        samplingRate: result.samplingRate ?? 1,
        processingTime: endTime - startTime,
      });

      return result.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Process data for visualization
  const processDataForVisualization = useCallback(
    (rawData: RawTemporalPoint[]) => {
      if (!rawData || rawData.length === 0) {
        return {
          timeSeries: [],
          aggregated: [],
          peakPeriods: [],
        };
      }

      // For time series chart
      const timeSeriesData = rawData.map((item) => ({
        timestamp: new Date(item.timestamp),
        value: item.count,
        nodes: item.uniqueNodes,
        edges: item.uniqueEdges,
        avgWeight: item.avgWeight,
      }));

      // For network graph (sample from peak times)
      const peakData = [...rawData]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        timeSeries: timeSeriesData,
        aggregated: rawData,
        peakPeriods: peakData,
      };
    },
    [],
  );

  const processed = useMemo(() => {
    if (!queryData) return null;
    return processDataForVisualization(queryData);
  }, [queryData, processDataForVisualization]);

  const timeSeriesData = processed?.timeSeries ?? [];

  return {
    data: timeSeriesData,
    timeSeriesData,
    metadata,
    isLoading: queryLoading,
    error: queryError instanceof Error ? queryError.message : null,
    refresh: () => refetch(),
  };
}
