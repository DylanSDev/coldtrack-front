import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { ColdTrackLogo } from "@/components/ColdTrackLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MONITORED_PARAMETERS = [
  { label: "Sonda térmica", spec: "-20 °C a +40 °C", unit: "°C" },
  { label: "Humedad relativa", spec: "0 a 100 % HR", unit: "%" },
  { label: "Pinza de corriente", spec: "Consumo compresor", unit: "A" },
  { label: "Acelerómetro triaxial", spec: "Desbalance y traba", unit: "Hz" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState("");

  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isPasswordValid = password.length >= 6;

  const emailError = touched.email
    ? !email.trim()
      ? "Ingresá tu correo electrónico."
      : !isEmailValid
      ? "El formato del correo no es válido."
      : ""
    : "";

  const passwordError = touched.password
    ? !password
      ? "Ingresá tu contraseña."
      : !isPasswordValid
      ? "Debe tener al menos 6 caracteres."
      : ""
    : "";

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    setTouched({ email: true, password: true });

    if (!isEmailValid || !isPasswordValid) return;

    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    setTimeout(() => {
      if (normalizedEmail === "albertorojo@cliente.com" && password === "albertorojo123") {
        login({
          email: normalizedEmail,
          name: "Alberto Rojo",
          role: "client",
        });
        navigate("/dashboard");
      } else {
        setFormError("El correo o la contraseña no coinciden con una cuenta activa.");
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="flex-1 flex bg-white dark:bg-[#070a14]">
      <section className="hidden lg:flex lg:w-[46%] xl:w-[48%] flex-col justify-between p-10 xl:p-14 bg-[#034AAD] dark:bg-[#0b1120] text-white border-r border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <ColdTrackLogo tile={false} className="w-8 h-8 text-white" />
          <div>
            <p className="text-base font-bold tracking-tight">ColdTrack</p>
            <p className="text-xs text-blue-100/80 dark:text-slate-400">
              Monitoreo térmico e industrial
            </p>
          </div>
        </div>

        <div className="relative max-w-md space-y-4">
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
            Control continuo de tu cadena de frío.
          </h2>
          <p className="text-sm text-blue-100/90 dark:text-slate-300 leading-relaxed">
            Supervisá temperatura interna, consumo eléctrico y estado mecánico de tus equipos en tiempo real desde un único panel operativo.
          </p>
        </div>

        <div className="relative border-t border-white/15 dark:border-slate-800 pt-6 space-y-3">
          <p className="text-xs font-medium text-blue-100/80 dark:text-slate-400">
            Variables registradas por nodo IoT
          </p>
          <div className="grid grid-cols-2 gap-3">
            {MONITORED_PARAMETERS.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/15 dark:border-slate-800 bg-white/5 dark:bg-slate-900/60 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-white">{item.label}</span>
                  <span className="font-mono text-[11px] text-blue-100 dark:text-slate-400">
                    {item.unit}
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/75 dark:text-slate-400 mt-0.5">
                  {item.spec}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px] space-y-7">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 lg:hidden mb-4">
              <ColdTrackLogo className="w-9 h-9" />
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                ColdTrack
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Iniciar sesión
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Ingresá con tu cuenta para acceder al panel de equipos y órdenes de servicio.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (formError) setFormError("");
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="nombre@empresa.com"
                className={`w-full h-11 px-3.5 rounded-lg border text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors ${
                  emailError
                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                    : "border-slate-300 dark:border-slate-700 focus:border-[#034AAD] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#034AAD]/15 dark:focus:ring-blue-500/15"
                }`}
              />
              {emailError && (
                <p className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (formError) setFormError("");
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  placeholder="Ingresá tu contraseña"
                  className={`w-full h-11 pl-3.5 pr-10 rounded-lg border text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors ${
                    passwordError
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                      : "border-slate-300 dark:border-slate-700 focus:border-[#034AAD] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#034AAD]/15 dark:focus:ring-blue-500/15"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#034AAD] hover:bg-[#023b8c] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </span>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4">
            ¿Problemas para acceder? Consultá con el administrador de tu red de equipos.
          </p>
        </div>
      </section>
    </div>
  );
}
