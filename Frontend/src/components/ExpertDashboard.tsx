import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Leaf, LayoutDashboard, Clipboard, BadgeCheck, Settings, LogOut, Menu, X } from "lucide-react";
import type { UserProfile } from "../types/main";
import LogoutModal from "./modals/LogoutModal";

const API_URL = import.meta.env.VITE_API_URL;

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Validation des prédictions", icon: Clipboard, path: "/validation" },
  { label: "Les prédictions vérifiées", icon: BadgeCheck, path: "/verification" },
  { label: "Paramètres", icon: Settings, path: "/settings" },
];

type ExpertDashboardProps = {
  expertName?: string;
  onLogout?: () => void;
  children: React.ReactNode;
};

export default function ExpertDashboard({ expertName = "Expert", onLogout, children }: ExpertDashboardProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
            localStorage.removeItem("token");
            if (onLogout) onLogout();
            return;
        }

        if (response.ok) {
          const data: UserProfile = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du profil expert :", error);
      }
    };

    fetchUserProfile();
  }, [onLogout]);

  const displayName = user ? `${user.first_name} ${user.last_name}` : expertName;

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div
      style={
        {
          "--ink": "#243020",
          "--paper": "#F6F3E7",
          "--paper-dim": "#EDE8D6",
          "--rust": "#C1440E",
          "--leaf": "#3F6B3F",
          "--line": "#D8D0B8",
        } as React.CSSProperties
      }
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .cd-root { font-family: 'IBM Plex Sans', sans-serif; background: var(--paper); color: var(--ink); }
        .cd-display { font-family: 'Fraunces', serif; }
        .cd-mono { font-family: 'IBM Plex Mono', monospace; }
        .cd-tag {
          position: relative;
          border: 1.5px dashed var(--line);
          background: var(--paper-dim);
        }
        .cd-tag::before, .cd-tag::after {
          content: "";
          position: absolute;
          width: 10px; height: 10px;
          border-radius: 9999px;
          background: var(--paper);
          border: 1.5px dashed var(--line);
          top: 50%;
          transform: translateY(-50%);
        }
        .cd-tag::before { left: -6px; }
        .cd-tag::after { right: -6px; }
        .cd-bar-track { background: var(--paper-dim); }
        .cd-bar-fill { background: var(--leaf); transition: width 0.6s ease; }
        .cd-navbtn {
          display: flex; align-items: center; gap: 10px;
          width: 100%; text-align: left;
          padding: 10px 12px; border-radius: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px; letter-spacing: 0.02em;
          border: 1px solid transparent;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
          color: var(--ink);
          opacity: 0.65;
        }
        .cd-navbtn:hover { opacity: 1; background: rgba(36,48,32,0.05); }
        .cd-navbtn.is-active {
          opacity: 1;
          background: var(--paper);
          border-color: var(--line);
        }
        .cd-navbtn.is-active .cd-navbtn-dot { background: var(--rust); }
        .cd-navbtn-dot { width: 5px; height: 5px; border-radius: 9999px; background: var(--line); flex-shrink: 0; }
      `}</style>

      <div className="cd-root min-h-screen w-full flex flex-col md:flex-row">
        {/* En-tête mobile avec bouton Hamburger */}
        <header
          className="md:hidden flex items-center justify-between p-4 border-b border-dashed"
          style={{ borderColor: "var(--line)", background: "var(--paper-dim)" }}
        >
          <div className="flex items-center gap-2">
            <Leaf size={18} style={{ color: "var(--leaf)" }} />
            <span className="cd-mono text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--leaf)" }}>
              AGRIDATA Consulting
            </span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md border touch-manipulation cursor-pointer"
            style={{ borderColor: "var(--line)", background: "var(--paper)" }}
            aria-label="Ouvrir le menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Backdrop pour fermer le menu sur mobile en cliquant à l'extérieur */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar (Desktop + Mobile Drawer) */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-50 w-64 md:w-60 shrink-0 flex flex-col justify-between p-5
            transform transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
          style={{
            borderRight: "1.5px dashed var(--line)",
            background: "var(--paper-dim)",
          }}
        >
          <div>
            <div className="flex items-center justify-between md:justify-start gap-2 mb-8 px-1">
              <div className="flex items-center gap-2">
                <Leaf size={16} style={{ color: "var(--leaf)" }} />
                <span className="cd-mono text-xs tracking-wide uppercase" style={{ color: "var(--leaf)" }}>
                  AGRIDATA Consulting
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1 rounded hover:bg-black/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `cd-navbtn ${isActive ? "is-active" : ""}`}
                  >
                    <span className="cd-navbtn-dot" />
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t md:border-t-0" style={{ borderColor: "var(--line)" }}>
            <div className="cd-mono text-xs mb-3 px-1 truncate" style={{ opacity: 0.5 }}>
              connecté — {displayName}
            </div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLogoutModalOpen(true);
              }}
              className="cd-navbtn w-full"
              style={{ color: "var(--rust)" }}
            >
              <LogOut size={15} />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Modal de déconnexion */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}