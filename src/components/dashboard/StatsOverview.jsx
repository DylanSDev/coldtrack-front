import React from "react";
import { Activity } from "lucide-react";

export function StatsOverview({ total, fallas, avgTemp }) {
  return (
    <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
      <StatCard label="Total Equipos" value={total} />
      <StatCard
        label="Alertas"
        value={fallas}
        valueColor="text-[#F40009]"
        borderColor="border-l-[#F40009]"
      />
      <StatCard label="Temp. Prom." value={`${avgTemp}°C`} />
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor = "text-slate-900",
  borderColor = "border-slate-200",
}) {
  return (
    <div
      className={`bg-white p-4 rounded-xl border shadow-sm text-center ${borderColor} ${
        borderColor.includes("border-l-4") ? "" : "border-slate-200"
      }`}
    >
      <p className="text-xs font-medium text-slate-500 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
