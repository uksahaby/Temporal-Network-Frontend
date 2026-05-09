"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface Node {
  id: string;
  group: string;
  size: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

type NodeDatum = Node & d3.SimulationNodeDatum;
type LinkDatum = d3.SimulationLinkDatum<NodeDatum> & {
  source: string | NodeDatum;
  target: string | NodeDatum;
  value: number;
};

interface NetworkGraphProps {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
}

export default function NetworkGraph({
  nodes,
  links,
  width = 800,
  height = 600,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NodeDatum | null>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const nodeData: NodeDatum[] = nodes.map((node) => ({ ...node }));
    const linkData: LinkDatum[] = links.map((link) => ({ ...link }));

    // Create force simulation
    const simulation = d3
      .forceSimulation<NodeDatum>(nodeData)
      .force(
        "link",
        d3
          .forceLink<NodeDatum, LinkDatum>(linkData)
          .id((d) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-40))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<NodeDatum>().radius((d) => d.size + 5),
      );

    // Create color scale
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(["group1", "group2", "group3", "group4"])
      .range(["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]);

    // Draw links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(linkData)
      .enter()
      .append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);

    // Draw nodes
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodeData)
      .enter()
      .append("circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => colorScale(d.group))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .call(
        d3
          .drag<SVGCircleElement, NodeDatum>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended),
      )
      .on("click", (event, d) => {
        setSelectedNode(d);
      });

    // Add labels
    const label = svg
      .append("g")
      .selectAll("text")
      .data(nodeData)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("font-size", "12px")
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("fill", "#374151");

    // Update positions
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as NodeDatum).x ?? 0)
        .attr("y1", (d) => (d.source as NodeDatum).y ?? 0)
        .attr("x2", (d) => (d.target as NodeDatum).x ?? 0)
        .attr("y2", (d) => (d.target as NodeDatum).y ?? 0);

      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);

      label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    });

    // Drag functions
    function dragstarted(
      event: d3.D3DragEvent<SVGCircleElement, NodeDatum, NodeDatum>,
    ) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(
      event: d3.D3DragEvent<SVGCircleElement, NodeDatum, NodeDatum>,
    ) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(
      event: d3.D3DragEvent<SVGCircleElement, NodeDatum, NodeDatum>,
    ) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Network Graph</h3>
        {selectedNode && (
          <div className="text-sm bg-gray-100 px-3 py-1 rounded">
            Selected: {selectedNode.id}
          </div>
        )}
      </div>
      <svg ref={svgRef} className="w-full h-auto border rounded" />
    </div>
  );
}
