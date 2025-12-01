import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext"; // Importar Provider
import ProtectedRoute from "@/components/ProtectedRoute"; // Importar Guard
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ChatBot from "@/pages/ChatBot";
import Orders from "@/pages/Orders";

function App() {
  return (
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
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
