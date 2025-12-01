import React, { useState, useEffect } from "react";
import {
  Clock,
  ShieldCheck,
  Activity,
  TrendingUp,
  Thermometer,
  BrainCircuit,
  Bot,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  const [isOnline, setIsOnline] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    // Simulamos un pulso de estado online
    const interval = setInterval(() => {
      setIsOnline((prev) => !prev);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // TODO: n8n Integration - Connect to webhook for fault reporting
  const handleReportFault = async () => {
    console.log("Reporting fault to n8n webhook...");
    // Ejemplo de fetch al webhook:
    // fetch('https://tu-n8n-webhook.com/...', { method: 'POST' ... })
    alert("Falla reportada. El equipo ColdTrack ha sido notificado.");
  };

  const scrollToFlow = () => {
    const section = document.getElementById("flujo-hiperautomatizacion");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ========== HERO SECTION ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-20 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-center">
        <div className="mx-auto max-w-6xl">
          {/* Status Indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <div
              className={`h-3 w-3 rounded-full transition-all duration-500 ${
                isOnline
                  ? "bg-green-700 shadow-lg shadow-green-500/50"
                  : "bg-green-400"
              }`}
            />
            <span className="text-sm font-medium text-slate-600">
              Sistema ColdTrack:{" "}
              <span className="font-semibold text-slate-900">ONLINE</span>
            </span>
          </div>

          {/* Main Headline */}
          <div className="mb-12 text-center">
            <h1 className="mb-6 text-4xl font-bold text-slate-900 sm:text-5xl lg:text-6xl">
              De Reactivo a Predictivo: <br className="hidden md:block" />
              El Futuro del Mantenimiento en Frío
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-slate-600">
              Diagnóstico inmediato mediante IA y gestión automatizada de
              reparaciones.{" "}
              <span className="font-semibold text-slate-900">
                Reduzca el tiempo de inactividad de 5 días a horas.
              </span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                onClick={handleReportFault}
                className="bg-[#F40000] px-8 py-6 text-base font-semibold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Reportar Falla
              </Button>
              <Button
                onClick={scrollToFlow}
                variant="outline"
                className="border-2 border-slate-300 px-8 py-6 text-base font-semibold text-slate-900 hover:border-slate-400 hover:bg-slate-100 transition-colors bg-transparent"
              >
                Saber más
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== BENTO GRID - METRICS ========== */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-center">
        <div className="mx-auto max-w-6xl w-full">
          <h2 className="mb-4 text-center text-3xl font-bold text-slate-900 sm:text-4xl">
            Resultados Medibles
          </h2>
          <p className="mb-16 text-center text-lg text-slate-600">
            Números que hablan por sí solos: eficiencia impulsada por
            hiperautomatización
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-4">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-medium text-slate-600">
                      Tiempo de Ciclo
                    </p>
                    <p className="mt-2 text-4xl font-bold text-slate-900">
                      4 Horas
                    </p>

                    <p className="text-sm text-slate-500 mt-2">Antes: 5 días</p>
                  </div>
                  <Clock className="h-20 w-10 text-[#F40000]" />
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-4">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-medium text-slate-600">
                      Tasa de Error
                    </p>
                    <p className="mt-2 text-4xl font-bold text-slate-900">
                      0.5%
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Diagnóstico IA
                    </p>
                  </div>
                  <ShieldCheck className="h-20 w-10 text-green-600" />
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-4">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-medium text-slate-600">
                      Equipos Monitoreados
                    </p>
                    <p className="mt-2 text-4xl font-bold text-slate-900">
                      1,240
                    </p>
                    <p className="text-sm text-slate-500 mt-2">Activos</p>
                  </div>
                  <Activity className="h-20 w-10 text-blue-600" />
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-4">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-medium text-slate-600">
                      Visitas Evitadas
                    </p>
                    <p className="mt-2 text-4xl font-bold text-slate-900">
                      85%
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Diagnóstico Remoto
                    </p>
                  </div>
                  <TrendingUp className="h-20 w-10 text-purple-600" />
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* ========== HYPERAUTOMATION FLOW - 3 COLUMNS ========== */}
      <section
        id="flujo-hiperautomatizacion"
        className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-center"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-slate-900 sm:text-4xl">
            Flujo de Hiperautomatización
          </h2>
          <p className="mb-12 text-center text-lg text-slate-600">
            Tres pilares que transforman la detección de fallos en acciones
            automáticas
          </p>

          <div className="grid gap-8 md:grid-cols-3 relative z-10">
            {/* Phase 1: IoT */}
            <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="mb-6 inline-block rounded-lg bg-blue-100 p-3">
                  <Thermometer className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-900">
                  Detección Proactiva
                </h3>
                <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100 border-none">
                  Fase 1 - IoT
                </Badge>
                <p className="text-slate-600 leading-relaxed">
                  Sensores detectan anomalías térmicas y envían telemetría en
                  tiempo real. Cero retrasos en la detección.
                </p>
              </div>
            </div>

            {/* Phase 2: AI */}
            <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="mb-6 inline-block rounded-lg bg-purple-100 p-3">
                  <BrainCircuit className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-900">
                  Diagnóstico Cognitivo
                </h3>
                <Badge className="mb-4 bg-purple-100 text-purple-800 hover:bg-purple-100 border-none">
                  Fase 2 - IA
                </Badge>
                <p className="text-slate-600 leading-relaxed">
                  El modelo de IA analiza los dat y diagnostica la falla sin
                  intervención humana. Precisión 99%.
                </p>
              </div>
            </div>

            {/* Phase 3: RPA */}
            <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="mb-6 inline-block rounded-lg bg-green-100 p-3">
                  <Bot className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-900">
                  Gestión B2B Automática
                </h3>
                <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-100 border-none">
                  Fase 3 - RPA
                </Badge>
                <p className="text-slate-600 leading-relaxed">
                  El Bot administrativo selecciona al mejor proveedor y emite la
                  orden automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== COGNITIVE ASSISTANT WIDGET ========== */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-center">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            {/* Left: Content */}
            <div>
              <h2 className="mb-6 text-3xl font-bold text-slate-900">
                Asistente Cognitivo ColdTrack
              </h2>
              <p className="mb-6 text-lg text-slate-600">
                Captura automática de reportes no estructurados. Dile al
                asistente lo que escuchas, ves o sientes, y él se encarga del
                resto.
              </p>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    Procesamiento de lenguaje natural
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    Clasificación automática de fallos
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    Routing inteligente a proveedores
                  </span>
                </li>
              </ul>
            </div>

            {/* Right: Visual Example */}
            <div className="relative max-w-md mx-auto">
              <Card className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-lg">
                <CardContent className="p-6">
                  {/* Chat Message */}
                  <div className="mb-6 flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#F40000] flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        Asistente ColdTrack
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        Hola, soy el Asistente ColdTrack. ¿Necesitas reportar un
                        ruido extraño en tu equipo?
                      </p>
                    </div>
                  </div>

                  {/* User Response Example */}
                  <div className="mb-6 flex gap-3 justify-end">
                    <div className="max-w-xs">
                      <div className="rounded-lg bg-[#F40000] px-4 py-2">
                        <p className="text-sm text-white">
                          Sí, el compresor hace un ruido como grinding y la
                          temperatura subió 3°C
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Processing */}
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                    <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-blue-700 font-medium">
                      Analizando... Enviando a mantenimiento preventivo
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Floating Badge */}
              <Badge className="absolute -top-3 -right-3 bg-[#F40000] text-white px-3 py-1 border-none">
                AI Powered
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FLOATING ACTION BUTTON (FAB) - ASSISTANT ========== */}
      <button
        onClick={() => setShowAssistant(!showAssistant)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-50 ${
          showAssistant
            ? "bg-red-700 hover:bg-red-800"
            : "bg-[#F40000] hover:bg-red-700 hover:scale-110"
        }`}
        aria-label="Abrir asistente ColdTrack"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </button>

      {/* Assistant Toast */}
      {showAssistant && (
        <div className="fixed bottom-24 right-6 z-40 animate-in slide-in-from-bottom-2 fade-in-50">
          <div className="w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
            <p className="text-sm font-semibold text-slate-900 mb-2">
              Asistente ColdTrack
            </p>
            <p className="text-sm text-slate-600">
              Hola, soy el Asistente ColdTrack. ¿Necesitas reportar un ruido
              extraño en tu equipo?
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                className="bg-[#F40000] hover:bg-red-700 text-white flex-1"
                onClick={handleReportFault}
              >
                Reportar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => setShowAssistant(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
