import { Link } from "react-router-dom";
import { Box, Thermometer, Droplets, Zap, DoorOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getStatus, TONES } from "@/lib/telemetry";

function formatNumber(value, decimals = 1) {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function ChatContextPanel({
  equipments,
  selectedEquipment,
  onSelectEquipment,
  diagnosisContext,
}) {
  if (!selectedEquipment) return null;

  const status = getStatus(selectedEquipment);
  const tone = TONES[status.tone];
  const { thermal, electrical, operational } = selectedEquipment.telemetry;
  const hasDiagnosis =
    diagnosisContext?.equipmentId === selectedEquipment.device_id &&
    Boolean(diagnosisContext?.diagnosis);

  const metrics = [
    {
      label: "Temp. interior",
      value: `${formatNumber(thermal.internal_temp_c)} °C`,
      icon: Thermometer,
      alert: thermal.internal_temp_c > 8,
    },
    {
      label: "Humedad",
      value: `${formatNumber(thermal.humidity_pct, 0)} %`,
      icon: Droplets,
      alert: thermal.humidity_pct > 75,
    },
    {
      label: "Corriente",
      value: `${formatNumber(electrical.compressor_amps)} A`,
      icon: Zap,
      alert: electrical.compressor_amps > 10,
    },
    {
      label: "Puerta",
      value: operational.door_status === "open" ? "Abierta" : "Cerrada",
      icon: DoorOpen,
      alert: operational.door_status === "open",
    },
  ];

  return (
    <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] p-4 space-y-4 h-fit">
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Equipo en consulta
        </label>
        <Select value={selectedEquipment.device_id} onValueChange={onSelectEquipment}>
          <SelectTrigger className="w-full rounded-xl bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs">
            <SelectValue placeholder="Seleccionar equipo" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 z-50">
            {equipments.map((equipment) => (
              <SelectItem key={equipment.device_id} value={equipment.device_id} className="text-xs">
                <span className="font-mono">{equipment.device_id}</span> · {equipment.modelo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
            {selectedEquipment.device_id}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {status.label}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {selectedEquipment.modelo}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {selectedEquipment.ubicacion}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={`rounded-xl border px-2.5 py-2 ${
                metric.alert
                  ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20"
                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{metric.label}</span>
              </div>
              <p
                className={`mt-1 font-mono text-xs font-semibold tabular-nums ${
                  metric.alert
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      {hasDiagnosis && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Diagnóstico preliminar
            </span>
            {diagnosisContext.confidence && (
              <span className="font-mono text-[11px] font-semibold text-[#034AAD] dark:text-blue-400">
                {diagnosisContext.confidence}%
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-900 dark:text-white">
            {diagnosisContext.diagnosis}
          </p>
          {diagnosisContext.reasoning && (
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">
              {diagnosisContext.reasoning}
            </p>
          )}
        </div>
      )}

      <Button
        asChild
        variant="outline"
        className="w-full h-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 gap-2"
      >
        <Link to={`/simulacion/${selectedEquipment.device_id}`}>
          <Box className="w-3.5 h-3.5" />
          <span>Ver simulación 3D</span>
        </Link>
      </Button>
    </aside>
  );
}
