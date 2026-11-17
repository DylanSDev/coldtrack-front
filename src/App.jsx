import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ChatBot from "@/pages/ChatBot";
import Orders from "@/pages/Orders";

// Three.js es pesado: se carga solo al entrar a la simulación.
const Simulation = lazy(() => import("@/pages/Simulation"));
const simulationRoute = (
  <Suspense fallback={<p className="p-10 text-center text-sm text-slate-500">Cargando simulación 3D…</p>}>
    <Simulation />
  </Suspense>
);

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Rutas Públicas */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Rutas Privadas (Protegidas) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<ChatBot />} />
              <Route path="/ordenes" element={<Orders />} />
              <Route path="/simulacion" element={simulationRoute} />
              <Route path="/simulacion/:deviceId" element={simulationRoute} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
