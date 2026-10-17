import React, { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, AlertTriangle, Leaf, User } from "lucide-react";
import LoginModal from "./modals/LoginModal.tsx";

const API_URL = import.meta.env.VITE_API_URL;

type DiagnosticResult = {
  predicted_class: string;
  confidence: number;
  probabilities: Record<string, number>;
};

type CitrusDiagnosticProps = {
  onLoginSuccess?: (token: string) => void;
};

const CLASS_INFO: Record<string, { label: string; note: string }> = {
  black_spot: { label: "Tache noire", note: "Taches circulaires sombres, centre affaissé." },
  canker: { label: "Chancre", note: "Lésions liégeuses en cratère, halo jaune." },
  greening: { label: "Greening (HLB)", note: "Jaunissement asymétrique du feuillage." },
  healthy: { label: "Sain", note: "Aucun symptôme détecté." },
  scab: { label: "Gale", note: "Excroissances liégeuses en relief." },
  rot: { label: "Pourriture", note: "Désagrégation ou ramollissement des tissus du fruit." },
};

function labelFor(key: string) {
  return CLASS_INFO[key]?.label ?? key;
}

export default function CitrusDiagnostic({ onLoginSuccess }: CitrusDiagnosticProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  }, []);

  const handleFile = useCallback((f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image. Choisis une photo au format JPG ou PNG.");
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      handleFile(f);
    },
    [handleFile]
  );

  const analyze = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/predict`, { 
        method: "POST", 
        body: formData 
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Le serveur a répondu avec le code ${res.status}.`);
      }
      const data: DiagnosticResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(
        err.message === "Failed to fetch"
          ? "Impossible de joindre le serveur de diagnostic. Vérifie qu'il est bien lancé."
          : err.message
      );
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  const sortedProbs = result
    ? Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div
      style={{
        "--ink": "#243020",
        "--paper": "#F6F3E7",
        "--paper-dim": "#EDE8D6",
        "--rust": "#C1440E",
        "--leaf": "#3F6B3F",
        "--line": "#D8D0B8",
      } as React.CSSProperties}
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
        @keyframes cd-scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        .cd-scanline {
          position: absolute;
          left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent, var(--rust), transparent);
          animation: cd-scan 1.6s ease-in-out infinite;
        }
        .cd-bar-track { background: var(--paper-dim); }
        .cd-bar-fill { background: var(--leaf); transition: width 0.6s ease; }
        .cd-bar-fill.is-top { background: var(--rust); }
      `}</style>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={onLoginSuccess}
      />

      <div className="cd-root min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-x-hidden">
        <div className="w-full max-w-4xl flex flex-col justify-between min-h-[90vh]">
          
          <div>
            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Leaf size={16} className="shrink-0" style={{ color: "var(--leaf)" }} />
                <span className="cd-mono text-xs tracking-wide uppercase truncate" style={{ color: "var(--leaf)" }}>
                  AGRIDATA Consulting <span className="hidden sm:inline">— Diagnostic assisté</span>
                </span>
              </div>

              {/* Bouton visible sur desktop uniquement à cet endroit */}
              <button
                onClick={() => setIsLoginOpen(true)}
                className="hidden sm:flex cd-mono text-xs uppercase tracking-wide items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border transition-opacity hover:opacity-80 cursor-pointer"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--paper-dim)",
                  color: "var(--ink)",
                }}
              >
                <User size={14} />
                <span>Espace Expert</span>
              </button>
            </div>

            <h1 className="cd-display text-2xl sm:text-4xl font-semibold mb-4 sm:mb-6" style={{ color: "var(--ink)" }}>
              Carnet de terrain — agrumes
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Colonne gauche : upload */}
              <div className="cd-tag rounded-md p-4 sm:p-6 flex flex-col">
                <p className="cd-mono text-xs uppercase tracking-wide mb-4" style={{ color: "var(--ink)", opacity: 0.6 }}>
                  Échantillon
                </p>

                {!previewUrl ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    className="flex-1 min-h-52 sm:min-h-60 rounded-md flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors p-4"
                    style={{
                      border: `2px dashed ${isDragging ? "var(--rust)" : "var(--line)"}`,
                      background: isDragging ? "rgba(193,68,14,0.06)" : "transparent",
                    }}
                  >
                    <Upload size={28} style={{ color: "var(--ink)", opacity: 0.5 }} />
                    <p className="text-sm text-center px-2 sm:px-6" style={{ opacity: 0.7 }}>
                      Dépose une photo de feuille ou de fruit ici,<br className="hidden sm:inline" /> ou clique pour en choisir une
                    </p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="relative rounded-md overflow-hidden mb-4" style={{ border: "1px solid var(--line)" }}>
                      <img src={previewUrl} alt="Échantillon uploadé" className="w-full h-52 sm:h-64 object-cover" />
                      {isLoading && (
                        <div className="absolute inset-0 overflow-hidden" style={{ background: "rgba(36,48,32,0.15)" }}>
                          <div className="cd-scanline" />
                        </div>
                      )}
                      <button
                        onClick={reset}
                        className="absolute top-2 right-2 rounded-full p-1.5 cursor-pointer"
                        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
                        aria-label="Retirer la photo"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {!result && (
                      <button
                        onClick={analyze}
                        disabled={isLoading}
                        className="cd-mono text-sm tracking-wide uppercase rounded-md py-3 flex items-center justify-center gap-2 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                        style={{ background: "var(--ink)", color: "var(--paper)", opacity: isLoading ? 0.6 : 1 }}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Analyse en cours...
                          </>
                        ) : (
                          "Analyser l'échantillon"
                        )}
                      </button>
                    )}

                    {result && (
                      <button
                        onClick={reset}
                        className="cd-mono text-xs tracking-wide uppercase rounded-md py-2.5 cursor-pointer"
                        style={{ border: "1px solid var(--line)", color: "var(--ink)", opacity: 0.7 }}
                      >
                        Analyser une autre photo
                      </button>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-4 flex items-start gap-2 text-sm rounded-md p-3" style={{ background: "rgba(193,68,14,0.08)", color: "var(--rust)" }}>
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Colonne droite : résultat */}
              <div className="cd-tag rounded-md p-4 sm:p-6 flex flex-col">
                <p className="cd-mono text-xs uppercase tracking-wide mb-4" style={{ color: "var(--ink)", opacity: 0.6 }}>
                  Fiche d'identification
                </p>

                {!result ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8 sm:py-0" style={{ opacity: 0.4 }}>
                    <Leaf size={28} />
                    <p className="text-sm">En attente d'un échantillon</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="rounded-full flex items-center justify-center shrink-0"
                        style={{ width: 44, height: 44, border: "2px solid var(--rust)", color: "var(--rust)" }}
                      >
                        <Leaf size={18} />
                      </div>
                      <div>
                        <p className="cd-display text-lg sm:text-xl font-semibold leading-tight">
                          {labelFor(result.predicted_class)}
                        </p>
                        <p className="cd-mono text-xs" style={{ opacity: 0.6 }}>
                          confiance : {(result.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-5" style={{ opacity: 0.75 }}>
                      {CLASS_INFO[result.predicted_class]?.note}
                    </p>

                    <p className="cd-mono text-xs uppercase tracking-wide mb-3" style={{ opacity: 0.5 }}>
                      Détail par classe
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {sortedProbs.map(([cls, prob], i) => (
                        <div key={cls}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{labelFor(cls)}</span>
                            <span className="cd-mono">{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div className="cd-bar-track h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`cd-bar-fill h-full rounded-full ${i === 0 ? "is-top" : ""}`}
                              style={{ width: `${Math.max(prob * 100, 2)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs mt-6 pt-4" style={{ borderTop: "1px solid var(--line)", opacity: 0.5 }}>
                      Ce diagnostic est une aide automatisée et ne remplace pas l'avis d'un agronome.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bouton Espace Expert affiché en bas uniquement sur Mobile */}
          <div className="mt-8 pt-4 border-t border-dashed sm:hidden flex justify-center" style={{ borderColor: "var(--line)" }}>
            <button
              onClick={() => setIsLoginOpen(true)}
              className="cd-mono text-xs uppercase tracking-wide flex items-center justify-center gap-2 px-4 py-3 rounded-md border w-full touch-manipulation"
              style={{
                borderColor: "var(--line)",
                background: "var(--paper-dim)",
                color: "var(--ink)",
              }}
            >
              <User size={16} />
              <span>Espace Expert</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}