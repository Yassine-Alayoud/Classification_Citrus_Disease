import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Clock, Leaf, CheckCircle2, Pencil, X } from "lucide-react";
import { labelFor, CLASS_INFO } from "../types/classInfo";

const API_URL = import.meta.env.VITE_API_URL;

const CLASS_OPTIONS = Object.keys(CLASS_INFO);

type PendingReview = {
  prediction_id: number;
  image_id: number;
  file_name: string;
  file_path: string;
  content_type: string;
  predicted_class: string;
  confidence: number;
  black_spot_probability: number;
  canker_probability: number;
  greening_probability: number;
  healthy_probability: number;
  rot_probability: number;
  scab_probability: number;
  created_at: string;
};

function probabilitiesOf(item: PendingReview): [string, number][] {
  const entries: [string, number][] = [
    ["black_spot", item.black_spot_probability],
    ["canker", item.canker_probability],
    ["greening", item.greening_probability],
    ["healthy", item.healthy_probability],
    ["rot", item.rot_probability],
    ["scab", item.scab_probability],
  ];
  return entries.sort((a, b) => b[1] - a[1]);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function imageUrl(filePath: string) {
  return `${API_URL}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
}

async function submitReview(predictionId: number, verifiedClass: string, comment: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/reviews/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      prediction_id: predictionId,
      verified_class: verifiedClass,
      comment,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Le serveur a répondu avec le code ${res.status}.`);
  }
  return res.json();
}

