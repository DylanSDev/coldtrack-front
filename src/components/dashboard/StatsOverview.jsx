import React from "react";
import { Server, AlertTriangle, Thermometer } from "lucide-react";

export function StatsOverview({ total, fallas, avgTemp }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full md:w-auto">
      <StatCard
        label="Total Activos"
        value={total}
        icon={<Server className="h-4 w-4 text-blue-500 dark:text-cyan-400" />}
        gradient="from-blue-500/10 to-transparent"
        valueColor="text-slate-900 dark:text-white"
        borderColor="border-blue-500/30 dark:border-blue-500/20"
      />
      <StatCard
        label="Alertas / Fallas"
        value={fallas}
        icon={<AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />}
        gradient="from-red-500/10 to-transparent"
        valueColor="text-red-600 dark:text-red-400"
        borderColor="border-red-500/40 dark:border-red-500/30"
        isAlert={fallas > 0}
      />
      <StatCard
        label="Temp. Promedio"
        value={`${avgTemp}°C`}
        icon={<Thermometer className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />}
        gradient="from-cyan-500/10 to-transparent"
        valueColor="text-slate-900 dark:text-cyan-300"
        borderColor="border-cyan-500/30 dark:border-cyan-500/20"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  gradient,
  valueColor = "text-slate-900 dark:text-white",
  borderColor = "border-slate-200 dark:border-slate-800",
  isAlert = false,
}) {
  return (
    <div
      className={`relative overflow-hidden bg-white dark:bg-[#0b1120]/90 p-4 rounded-xl border ${borderColor} shadow-xs transition-all duration-200 hover:shadow-md backdrop-blur-md`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${gradient} rounded-full blur-xl -z-10`} />
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-black tracking-tight ${valueColor}`}>{value}</p>
        {isAlert && (
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 px-1.5 py-0.5 rounded-sm">
            Atención
          </span>
        )}
      </div>
    </div>
  );
}
