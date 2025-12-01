import React from "react";
import { Bot, RefreshCw, AlertTriangle } from "lucide-react";
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
import { useState } from "react";

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
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-h-[85vh] flex flex-col overflow-hidden">
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
                {result.confidence_level && (
                  <Badge
                    variant="outline"
                    className="mt-2 bg-white text-blue-700 border-blue-200"
                  >
                    Confianza: {result.confidence_level}%
                  </Badge>
                )}
              </div>
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

        <DialogFooter>
          {!isAnalyzing && (
            <Button
              className="bg-[#F40009] hover:bg-red-700 text-white w-full"
              onClick={onClose}
            >
              Cerrar y Archivar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
