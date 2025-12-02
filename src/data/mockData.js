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

const enrichData = (data) => {
  return data.map((item) => {
    let meta = {
      modelo: "Heladera Exhibidora Std",
      ubicacion: "Tienda Central - San Miguel de Tucumán",
      salud: 90,
    };
    if (item.device_id === "REF-TUC-002") {
      meta = {
        modelo: "Visicooler 500L",
        ubicacion: "Supermercado Norte - Las Talitas",
        salud: 45,
      };
    } else if (item.device_id === "REF-TUC-001") {
      meta = {
        modelo: "Visicooler 1 Puerta",
        ubicacion: "Kiosco El Paso - Yerba Buena",
        salud: 98,
      };
    } else if (item.device_id === "REF-TUC-003") {
      meta = {
        modelo: "Freezer Horizontal",
        ubicacion: "Almacén Don Pepe - San Miguel de Tucumán",
        salud: 20,
      };
    } else if (item.device_id === "REF-TUC-004") {
      meta = {
        modelo: "Heladera Doble",
        ubicacion: "Estación YPF - Alberdi",
        salud: 88,
      };
    }
    let estado = "Operativo";
    if (item.telemetry.thermal.internal_temp_c > 8) estado = "Posible Falla";
    if (item.device_id === "REF-TUC-003") estado = "Posible Falla";

    return { ...item, ...meta, estado };
  });
};

export const processedData = enrichData(rawTelemetryData);
