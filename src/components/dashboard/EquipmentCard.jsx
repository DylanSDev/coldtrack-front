import React from "react";
import { Link } from "react-router-dom";
import { Bot, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EquipmentIllustration } from "@/components/dashboard/EquipmentIllustration";
import { getEquipmentKind, getStatus } from "@/lib/telemetry";

const BADGE = {
  ok: "bg-emerald-400/90 text-emerald-950 dark:bg-emerald-400/20 dark:text-emerald-300",
  alert: "bg-red-200 text-red-900 dark:bg-red-400/20 dark:text-red-300",
  door: "bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-300",
};

const num = (v, digits = 1) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function EquipmentCard({ data, selected, onSelect, onViewTelemetry, onAnalyze, hasOrder }) {
  const status = getStatus(data);
  const kind = getEquipmentKind(data);
  const { internal_temp_c: temp, humidity_pct: humidity } = data.telemetry.thermal;
  const isFailing = data.estado === "Posible Falla";

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-5 rounded-xl border bg-white dark:bg-[#0b1120] p-5 cursor-pointer transition-shadow hover:shadow-md ${
        selected ? "border-blue-600 dark:border-blue-500" : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <EquipmentIllustration
        type={kind.type}
        doors={kind.doors}
        open={status.key === "door"}
        className="h-44 w-36 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${BADGE[status.key]}`}>
          {status.label}
        </span>

        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{num(temp)} °C</p>

        <p className="mt-1.5 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{data.modelo}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{data.ubicacion}</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Humedad: {humidity} % · Salud: {data.salud} %
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-8 rounded-lg border-slate-300 dark:border-slate-700 px-3 text-xs font-medium text-slate-900 dark:text-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              onViewTelemetry();
            }}
          >
            Ver telemetría
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-8 rounded-lg border-slate-300 dark:border-slate-700 px-3 text-xs font-medium text-slate-900 dark:text-slate-100"
          >
            <Link to={`/simulacion/${data.device_id}`} onClick={(e) => e.stopPropagation()}>
              Ver simulación 3D
            </Link>
          </Button>

          {isFailing &&
            (hasOrder ? (
              <Button disabled variant="outline" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Orden creada
              </Button>
            ) : (
              <Button
                className="h-8 gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 px-3 text-xs font-medium text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze();
                }}
              >
                <Bot className="h-3.5 w-3.5" />
                Diagnóstico IA
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
