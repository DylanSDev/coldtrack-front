import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EquipmentSimulator3D } from "@/components/three/EquipmentSimulator3D";
import { ColdTrackSensor3D } from "@/components/three/ColdTrackSensor3D";
import { processedData } from "@/data/mockData";

function toSimTelemetry(equipo) {
  const { thermal, electrical, mechanical, operational } = equipo.telemetry;
  const hz = (mechanical.compressor_vibration_x_hz + mechanical.compressor_vibration_y_hz) / 2;
  return {
    temperatura: thermal.internal_temp_c,
    tempEvaporador: thermal.evaporator_temp_c,
    tempAmbiente: thermal.ambient_temp_c,
    humedad: thermal.humidity_pct,
    estadoPuerta: operational.door_status === "open" ? "abierta" : "cerrada",
    corriente: electrical.compressor_amps,
    vibracion: electrical.compressor_amps > 10 || hz > 60 ? "alta" : "normal",
  };
}

function statusOf(t) {
  if (t.corriente > 10 && t.vibracion === "alta") return "error";
  if (
    t.estadoPuerta === "abierta" ||
    t.temperatura > 8 ||
    (t.tempEvaporador ?? -10) > 0 ||
    t.humedad > 75
  ) {
    return "warning";
  }
  return "ok";
}

export default function Simulation() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const equipo = useMemo(
    () => processedData.find((e) => e.device_id === deviceId) ?? processedData[0],
    [deviceId]
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:px-12 max-w-[1440px] w-full mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al panel
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Simulación 3D
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {equipo.modelo} · {equipo.ubicacion}
          </p>
        </div>
        <Select value={equipo.device_id} onValueChange={(id) => navigate(`/simulacion/${id}`)}>
          <SelectTrigger className="w-full sm:w-[300px] bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl">
            <SelectValue placeholder="Equipo" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 z-50">
            {processedData.map((e) => (
              <SelectItem key={e.device_id} value={e.device_id}>
                {e.device_id} · {e.modelo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* key: al cambiar de equipo se reinicia la simulación */}
      <Simulators key={equipo.device_id} equipo={equipo} />
    </div>
  );
}

function Simulators({ equipo }) {
  const [telemetry, setTelemetry] = useState(() => toSimTelemetry(equipo));
  const [activeSensor, setActiveSensor] = useState(null);

  return (
    <>
      <div className="h-[640px]">
        <EquipmentSimulator3D
          equipmentName={`${equipo.modelo} · ${equipo.device_id}`}
          telemetry={telemetry}
          onTelemetryChange={setTelemetry}
        />
      </div>

      <div className="h-[600px]">
        <ColdTrackSensor3D
          activeSensor={activeSensor}
          onSelectSensor={setActiveSensor}
          telemetryStatus={statusOf(telemetry)}
        />
      </div>
    </>
  );
}
