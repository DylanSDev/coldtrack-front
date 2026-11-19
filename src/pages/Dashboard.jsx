import React, { useState, useMemo } from "react";
import { Search, RefreshCw, MapPin } from "lucide-react";
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
import { TelemetryChart } from "@/components/dashboard/TelemetryChart";
import { AnalysisModal } from "@/components/modals/AnalysisModal";
import { TelemetryModal } from "@/components/modals/TelemetryModal";

import { runDiagnosis } from "@/services/n8nService";
import { processedData } from "@/data/mockData";

export default function Dashboard() {
  // --- Estados ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [locationFilter, setLocationFilter] = useState("todas");
  const [chartDeviceId, setChartDeviceId] = useState(processedData[0]?.device_id);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estado para rastrear qué equipos ya tienen orden creada
  const [ordersCreated, setOrdersCreated] = useState([]);

  // Estados de Modales
  const [selectedTelemetry, setSelectedTelemetry] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  // Estado de Análisis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // --- Lógica de Negocio ---
  const locations = useMemo(
    () => [...new Set(processedData.map((e) => e.ubicacion))],
    []
  );

  const filteredEquipos = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return processedData.filter((eq) => {
      const matchesSearch =
        eq.device_id.toLowerCase().includes(term) ||
        eq.ubicacion.toLowerCase().includes(term) ||
        eq.modelo.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "todos" || eq.estado === statusFilter;
      const matchesLocation =
        locationFilter === "todas" || eq.ubicacion === locationFilter;
      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [searchTerm, statusFilter, locationFilter]);

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
    const networkHealth = Math.round(
      processedData.reduce((acc, curr) => acc + curr.salud, 0) / total
    );
    return {
      total,
      fallas,
      operativos: total - fallas,
      avgTemp: avgTemp.toFixed(1),
      networkHealth,
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const onAnalyzeRequest = async (equipo) => {
    setSelectedAnalysis(equipo);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const output = await runDiagnosis(equipo.telemetry);
      setAnalysisResult(output);
    } catch {
      setAnalysisResult({
        primary_diagnosis: "Error de conexión",
        reasoning: "No se pudo conectar con el orquestador n8n. Verifica tus credenciales o el estado del webhook.",
        isError: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOrderSuccess = (deviceId) => {
    setOrdersCreated((prev) => [...prev, deviceId]);
  };

  const selectClass =
    "bg-white dark:bg-[#0b1120]/90 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl";
  const selectContentClass =
    "bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 z-50";

  return (
    <div className="flex-1 p-4 sm:p-6 lg:px-12 max-w-[1440px] w-full mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Panel General
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Supervisión predictiva en tiempo real de tu red de frío.
          </p>
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className={`w-full md:w-[320px] gap-2 ${selectClass}`}>
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <SelectValue placeholder="Ubicación" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="todas">Todas las ubicaciones</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <StatsOverview {...kpis} />

      {/* Búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Buscar por ID, modelo o ubicación..."
            className={`pl-9 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-blue-500 ${selectClass}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2.5 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={`w-full sm:w-[180px] ${selectClass}`}>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem value="todos">Todos los Estados</SelectItem>
              <SelectItem value="Operativo">Solo Operativos</SelectItem>
              <SelectItem value="Posible Falla">Posible Falla</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className={`gap-2 shrink-0 hover:text-blue-600 dark:hover:text-cyan-400 ${selectClass}`}
            onClick={handleRefresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-500 dark:text-cyan-400" : ""}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Equipos */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
          <span>
            Mostrando {filteredEquipos.length} de {processedData.length} equipos
          </span>
          <span className="text-[11px] font-mono text-blue-600 dark:text-cyan-400">
            Nodo Central Tucumán
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEquipos.length === 0 && (
            <p className="col-span-full text-center text-sm text-slate-500 py-10">
              Ningún equipo coincide con los filtros.
            </p>
          )}
          {filteredEquipos.map((equipo) => (
            <EquipmentCard
              key={equipo.device_id}
              data={equipo}
              selected={equipo.device_id === chartDeviceId}
              onSelect={() => setChartDeviceId(equipo.device_id)}
              hasOrder={ordersCreated.includes(equipo.device_id)}
              onViewTelemetry={() => setSelectedTelemetry(equipo)}
              onAnalyze={() => onAnalyzeRequest(equipo)}
            />
          ))}
        </div>
      </div>

      {/* Telemetría */}
      <TelemetryChart
        equipos={filteredEquipos}
        selectedId={chartDeviceId}
        onSelect={setChartDeviceId}
      />

      {/* Modales */}
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
        onOrderSuccess={() => handleOrderSuccess(selectedAnalysis?.device_id)}
      />
    </div>
  );
}
