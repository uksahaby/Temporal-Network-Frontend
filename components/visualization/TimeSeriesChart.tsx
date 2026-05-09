// "use client";

// import { useEffect, useRef } from "react";
// import * as d3 from "d3";
// import "d3-transition";

// interface TimeSeriesData {
//   date: Date;
//   value: number;
// }

// interface TimeSeriesChartProps {
//   data: TimeSeriesData[];
//   width?: number;
//   height?: number;
// }

// export default function TimeSeriesChart({
//   data,
//   width = 800,
//   height = 400,
// }: TimeSeriesChartProps) {
//   const svgRef = useRef<SVGSVGElement>(null);

//   useEffect(() => {
//     if (!svgRef.current || !data.length) return;

//     d3.select(svgRef.current).selectAll("*").remove();

//     const svg = d3
//       .select(svgRef.current)
//       .attr("width", width)
//       .attr("height", height);

//     const margin = { top: 20, right: 30, bottom: 40, left: 50 };
//     const innerWidth = width - margin.left - margin.right;
//     const innerHeight = height - margin.top - margin.bottom;

//     // Create scales
//     const xScale = d3
//       .scaleTime()
//       .domain(d3.extent(data, (d: TimeSeriesData) => d.date) as [Date, Date])
//       .range([0, innerWidth]);

//     const yScale = d3
//       .scaleLinear()
//       .domain([0, d3.max(data, (d: TimeSeriesData) => d.value) || 0])
//       .range([innerHeight, 0]);

//     // Create line generator
//     const line = d3
//       .line<TimeSeriesData>()
//       .x((d: TimeSeriesData) => xScale(d.date))
//       .y((d: TimeSeriesData) => yScale(d.value))
//       .curve(d3.curveMonotoneX);

//     // Create area generator
//     const area = d3
//       .area<TimeSeriesData>()
//       .x((d: TimeSeriesData) => xScale(d.date))
//       .y0(innerHeight)
//       .y1((d: TimeSeriesData) => yScale(d.value))
//       .curve(d3.curveMonotoneX);

//     const g = svg
//       .append("g")
//       .attr("transform", `translate(${margin.left},${margin.top})`);

//     // Add area
//     g.append("path")
//       .datum(data)
//       .attr("fill", "url(#gradient)")
//       .attr("opacity", 0.3)
//       .attr("d", area);

//     // Add line
//     g.append("path")
//       .datum(data)
//       .attr("fill", "none")
//       .attr("stroke", "#3b82f6")
//       .attr("stroke-width", 3)
//       .attr("d", line);

//     // Add circles for data points
//     g.selectAll("circle")
//       .data(data)
//       .enter()
//       .append("circle")
//       .attr("cx", (d: TimeSeriesData) => xScale(d.date))
//       .attr("cy", (d: TimeSeriesData) => yScale(d.value))
//       .attr("r", 4)
//       .attr("fill", "#3b82f6")
//       .attr("stroke", "white")
//       .attr("stroke-width", 2)
//       .on("mouseover", (event, d) => {
//         const target = event.currentTarget as SVGCircleElement;
//         d3.select(target).transition().duration(200).attr("r", 8);

//         // Show tooltip
//         g.append("text")
//           .attr("class", "tooltip")
//           .attr("x", xScale(d.date))
//           .attr("y", yScale(d.value) - 15)
//           .attr("text-anchor", "middle")
//           .attr("font-size", "12px")
//           .attr("fill", "#374151")
//           .text(`Value: ${d.value}`);
//       })
//       .on("mouseout", (event) => {
//         const target = event.currentTarget as SVGCircleElement;
//         d3.select(target).transition().duration(200).attr("r", 4);

//         g.selectAll(".tooltip").remove();
//       });

//     // Add axes
//     g.append("g")
//       .attr("transform", `translate(0,${innerHeight})`)
//       .call(d3.axisBottom(xScale).ticks(5));

//     g.append("g").call(d3.axisLeft(yScale));

//     // Add gradient
//     const defs = svg.append("defs");
//     const gradient = defs
//       .append("linearGradient")
//       .attr("id", "gradient")
//       .attr("x1", "0%")
//       .attr("y1", "0%")
//       .attr("x2", "0%")
//       .attr("y2", "100%");

//     gradient
//       .append("stop")
//       .attr("offset", "0%")
//       .attr("stop-color", "#3b82f6")
//       .attr("stop-opacity", 0.8);

//     gradient
//       .append("stop")
//       .attr("offset", "100%")
//       .attr("stop-color", "#3b82f6")
//       .attr("stop-opacity", 0.1);
//   }, [data, width, height]);

//   return (
//     <div className="border rounded-lg p-4 bg-white shadow-sm">
//       <h3 className="text-lg font-semibold mb-4">Time Series Chart</h3>
//       <svg ref={svgRef} className="w-full h-auto" />
//     </div>
//   );
// }

"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimeSeriesChartProps {
  data: Array<{
    date: Date;
    density: number;
    nodes: number;
    edges: number;
    clustering: number;
  }>;
  width?: number;
  height?: number;
}

export default function TimeSeriesChart({
  data,
  width = 800,
  height = 300,
}: TimeSeriesChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // D3 DOM ops scale poorly with very long timelines; downsample for rendering.
    const MAX_POINTS = 2000;
    const stride =
      data.length > MAX_POINTS ? Math.ceil(data.length / MAX_POINTS) : 1;
    const renderData =
      stride === 1 ? data : data.filter((_, idx) => idx % stride === 0);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(renderData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(renderData, (d) => d.density) || 1])
      .range([innerHeight, 0]);

    // Create line generator for density
    const line = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.density))
      .curve(d3.curveMonotoneX);

    // Create area generator
    const area = d3
      .area<(typeof data)[0]>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.density))
      .curve(d3.curveMonotoneX);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add area
    g.append("path")
      .datum(renderData)
      .attr("fill", "url(#gradient)")
      .attr("opacity", 0.3)
      .attr("d", area);

    // Add line
    g.append("path")
      .datum(renderData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Add circles for data points
    g.selectAll("circle")
      .data(renderData)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.density))
      .attr("r", 4)
      .attr("fill", "#3b82f6")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(200).attr("r", 8);

        // Show tooltip
        g.append("text")
          .attr("class", "tooltip")
          .attr("x", xScale(d.date))
          .attr("y", yScale(d.density) - 15)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("fill", "#374151")
          .text(`Density: ${d.density.toFixed(3)}`);
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(200).attr("r", 4);

        g.selectAll(".tooltip").remove();
      });

    // Add x-axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5));

    // Add y-axis
    g.append("g").call(d3.axisLeft(yScale));

    // Add labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("Time");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("Network Density");

    // Add gradient
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.8);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.1);
  }, [data, width, height]);

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time Series Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No time series data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Density Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-white">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="w-full h-auto"
          />
        </div>
      </CardContent>
    </Card>
  );
}
