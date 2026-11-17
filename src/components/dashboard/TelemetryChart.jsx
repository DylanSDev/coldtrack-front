import React, { useMemo, useRef, useState } from "react";
import { LineChart, Table2 } from "lucide-react";
import { generateSeries, TEMP_ALERT_THRESHOLD_C } from "@/lib/telemetry";

const W = 800;
const H = 260;
const PAD = { top: 20, right: 20, bottom: 30, left: 40 };

function smoothPath(pts) {
  return pts
    .map(([x, y], i) => {
      if (i === 0) return `M${x.toFixed(1)} ${y.toFixed(1)}`;
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      return `C${cx.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TelemetryChart({ equipos, selectedId, onSelect }) {
  const equipo = equipos.find((e) => e.device_id === selectedId) ?? equipos[0];
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState("chart");

  const series = useMemo(() => (equipo ? generateSeries(equipo) : []), [equipo]);

  if (!equipo) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
        No hay equipos para mostrar telemetría.
      </div>
    );
  }

  // Escala con marcas redondas
  const vals = series.map((p) => p.value);
  const rawMin = Math.min(...vals, 0);
  const rawMax = Math.max(...vals, TEMP_ALERT_THRESHOLD_C + 1);
  const step = rawMax - rawMin > 12 ? 5 : 2;
  const yMin = Math.floor(rawMin / step) * step;
  const yMax = Math.ceil(rawMax / step) * step;
  const ticks = [];
  for (let t = yMin; t <= yMax; t += step) ticks.push(t);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (i / (series.length - 1)) * innerW;
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const pts = series.map((p, i) => [x(i), y(p.value)]);
  const line = smoothPath(pts);
  const area = `${line} L${x(series.length - 1)} ${PAD.top + innerH} L${x(0)} ${PAD.top + innerH} Z`;
  const gid = `tc-${equipo.device_id}`;
  const last = series.length - 1;
  const yThr = y(TEMP_ALERT_THRESHOLD_C);

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / innerW) * last);
    setHover(Math.max(0, Math.min(last, i)));
  };

  const tipAlign = hover === null ? "" : hover < 3 ? "translate-x-0" : hover > last - 3 ? "-translate-x-full" : "-translate-x-1/2";
  const axisText = "fill-slate-500 dark:fill-slate-400";

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0b1120]/90 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Temperatura interna, últimas 24 h</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {equipo.modelo} · {equipo.device_id} · {equipo.ubicacion}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-900/70 p-1" role="tablist" aria-label="Equipo">
            {equipos.map((e) => {
              const on = e.device_id === equipo.device_id;
              return (
                <button
                  key={e.device_id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => onSelect(e.device_id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors ${
                    on
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {e.device_id.replace("REF-", "")}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {view === "chart" ? <Table2 className="h-3.5 w-3.5" /> : <LineChart className="h-3.5 w-3.5" />}
            {view === "chart" ? "Ver tabla" : "Ver gráfico"}
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs tabular-nums">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Hora</th>
                <th className="px-3 py-2 text-right font-semibold">Temperatura</th>
                <th className="px-3 py-2 text-left font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {series.map((p) => (
                <tr key={p.label}>
                  <td className="px-3 py-1.5 font-mono">{p.label}</td>
                  <td className="px-3 py-1.5 text-right">{p.value.toFixed(1)} °C</td>
                  <td className="px-3 py-1.5">{p.value > TEMP_ALERT_THRESHOLD_C ? "Sobre el umbral" : "En rango"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto text-blue-600 dark:text-blue-500"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            role="img"
            aria-label={`Temperatura interna de ${equipo.device_id} en las últimas 24 horas. Lectura actual ${series[last].value.toFixed(1)} °C.`}
          >
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* zona de alerta */}
            <rect x={PAD.left} y={PAD.top} width={innerW} height={yThr - PAD.top} fill="#ef4444" opacity="0.06" />

            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
                <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" className={axisText} fontSize="11">
                  {t}°
                </text>
              </g>
            ))}
            {[0, 6, 12, 18, 23].map((i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className={axisText} fontSize="11">
                {series[i].label}
              </text>
            ))}

            {/* umbral */}
            <line x1={PAD.left} x2={W - PAD.right} y1={yThr} y2={yThr} stroke="#ef4444" strokeWidth="1" strokeDasharray="5 4" />
            <text x={PAD.left + 8} y={PAD.top + 14} className={axisText} fontSize="11">
              Zona de alerta (más de {TEMP_ALERT_THRESHOLD_C} °C)
            </text>

            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {hover === null ? (
              <>
                <circle cx={pts[last][0]} cy={pts[last][1]} r="5" fill="currentColor" className="stroke-white dark:stroke-[#0b1120]" strokeWidth="2" />
                <text
                  x={pts[last][0] - 10}
                  y={pts[last][1] - 10}
                  textAnchor="end"
                  fontSize="13"
                  fontWeight="700"
                  className="fill-slate-900 dark:fill-white"
                >
                  {series[last].value.toFixed(1)} °C
                </text>
              </>
            ) : (
              <>
                <line x1={pts[hover][0]} x2={pts[hover][0]} y1={PAD.top} y2={PAD.top + innerH} className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1" />
                <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill="currentColor" className="stroke-white dark:stroke-[#0b1120]" strokeWidth="2" />
              </>
            )}
          </svg>

          {hover !== null && (
            <div
              className={`absolute pointer-events-none -translate-y-full ${tipAlign}`}
              style={{ left: `${(pts[hover][0] / W) * 100}%`, top: `calc(${(pts[hover][1] / H) * 100}% - 12px)` }}
            >
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{series[hover].label}</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500" />
                  {series[hover].value.toFixed(1)} °C
                </div>
                {series[hover].value > TEMP_ALERT_THRESHOLD_C && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Sobre el umbral</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
