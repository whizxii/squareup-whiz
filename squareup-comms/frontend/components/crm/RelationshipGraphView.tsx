"use client";

/**
 * RelationshipGraphView — interactive SVG graph showing contacts,
 * companies, and deals as nodes with relationship edges.
 * Uses a simple force-directed simulation in a requestAnimationFrame loop.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  User,
  Building2,
  Briefcase,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRelationshipGraph } from "@/lib/hooks/use-crm-queries";
import type { GraphNode, GraphLink, GraphNodeType, GraphNodeHealth } from "@/lib/types/crm";

// ─── Constants ────────────────────────────────────────────────

const NODE_RADIUS: Record<GraphNodeType, number> = {
  company: 28,
  contact: 20,
  deal: 22,
};

const NODE_COLORS: Record<GraphNodeType, { bg: string; border: string; text: string }> = {
  contact: { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  company: { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" },
  deal: { bg: "#f59e0b", border: "#d97706", text: "#ffffff" },
};

const HEALTH_RING: Record<GraphNodeHealth, string> = {
  good: "#22c55e",
  warning: "#eab308",
  at_risk: "#ef4444",
};

const LINK_COLORS: Record<string, string> = {
  works_at: "#8b5cf680",
  involved_in: "#f59e0b80",
  belongs_to: "#6366f180",
};

const NODE_ICON_SIZE = 14;

// ─── Simulation Types ─────────────────────────────────────────

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  data: GraphNode;
}

interface SimLink {
  source: string;
  target: string;
  data: GraphLink;
}

// ─── Simple force simulation ──────────────────────────────────

function createSimNodes(nodes: GraphNode[], width: number, height: number): SimNode[] {
  return nodes.map((n, i) => ({
    id: n.id,
    x: width / 2 + (Math.cos((i / nodes.length) * Math.PI * 2) * Math.min(width, height)) / 3,
    y: height / 2 + (Math.sin((i / nodes.length) * Math.PI * 2) * Math.min(width, height)) / 3,
    vx: 0,
    vy: 0,
    data: n,
  }));
}

function createSimLinks(links: GraphLink[]): SimLink[] {
  return links.map((l) => ({ source: l.source, target: l.target, data: l }));
}

function tickSimulation(
  nodes: SimNode[],
  links: SimLink[],
  centerX: number,
  centerY: number,
): SimNode[] {
  const REPULSION = 3000;
  const ATTRACTION = 0.005;
  const CENTER_GRAVITY = 0.01;
  const DAMPING = 0.85;
  const MAX_VELOCITY = 8;

  // Build index
  const nodeMap = new Map<string, SimNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Reset forces
  const fx = new Map<string, number>();
  const fy = new Map<string, number>();
  for (const n of nodes) {
    fx.set(n.id, 0);
    fy.set(n.id, 0);
  }

  // Repulsion (all pairs)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = REPULSION / (dist * dist);
      const fdx = (dx / dist) * force;
      const fdy = (dy / dist) * force;
      fx.set(a.id, (fx.get(a.id) ?? 0) - fdx);
      fy.set(a.id, (fy.get(a.id) ?? 0) - fdy);
      fx.set(b.id, (fx.get(b.id) ?? 0) + fdx);
      fy.set(b.id, (fy.get(b.id) ?? 0) + fdy);
    }
  }

  // Attraction (linked nodes)
  for (const link of links) {
    const a = nodeMap.get(link.source);
    const b = nodeMap.get(link.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const force = dist * ATTRACTION;
    fx.set(a.id, (fx.get(a.id) ?? 0) + dx * force);
    fy.set(a.id, (fy.get(a.id) ?? 0) + dy * force);
    fx.set(b.id, (fx.get(b.id) ?? 0) - dx * force);
    fy.set(b.id, (fy.get(b.id) ?? 0) - dy * force);
  }

  // Center gravity
  for (const n of nodes) {
    fx.set(n.id, (fx.get(n.id) ?? 0) + (centerX - n.x) * CENTER_GRAVITY);
    fy.set(n.id, (fy.get(n.id) ?? 0) + (centerY - n.y) * CENTER_GRAVITY);
  }

  // Apply forces, return new array
  return nodes.map((n) => {
    let vx = (n.vx + (fx.get(n.id) ?? 0)) * DAMPING;
    let vy = (n.vy + (fy.get(n.id) ?? 0)) * DAMPING;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > MAX_VELOCITY) {
      vx = (vx / speed) * MAX_VELOCITY;
      vy = (vy / speed) * MAX_VELOCITY;
    }
    return { ...n, x: n.x + vx, y: n.y + vy, vx, vy };
  });
}

// ─── Node icon helper ─────────────────────────────────────────

function NodeIcon({ type }: { type: GraphNodeType }) {
  switch (type) {
    case "contact":
      return <User width={NODE_ICON_SIZE} height={NODE_ICON_SIZE} stroke="white" strokeWidth={2} />;
    case "company":
      return <Building2 width={NODE_ICON_SIZE} height={NODE_ICON_SIZE} stroke="white" strokeWidth={2} />;
    case "deal":
      return <Briefcase width={NODE_ICON_SIZE} height={NODE_ICON_SIZE} stroke="white" strokeWidth={2} />;
  }
}

// ─── Tooltip ──────────────────────────────────────────────────

function NodeTooltip({
  node,
  position,
  onClose,
}: {
  node: GraphNode;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const meta = node.metadata ?? {};
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[200px]"
      style={{ left: position.x + 16, top: position.y - 20 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: HEALTH_RING[node.health] }}
          />
          <span className="font-semibold text-foreground text-sm">{node.label}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1 text-muted-foreground">
        <div className="capitalize font-medium text-foreground/80">{node.type}</div>
        {meta.email ? <div>Email: {String(meta.email)}</div> : null}
        {meta.title ? <div>Title: {String(meta.title)}</div> : null}
        {meta.stage ? <div>Stage: {String(meta.stage)}</div> : null}
        {meta.company ? <div>Company: {String(meta.company)}</div> : null}
        {meta.industry ? <div>Industry: {String(meta.industry)}</div> : null}
        {meta.domain ? <div>Domain: {String(meta.domain)}</div> : null}
        {meta.value != null ? (
          <div>Value: {String(meta.currency ?? "INR")} {Number(meta.value).toLocaleString()}</div>
        ) : null}
        {meta.lead_score != null ? <div>Lead Score: {String(meta.lead_score)}</div> : null}
        {meta.relationship_strength != null ? (
          <div>Relationship: {String(meta.relationship_strength)}/10</div>
        ) : null}
        {meta.probability != null ? <div>Probability: {String(meta.probability)}%</div> : null}
        {meta.contact_count != null ? <div>Contacts: {String(meta.contact_count)}</div> : null}
      </div>
    </motion.div>
  );
}

// ─── Legend ────────────────────────────────────────────────────

function GraphLegend() {
  const items = [
    { type: "contact" as const, label: "Contact", color: NODE_COLORS.contact.bg },
    { type: "company" as const, label: "Company", color: NODE_COLORS.company.bg },
    { type: "deal" as const, label: "Deal", color: NODE_COLORS.deal.bg },
  ];
  const healthItems = [
    { health: "good" as const, label: "Healthy", color: HEALTH_RING.good },
    { health: "warning" as const, label: "Warning", color: HEALTH_RING.warning },
    { health: "at_risk" as const, label: "At Risk", color: HEALTH_RING.at_risk },
  ];

  return (
    <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs space-y-2">
      <p className="font-semibold text-foreground text-[10px] uppercase tracking-wider">Node Types</p>
      <div className="flex items-center gap-3">
        {items.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="font-semibold text-foreground text-[10px] uppercase tracking-wider pt-1">Health</p>
      <div className="flex items-center gap-3">
        {healthItems.map((item) => (
          <div key={item.health} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: item.color, backgroundColor: "transparent" }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────

function GraphStats({ nodes, links }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const contactCount = nodes.filter((n) => n.type === "contact").length;
  const companyCount = nodes.filter((n) => n.type === "company").length;
  const dealCount = nodes.filter((n) => n.type === "deal").length;

  return (
    <div className="absolute top-4 left-4 flex items-center gap-3 text-xs">
      <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-4">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{contactCount}</span> contacts
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{companyCount}</span> companies
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{dealCount}</span> deals
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{links.length}</span> links
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export function RelationshipGraphView() {
  const { data, isLoading, error } = useRelationshipGraph({ limit: 150 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<{
    node: GraphNode;
    screenPos: { x: number; y: number };
  } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const tickCount = useRef(0);

  const nodes = data?.nodes ?? [];
  const links = data?.links ?? [];

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Initialize simulation when data changes
  useEffect(() => {
    if (nodes.length === 0) return;
    const sn = createSimNodes(nodes, dimensions.width, dimensions.height);
    const sl = createSimLinks(links);
    setSimNodes(sn);
    setSimLinks(sl);
    tickCount.current = 0;
  }, [nodes.length, links.length, dimensions.width, dimensions.height]);

  // Animation loop with convergence detection
  useEffect(() => {
    if (simNodes.length === 0) return;
    const MAX_TICKS = 300;
    const CONVERGE_THRESHOLD = 0.1;
    let convergedFrames = 0;
    const CONVERGE_FRAMES_NEEDED = 5;

    function hasConverged(nodes: SimNode[]): boolean {
      return nodes.every(
        (n) => Math.sqrt(n.vx * n.vx + n.vy * n.vy) < CONVERGE_THRESHOLD,
      );
    }

    function step() {
      if (tickCount.current >= MAX_TICKS) return;
      setSimNodes((prev) => {
        const next = tickSimulation(
          prev,
          simLinks,
          dimensions.width / 2,
          dimensions.height / 2,
        );
        tickCount.current += 1;

        if (hasConverged(next)) {
          convergedFrames += 1;
        } else {
          convergedFrames = 0;
        }

        return next;
      });

      // Stop early if simulation has been stable for several frames
      if (convergedFrames >= CONVERGE_FRAMES_NEEDED) return;
      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [simNodes.length, simLinks, dimensions.width, dimensions.height]);

  // Node index for links
  const nodeIndex = useMemo(() => {
    const map = new Map<string, SimNode>();
    for (const n of simNodes) map.set(n.id, n);
    return map;
  }, [simNodes]);

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z * 1.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z / 1.25, 0.3)), []);
  const handleFitView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [dragging, pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && !dragging) {
        setPan({
          x: panStart.current.panX + (e.clientX - panStart.current.x),
          y: panStart.current.panY + (e.clientY - panStart.current.y),
        });
      }
      if (dragging) {
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;
        const svgX = (e.clientX - svgRect.left - pan.x) / zoom;
        const svgY = (e.clientY - svgRect.top - pan.y) / zoom;
        setSimNodes((prev) =>
          prev.map((n) =>
            n.id === dragging ? { ...n, x: svgX, y: svgY, vx: 0, vy: 0 } : n,
          ),
        );
      }
    },
    [isPanning, dragging, pan, zoom],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragging(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.3, Math.min(3, z * delta)));
  }, []);

  // Node click
  const handleNodeClick = useCallback(
    (node: SimNode, e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedNode?.node.id === node.id) {
        setSelectedNode(null);
      } else {
        setSelectedNode({
          node: node.data,
          screenPos: { x: e.clientX, y: e.clientY },
        });
      }
    },
    [selectedNode],
  );

  // Node drag start
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(nodeId);
    tickCount.current = 0; // restart simulation on drag
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col p-4 gap-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-muted-foreground" />
          <Skeleton width={160} height={20} className="rounded" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Failed to load relationship graph. Please try again.
      </div>
    );
  }

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Network className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">No relationships yet</p>
          <p className="text-xs text-muted-foreground">
            Add contacts and deals to see your relationship network
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-background"
      style={{ cursor: isPanning ? "grabbing" : dragging ? "grabbing" : "grab" }}
    >
      {/* SVG canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="select-none"
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Links */}
          {simLinks.map((link) => {
            const src = nodeIndex.get(link.source);
            const tgt = nodeIndex.get(link.target);
            if (!src || !tgt) return null;
            return (
              <line
                key={`${link.source}-${link.target}`}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={LINK_COLORS[link.data.type] ?? "#64748b40"}
                strokeWidth={Math.max(1, (link.data.strength ?? 5) / 3)}
                strokeLinecap="round"
              />
            );
          })}

          {/* Nodes */}
          {simNodes.map((node) => {
            const r = NODE_RADIUS[node.data.type];
            const colors = NODE_COLORS[node.data.type];
            const healthColor = HEALTH_RING[node.data.health];
            const isSelected = selectedNode?.node.id === node.id;
            const isDragged = dragging === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => handleNodeClick(node, e)}
                onMouseDown={(e) => handleNodeDragStart(node.id, e)}
                style={{ cursor: isDragged ? "grabbing" : "pointer" }}
              >
                {/* Health ring */}
                <circle
                  r={r + 4}
                  fill="none"
                  stroke={healthColor}
                  strokeWidth={2.5}
                  opacity={isSelected ? 1 : 0.6}
                />
                {/* Node circle */}
                <circle
                  r={r}
                  fill={colors.bg}
                  stroke={isSelected ? "#fff" : colors.border}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* Icon */}
                <foreignObject
                  x={-NODE_ICON_SIZE / 2}
                  y={-NODE_ICON_SIZE / 2}
                  width={NODE_ICON_SIZE}
                  height={NODE_ICON_SIZE}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <NodeIcon type={node.data.type} />
                  </div>
                </foreignObject>
                {/* Label */}
                <text
                  y={r + 14}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-medium select-none"
                  style={{ pointerEvents: "none" }}
                >
                  {node.data.label.length > 18
                    ? node.data.label.slice(0, 16) + "…"
                    : node.data.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Stats */}
      <GraphStats nodes={nodes} links={links} />

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="p-1.5 bg-card/90 backdrop-blur-sm border border-border rounded-lg hover:bg-accent transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-foreground" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 bg-card/90 backdrop-blur-sm border border-border rounded-lg hover:bg-accent transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-foreground" />
        </button>
        <button
          onClick={handleFitView}
          className="p-1.5 bg-card/90 backdrop-blur-sm border border-border rounded-lg hover:bg-accent transition-colors"
          title="Fit view"
        >
          <Maximize2 className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Legend */}
      <GraphLegend />

      {/* Node tooltip */}
      <AnimatePresence>
        {selectedNode && (
          <NodeTooltip
            node={selectedNode.node}
            position={selectedNode.screenPos}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
