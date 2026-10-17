import React, { useState } from "react";
import { X, Lock, Mail, UserCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (token: string) => void;
};

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // États pour la gestion de l'appel API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Identifiants incorrects ou erreur serveur.");
      }

      const data = await response.json();
      
      // Sauvegarde du token dans le localStorage
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      // Notification de succès et fermeture du modal
      if (onLoginSuccess) {
        onLoginSuccess(data.access_token);
      }
      
      onClose();
      // Redirection vers le chemin du dashboard
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div 
        className="w-full max-w-md my-auto rounded-lg p-4 sm:p-6 relative shadow-xl border max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--paper, #F6F3E7)",
          borderColor: "var(--line, #D8D0B8)",
          color: "var(--ink, #243020)"
        }}
      >
        {/* Bouton de fermeture tactile */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full transition-colors hover:bg-black/5 cursor-pointer touch-manipulation"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        {/* En-tête du modal */}
        <div className="flex items-center gap-2 mb-2 pr-6">
          <UserCheck size={20} className="shrink-0" style={{ color: "var(--leaf, #3F6B3F)" }} />
          <h2 className="cd-display text-lg sm:text-xl font-semibold">Espace Expert</h2>
        </div>
        <p className="text-xs mb-4 sm:mb-6 cd-mono opacity-70">
          Veuillez vous identifier pour accéder aux outils avancés.
        </p>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-xs cd-mono border border-red-300">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-medium cd-mono uppercase mb-1">
              Adresse e-mail
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 opacity-50 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="expert@agridata.ma"
                className="w-full pl-9 pr-3 py-2 text-base sm:text-sm rounded-md border focus:outline-none focus:ring-1"
                style={{
                  background: "var(--paper-dim, #EDE8D6)",
                  borderColor: "var(--line, #D8D0B8)",
                  color: "var(--ink, #243020)"
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium cd-mono uppercase mb-1">
              Mot de passe
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3 opacity-50 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-base sm:text-sm rounded-md border focus:outline-none focus:ring-1"
                style={{
                  background: "var(--paper-dim, #EDE8D6)",
                  borderColor: "var(--line, #D8D0B8)",
                  color: "var(--ink, #243020)"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 p-1.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer touch-manipulation"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 sm:py-3 rounded-md text-xs cd-mono uppercase tracking-wide font-medium transition-opacity cursor-pointer flex items-center justify-center gap-2 touch-manipulation"
            style={{
              background: "var(--ink, #243020)",
              color: "var(--paper, #F6F3E7)",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}