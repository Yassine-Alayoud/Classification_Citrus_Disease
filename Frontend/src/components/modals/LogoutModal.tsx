// import React from "react";
import { LogOut, X } from "lucide-react";

type LogoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-sm rounded-lg p-5 sm:p-6 relative shadow-xl border max-h-[90vh] overflow-y-auto my-auto"
        style={{
          background: "var(--paper, #F6F3E7)",
          borderColor: "var(--line, #D8D0B8)",
          color: "var(--ink, #243020)",
        }}
      >
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full transition-colors hover:bg-black/5 cursor-pointer touch-manipulation"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        {/* En-tête */}
        <div className="flex items-center gap-2 mb-3 pr-6">
          <LogOut size={20} className="shrink-0" style={{ color: "var(--rust, #C1440E)" }} />
          <h3 className="cd-display text-base sm:text-lg font-semibold">Déconnexion</h3>
        </div>

        <p className="text-xs sm:text-sm mb-6 cd-mono opacity-80">
          Êtes-vous sûr de vouloir vous déconnecter de votre espace expert ?
        </p>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-md text-xs cd-mono uppercase font-medium border transition-colors hover:bg-black/5 cursor-pointer touch-manipulation"
            style={{
              borderColor: "var(--line, #D8D0B8)",
              color: "var(--ink, #243020)",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-md text-xs cd-mono uppercase tracking-wide font-medium transition-opacity hover:opacity-90 cursor-pointer touch-manipulation"
            style={{
              background: "var(--rust, #C1440E)",
              color: "#FFFFFF",
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}