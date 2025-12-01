import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar Simple */}
      <nav className="p-4 bg-white shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-red">ColdTrack</h1>
        <Link to="/login">
          <Button>Ingresar</Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-extrabold mb-6 text-slate-900">
          Reparación Inteligente de{" "}
          <span className="text-red-600">Equipos de Frío</span>
        </h2>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          Gestionamos el mantenimiento de tus equipos Arca Continental mediante
          IoT e Inteligencia Artificial. De reactivo a predictivo.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/login">
            <Button size="lg" className="bg-red-600 hover:bg-red-700">
              Soy Cliente
            </Button>
          </Link>
          <Button variant="outline" size="lg">
            Saber más
          </Button>
        </div>
      </main>
    </div>
  );
}
