const N8N_DIAGNOSIS_URL = import.meta.env.VITE_N8N_DIAGNOSIS_URL;
const N8N_REPAIR_URL = import.meta.env.VITE_N8N_REPAIR_URL;
const N8N_CHAT_URL = import.meta.env.VITE_N8N_CHAT_URL;

/**
 * Genera los headers para las peticiones, incluyendo Basic Auth si está configurado en las variables de entorno
 */
const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };

  const user = import.meta.env.VITE_N8N_AUTH_USER;
  const password = import.meta.env.VITE_N8N_AUTH_PASSWORD;

  if (user && password) {
    try {
      const basicAuth = btoa(unescape(encodeURIComponent(`${user}:${password}`)));
      headers["Authorization"] = `Basic ${basicAuth}`;
    } catch (error) {
      console.error("Error al generar encabezado de Basic Auth:", error);
    }
  }

  return headers;
};

/**
 * Dispara el Workflow de Diagnóstico Cognitivo en n8n
 */
export const runDiagnosis = async (telemetryData) => {
  try {
    const response = await fetch(N8N_DIAGNOSIS_URL, {
      method: "POST",
      headers: getHeaders(),
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
      headers: getHeaders(),
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

/**
 * Envía el mensaje del usuario y el contexto actual al bot de n8n
 * @param {string} message - Mensaje del usuario
 * @param {Object} context - Datos del equipo, diagnóstico y preguntas sugeridas
 * @returns {Promise<string>} - Respuesta del bot
 */
export const sendChatToAgent = async (message, context) => {
  try {
    const response = await fetch(N8N_CHAT_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        message, // Lo que escribe el usuario
        context, // { equipmentId, diagnosis, questions, ... }
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    // Asumimos que n8n devuelve un JSON: { "output": "Texto de respuesta..." }
    return data.output || "No pude procesar la respuesta.";
  } catch (error) {
    console.error("Error en el chat con n8n:", error);
    throw error;
  }
};
