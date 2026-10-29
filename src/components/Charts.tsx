// Two tiny hand-rolled SVG charts. A gym log needs a trend line and a bar
// row, not a charting library.

export function LineChart({
  points,
  format = (v) => String(Math.round(v)),
  height = 140,
}: {
  points: { label: string; value: number }[];
  format?: (v: number) => string;
  height?: number;
}) {
  if (points.length === 0) return null;
  const w = 320;
  const pad = { t: 14, r: 10, b: 20, l: 10 };
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (points.length === 1 ? (w - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (w - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (height - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const bestIdx = values.indexOf(max);

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label={`Trend from ${format(points[0].value)} to ${format(last.value)}`}>
      <line x1={pad.l} x2={w - pad.r} y1={y(max)} y2={y(max)} stroke="var(--border)" strokeDasharray="3 4" />
      <line x1={pad.l} x2={w - pad.r} y1={y(min)} y2={y(min)} stroke="var(--border)" strokeDasharray="3 4" />
      {/* The line and dots glide to new values instead of jumping. */}
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="transition-[d] duration-500 ease-out motion-reduce:transition-none" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={i === points.length - 1 || i === bestIdx ? 4 : 2.5}
          fill="var(--primary)"
          className="transition-all duration-500 ease-out motion-reduce:transition-none"
        >
          <title>
            {p.label}: {format(p.value)}
          </title>
        </circle>
      ))}
      <text x={x(bestIdx)} y={y(max) - 6} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
        {format(max)}
      </text>
      <text x={pad.l} y={height - 4} fontSize="10" fill="var(--muted-foreground)">
        {points[0].label}
      </text>
      <text x={w - pad.r} y={height - 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
        {last.label}
      </text>
    </svg>
  );
}

export function BarRow({
  bars,
  height = 90,
  target,
}: {
  bars: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  target?: number;
}) {
  const max = Math.max(1, target ?? 0, ...bars.map((b) => b.value));
  return (
    <div>
      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {target !== undefined && (
          <div className="absolute inset-x-0 border-t border-dashed border-muted-foreground/40" style={{ bottom: (target / max) * height }} />
        )}
        {bars.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end" style={{ height }} title={`${b.label}: ${b.value}`}>
            {b.value > 0 && <span className="mb-0.5 text-[10px] text-muted-foreground tabular-nums">{b.value}</span>}
            <div
              className={`w-full rounded-t-md ${b.highlight ? "bg-primary" : "bg-muted-foreground/30"}`}
              style={{ height: Math.max(b.value ? 3 : 0, (b.value / max) * (height - 14)) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {bars.map((b, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] text-muted-foreground">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
