// Utilidades de presentación para telemetría (datos simulados determinísticos).

export const TEMP_ALERT_THRESHOLD_C = 8;

function seededRandom(seed) {
  let s = 0;
  for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Serie de temperatura de las últimas 24 h que termina en la lectura actual. */
export function generateSeries(equipo, points = 24) {
  const rnd = seededRandom(equipo.device_id);
  const end = equipo.telemetry.thermal.internal_temp_c;
  const failing = equipo.estado === "Posible Falla";
  const start = failing ? 3 + rnd() * 2 : end + (rnd() - 0.5);

  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const base = start + (end - start) * (failing ? t ** 2.2 : t);
    const noise = (rnd() - 0.5) * (failing ? 0.8 : 0.6);
    return {
      label: `${String(i).padStart(2, "0")}:00`,
      value: +(i === points - 1 ? end : base + noise).toFixed(1),
    };
  });
}

/** Estado visible de un equipo: Óptimo / Alerta Térmica / Puerta Abierta. */
export function getStatus(equipo) {
  if (equipo.telemetry.operational.door_status === "open") {
    return { key: "door", label: "Puerta Abierta", tone: "amber" };
  }
  if (equipo.estado === "Posible Falla") {
    return { key: "alert", label: "Alerta Térmica", tone: "red" };
  }
  return { key: "ok", label: "Óptimo", tone: "emerald" };
}

export function getEquipmentKind(equipo) {
  const m = equipo.modelo.toLowerCase();
  if (m.includes("freezer") || m.includes("horizontal")) return { type: "chest", doors: 1 };
  if (m.includes("doble") || m.includes("2 puertas")) return { type: "upright", doors: 2 };
  return { type: "upright", doors: 1 };
}

export const TONES = {
  emerald: {
    badge:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    hex: "#10b981",
  },
  red: {
    badge:
      "bg-red-500/10 text-red-700 border-red-500/25 dark:bg-red-500/15 dark:text-red-300",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    hex: "#ef4444",
  },
  amber: {
    badge:
      "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    hex: "#f59e0b",
  },
};
