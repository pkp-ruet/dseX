/**
 * THE chart style (2026-10 redesign, step 0). Every Recharts chart takes its
 * grid, axes, tooltip, colours and line weights from here, so charts across
 * the site look like one family. Spread the pieces onto the Recharts parts:
 *
 *   <CartesianGrid {...CHART.grid} />
 *   <XAxis dataKey="year" {...CHART.xAxis} />
 *   <YAxis {...CHART.yAxis} width={36} />
 *   <Tooltip {...CHART.tooltip} />
 *   <Line dataKey="pe" stroke={CHART.color.primary} {...CHART.line} />
 *
 * Colours are CSS tokens, so they follow globals.css. Text is 12px, the app's
 * floor (the older per-chart TICK constants used 11px).
 */

const tick = { fontSize: 12, fill: "var(--text-muted)" } as const;

export const CHART = {
  margin: { top: 8, right: 8, left: 0, bottom: 0 },
  height: { sm: 160, md: 220, lg: 280 },

  grid: { vertical: false, stroke: "var(--border)", strokeOpacity: 0.6 },
  xAxis: { tick, axisLine: false, tickLine: false, tickMargin: 8, minTickGap: 16 },
  yAxis: { tick, axisLine: false, tickLine: false, tickMargin: 4 },

  tooltip: {
    cursor: { stroke: "var(--border)", strokeWidth: 1 },
    contentStyle: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      boxShadow: "var(--shadow-lift)",
      padding: "8px 10px",
      fontSize: 12,
      color: "var(--text)",
    },
    labelStyle: { color: "var(--text-muted)", fontWeight: 600, marginBottom: 2 },
    itemStyle: { color: "var(--text)", padding: 0 },
  },

  /** Series colours. One accent per chart; up/down only for real gains and losses. */
  color: {
    primary: "var(--primary)",
    positive: "var(--positive)",
    negative: "var(--negative)",
    neutral: "var(--text-muted)",
    info: "var(--info)",
    reference: "var(--text-muted)",
  },

  line: { strokeWidth: 2, dot: false, activeDot: { r: 4, strokeWidth: 0 } },
  area: { strokeWidth: 2, fillOpacity: 0.12, dot: false, activeDot: { r: 4, strokeWidth: 0 } },
  bar: { radius: [4, 4, 0, 0] as [number, number, number, number], maxBarSize: 28 },
  /** A dashed reference line (an average, a target). */
  reference: { stroke: "var(--text-muted)", strokeDasharray: "4 4", strokeOpacity: 0.8 },
} as const;
