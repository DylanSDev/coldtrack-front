import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  // Si no está autenticado, redirigir al Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado, renderizar la ruta hija (Outlet)
  return <Outlet />;
}
