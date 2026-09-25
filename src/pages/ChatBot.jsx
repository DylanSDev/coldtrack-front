import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Send, Bot, User, Loader2, ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { sendChatToAgent } from "@/services/n8nService";

export default function ChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);

  const context = useMemo(() => location.state?.context || {}, [location.state?.context]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let initialText =
      "Hola. Soy el Asistente de Diagnóstico Cognitivo de ColdTrack. ¿En qué puedo ayudarte hoy?";

    if (context.diagnosis) {
      initialText = `❄️ Hemos recibido el reporte del equipo: ${context.equipmentId}.\n\n🔍 Diagnóstico preliminar: ${context.diagnosis}\nPara confirmar la falla con alta precisión, conversemos sobre el comportamiento del equipo.\n\n💬 Puedes responder aquí directamente para profundizar.`;
    }

    setMessages([
      {
        id: 1,
        role: "assistant",
        content: initialText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  }, [context]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const botResponseText = await sendChatToAgent(userMsg.content, context);

      const botMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: botResponseText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg = {
        id: Date.now() + 1,
        role: "assistant",
        isError: true,
        content:
          "Se perdió la conexión con el motor de IA de n8n. Por favor verifica tu conexión o credenciales.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4 animate-in fade-in duration-300">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Asistente Cognitivo
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-cyan-300 border border-blue-500/20">
                IA n8n
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {context.equipmentId
                ? `Contexto Activo: ${context.equipmentId}`
                : "Soporte General de Frío"}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0b1120]/95 backdrop-blur-md rounded-2xl min-h-[500px]">
        <ScrollArea className="flex-1 p-4 sm:p-6">
          <div className="space-y-5 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <Avatar
                  className={`h-8 w-8 sm:h-9 sm:w-9 ${
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <AvatarFallback className="bg-transparent text-xs font-bold">
                    {msg.role === "assistant" ? <Bot size={18} /> : <User size={18} />}
                  </AvatarFallback>
                </Avatar>

                {/* Bubble */}
                <div
                  className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-xs ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-xs"
                        : msg.isError
                        ? "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/50 rounded-tl-xs"
                        : "bg-slate-100 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-xs"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                  <AvatarFallback className="bg-transparent">
                    <Bot size={18} />
                  </AvatarFallback>
                </Avatar>
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900/90 rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-cyan-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Procesando diagnóstico en n8n...
                  </span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Bottom Input Area */}
        <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Escribe tu consulta o respuesta técnica..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="bg-white dark:bg-[#070a14] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-500 rounded-xl"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white h-10 w-10 shrink-0 rounded-xl shadow-md shadow-blue-500/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2">
            ColdTrack AI Copilot • Respuestas asistidas por el flujo de hiperautomatización.
          </p>
        </div>
      </Card>
    </div>
  );
}
