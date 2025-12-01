import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20 text-center">
        <div className="mb-8 flex justify-center">
          <span className="px-3 py-1 rounded-full bg-red-100 text-brand-red text-sm font-medium">
            Nueva Plataforma v1.0
          </span>
        </div>

        <h2 className="text-5xl md:text-6xl font-extrabold mb-6 text-slate-900 tracking-tight">
          Reparación Inteligente de <br />
          <span className="text-brand-red">Equipos de Frío</span>
        </h2>

        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Gestionamos el mantenimiento de tus equipos Arca Continental mediante
          <strong> IoT</strong> e <strong>Inteligencia Artificial</strong>.
          Transformamos el servicio de reactivo a predictivo.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-brand-red hover:bg-red-700 text-lg px-8 py-6 h-auto"
            >
              Soy Cliente
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto text-lg px-8 py-6 h-auto"
          >
            Saber más
          </Button>
        </div>
      </main>
    </div>
  );
}