export default function ValidationView() {
  const [items, setItems] = useState<PendingReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPending() {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/reviews/pending`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Le serveur a répondu avec le code ${res.status}.`);
        }
        const data: PendingReview[] = await res.json();
        if (!cancelled) setItems(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.message === "Failed to fetch"
              ? "Impossible de joindre le serveur. Vérifie qu'il est bien lancé."
              : err.message
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPending();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReviewed = (predictionId: number) => {
    setItems((prev) => prev.filter((it) => it.prediction_id !== predictionId));
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
        <h1 className="cd-display text-2xl sm:text-3xl font-semibold">Validation des prédictions</h1>
        {!isLoading && !error && (
          <span className="cd-mono text-xs opacity-60">
            {items.length} en attente
          </span>
        )}
      </div>
      <p className="text-xs sm:text-sm mb-6 opacity-60">
        Prédictions non encore vérifiées par l'expert.
      </p>

      {isLoading && (
        <div className="cd-tag rounded-md p-8 sm:p-10 flex flex-col items-center justify-center gap-2 opacity-60">
          <Loader2 size={22} className="animate-spin" />
          <p className="text-sm">Chargement des prédictions...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-start gap-2 text-sm rounded-md p-4 cd-tag" style={{ color: "var(--rust)" }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="cd-tag rounded-md p-8 sm:p-10 flex flex-col items-center justify-center gap-2 text-center opacity-50">
          <Leaf size={24} />
          <p className="text-sm">Aucune prédiction en attente de validation.</p>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <PredictionCard
              key={item.prediction_id}
              item={item}
              onReviewed={handleReviewed}
              onImageClick={(url, title) => setSelectedImage({ url, title })}
            />
          ))}
        </div>
      )}

      {/* Modale responsive d'agrandissement de l'image */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors p-2 touch-manipulation"
              aria-label="Fermer"
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-md shadow-2xl"
            />
            <p className="text-white text-xs cd-mono mt-3 opacity-80 text-center truncate w-full px-2">
              {selectedImage.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PredictionCard({
  item,
  onReviewed,
  onImageClick,
}: {
  item: PendingReview;
  onReviewed: (predictionId: number) => void;
  onImageClick: (url: string, title: string) => void;
}) {
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctedClass, setCorrectedClass] = useState(item.predicted_class);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const confirm = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitReview(item.prediction_id, item.predicted_class, "");
      onReviewed(item.prediction_id);
    } catch (err: any) {
      setSubmitError(
        err.message === "Failed to fetch"
          ? "Impossible de joindre le serveur. Vérifie qu'il est bien lancé."
          : err.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCorrection = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitReview(item.prediction_id, correctedClass, comment);
      onReviewed(item.prediction_id);
    } catch (err: any) {
      setSubmitError(
        err.message === "Failed to fetch"
          ? "Impossible de joindre le serveur. Vérifie qu'il est bien lancé."
          : err.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cd-tag rounded-md p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div
            onClick={() => onImageClick(imageUrl(item.file_path), item.file_name)}
            className="rounded-md overflow-hidden shrink-0 cursor-pointer group relative hover:opacity-90 transition-opacity w-full sm:w-20 h-40 sm:h-20"
            style={{ border: "1px solid var(--line)", background: "var(--paper)" }}
            title="Cliquer pour agrandir"
          >
            <img
              src={imageUrl(item.file_path)}
              alt={item.file_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div>
              <p className="cd-display text-base sm:text-lg font-semibold leading-tight truncate">
                {labelFor(item.predicted_class)}
              </p>
              <p className="cd-mono text-xs mt-0.5 opacity-60">
                confiance : {(item.confidence * 100).toFixed(1)}%
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-2 cd-mono text-xs opacity-50">
              <Clock size={12} className="shrink-0" />
              <span className="truncate">{formatDate(item.created_at)}</span>
            </div>

            <p className="cd-mono text-xs mt-1 truncate opacity-40">
              {item.file_name}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {probabilitiesOf(item).map(([cls, prob]) => (
            <div key={cls}>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate pr-2">{labelFor(cls)}</span>
                <span className="cd-mono shrink-0 opacity-60">
                  {(prob * 100).toFixed(1)}%
                </span>
              </div>
              <div className="cd-bar-track h-1.5 rounded-full overflow-hidden">
                <div className="cd-bar-fill h-full rounded-full" style={{ width: `${Math.max(prob * 100, 2)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="mt-3 flex items-start gap-2 text-xs rounded-md p-2.5" style={{ background: "rgba(193,68,14,0.08)", color: "var(--rust)" }}>
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {!isCorrecting ? (
        <div className="flex gap-2 mt-4 pt-3.5 border-t" style={{ borderColor: "var(--line)" }}>
          <button
            onClick={confirm}
            disabled={isSubmitting}
            className="cd-mono text-xs tracking-wide uppercase rounded-md py-2.5 px-2 flex-1 flex items-center justify-center gap-1.5 transition-opacity cursor-pointer disabled:cursor-not-allowed touch-manipulation"
            style={{ background: "var(--leaf)", color: "var(--paper)", opacity: isSubmitting ? 0.6 : 1 }}
          >
            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Confirmer
          </button>
          <button
            onClick={() => setIsCorrecting(true)}
            disabled={isSubmitting}
            className="cd-mono text-xs tracking-wide uppercase rounded-md py-2.5 px-2 flex-1 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            style={{ border: "1px solid var(--line)", color: "var(--ink)", opacity: 0.75 }}
          >
            <Pencil size={13} />
            Corriger
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5 pt-3.5 border-t" style={{ borderColor: "var(--line)" }}>
          <div>
            <label className="block text-xs font-medium cd-mono uppercase mb-1 opacity-60">
              Classe correcte
            </label>
            <select
              value={correctedClass}
              onChange={(e) => setCorrectedClass(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-1"
              style={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
            >
              {CLASS_OPTIONS.map((cls) => (
                <option key={cls} value={cls}>
                  {labelFor(cls)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium cd-mono uppercase mb-1 opacity-60">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Précision utile pour le suivi du modèle..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-1 resize-none"
              style={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveCorrection}
              disabled={isSubmitting}
              className="cd-mono text-xs tracking-wide uppercase rounded-md py-2.5 flex-1 flex items-center justify-center gap-1.5 transition-opacity cursor-pointer disabled:cursor-not-allowed touch-manipulation"
              style={{ background: "var(--ink)", color: "var(--paper)", opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Enregistrer
            </button>
            <button
              onClick={() => {
                setIsCorrecting(false);
                setCorrectedClass(item.predicted_class);
                setComment("");
                setSubmitError(null);
              }}
              disabled={isSubmitting}
              className="cd-mono text-xs tracking-wide uppercase rounded-md py-2.5 px-3 flex items-center justify-center cursor-pointer touch-manipulation"
              style={{ border: "1px solid var(--line)", color: "var(--ink)", opacity: 0.6 }}
              aria-label="Annuler"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}