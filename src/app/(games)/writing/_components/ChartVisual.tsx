"use client";

// Renders all 8 IELTS Writing Task 1 visual types (line, bar, pie, table, map, process, mixed, system)
// in the Warm Study palette with clear data labels.
import type { Task1Visual } from "@/lib/writing/writing-data";

const SERIES_COLORS = ["#f97316", "#0ea5e9", "#22c55e", "#8b5cf6"];

export function ChartVisual({ visual }: { visual: Task1Visual }) {
  switch (visual.type) {
    case "line":
      return <LineChart visual={visual} />;
    case "bar":
      return <BarChart visual={visual} />;
    case "pie":
      return <PieCharts visual={visual} />;
    case "table":
      return <TableVisual visual={visual} />;
    case "map":
      return <MapVisual visual={visual} />;
    case "process":
      return <ProcessVisual visual={visual} />;
    case "mixed":
      return <MixedChart visual={visual} />;
    case "system":
      return <SystemVisual visual={visual} />;
  }
}

function LineChart({ visual }: { visual: Extract<Task1Visual, { type: "line" }> }) {
  const maxVal = Math.max(100, ...visual.series.flatMap((s) => s.values));
  const yTop = 20;
  const yBot = 152;
  const xLeft = 42;
  const xRight = 264;
  const spanX = xRight - xLeft;
  const spanY = yBot - yTop;
  const xAt = (i: number) =>
    visual.labels.length <= 1 ? xLeft : xLeft + (i / (visual.labels.length - 1)) * spanX;
  const yAt = (v: number) => yBot - (v / maxVal) * spanY;

  return (
    <div className="ws-visual">
      <div className="ws-visual-head">
        <strong>{visual.title}</strong>
        <span className="muted tiny">Đơn vị: {visual.unit}</span>
      </div>
      <div className="ws-legend">
        {visual.series.map((s, i) => (
          <span key={s.name}>
            <i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 290 178" className="ws-svg" role="img" aria-label={visual.title}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = yBot - t * spanY;
          return (
            <g key={t}>
              <line
                x1={32}
                y1={y}
                x2={276}
                y2={y}
                stroke="#cbd5e1"
                strokeDasharray={t === 0 ? undefined : "3 3"}
              />
              <text x={27} y={y + 4} fontSize={10} fill="#64748b" textAnchor="end">
                {Math.round(t * maxVal)}
              </text>
            </g>
          );
        })}
        {visual.labels.map((lbl, i) => (
          <text key={lbl} x={xAt(i)} y={170} fontSize={11} fill="#475569" textAnchor="middle">
            {lbl}
          </text>
        ))}
        {visual.series.map((s, si) => {
          const color = SERIES_COLORS[si % SERIES_COLORS.length];
          const pts = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
          return (
            <g key={s.name}>
              <polyline fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" points={pts} />
              {s.values.map((v, i) => {
                const cx = xAt(i);
                const cy = yAt(v);
                // Offset labels slightly apart when two lines cross
                const dy = si === 0 ? (v > (visual.series[1]?.values[i] ?? 0) ? -9 : 15) : v > (visual.series[0]?.values[i] ?? 0) ? -9 : 15;
                return (
                  <g key={`${s.name}-${i}`}>
                    <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
                    <text x={cx} y={cy + dy} fontSize={11} fontWeight={700} fill={color} textAnchor="middle">
                      {v}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BarChart({ visual }: { visual: Extract<Task1Visual, { type: "bar" }> }) {
  const maxVal = 80;
  const yTop = 18;
  const yBot = 152;
  const spanY = yBot - yTop;
  const groupW = 74;
  const startX = 42;
  const barW = 18;

  return (
    <div className="ws-visual">
      <div className="ws-visual-head">
        <strong>{visual.title}</strong>
        <span className="muted tiny">Đơn vị: {visual.unit}</span>
      </div>
      <div className="ws-legend">
        {visual.series.map((s, i) => (
          <span key={s.name}>
            <i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 286 178" className="ws-svg" role="img" aria-label={visual.title}>
        {[0, 20, 40, 60, 80].map((val) => {
          const y = yBot - (val / maxVal) * spanY;
          return (
            <g key={val}>
              <line x1={32} y1={y} x2={276} y2={y} stroke="#cbd5e1" strokeDasharray={val === 0 ? undefined : "3 3"} />
              <text x={27} y={y + 4} fontSize={10} fill="#64748b" textAnchor="end">
                {val}%
              </text>
            </g>
          );
        })}
        {visual.labels.map((lbl, gi) => {
          const gx = startX + gi * (groupW + 10);
          return (
            <g key={lbl}>
              {visual.series.map((s, si) => {
                const v = s.values[gi] ?? 0;
                const h = (v / maxVal) * spanY;
                const x = gx + si * (barW + 3);
                const y = yBot - h;
                const color = SERIES_COLORS[si % SERIES_COLORS.length];
                return (
                  <g key={`${lbl}-${s.name}`}>
                    <rect x={x} y={y} width={barW} height={h} rx={4} fill={color} />
                    <text x={x + barW / 2} y={y - 4} fontSize={10} fontWeight={700} fill={color} textAnchor="middle">
                      {v}
                    </text>
                  </g>
                );
              })}
              <text x={gx + 29} y={170} fontSize={11} fill="#475569" textAnchor="middle">
                {lbl}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PieCharts({ visual }: { visual: Extract<Task1Visual, { type: "pie" }> }) {
  const labels = visual.panels[0]?.segments.map((s) => s.label) ?? [];
  const r = 34;
  const c = 2 * Math.PI * r;

  return (
    <div className="ws-visual">
      <div className="ws-visual-head">
        <strong>{visual.title}</strong>
      </div>
      <div className="ws-legend">
        {labels.map((lbl, i) => (
          <span key={lbl}>
            <i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {lbl}
          </span>
        ))}
      </div>
      <div className="ws-pie-grid">
        {visual.panels.map((panel) => {
          const total = panel.segments.reduce((acc, s) => acc + s.value, 0) || 100;
          const arcs = panel.segments.reduce<
            { label: string; value: number; len: number; offset: number; color: string }[]
          >((acc, seg, i) => {
            const prevEnd = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
            const len = (seg.value / total) * c;
            acc.push({
              label: seg.label,
              value: seg.value,
              len,
              offset: prevEnd,
              color: SERIES_COLORS[i % SERIES_COLORS.length],
            });
            return acc;
          }, []);
          return (
            <div key={panel.title} className="ws-pie-card">
              <strong className="ws-pie-year">{panel.title}</strong>
              <svg viewBox="0 0 100 100" className="ws-pie-svg" role="img" aria-label={`${visual.title} ${panel.title}`}>
                <g transform="rotate(-90 50 50)">
                  {arcs.map((a) => (
                    <circle
                      key={a.label}
                      cx={50}
                      cy={50}
                      r={r}
                      fill="none"
                      stroke={a.color}
                      strokeWidth={22}
                      strokeDasharray={`${a.len} ${c - a.len}`}
                      strokeDashoffset={-a.offset}
                    />
                  ))}
                </g>
              </svg>
              <div className="ws-pie-nums">
                {panel.segments.map((seg, i) => (
                  <span key={seg.label} style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}>
                    {seg.label}: <strong>{seg.value}%</strong>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableVisual({ visual }: { visual: Extract<Task1Visual, { type: "table" }> }) {
  return (
    <div className="ws-visual">
      <div className="ws-visual-head">
        <strong>{visual.title}</strong>
      </div>
      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              {visual.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row) => (
              <tr key={String(row[0])}>
                {row.map((cell, ci) => (
                  <td key={ci} className={ci === 0 ? "ws-table-cat" : undefined}>
                    {ci === 0 ? cell : `$${cell}`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MapVisual({ visual }: { visual: Extract<Task1Visual, { type: "map" }> }) {
  const before = visual.panels[0]?.grid ?? [];
  return (
    <div className="ws-visual">
      <div className="ws-visual-head">
        <strong>{visual.title}</strong>
        <span className="muted tiny">N ↑ · S ↓ · W ← · E →</span>
      </div>
      <div className="ws-map-panels">
        {visual.panels.map((panel, pi) => (
          <div key={panel.title} className="ws-map-panel">
            <strong>{panel.title}</strong>
            <div className="ws-map-grid">
              {panel.grid.map((row, ri) =>
                row.map((cell, ci) => {
                  const changed = pi === 1 && before[ri]?.[ci] !== cell;
                  return (
                    <div key={`${ri}-${ci}`} className={changed ? "ws-map-cell changed" : "ws-map-cell"}>
                      {cell}
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcessVisual({ visual }: { visual: Extract<Task1Visual, { type: "process" }> }) {
  return (
    <div className="ws-visual">
      <div className="ws-visual-head">
        <strong>{visual.title}</strong>
        <span className="muted tiny">{visual.stages.length} giai đoạn</span>
      </div>
      <ol className="ws-process-list">
        {visual.stages.map((stage, i) => (
          <li key={stage} className="ws-process-step">
            <span className="ws-step-num">{i + 1}</span>
            <span>{stage}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MixedChart({ visual }: { visual: Extract<Task1Visual, { type: "mixed" }> }) {
  const maxBar = 60;
  const yTop = 20;
  const yBot = 152;
  const spanY = yBot - yTop;
  const xAt = (i: number) => 56 + i * 64;
  const yLine = (pct: number) => yBot - (pct / 100) * spanY;

  return (
    <div className="ws-visual">
      <div className="ws-visual-head">
        <strong>{visual.title}</strong>
      </div>
      <div className="ws-legend">
        <span>
          <i style={{ background: "#f97316" }} />
          {visual.bars.name} ({visual.bars.unit})
        </span>
        <span>
          <i style={{ background: "#0ea5e9" }} />
          {visual.line.name} ({visual.line.unit})
        </span>
      </div>
      <svg viewBox="0 0 296 178" className="ws-svg" role="img" aria-label={visual.title}>
        {[0, 0.5, 1].map((t) => {
          const y = yBot - t * spanY;
          return (
            <line
              key={t}
              x1={26}
              y1={y}
              x2={276}
              y2={y}
              stroke="#cbd5e1"
              strokeDasharray={t === 0 ? undefined : "3 3"}
            />
          );
        })}
        {visual.labels.map((lbl, i) => {
          const cx = xAt(i);
          const bv = visual.bars.values[i];
          const bh = (bv / maxBar) * spanY;
          const by = yBot - bh;
          return (
            <g key={lbl}>
              <rect x={cx - 16} y={by} width={32} height={bh} rx={5} fill="rgba(249, 115, 22, 0.25)" stroke="#f97316" strokeWidth={2} />
              <text x={cx} y={yBot - 6} fontSize={10} fontWeight={700} fill="#ea580c" textAnchor="middle">
                {bv}k
              </text>
              <text x={cx} y={170} fontSize={11} fill="#475569" textAnchor="middle">
                {lbl}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={visual.line.values.map((v, i) => `${xAt(i)},${yLine(v)}`).join(" ")}
        />
        {visual.line.values.map((v, i) => (
          <g key={i}>
            <circle cx={xAt(i)} cy={yLine(v)} r={4} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
            <text x={xAt(i)} y={yLine(v) - 9} fontSize={11} fontWeight={700} fill="#0284c7" textAnchor="middle">
              {v}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function SystemVisual({ visual }: { visual: Extract<Task1Visual, { type: "system" }> }) {
  return (
    <div className="ws-visual">
      <div className="ws-visual-head">
        <strong>{visual.title}</strong>
      </div>
      <div className="ws-system-flow">
        {visual.stages.map((s, i) => (
          <div key={s} className="ws-system-node">
            <span className="ws-step-num">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div className="ws-system-out">
        <span className="muted tiny">Đầu ra sử dụng:</span>
        <div className="ws-system-branches">
          {visual.outputs.map((out) => (
            <span key={out} className="ws-branch-pill">
              → {out}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
