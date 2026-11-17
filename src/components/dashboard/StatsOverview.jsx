import React from "react";

export function StatsOverview({ total, fallas, avgTemp, networkHealth }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Equipos activos" value={total} />
      <StatCard label="Temperatura promedio" value={`${String(avgTemp).replace(".", ",")} °C`} />
      <StatCard
        label="Alertas activas"
        value={fallas}
        valueClass={fallas > 0 ? "text-red-600 dark:text-red-400" : undefined}
      />
      <StatCard label="Estado red IoT" value={`${networkHealth}%`} />
    </div>
  );
}

function StatCard({ label, value, valueClass = "text-slate-900 dark:text-white" }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] px-5 py-4">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</p>
    </div>
  );
}
