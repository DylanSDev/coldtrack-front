import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Box,
  DoorOpen,
  Settings,
  Thermometer,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getStatus, TONES } from "@/lib/telemetry";

const CATEGORY_META = {
  thermal: { title: "Térmico", icon: Thermometer, accent: "text-cyan-600 dark:text-cyan-400" },
  electrical: { title: "Eléctrico", icon: Zap, accent: "text-amber-600 dark:text-amber-400" },
  mechanical: { title: "Mecánico", icon: Settings, accent: "text-blue-600 dark:text-blue-400" },
  operational: { title: "Operacional", icon: DoorOpen, accent: "text-emerald-600 dark:text-emerald-400" },
};

const METRIC_META = {
  internal_temp_c: {
    label: "Temperatura interior",
    unit: "°C",
    decimals: 1,
    isAlert: (value) => value > 8,
  },
  evaporator_temp_c: {
    label: "Temperatura del evaporador",
    unit: "°C",
    decimals: 1,
    isAlert: (value) => value > 0,
  },
  ambient_temp_c: {
    label: "Temperatura ambiente",
    unit: "°C",
    decimals: 1,
  },
  humidity_pct: {
    label: "Humedad relativa",
    unit: "%",
    decimals: 0,
    isAlert: (value) => value > 75,
  },
  line_voltage_v: {
    label: "Tensión de línea",
    unit: "V",
    decimals: 1,
    isAlert: (value) => value < 205 || value > 240,
  },
  compressor_amps: {
    label: "Corriente del compresor",
    unit: "A",
    decimals: 1,
    isAlert: (value) => value > 10,
  },
  power_factor: {
    label: "Factor de potencia",
    unit: "",
    decimals: 2,
    isAlert: (value) => value < 0.7,
  },
  daily_energy_kwh: {
    label: "Consumo diario",
    unit: "kWh",
    decimals: 1,
  },
  compressor_vibration_x_hz: {
    label: "Vibración eje X",
    unit: "Hz",
    decimals: 0,
  },
  compressor_vibration_y_hz: {
    label: "Vibración eje Y",
    unit: "Hz",
    decimals: 0,
  },
  fan_rpm: {
    label: "Velocidad del forzador",
    unit: "RPM",
    decimals: 0,
  },
  noise_level_db: {
    label: "Nivel acústico",
    unit: "dB",
    decimals: 0,
  },
  door_status: {
    label: "Estado de puerta",
    format: (value) => (value === "open" ? "Abierta" : "Cerrada"),
    isAlert: (value) => value === "open",
  },
  door_open_count_24h: {
    label: "Aperturas en 24 h",
    unit: "",
    decimals: 0,
  },
  compressor_run_time_min: {
    label: "Tiempo de marcha",
    unit: "min",
    decimals: 0,
  },
};

function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "--/--/---- --:--";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatMetricValue(key, rawValue) {
  const meta = METRIC_META[key];
  if (!meta) return String(rawValue);
  if (meta.format) return meta.format(rawValue);
  if (typeof rawValue === "number") {
    const formatted = rawValue.toLocaleString("es-AR", {
      minimumFractionDigits: meta.decimals ?? 0,
      maximumFractionDigits: meta.decimals ?? 0,
    });
    return meta.unit ? `${formatted} ${meta.unit}` : formatted;
  }
  return String(rawValue);
}

export function TelemetryModal({ isOpen, onClose, data }) {
  const navigate = useNavigate();

  if (!data) return null;

  const { telemetry } = data;
  const status = getStatus(data);
  const tone = TONES[status.tone];
  const formattedSync = formatDateTime(data.timestamp);

  const summaryItems = [
    {
      label: "Temp. interior",
      value: formatMetricValue("internal_temp_c", telemetry.thermal.internal_temp_c),
      alert: METRIC_META.internal_temp_c.isAlert(telemetry.thermal.internal_temp_c),
    },
    {
      label: "Corriente",
      value: formatMetricValue("compressor_amps", telemetry.electrical.compressor_amps),
      alert: METRIC_META.compressor_amps.isAlert(telemetry.electrical.compressor_amps),
    },
    {
      label: "Puerta",
      value: formatMetricValue("door_status", telemetry.operational.door_status),
      alert: METRIC_META.door_status.isAlert(telemetry.operational.door_status),
    },
    {
      label: "Salud",
      value: `${data.salud}%`,
      alert: data.salud < 60,
    },
  ];

  const handleOpenSimulation = () => {
    onClose();
    navigate(`/simulacion/${data.device_id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 max-w-2xl max-h-[88vh] overflow-y-auto text-slate-900 dark:text-slate-100 rounded-2xl p-5 sm:p-6">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              {status.label}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              {data.device_id}
            </span>
          </div>

          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Activity className="h-5 w-5 text-[#034AAD] dark:text-blue-400 shrink-0" />
            <span>{data.modelo}</span>
          </DialogTitle>

          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{data.ubicacion}</span>
            <span aria-hidden="true">/</span>
            <span className="font-mono">Última lectura: {formattedSync}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border px-3 py-2.5 ${
                item.alert
                  ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50"
              }`}
            >
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                {item.label}
              </span>
              <span
                className={`mt-0.5 block font-mono text-sm font-semibold tabular-nums ${
                  item.alert
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-1">
          {Object.entries(telemetry).map(([category, metrics]) => {
            const meta = CATEGORY_META[category];
            const Icon = meta?.icon || Activity;
            return (
              <div
                key={category}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40"
              >
                <h4 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100 mb-3 text-sm">
                  <Icon className={`h-4 w-4 ${meta?.accent || "text-slate-400"}`} />
                  <span>{meta?.title || category}</span>
                </h4>
                <ul className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
                  {Object.entries(metrics).map(([key, value]) => {
                    const metricMeta = METRIC_META[key];
                    const alert = metricMeta?.isAlert ? metricMeta.isAlert(value) : false;
                    return (
                      <li key={key} className="flex justify-between items-center py-2 first:pt-0 last:pb-0 gap-3">
                        <span className="text-slate-600 dark:text-slate-400">
                          {metricMeta?.label || key.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums shrink-0 ${
                            alert
                              ? "text-red-600 dark:text-red-400"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {alert && <AlertTriangle className="h-3 w-3 shrink-0" />}
                          {formatMetricValue(key, value)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenSimulation}
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2 rounded-lg"
          >
            <Box className="h-4 w-4" />
            <span>Ver simulación 3D</span>
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
