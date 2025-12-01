import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Refrigerator } from "lucide-react";

export default function Navbar() {
  const location = useLocation();

  // Ocultar botón de "Ingresar" si ya estamos en Login
  const isLoginPage = location.pathname === "/login";

  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2  hover:scale-105 transition-transform duration-200"
        >
          <div className="bg-brand-red p-1 rounded-md">
            <Refrigerator class="text-red-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight hover:text-red-700">
            ColdTrack
          </h1>
        </Link>

        {/* Menú Derecha */}
        <div className="flex items-center gap-4">
          {!isLoginPage && (
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
          )}
        </div>
      </div>
    </nav>
  );
}
