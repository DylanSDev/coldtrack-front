import React, { useState } from "react";
import {
  Bot,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  FileText,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createRepairOrder } from "@/services/n8nService";

const ExpandableText = ({ text, limit = 120 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return "Sin detalles adicionales.";
  if (text.length <= limit) return text;

  return (
    <span>
      {isExpanded ? text : `${text.substring(0, limit)}...`}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
      >
        {isExpanded ? "Ver menos" : "Ver más"}
      </button>
    </span>
  );
};

export function AnalysisModal({
  isOpen,
  onClose,
  equipment,
  isAnalyzing,
  result,
  onOrderSuccess, // Recibimos la función para avisar al Dashboard
}) {
  const navigate = useNavigate();
  const [orderCreated, setOrderCreated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función para crear la orden llamando al Webhook
  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        idEquipo: equipment?.device_id || "Desconocido",
        diagnostico: result?.primary_diagnosis || "Diagnóstico no disponible",
        razonamiento: result?.reasoning || "Sin detalles adicionales",
      };

      await createRepairOrder(payload);

      // 1. Avisamos al Dashboard para que actualice la tarjeta (botón verde)
      if (onOrderSuccess) {
        onOrderSuccess();
      }

      // 2. Cambiamos la vista local para mostrar la pantalla de éxito
      setOrderCreated(true);
    } catch (error) {
      console.error("Error al generar la orden:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Retrasamos un poco el reset para que no se vea el cambio brusco al cerrar
    setTimeout(() => setOrderCreated(false), 300);
    onClose();
  };

  // Determinar si la confianza es suficiente (Umbral 75%)
  const isHighConfidence = result?.confidence_level >= 75;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-h-[85vh] flex flex-col overflow-hidden sm:max-w-lg">
        {/* LÓGICA DE VISTAS: Si no se ha creado orden, muestra análisis. Si sí, muestra éxito. */}
        {!orderCreated ? (
          <>
            {/* --- VISTA 1: ANÁLISIS Y ACCIONES --- */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-[#F40009]" />
                Análisis Cognitivo
              </DialogTitle>
              <DialogDescription>
                {isAnalyzing
                  ? "Procesando datos con modelo de ML predictivo..."
                  : `Diagnóstico para: ${equipment?.device_id}`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-6 space-y-4 px-1">
              {isAnalyzing ? (
                <div className="text-center space-y-4">
                  <RefreshCw className="h-12 w-12 text-[#F40009] animate-spin mx-auto" />
                  <p className="text-slate-500 animate-pulse">
                    Consultando motor de IA...
                  </p>
                </div>
              ) : result ? (
                <div className="space-y-4 text-left">
                  {/* Tarjeta de Diagnóstico Principal */}
                  <div
                    className={`border p-4 rounded-lg ${
                      result.isError
                        ? "bg-red-50 border-red-200"
                        : "bg-blue-50 border-blue-100"
                    }`}
                  >
                    <h4
                      className={`font-bold flex items-center gap-2 ${
                        result.isError ? "text-red-700" : "text-blue-800"
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5" />
                      {result.primary_diagnosis || "Diagnóstico no disponible"}
                    </h4>

                    <div className="flex items-center justify-between mt-2">
                      {result.confidence_level && (
                        <Badge
                          variant="outline"
                          className={`bg-white border-blue-200 ${
                            isHighConfidence
                              ? "text-green-700 border-green-200"
                              : "text-amber-700 border-amber-200"
                          }`}
                        >
                          Confianza IA: {result.confidence_level}%
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        {isHighConfidence
                          ? "Umbral óptimo"
                          : "Requiere más datos"}
                      </span>
                    </div>
                  </div>

                  {/* Razonamiento */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-900 mb-2">
                      Razonamiento Técnico:
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <ExpandableText text={result.reasoning} limit={150} />
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {!isAnalyzing && result && (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>

                  {isHighConfidence ? (
                    <Button
                      className="bg-[#F40009] hover:bg-red-700 text-white gap-2"
                      onClick={handleCreateOrder}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {isSubmitting
                        ? "Generando..."
                        : "Generar Orden de Reparación"}
                    </Button>
                  ) : (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      onClick={() => navigate("/chat")}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Consultar Agente Investigador
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </>
        ) : (
          /* --- VISTA 2: ÉXITO (Restaurada) --- */
          <div className="py-10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">
                ¡Orden Generada!
              </h3>
              <p className="text-slate-500 max-w-[80%] mx-auto">
                La Orden de Reparación{" "}
                <strong>#ORD-{Math.floor(Math.random() * 10000)}</strong> ha
                sido creada automáticamente y enviada al Bot Administrativo para
                cotización.
              </p>
            </div>
            <div className="pt-4">
              <Button
                className="bg-slate-900 text-white hover:bg-slate-800 w-full sm:w-auto min-w-[200px]"
                onClick={handleClose}
              >
                Entendido, cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
