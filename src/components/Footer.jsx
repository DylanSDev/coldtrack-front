import React from "react";
import { Snowflake, ShieldCheck, Activity, Cpu, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t bg-slate-900 text-slate-400 dark:bg-[#050811] dark:border-slate-800/80 dark:text-slate-400 mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Columna 1: Branding & Descripción */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
                <Snowflake className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                ColdTrack
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30 uppercase">
                IoT Platform
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Plataforma de hiperautomatización y mantenimiento predictivo en cadena de frío. Conectamos telemetría IoT, diagnóstico cognitivo con IA y orquestación B2B automatizada.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Basic Auth Seguro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Telemetría en Vivo</span>
              </div>
            </div>
          </div>

          {/* Columna 2: Navegación Rápida */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Módulos del Sistema
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/dashboard"
                  className="hover:text-cyan-400 transition-colors duration-150 flex items-center gap-1.5"
                >
                  <span>Monitor IoT & Diagnóstico</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/chat"
                  className="hover:text-cyan-400 transition-colors duration-150 flex items-center gap-1.5"
                >
                  <span>Asistente Cognitivo IA</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/ordenes"
                  className="hover:text-cyan-400 transition-colors duration-150 flex items-center gap-1.5"
                >
                  <span>Órdenes de Reparación</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Proyecto & Créditos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Institución & Proyecto
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="font-semibold text-slate-300">
                Arca Continental
              </p>
              <p>Gestión de Procesos de Negocio (TFI)</p>
              <div className="pt-2 border-t border-slate-800">
                <p className="font-medium text-slate-300">UTN - FRT</p>
                <p className="text-slate-400">Grupo Nº 18</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} ColdTrack • Arca Continental. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Diseñado con tecnología IoT & IA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
