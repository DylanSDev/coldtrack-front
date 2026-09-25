import React from "react";
import {
  Server,
  Activity,
  AlertTriangle,
  MapPin,
  Thermometer,
  Cpu,
  Bot,
  CheckCircle2,
  ChevronRight,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function EquipmentCard({ data, onViewTelemetry, onAnalyze, hasOrder }) {
  const isOptimal = data.estado === "Operativo";
  const isCriticalTemp = data.telemetry.thermal.internal_temp_c > 8;

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0b1120]/95 hover:shadow-xl hover:shadow-blue-950/10 dark:hover:shadow-cyan-950/20 hover:-translate-y-1 backdrop-blur-md">
      {/* Ambient top border highlight */}
      <div
        className={`h-1 w-full transition-colors duration-300 ${
          isOptimal
            ? "bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
            : "bg-gradient-to-r from-amber-500 via-red-500 to-rose-600"
        }`}
      />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-5 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-cyan-400">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {data.device_id}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isOptimal
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-950/30"
              : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 dark:bg-red-950/30 animate-pulse"
          }`}
        >
          {isOptimal ? (
            <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          )}
          <span>{data.estado}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 px-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
            {data.modelo}
          </h3>
          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <span className="truncate">{data.ubicacion}</span>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
          {/* Temperature */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              Temp. Interna
            </span>
            <div className="flex items-center gap-1.5">
              <Thermometer
                className={`h-4 w-4 ${
                  isCriticalTemp
                    ? "text-red-500 animate-bounce"
                    : "text-blue-500 dark:text-cyan-400"
                }`}
              />
              <span
                className={`text-xl font-black ${
                  isCriticalTemp
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {data.telemetry.thermal.internal_temp_c}°C
              </span>
            </div>
          </div>

          {/* Device Health */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Salud IoT
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {data.salud}%
              </span>
            </div>
            <div className="pt-1">
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.salud < 50
                      ? "bg-red-500"
                      : data.salud < 80
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-blue-500 to-emerald-400"
                  }`}
                  style={{ width: `${data.salud}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2.5 bg-slate-50/70 dark:bg-slate-900/30 p-4 px-5 border-t border-slate-100 dark:border-slate-800/60">
        <Button
          variant="outline"
          className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={onViewTelemetry}
        >
          Telemetría
        </Button>

        {data.estado === "Posible Falla" &&
          (hasOrder ? (
            <Button
              disabled
              className="flex-1 bg-emerald-600/90 dark:bg-emerald-600 text-white text-xs font-semibold opacity-90 cursor-not-allowed gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Orden Creada
            </Button>
          ) : (
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 text-xs font-semibold gap-1.5 transition-all duration-200 hover:scale-[1.02]"
              onClick={onAnalyze}
            >
              <Bot className="h-3.5 w-3.5 text-cyan-300" />
              Diagnóstico IA
            </Button>
          ))}
      </CardFooter>
    </Card>
  );
}
