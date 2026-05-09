"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapViewProps {
  data: Array<{
    source: string;
    target: string;
    value: number;
    timestamp: string;
  }>;
  timeWindows: string[];
  nodes: string[];
}

export default function HeatmapView({
  data,
  timeWindows,
  nodes,
}: HeatmapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length || !timeWindows.length || !nodes.length)
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 50, right: 30, bottom: 100, left: 100 };

    // Prepare matrix data
    const matrix: number[][] = [];
    nodes.forEach((source, i) => {
      matrix[i] = [];
      nodes.forEach((target, j) => {
        const connections = data.filter(
          (d) =>
            (d.source === source && d.target === target) ||
            (d.source === target && d.target === source),
        );
        matrix[i][j] = connections.length;
      });
    });

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(nodes)
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(nodes)
      .range([margin.top, height - margin.bottom]);

    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(matrix.flat()) || 1]);

    // Create heatmap cells
    svg
      .selectAll()
      .data(
        matrix.flatMap((row, i) =>
          row.map((value, j) => ({
            source: nodes[i],
            target: nodes[j],
            value,
          })),
        ),
      )
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.target)!)
      .attr("y", (d) => yScale(d.source)!)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.value))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);

        // Show tooltip
        svg
          .append("text")
          .attr("class", "tooltip")
          .attr("x", xScale(d.target)! + xScale.bandwidth() / 2)
          .attr("y", yScale(d.source)! - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("fill", "#374151")
          .text(`${d.value} connections`);
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5);

        svg.selectAll(".tooltip").remove();
      });

    // Add x-axis labels
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("font-size", "8px");

    // Add y-axis labels
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("font-size", "8px");

    // Add labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("Target Nodes");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("Source Nodes");

    // Add title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("Connection Heatmap");
  }, [data, timeWindows, nodes]);

  if (!data.length || !nodes.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No heatmap data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Connection Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-white">
          <svg
            ref={svgRef}
            width={800}
            height={400}
            className="w-full h-auto"
          />
          <div className="mt-4 flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 mr-2"></div>
              <span className="text-xs text-gray-600">Low</span>
            </div>
            <div className="w-32 h-4 bg-linear-to-r from-blue-100 to-blue-800"></div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-800 mr-2"></div>
              <span className="text-xs text-gray-600">High</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
