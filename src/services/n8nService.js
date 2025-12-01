const N8N_WEBHOOK_URL =
  "https://primary-production-b0a2e.up.railway.app/webhook-test/ia-diagnosis";

/**
 * Dispara el Workflow de Diagnóstico Cognitivo en n8n
 * @param {Object} telemetryData - Datos de telemetría del equipo
 * @returns {Promise<Object>} - Resultado del diagnóstico (output de la IA)
 */
export const runDiagnosis = async (telemetryData) => {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
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
