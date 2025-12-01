import React from "react";
import { Activity, Thermometer, Zap, Settings, DoorOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TelemetryModal({ isOpen, onClose, data }) {
  if (!data) return null;

  const { telemetry } = data;

  // Mapeo de iconos por categoría
  const icons = {
    thermal: <Thermometer className="h-4 w-4 text-blue-500" />,
    electrical: <Zap className="h-4 w-4 text-amber-500" />,
    mechanical: <Settings className="h-4 w-4 text-slate-500" />,
    operational: <DoorOpen className="h-4 w-4 text-green-600" />,
  };

  // Mapeo de títulos
  const titles = {
    thermal: "Térmico",
    electrical: "Eléctrico",
    mechanical: "Mecánico",
    operational: "Operacional",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-500" />
            Telemetría en Tiempo Real:{" "}
            <span className="font-mono text-[#F40009]">{data.device_id}</span>
          </DialogTitle>
          <DialogDescription>
            Lecturas de sensores IoT - Última actualización:{" "}
            {new Date(data.timestamp).toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {Object.keys(telemetry).map((category) => (
            <div
              key={category}
              className="border border-slate-200 rounded-lg p-4 bg-slate-50"
            >
              <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-3 capitalize">
                {icons[category]} {titles[category] || category}
              </h4>
              <ul className="space-y-2 text-sm">
                {Object.entries(telemetry[category]).map(([key, value]) => (
                  <li key={key} className="flex justify-between">
                    <span className="text-slate-500 capitalize">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="font-medium text-slate-900">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
