import { useState, useEffect } from "react";
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState("");

  // Efecto para validar Email
  useEffect(() => {
    if (touched.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        setEmailError("El email es requerido");
        setIsEmailValid(false);
      } else if (!emailRegex.test(email)) {
        setEmailError("Ingresa un email válido");
        setIsEmailValid(false);
      } else {
        setEmailError("");
        setIsEmailValid(true);
      }
    }
  }, [email, touched.email]);

  // Efecto para validar Password
  useEffect(() => {
    if (touched.password) {
      if (!password) {
        setPasswordError("La contraseña es requerida");
        setIsPasswordValid(false);
      } else if (password.length < 6) {
        setPasswordError("Mínimo 6 caracteres");
        setIsPasswordValid(false);
      } else {
        setPasswordError("");
        setIsPasswordValid(true);
      }
    }
  }, [password, touched.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setTouched({ email: true, password: true });

    // Si hay errores de validación, no continuar
    if (!isEmailValid || !isPasswordValid) return;

    setIsLoading(true);

    // Simulación de llamada a API
    setTimeout(() => {
      // VALIDACIÓN HARDCODEADA
      if (
        email === "albertorojo@cliente.com" &&
        password === "albertorojo123"
      ) {
        // 1. Guardar sesión con el nombre pedido
        login({
          email: email,
          name: "Alberto Rojo",
          role: "client",
        });

        // 2. Redirigir
        navigate("/dashboard");
      } else {
        // Error de credenciales
        setFormError("Usuario o contraseña incorrectos.");
        setIsLoading(false);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-100 to-gray-200 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="blob-scene-haikei.svg"
          alt="Fondo ColdTrack"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-white/30"></div>
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-100">
        <div className="pt-12 pb-8 px-8 text-center">
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter mb-3 font-sans">
            Bienvenido a <br />{" "}
            <span className="text-slate-900">ColdTrack</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
            Gestión Inteligente de Activos
          </p>
          <div className="w-16 h-1 bg-[#F40009] mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="px-8 pb-12 pt-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Email */}
            <div
              className="animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <label
                htmlFor="email"
                className="block text-xs font-bold text-gray-700 uppercase mb-2 pl-1"
              >
                Usuario / Email
              </label>
              <div className="relative group">
                <div
                  className={`absolute left-4 top-3.5 transition-colors duration-300 
                  ${
                    isEmailValid
                      ? "text-green-600"
                      : "text-gray-400 group-focus-within:text-[#F40009]"
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  placeholder="placeholder@coldtrack.com"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 bg-gray-50 outline-none transition-all duration-300
                    ${
                      emailError
                        ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : isEmailValid
                        ? "border-green-500 focus:ring-4 focus:ring-green-500/10"
                        : "border-gray-200 focus:border-[#F40009] focus:ring-4 focus:ring-[#F40009]/10"
                    }`}
                />
              </div>
              {emailError && (
                <p className="text-red-500 text-xs mt-1.5 ml-1 font-medium flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3 h-3" /> {emailError}
                </p>
              )}
            </div>

            {/* Input Password */}
            <div
              className="animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <label
                htmlFor="password"
                className="block text-xs font-bold text-gray-700 uppercase mb-2 pl-1"
              >
                Contraseña
              </label>
              <div className="relative group">
                <div
                  className={`absolute left-4 top-3.5 transition-colors duration-300
                  ${
                    isPasswordValid
                      ? "text-green-600"
                      : "text-gray-400 group-focus-within:text-[#F40009]"
                  }`}
                >
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 bg-gray-50 outline-none transition-all duration-300
                    ${
                      passwordError
                        ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : isPasswordValid
                        ? "border-green-500 focus:ring-4 focus:ring-green-500/10"
                        : "border-gray-200 focus:border-[#F40009] focus:ring-4 focus:ring-[#F40009]/10"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-500 text-xs mt-1.5 ml-1 font-medium flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3 h-3" /> {passwordError}
                </p>
              )}
            </div>

            {/* Error General del Formulario */}
            {formError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {formError}
              </div>
            )}

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={
                isLoading ||
                (touched.email && !isEmailValid) ||
                (touched.password && !isPasswordValid)
              }
              className="w-full bg-[#F40009] hover:bg-[#d10008] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-600/40 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validando Credenciales...</span>
                </>
              ) : (
                <span>INGRESAR AL SISTEMA</span>
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-up {
          opacity: 0;
          animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
