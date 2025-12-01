import React, { useState, useMemo } from "react";
import {
  Snowflake,
  Thermometer,
  AlertTriangle,
  WifiOff,
  Activity,
  Search,
  RefreshCw,
  MapPin,
  Server,
  Cpu,
  Zap,
  Settings,
  DoorOpen,
  Bot,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// --- Raw Telemetry Data (Provisto por el usuario) ---
const rawTelemetryData = [
  {
    // Escenario Normal
    device_id: "REF-TUC-001",
    timestamp: "2025-11-26T14:00:00Z",
    telemetry: {
      thermal: {
        internal_temp_c: 3.2,
        ambient_temp_c: 24.5,
        evaporator_temp_c: -10.5,
        humidity_pct: 45,
      },
      electrical: {
        line_voltage_v: 220.5,
        compressor_amps: 2.8,
        power_factor: 0.92,
        daily_energy_kwh: 1.2,
      },
      mechanical: {
        compressor_vibration_x_hz: 48,
        compressor_vibration_y_hz: 49,
        fan_rpm: 1250,
        noise_level_db: 42,
      },
      operational: {
        door_status: "closed",
        door_open_count_24h: 12,
        compressor_run_time_min: 25,
      },
    },
  },
  {
    // Escenario Fuga de Gas
    device_id: "REF-TUC-002",
    timestamp: "2025-11-26T14:05:00Z",
    telemetry: {
      thermal: {
        internal_temp_c: 12.8,
        ambient_temp_c: 26.0,
        evaporator_temp_c: 24.5,
        humidity_pct: 55,
      },
      electrical: {
        line_voltage_v: 221.0,
        compressor_amps: 1.1,
        power_factor: 0.75,
        daily_energy_kwh: 0.9,
      },
      mechanical: {
        compressor_vibration_x_hz: 35,
        compressor_vibration_y_hz: 36,
        fan_rpm: 1255,
        noise_level_db: 38,
      },
      operational: {
        door_status: "closed",
        door_open_count_24h: 5,
        compressor_run_time_min: 450,
      },
    },
  },
  {
    // Escenario Compresor Trabado
    device_id: "REF-TUC-003",
    timestamp: "2025-11-26T14:10:00Z",
    telemetry: {
      thermal: {
        internal_temp_c: 9.5,
        ambient_temp_c: 28.0,
        evaporator_temp_c: 22.0,
        humidity_pct: 60,
      },
      electrical: {
        line_voltage_v: 215.0,
        compressor_amps: 16.5,
        power_factor: 0.45,
        daily_energy_kwh: 0.5,
      },
      mechanical: {
        compressor_vibration_x_hz: 1,
        compressor_vibration_y_hz: 0,
        fan_rpm: 1245,
        noise_level_db: 30,
      },
      operational: {
        door_status: "closed",
        door_open_count_24h: 2,
        compressor_run_time_min: 1,
      },
    },
  },
  {
    // Escenario Falso Positivo
    device_id: "REF-TUC-004",
    timestamp: "2025-11-27T10:30:00Z",
    telemetry: {
      thermal: {
        internal_temp_c: 12.0,
        ambient_temp_c: 29.0,
        evaporator_temp_c: -15.0,
        humidity_pct: 85,
      },
      electrical: {
        line_voltage_v: 220.0,
        compressor_amps: 2.9,
        power_factor: 0.92,
        daily_energy_kwh: 3.8,
      },
      mechanical: {
        compressor_vibration_x_hz: 45,
        compressor_vibration_y_hz: 46,
        fan_rpm: 1240,
        noise_level_db: 48,
      },
      operational: {
        door_status: "closed",
        door_open_count_24h: 15,
        compressor_run_time_min: 180,
      },
    },
  },
];

// --- Enriquecimiento de Datos (Mock Metadata) ---
// Asignamos modelos y ubicaciones a los IDs crudos
const enrichData = (data) => {
  return data.map((item) => {
    let meta = {
      modelo: "Heladera Exhibidora Std",
      ubicacion: "Sin asignar",
      salud: 90,
    };

    // Asignación específica requerida
    if (item.device_id === "REF-TUC-002") {
      meta = {
        modelo: "Visicooler 500L",
        ubicacion: "Supermercado Norte - Salta",
        salud: 45,
      };
    } else if (item.device_id === "REF-TUC-001") {
      meta = {
        modelo: "Visicooler 1 Puerta",
        ubicacion: "Kiosco El Paso - Tucumán",
        salud: 98,
      };
    } else if (item.device_id === "REF-TUC-003") {
      meta = {
        modelo: "Freezer Horizontal",
        ubicacion: "Almacén Don Pepe - Centro",
        salud: 20,
      };
    } else if (item.device_id === "REF-TUC-004") {
      meta = { modelo: "Heladera Doble", ubicacion: "Estación YPF", salud: 88 };
    }

    // Determinar estado basado en temperatura
    let estado = "Operativo";
    if (item.telemetry.thermal.internal_temp_c > 8) estado = "Posible Falla";
    if (item.device_id === "REF-TUC-003") estado = "Posible Falla"; // Forzado por alta corriente

    return { ...item, ...meta, estado };
  });
};

const processedData = enrichData(rawTelemetryData);

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados para Modales
  const [selectedTelemetry, setSelectedTelemetry] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  // Simulación de recarga
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Filtrado
  const filteredEquipos = useMemo(() => {
    return processedData.filter((eq) => {
      const matchesSearch =
        eq.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.ubicacion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "todos" || eq.estado === statusFilter; // Simple match exacto para este caso

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  // KPIs
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

  const getStatusConfig = (estado) => {
    switch (estado) {
      case "Operativo":
        return {
          color: "bg-emerald-500",
          badge: "default",
          icon: <Activity className="h-4 w-4" />,
        };
      case "Posible Falla":
        return {
          color: "bg-[#F40009]",
          badge: "destructive",
          icon: <AlertTriangle className="h-4 w-4" />,
        };
      default:
        return {
          color: "bg-slate-500",
          badge: "secondary",
          icon: <Activity className="h-4 w-4" />,
        };
    }
  };

  // Handler para Análisis conectado a n8n
  const handleAnalyze = async (equipo) => {
    // 1. Abrir modal y mostrar estado de carga
    setSelectedAnalysis(equipo);
    setIsAnalyzing(true);
    setAnalysisResult(null); // Limpiar resultado anterior

    try {
      // 2. Enviar datos a n8n (Asegúrate de reemplazar la URL)
      const response = await fetch(
        "https://primary-production-b0a2e.up.railway.app/webhook-test/ia-diagnosis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Enviamos el objeto 'equipo' completo que ya contiene la telemetría
          body: JSON.stringify(equipo.telemetry),
        }
      );

      if (!response.ok) throw new Error("Error en la respuesta de n8n");

      // 3. Recibir el diagnóstico generado por la IA en n8n
      const data = await response.json();
      setAnalysisResult(data.output);
    } catch (error) {
      console.error("Error conectando con n8n:", error);
      setAnalysisResult({
        diagnostico: "Error de conexión con el servidor de análisis.",
        accion: "Verificar conectividad y reintentar.",
        isError: true,
      });
    } finally {
      // 4. Finalizar estado de carga
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
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

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <p className="text-xs font-medium text-slate-500 uppercase">
                Total Equipos
              </p>
              <p className="text-2xl font-bold text-slate-900">{kpis.total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center border-l-4 border-l-[#F40009]">
              <p className="text-xs font-medium text-slate-500 uppercase">
                Alertas
              </p>
              <p className="text-2xl font-bold text-[#F40009]">{kpis.fallas}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <p className="text-xs font-medium text-slate-500 uppercase">
                Temp. Prom.
              </p>
              <p className="text-2xl font-bold text-slate-700">
                {kpis.avgTemp}°C
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
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
            {/* FIX: Se agregó bg-white y z-50 para corregir transparencia */}
            <SelectContent className="bg-white z-50">
              <SelectItem value="todos">Todos los Estados</SelectItem>
              <SelectItem value="Operativo">Operativos</SelectItem>
              <SelectItem value="Posible Falla">Posible Falla</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="ml-auto w-full md:w-auto gap-2 hover:text-[#F40009] hover:border-[#F40009]"
            onClick={handleRefresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar Datos
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipos.map((equipo) => {
            const statusConfig = getStatusConfig(equipo.estado);
            const isCriticalTemp = equipo.telemetry.thermal.internal_temp_c > 8;

            return (
              <Card
                key={equipo.device_id}
                className="group hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-full bg-white border border-slate-100`}
                    >
                      <Server className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {equipo.device_id}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${statusConfig.color} text-white border-none px-3 py-1`}
                  >
                    <span className="mr-1">{statusConfig.icon}</span>
                    {equipo.estado}
                  </Badge>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {equipo.modelo}
                    </h3>
                    <div className="flex items-center text-sm text-slate-500 mt-1">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {equipo.ubicacion}
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
                          {equipo.telemetry.thermal.internal_temp_c}°C
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
                          {equipo.salud}%
                        </span>
                      </div>
                      <Progress
                        value={equipo.salud}
                        className="h-1.5"
                        indicatorClassName={
                          equipo.salud < 50 ? "bg-[#F40009]" : "bg-emerald-500"
                        }
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-3 bg-slate-50/50 p-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    className="w-full text-slate-600 border-slate-300 hover:bg-white"
                    onClick={() => setSelectedTelemetry(equipo)}
                  >
                    Ver Telemetría
                  </Button>

                  {equipo.estado === "Posible Falla" && (
                    <Button
                      className="w-full bg-[#F40009] hover:bg-red-700 text-white shadow-sm shadow-red-200 gap-2"
                      onClick={() => handleAnalyze(equipo)}
                    >
                      <Bot className="h-4 w-4" />
                      Realizar Análisis
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* --- MODAL 1: VER TELEMETRÍA --- */}
        <Dialog
          open={!!selectedTelemetry}
          onOpenChange={() => setSelectedTelemetry(null)}
        >
          <DialogContent className="bg-white max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-500" />
                Telemetría en Tiempo Real:{" "}
                <span className="font-mono text-[#F40009]">
                  {selectedTelemetry?.device_id}
                </span>
              </DialogTitle>
              <DialogDescription>
                Lecturas de sensores IoT - Última actualización:{" "}
                {selectedTelemetry &&
                  new Date(selectedTelemetry.timestamp).toLocaleTimeString()}
              </DialogDescription>
            </DialogHeader>

            {selectedTelemetry && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Thermal */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
                    <Thermometer className="h-4 w-4 text-blue-500" /> Térmico
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {Object.entries(selectedTelemetry.telemetry.thermal).map(
                      ([key, value]) => (
                        <li key={key} className="flex justify-between">
                          <span className="text-slate-500 capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="font-medium text-slate-900">
                            {value}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                {/* Electrical */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
                    <Zap className="h-4 w-4 text-amber-500" /> Eléctrico
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {Object.entries(selectedTelemetry.telemetry.electrical).map(
                      ([key, value]) => (
                        <li key={key} className="flex justify-between">
                          <span className="text-slate-500 capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="font-medium text-slate-900">
                            {value}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                {/* Mechanical */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
                    <Settings className="h-4 w-4 text-slate-500" /> Mecánico
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {Object.entries(selectedTelemetry.telemetry.mechanical).map(
                      ([key, value]) => (
                        <li key={key} className="flex justify-between">
                          <span className="text-slate-500 capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="font-medium text-slate-900">
                            {value}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                {/* Operational */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
                    <DoorOpen className="h-4 w-4 text-green-600" /> Operacional
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {Object.entries(
                      selectedTelemetry.telemetry.operational
                    ).map(([key, value]) => (
                      <li key={key} className="flex justify-between">
                        <span className="text-slate-500 capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="font-medium text-slate-900">
                          {value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedTelemetry(null)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- MODAL 2: ANALISIS IA --- */}
        <Dialog
          open={!!selectedAnalysis}
          onOpenChange={() => setSelectedAnalysis(null)}
        >
          {/* CAMBIO 1: Agregamos max-h-[85vh] y flex-col para el scroll del modal completo */}
          <DialogContent className="bg-white max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-[#F40009]" />
                Análisis Cognitivo
              </DialogTitle>
              {isAnalyzing ? (
                <DialogDescription>
                  Procesando datos con modelo de ML predictivo...
                </DialogDescription>
              ) : (
                <DialogDescription>
                  Diagnóstico generado para:{" "}
                  <span className="font-mono text-[#F40009]">
                    {selectedAnalysis?.device_id}
                  </span>
                </DialogDescription>
              )}
            </DialogHeader>

            {/* CAMBIO 2: Envolvemos el contenido en un div con overflow-y-auto para el scroll interno */}
            <div className="flex-1 overflow-y-auto py-6 space-y-4 px-1">
              {isAnalyzing ? (
                <div className="text-center space-y-4">
                  <RefreshCw className="h-12 w-12 text-[#F40009] animate-spin mx-auto" />
                  <p className="text-slate-500 animate-pulse">
                    Consultando motor de IA...
                  </p>
                </div>
              ) : (
                // BLOQUE DE RESULTADOS
                <div className="space-y-4 text-left">
                  {/* 1. Diagnóstico Principal */}
                  <div
                    className={`border p-4 rounded-lg ${
                      analysisResult?.isError
                        ? "bg-red-50 border-red-200"
                        : "bg-blue-50 border-blue-100"
                    }`}
                  >
                    <h4
                      className={`font-bold flex items-center gap-2 ${
                        analysisResult?.isError
                          ? "text-red-700"
                          : "text-blue-800"
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5" />
                      {analysisResult?.primary_diagnosis ||
                        "Diagnóstico no disponible"}
                    </h4>

                    {/* Nivel de confianza si existe */}
                    {analysisResult?.confidence_level && (
                      <Badge
                        variant="outline"
                        className="mt-2 bg-white text-blue-700 border-blue-200"
                      >
                        Confianza: {analysisResult.confidence_level}%
                      </Badge>
                    )}
                  </div>

                  {/* 2. Razonamiento (Reasoning) */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-900 mb-2">
                      Análisis Técnico:
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {/* CAMBIO 3: Usamos el nuevo componente para el texto largo */}
                      <ExpandableText
                        text={analysisResult?.reasoning}
                        limit={120}
                      />
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal (Se mantiene fijo abajo gracias al flex-col del padre) */}
            <DialogFooter>
              {!isAnalyzing && (
                <Button
                  className="bg-[#F40009] hover:bg-red-700 text-white w-full"
                  onClick={() => setSelectedAnalysis(null)}
                >
                  Cerrar y Archivar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Componente auxiliar para texto expandible
const ExpandableText = ({ text, limit = 150 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return "Sin detalles adicionales.";

  // Si el texto es corto, lo mostramos directo
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
