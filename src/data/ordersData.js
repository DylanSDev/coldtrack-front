export const ORDER_STAGES = [
  "Cotización aprobada",
  "Técnico asignado",
  "Completada",
];

export const STATUS_META = {
  "Cotización aprobada": {
    badge:
      "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  "Técnico asignado": {
    badge:
      "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:bg-blue-500/15 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  Completada: {
    badge:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

export const PRIORITY_META = {
  Crítica: "bg-red-500/10 text-red-700 border-red-500/25 dark:bg-red-500/15 dark:text-red-300",
  Alta: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300",
  Normal: "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
};

export function formatCurrencyArs(amount) {
  return `$ ${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const INITIAL_ORDERS = [
  {
    id: "ORD-7321",
    deviceId: "REF-TUC-003",
    model: "Freezer Horizontal",
    location: "Almacén Don Pepe - San Miguel de Tucumán",
    diagnosis: "Compresor trabado y sobrecorriente",
    technicalNotes:
      "Consumo registrado de 16,5 A con vibración anómala en arranque y temperatura interna en ascenso (9,5 °C). Se requiere revisión de relé térmico y bobinado.",
    supplier: "Servicios Térmicos del Norte",
    supplierContact: "+54 381 422-8910",
    scheduledWindow: "Hoy, 14:00 a 16:00 hs",
    status: "Técnico asignado",
    priority: "Crítica",
    createdAt: "24/09/2026 16:15",
    costEstimate: 92000,
  },
  {
    id: "ORD-8492",
    deviceId: "REF-TUC-002",
    model: "Visicooler 500L",
    location: "Supermercado Norte - Las Talitas",
    diagnosis: "Posible fuga de gas refrigerante R134a",
    technicalNotes:
      "Evaporador a 24,5 °C con marcha continua del compresor (450 min) y baja corriente nominal (1,1 A). Presupuesto aprobado para prueba de estanqueidad y recarga.",
    supplier: "Frío Express S.A.",
    supplierContact: "+54 381 430-1455",
    scheduledWindow: "Mañana, 09:00 a 12:00 hs",
    status: "Cotización aprobada",
    priority: "Alta",
    createdAt: "24/09/2026 18:30",
    costEstimate: 48500,
  },
  {
    id: "ORD-8104",
    deviceId: "REF-TUC-004",
    model: "Heladera Doble",
    location: "Estación YPF - Alberdi",
    diagnosis: "Inspección de burletes y cierre magnético",
    technicalNotes:
      "Humedad interior del 85% con sensor de puerta informando cierre correcto. Verificación preventiva de sellado perimetral para descartar falso positivo.",
    supplier: "Frío Express S.A.",
    supplierContact: "+54 381 430-1455",
    scheduledWindow: "26/09/2026, 10:30 hs",
    status: "Cotización aprobada",
    priority: "Normal",
    createdAt: "23/09/2026 11:20",
    costEstimate: 31000,
  },
  {
    id: "ORD-5190",
    deviceId: "REF-TUC-001",
    model: "Visicooler 1 Puerta",
    location: "Kiosco El Paso - Yerba Buena",
    diagnosis: "Mantenimiento preventivo y limpieza de condensador",
    technicalNotes:
      "Limpieza de serpentina condensadora, calibración de sonda SHT31 y verificación de consumo eléctrico dentro de parámetros nominales.",
    supplier: "Refrigeración Tucumán SRL",
    supplierContact: "+54 381 484-2201",
    scheduledWindow: "Finalizada el 22/09/2026",
    status: "Completada",
    priority: "Normal",
    createdAt: "22/09/2026 10:00",
    costEstimate: 25000,
  },
];
