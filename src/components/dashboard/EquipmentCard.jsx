import React from "react";
import {
  Server,
  Activity,
  AlertTriangle,
  MapPin,
  Thermometer,
  Cpu,
  Bot,
  CheckCircle2, // <--- Importamos el icono de check
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

// Recibimos la prop hasOrder
export function EquipmentCard({ data, onViewTelemetry, onAnalyze, hasOrder }) {
  const getStatusConfig = (estado) => {
    switch (estado) {
      case "Operativo":
        return {
          color: "bg-emerald-500",
          icon: <Activity className="h-4 w-4" />,
        };
      case "Posible Falla":
        return {
          color: "bg-[#F40009]",
          icon: <AlertTriangle className="h-4 w-4" />,
        };
      default:
        return {
          color: "bg-slate-500",
          icon: <Activity className="h-4 w-4" />,
        };
    }
  };

  const statusConfig = getStatusConfig(data.estado);
  const isCriticalTemp = data.telemetry.thermal.internal_temp_c > 8;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-white border border-slate-100">
            <Server className="h-5 w-5 text-slate-600" />
          </div>
          <span className="font-mono text-sm font-semibold text-slate-700">
            {data.device_id}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`${statusConfig.color} text-white border-none px-3 py-1`}
        >
          <span className="mr-1">{statusConfig.icon}</span>
          {data.estado}
        </Badge>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900">{data.modelo}</h3>
          <div className="flex items-center text-sm text-slate-500 mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            {data.ubicacion}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase">
              Temperatura
            </span>
            <div className="flex items-center gap-1">
              <Thermometer
                className={`h-5 w-5 ${
                  isCriticalTemp ? "text-[#F40009]" : "text-slate-400"
                }`}
              />
              <span
                className={`text-2xl font-bold ${
                  isCriticalTemp ? "text-[#F40009]" : "text-slate-700"
                }`}
              >
                {data.telemetry.thermal.internal_temp_c}°C
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase">
              Salud Dispositivo
            </span>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-slate-400" />
              <span className="text-lg font-semibold text-slate-700">
                {data.salud}%
              </span>
            </div>
            <Progress
              value={data.salud}
              className="h-1.5"
              indicatorClassName={
                data.salud < 50 ? "bg-[#F40009]" : "bg-emerald-500"
              }
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3 bg-slate-50/50 p-4 border-t border-slate-100">
        <Button
          variant="outline"
          className="w-full text-slate-600 border-slate-300 hover:bg-white"
          onClick={onViewTelemetry}
        >
          Ver Telemetría
        </Button>

        {/* Lógica Modificada para el Botón de Acción */}
        {data.estado === "Posible Falla" &&
          (hasOrder ? (
            // ESTADO: ORDEN CREADA (Verde y Deshabilitado)
            <Button
              disabled
              className="w-full bg-green-600 text-white opacity-90 cursor-not-allowed gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Orden Creada
            </Button>
          ) : (
            // ESTADO: DEFAULT (Rojo y Habilitado)
            <Button
              className="w-full bg-[#F40009] hover:bg-red-700 text-white shadow-sm shadow-red-200 gap-2"
              onClick={onAnalyze}
            >
              <Bot className="h-4 w-4" />
              Realizar Análisis
            </Button>
          ))}
      </CardFooter>
    </Card>
  );
}
