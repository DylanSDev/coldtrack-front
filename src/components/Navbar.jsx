import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Refrigerator } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // <--- 1. Importamos el hook

export default function Navbar() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth(); // <--- 2. Obtenemos estado y función

  const isLoginPage = location.pathname === "/login";

  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50 h-16">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"
        >
          <div className="bg-brand-red p-1 rounded-md">
            <Refrigerator className="text-red-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight hover:text-red-700">
            ColdTrack
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Button
              onClick={logout}
              variant="ghost"
              className="text-slate-600 hover:text-red-700 hover:bg-red-50 font-medium transition-colors duration-200"
            >
              Cerrar Sesión
            </Button>
          ) : (
            !isLoginPage && (
              <Link to="/login">
                <Button
                  variant={location.pathname === "/" ? "default" : "outline"}
                  className={
                    location.pathname === "/"
                      ? "bg-brand-red hover:bg-red-800 hover:text-white hover:scale-105 transition-transform duration-200"
                      : ""
                  }
                >
                  Ingresar
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
