"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CentralityChartProps {
  nodes: Array<{
    id: string;
    degree: number;
    centrality: number;
    betweenness: number;
    closeness: number;
    pagerank: number;
  }>;
  topN?: number;
}

export default function CentralityChart({
  nodes,
  topN = 10,
}: CentralityChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [metric, setMetric] = useState<
    "degree" | "centrality" | "betweenness" | "closeness" | "pagerank"
  >("degree");

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };

    // Sort nodes by selected metric
    const sortedNodes = [...nodes]
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, topN);

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(sortedNodes.map((d) => d.id))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(sortedNodes, (d) => d[metric]) || 1])
      .range([height - margin.bottom, margin.top]);

    // Create color scale based on metric value
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(sortedNodes, (d) => d[metric]) || 1]);

    // Create bars
    svg
      .selectAll("rect")
      .data(sortedNodes)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.id)!)
      .attr("y", (d) => yScale(d[metric]))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - margin.bottom - yScale(d[metric]))
      .attr("fill", (d) => colorScale(d[metric]))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.8)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);

        // Show tooltip
        svg
          .append("text")
          .attr("class", "tooltip")
          .attr("x", xScale(d.id)! + xScale.bandwidth() / 2)
          .attr("y", yScale(d[metric]) - 10)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("fill", "#374151")
          .text(`${d[metric].toFixed(3)}`);
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);

        svg.selectAll(".tooltip").remove();
      });

    // Add x-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("font-size", "10px");

    // Add y-axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));

    // Add labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("Node ID");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text(metric.charAt(0).toUpperCase() + metric.slice(1));
  }, [nodes, metric, topN]);

  if (!nodes.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Centrality Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No centrality data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Nodes by Centrality</CardTitle>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600" htmlFor="metric-select">
              Metric
            </label>
            <select
              id="metric-select"
              value={metric}
              onChange={(event) =>
                setMetric(
                  event.target.value as
                    | "degree"
                    | "centrality"
                    | "betweenness"
                    | "closeness"
                    | "pagerank",
                )
              }
              className="w-40 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
            >
              <option value="degree">Degree</option>
              <option value="centrality">Centrality</option>
              <option value="betweenness">Betweenness</option>
              <option value="closeness">Closeness</option>
              <option value="pagerank">PageRank</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-white">
          <svg
            ref={svgRef}
            width={600}
            height={300}
            className="w-full h-auto"
          />
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing top {Math.min(topN, nodes.length)} nodes by {metric}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
