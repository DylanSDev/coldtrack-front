import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Loader2,
  RotateCcw,
  Send,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatContextPanel } from "@/components/chat/ChatContextPanel";
import { processedData } from "@/data/mockData";
import { sendChatToAgent } from "@/services/n8nService";

function currentTime() {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildInitialMessage(equipment, diagnosisContext) {
  if (
    diagnosisContext?.equipmentId === equipment.device_id &&
    diagnosisContext?.diagnosis
  ) {
    return `Equipo ${equipment.device_id} (${equipment.modelo}). Diagnóstico preliminar: ${diagnosisContext.diagnosis}. Indicame qué observás en el equipo o seleccioná una consulta sugerida para continuar.`;
  }

  return `Canal técnico listo para ${equipment.device_id} (${equipment.modelo}). Podés consultar sobre las lecturas actuales, posibles fallas o pasos de verificación en sitio.`;
}

function buildSuggestedPrompts(equipment, diagnosisContext) {
  if (
    diagnosisContext?.equipmentId === equipment.device_id &&
    diagnosisContext?.questions &&
    diagnosisContext.questions !== "Sin preguntas específicas"
  ) {
    return diagnosisContext.questions
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  return [
    "¿Qué indican las lecturas actuales de este equipo?",
    "¿Cómo descarto una falla de sensor o falso positivo?",
    "¿Qué verificaciones físicas recomiendan antes de pedir servicio?",
  ];
}

export default function ChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);

  const diagnosisContext = useMemo(
    () => location.state?.context || null,
    [location.state?.context]
  );

  const defaultEquipmentId = useMemo(() => {
    if (diagnosisContext?.equipmentId) return diagnosisContext.equipmentId;
    const failing = processedData.find((item) => item.estado === "Posible Falla");
    return failing?.device_id || processedData[0]?.device_id;
  }, [diagnosisContext]);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState(defaultEquipmentId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedEquipment = useMemo(
    () =>
      processedData.find((item) => item.device_id === selectedEquipmentId) ||
      processedData[0],
    [selectedEquipmentId]
  );

  const activeContext = useMemo(() => {
    if (
      diagnosisContext &&
      diagnosisContext.equipmentId === selectedEquipment.device_id
    ) {
      return {
        ...diagnosisContext,
        telemetry: selectedEquipment.telemetry,
      };
    }

    return {
      equipmentId: selectedEquipment.device_id,
      model: selectedEquipment.modelo,
      location: selectedEquipment.ubicacion,
      status: selectedEquipment.estado,
      telemetry: selectedEquipment.telemetry,
    };
  }, [diagnosisContext, selectedEquipment]);

  const suggestedPrompts = useMemo(
    () => buildSuggestedPrompts(selectedEquipment, diagnosisContext),
    [selectedEquipment, diagnosisContext]
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setMessages([
      {
        id: `init-${selectedEquipment.device_id}`,
        role: "assistant",
        content: buildInitialMessage(selectedEquipment, diagnosisContext),
        timestamp: currentTime(),
      },
    ]);
  }, [selectedEquipment, diagnosisContext]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isLoading]);

  const sendMessage = async (rawText) => {
    const text = rawText.trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: text,
      timestamp: currentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const responseText = await sendChatToAgent(text, activeContext);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: responseText,
          timestamp: currentTime(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          isError: true,
          retryText: text,
          content:
            "No pudimos comunicarnos con el servicio de diagnóstico. Verificá la conexión o intentá nuevamente.",
          timestamp: currentTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: "assistant",
        content: buildInitialMessage(selectedEquipment, diagnosisContext),
        timestamp: currentTime(),
      },
    ]);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Asistente técnico
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Diagnóstico asistido para{" "}
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {selectedEquipment.device_id}
              </span>
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetChat}
          disabled={isLoading}
          className="rounded-xl border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reiniciar chat</span>
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 min-h-0">
        <ChatContextPanel
          equipments={processedData}
          selectedEquipment={selectedEquipment}
          onSelectEquipment={setSelectedEquipmentId}
          diagnosisContext={diagnosisContext}
        />

        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] min-h-[480px] lg:h-[calc(100dvh-13rem)]">
          <ScrollArea className="flex-1 p-4 sm:p-5">
            <div className="space-y-4 pb-2">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <Avatar
                      className={`h-8 w-8 shrink-0 ${
                        isUser
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          : "bg-[#034AAD] dark:bg-blue-600 text-white"
                      }`}
                    >
                      <AvatarFallback className="bg-transparent text-xs font-semibold">
                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                          isUser
                            ? "bg-[#034AAD] dark:bg-blue-600 text-white rounded-tr-xs"
                            : message.isError
                            ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 rounded-tl-xs"
                            : "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs"
                        }`}
                      >
                        {message.isError && (
                          <div className="flex items-center gap-1.5 font-semibold mb-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Error de conexión</span>
                          </div>
                        )}
                        <p>{message.content}</p>
                        {message.isError && message.retryText && (
                          <button
                            type="button"
                            onClick={() => sendMessage(message.retryText)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline hover:opacity-80"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reintentar envío
                          </button>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0 bg-[#034AAD] dark:bg-blue-600 text-white">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 rounded-2xl rounded-tl-xs border border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#034AAD] dark:text-blue-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Analizando consulta...
                    </span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5">
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isLoading}
                    onClick={() => sendMessage(prompt)}
                    className="text-left text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-[#034AAD] dark:hover:border-blue-500 hover:text-[#034AAD] dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <textarea
                rows={1}
                placeholder="Escribí tu consulta sobre el equipo..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1 min-h-[42px] max-h-28 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070a14] px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#034AAD] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#034AAD]/15"
              />
              <Button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                aria-label="Enviar mensaje"
                className="bg-[#034AAD] hover:bg-[#023b8c] dark:bg-blue-600 dark:hover:bg-blue-700 text-white h-[42px] w-[42px] shrink-0 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
