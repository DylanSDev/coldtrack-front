export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-8 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Arca Continental - Gestión de
          Procesos de Negocio.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Desarrollado por Grupo Nº 18, de la UTN - FRT.
        </p>
      </div>
    </footer>
  );
}
