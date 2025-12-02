import React, { useState, useMemo } from "react";
import { Snowflake, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { EquipmentCard } from "@/components/dashboard/EquipmentCard";
import { AnalysisModal } from "@/components/modals/AnalysisModal";
import { TelemetryModal } from "@/components/modals/TelemetryModal";

import { runDiagnosis } from "@/services/n8nService";
import { processedData } from "@/data/mockData";

export default function Dashboard() {
  // --- Estados ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // NUEVO: Estado para rastrear qué equipos ya tienen orden creada
  const [ordersCreated, setOrdersCreated] = useState([]);

  // Estados de Modales
  const [selectedTelemetry, setSelectedTelemetry] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  // Estado de Análisis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // --- Lógica de Negocio ---
  const filteredEquipos = useMemo(() => {
    return processedData.filter((eq) => {
      const matchesSearch =
        eq.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.ubicacion.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "todos" || eq.estado === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    const total = processedData.length;
    const fallas = processedData.filter(
      (e) => e.estado === "Posible Falla"
    ).length;
    const avgTemp =
      processedData.reduce(
        (acc, curr) => acc + curr.telemetry.thermal.internal_temp_c,
        0
      ) / total;
    return { total, fallas, avgTemp: avgTemp.toFixed(1) };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const onAnalyzeRequest = async (equipo) => {
    setSelectedAnalysis(equipo);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const output = await runDiagnosis(equipo.telemetry);
      setAnalysisResult(output);
    } catch (error) {
      setAnalysisResult({
        primary_diagnosis: "Error de conexión",
        reasoning: "No se pudo conectar con el orquestador n8n.",
        isError: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // NUEVO: Handler que se ejecuta cuando el modal confirma la creación
  const handleOrderSuccess = (deviceId) => {
    setOrdersCreated((prev) => [...prev, deviceId]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Snowflake className="h-8 w-8 text-[#F40009]" />
              ColdTrack Monitor
            </h1>
            <p className="text-slate-500 mt-1">
              Gestión centralizada de activos de refrigeración IoT.
            </p>
          </div>
          <StatsOverview {...kpis} />
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por ID o ubicación..."
              className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-[#F40009]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="todos">Todos los Estados</SelectItem>
              <SelectItem value="Operativo">Operativos</SelectItem>
              <SelectItem value="Posible Falla">Posible Falla</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="ml-auto gap-2 hover:text-[#F40009]"
            onClick={handleRefresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar Datos
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipos.map((equipo) => (
            <EquipmentCard
              key={equipo.device_id}
              data={equipo}
              // NUEVO: Pasamos si tiene orden creada
              hasOrder={ordersCreated.includes(equipo.device_id)}
              onViewTelemetry={() => setSelectedTelemetry(equipo)}
              onAnalyze={() => onAnalyzeRequest(equipo)}
            />
          ))}
        </div>

        <TelemetryModal
          isOpen={!!selectedTelemetry}
          onClose={() => setSelectedTelemetry(null)}
          data={selectedTelemetry}
        />

        <AnalysisModal
          isOpen={!!selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
          equipment={selectedAnalysis}
          isAnalyzing={isAnalyzing}
          result={analysisResult}
          // NUEVO: Pasamos el callback
          onOrderSuccess={() => handleOrderSuccess(selectedAnalysis?.device_id)}
        />
      </div>
    </div>
  );
}
