"use client";

/**
 * Lightweight SVG bar & sparkline charts for the CRM dashboard.
 * No third-party charting library required.
 */

// ─── Mini Bar Chart ─────────────────────────────────────────────

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarDatum[];
  height?: number;
  barColor?: string;
  className?: string;
}

export function MiniBarChart({
  data,
  height = 120,
  barColor = "var(--color-primary)",
  className = "",
}: MiniBarChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(32, Math.floor(240 / data.length));
  const gap = 4;
  const svgWidth = data.length * (barWidth + gap) - gap;

  return (
    <div className={className}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        preserveAspectRatio="xMidYEnd meet"
      >
        {data.map((d, i) => {
          const barH = (d.value / maxValue) * (height - 20);
          const x = i * (barWidth + gap);
          const y = height - 16 - barH;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={d.color ?? barColor}
                opacity={0.85}
              />
              <text
                x={x + barWidth / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                opacity={0.5}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Sparkline ──────────────────────────────────────────────────

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  className?: string;
}

export function Sparkline({
  values,
  width = 200,
  height = 40,
  strokeColor = "var(--color-primary)",
  className = "",
}: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padY = 4;
  const innerH = height - padY * 2;
  const stepX = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = padY + innerH - ((v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Horizontal Funnel ──────────────────────────────────────────

interface FunnelDatum {
  label: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelDatum[];
  className?: string;
}

export function FunnelChart({ data, className = "" }: FunnelChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`space-y-2 ${className}`}>
      {data.map((d) => {
        const pct = Math.round((d.value / maxValue) * 100);
        return (
          <div key={d.label} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-medium">{d.value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: d.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
