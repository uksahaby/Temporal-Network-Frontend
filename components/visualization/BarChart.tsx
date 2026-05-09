"use client"; // Must be client component for D3

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface BarChartProps {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
}

export default function BarChart({
  data,
  width = 600,
  height = 400,
}: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG container
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Set up margins
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 0])
      .range([innerHeight, 0]);

    // Create group for chart
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add bars
    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.label)!)
      .attr("y", (d) => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => innerHeight - yScale(d.value))
      .attr("fill", "#3b82f6")
      .attr("opacity", 0.8)
      .on("mouseover", (event) => {
        const target = event.currentTarget as SVGRectElement;
        d3.select(target)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("fill", "#1d4ed8");
      })
      .on("mouseout", (event) => {
        const target = event.currentTarget as SVGRectElement;
        d3.select(target)
          .transition()
          .duration(200)
          .attr("opacity", 0.8)
          .attr("fill", "#3b82f6");
      });

    // Add x-axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    // Add y-axis
    g.append("g").call(d3.axisLeft(yScale));

    // Add labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .text("Categories");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text("Values");
  }, [data, width, height]);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Bar Chart Example</h3>
      <svg ref={svgRef} className="w-full h-auto" />
    </div>
  );
}
