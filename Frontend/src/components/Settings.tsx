import { useState, useEffect } from "react";
import { Mail, ShieldCheck, CalendarDays, Loader2, Activity } from "lucide-react";
import PasswordForm from "./PasswordForm";

const API_URL = import.meta.env.VITE_API_URL;

type UserProfile = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role?: string;
  created_at?: string;
};

export default function SettingsView() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Token d'authentification introuvable.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/";
          return;
        }

        if (response.ok) {
          const data: UserProfile = await response.json();
          setUser(data);
        } else {
          setError("Impossible de charger les informations du profil.");
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des données :", err);
        setError("Erreur réseau lors de la connexion au serveur.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const fullName = user ? `${user.first_name} ${user.last_name}` : "Chargement...";
  const roleText = user?.role || "Agronome — validation des diagnostics";
  
  const memberSinceText = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { 
        day: "numeric",
        month: "long",
        year: "numeric" 
    })
    : "20 mars 2025";

  return (
    <div className="w-full">
      <h1 className="cd-display text-2xl sm:text-3xl font-semibold mb-1">Paramètres</h1>
      <p className="text-xs sm:text-sm mb-6 opacity-60">
        Informations du compte et sécurité.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Informations de l'expert */}
        <div className="cd-tag rounded-md p-4 sm:p-6 w-full">
          <p className="cd-mono text-xs uppercase tracking-wide mb-4 opacity-60">
            Informations du compte
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-sm opacity-60 py-4">
              <Loader2 size={16} className="animate-spin" />
              <span>Chargement des informations...</span>
            </div>
          ) : error ? (
            <p className="text-sm py-2" style={{ color: "var(--rust)" }}>
              {error}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="rounded-full flex items-center justify-center shrink-0 w-10 h-10 sm:w-11 sm:h-11"
                  style={{ border: "2px solid var(--leaf)", color: "var(--leaf)" }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="cd-display text-base sm:text-lg font-semibold leading-tight truncate">
                    {fullName}
                  </p>
                  <p className="cd-mono text-xs truncate opacity-60">
                    {roleText}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-xs sm:text-sm">
                {/* Statut du compte */}
                <div className="flex items-center justify-between gap-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Activity size={14} className="shrink-0 opacity-50" />
                    <span className="truncate opacity-85">Statut du compte</span>
                  </div>
                  <span
                    className="cd-mono text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{
                      background: user?.is_active ? "rgba(63, 107, 63, 0.15)" : "rgba(193, 68, 14, 0.15)",
                      color: user?.is_active ? "var(--leaf)" : "var(--rust)",
                      border: `1px solid ${user?.is_active ? "var(--leaf)" : "var(--rust)"}`,
                    }}
                  >
                    {user?.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2.5 pt-3 min-w-0" style={{ borderTop: "1px solid var(--line)" }}>
                  <Mail size={14} className="shrink-0 opacity-50" />
                  <span className="truncate opacity-85">{user?.email}</span>
                </div>

                {/* Date de création */}
                <div className="flex items-center gap-2.5 pt-3 min-w-0" style={{ borderTop: "1px solid var(--line)" }}>
                  <CalendarDays size={14} className="shrink-0 opacity-50" />
                  <span className="truncate opacity-85">Membre depuis {memberSinceText}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Formulaire de mot de passe */}
        <PasswordForm />
      </div>
    </div>
  );
}