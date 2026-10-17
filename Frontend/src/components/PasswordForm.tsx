import React, { useCallback, useState } from "react";
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      const token = localStorage.getItem("token");

      if (newPassword.length < 8) {
        setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("La confirmation ne correspond pas au nouveau mot de passe.");
        return;
      }
      if (newPassword === currentPassword) {
        setError("Le nouveau mot de passe doit être différent de l'actuel.");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/auth/change-password`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Mot de passe actuel incorrect.");
        }
        setSuccess(true);
        reset();
      } catch (err: any) {
        setError(
          err.message === "Failed to fetch"
            ? "Impossible de joindre le serveur. Vérifie qu'il est bien lancé."
            : err.message
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentPassword, newPassword, confirmPassword]
  );

  return (
    <div className="cd-tag rounded-md p-4 sm:p-6 w-full">
      <p className="cd-mono text-xs uppercase tracking-wide mb-4 opacity-60">
        Modifier le mot de passe
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium cd-mono uppercase mb-1 opacity-70">
            Mot de passe actuel
          </label>
          <div className="relative flex items-center">
            <Lock size={16} className="absolute left-3 shrink-0 opacity-50" />
            <input
              type={showCurrent ? "text" : "password"}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2 text-sm rounded-md border focus:outline-none focus:ring-1"
              style={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-2.5 p-1.5 opacity-50 hover:opacity-100 transition-opacity touch-manipulation"
              aria-label={showCurrent ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium cd-mono uppercase mb-1 opacity-70">
            Nouveau mot de passe
          </label>
          <div className="relative flex items-center">
            <Lock size={16} className="absolute left-3 shrink-0 opacity-50" />
            <input
              type={showNew ? "text" : "password"}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8 caractères minimum"
              className="w-full pl-9 pr-10 py-2 text-sm rounded-md border focus:outline-none focus:ring-1"
              style={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-2.5 p-1.5 opacity-50 hover:opacity-100 transition-opacity touch-manipulation"
              aria-label={showNew ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium cd-mono uppercase mb-1 opacity-70">
            Confirmer le nouveau mot de passe
          </label>
          <div className="relative flex items-center">
            <Lock size={16} className="absolute left-3 shrink-0 opacity-50" />
            <input
              type={showNew ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-1"
              style={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs sm:text-sm rounded-md p-3" style={{ background: "rgba(193,68,14,0.08)", color: "var(--rust)" }}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 text-xs sm:text-sm rounded-md p-3" style={{ background: "rgba(63,107,63,0.1)", color: "var(--leaf)" }}>
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>Mot de passe mis à jour avec succès.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full cd-mono text-xs tracking-wide uppercase rounded-md py-2.5 mt-1 transition-opacity cursor-pointer disabled:cursor-not-allowed touch-manipulation"
          style={{ background: "var(--ink)", color: "var(--paper)", opacity: isSubmitting ? 0.6 : 1 }}
        >
          {isSubmitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </form>
    </div>
  );
}