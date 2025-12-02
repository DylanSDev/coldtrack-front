import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Send, Bot, User, Loader2, ArrowLeft, Wrench } from "lucide-react";
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

  // 1. Recuperamos el contexto enviado desde el Modal
  const context = location.state?.context || {};

  // Estado de los mensajes
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 2. Efecto de Inicio: Generar el primer mensaje del Bot automáticamente
  useEffect(() => {
    let initialText =
      "Hola. Soy el Agente de Soporte Técnico. ¿En qué puedo ayudarte?";

    // Si hay contexto, personalizamos el saludo
    if (context.diagnosis) {
      // Formateamos las preguntas si vienen como string con "|"
      const questionsText = context.questions
        ? context.questions.replace(/ \| /g, "\n• ")
        : "";

      initialText = ` ‼️ Hemos recibido el reporte del equipo: ${context.equipmentId}.\n\n ⚙️​ Diagnóstico preliminar: ${context.diagnosis}\n  Para confirmar la falla, necesitamos hacerte algunas preguntas. \n\n ➡️​ Responde en el chat para iniciar la conversación.\n\n`;
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

  // Auto-scroll al fondo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // 3. Manejar el envío de mensajes
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

    // Actualizamos UI inmediatamente
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Enviamos a n8n
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
    } catch (error) {
      const errorMsg = {
        id: Date.now() + 1,
        role: "assistant",
        isError: true,
        content:
          "Lo siento, perdí la conexión con el servidor de IA. Intenta de nuevo.",
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
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 p-2 md:p-4">
      {/* Encabezado */}
      <div className="max-w-4xl w-full mx-auto mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Agente Investigador{" "}
              <Badge
                variant="outline"
                className="text-[#F40009] border-[#F40009] bg-red-50"
              >
                IA
              </Badge>
            </h1>
            <p className="text-xs text-slate-500">
              {context.equipmentId
                ? `Contexto: ${context.equipmentId}`
                : "Soporte General"}
            </p>
          </div>
        </div>
      </div>

      {/* Área de Chat */}
      <Card className="flex-1 flex flex-col overflow-hidden max-w-4xl w-full mx-auto shadow-md border-slate-200 bg-white">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <Avatar
                  className={`h-8 w-8 ${
                    msg.role === "assistant" ? "bg-red-50" : "bg-blue-50"
                  }`}
                >
                  <AvatarFallback
                    className={
                      msg.role === "assistant"
                        ? "text-[#F40009]"
                        : "text-blue-600"
                    }
                  >
                    {msg.role === "assistant" ? (
                      <Bot size={18} />
                    ) : (
                      <User size={18} />
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Burbuja de Mensaje */}
                <div
                  className={`flex flex-col max-w-[85%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : msg.isError
                        ? "bg-red-100 text-red-800 border border-red-200 rounded-tl-none"
                        : "bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Indicador de "Escribiendo..." */}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 bg-red-50">
                  <AvatarFallback className="text-[#F40009]">
                    <Bot size={18} />
                  </AvatarFallback>
                </Avatar>
                <div className="px-4 py-3 bg-slate-100 rounded-2xl rounded-tl-none border border-slate-200 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  <span className="text-xs text-slate-500 font-medium">
                    Analizando respuesta...
                  </span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex gap-2 items-end">
            <Input
              placeholder="Describe el problema o responde las preguntas..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="bg-white border-slate-300 focus-visible:ring-[#F40009] min-h-[44px]"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-[#F40009] hover:bg-red-700 text-white h-[44px] w-[44px] shrink-0 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            La IA puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </Card>
    </div>
  );
}
