const N8N_DIAGNOSIS_URL =
  "https://primary-production-b0a2e.up.railway.app/webhook-test/ia-diagnosis";
const N8N_REPAIR_URL =
  "https://primary-production-b0a2e.up.railway.app/webhook-test/supplier-reparation";

/**
 * Dispara el Workflow de Diagnóstico Cognitivo en n8n
 */
export const runDiagnosis = async (telemetryData) => {
  try {
    const response = await fetch(N8N_DIAGNOSIS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(telemetryData),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.output;
  } catch (error) {
    console.error("Fallo en la conexión con la Capa de Orquestación:", error);
    throw error;
  }
};

/**
 * Genera una orden de reparación enviando los datos al Webhook de n8n
 * @param {Object} orderData - Datos de la orden (idEquipo, diagnostico, razonamiento)
 */
export const createRepairOrder = async (orderData) => {
  try {
    const response = await fetch(N8N_REPAIR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    // Retornamos la respuesta, asumiendo que el webhook devuelve un JSON
    return await response.json();
  } catch (error) {
    console.error("Fallo al crear la orden de reparación:", error);
    throw error;
  }
};
