import { useNavigate } from "react-router-dom";
import { Box, CalendarClock, CheckCircle2, MapPin, Phone, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ORDER_STAGES,
  PRIORITY_META,
  STATUS_META,
  formatCurrencyArs,
} from "@/data/ordersData";

export function OrderDetailModal({ order, isOpen, onClose, onAdvanceStatus }) {
  const navigate = useNavigate();

  if (!order) return null;

  const statusStyle = STATUS_META[order.status];
  const priorityStyle = PRIORITY_META[order.priority];
  const currentStageIndex = ORDER_STAGES.indexOf(order.status);
  const nextStage =
    currentStageIndex >= 0 && currentStageIndex < ORDER_STAGES.length - 1
      ? ORDER_STAGES[currentStageIndex + 1]
      : null;

  const handleOpenSimulation = () => {
    onClose();
    navigate(`/simulacion/${order.deviceId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 max-w-xl max-h-[88vh] overflow-y-auto text-slate-900 dark:text-slate-100 rounded-2xl p-5 sm:p-6">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
              {order.id}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle?.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle?.dot}`} />
              {order.status}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityStyle}`}
            >
              Prioridad {order.priority.toLowerCase()}
            </span>
          </div>

          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {order.diagnosis}
          </DialogTitle>

          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-slate-700 dark:text-slate-300">{order.deviceId}</span>
            <span aria-hidden="true">/</span>
            <span>{order.model}</span>
            <span aria-hidden="true">/</span>
            <span className="font-mono">Creada el {order.createdAt}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 space-y-2">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Progreso de atención
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_STAGES.map((stage, index) => {
                const isDone = index <= currentStageIndex;
                return (
                  <div key={stage} className="space-y-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-colors ${
                        isDone
                          ? "bg-[#034AAD] dark:bg-blue-500"
                          : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                    <span
                      className={`block text-[11px] leading-tight ${
                        isDone
                          ? "font-medium text-slate-900 dark:text-slate-100"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Detalle técnico
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {order.technicalNotes}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Ubicación del equipo
              </span>
              <p className="font-medium text-slate-900 dark:text-slate-100 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{order.location}</span>
              </p>
              <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{order.scheduledWindow}</span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Proveedor y presupuesto
              </span>
              <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{order.supplier}</span>
              </p>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  {order.supplierContact}
                </span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                  {formatCurrencyArs(order.costEstimate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenSimulation}
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg gap-2"
          >
            <Box className="w-4 h-4" />
            <span>Ver simulación 3D</span>
          </Button>

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            {nextStage && (
              <Button
                type="button"
                onClick={() => onAdvanceStatus(order.id, nextStage)}
                className="bg-[#034AAD] hover:bg-[#023b8c] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {nextStage === "Completada" ? "Marcar completada" : "Asignar técnico"}
                </span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
            >
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
