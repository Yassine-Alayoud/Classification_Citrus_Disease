import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Clock, Leaf, Pencil, CheckCircle2, XCircle, X } from "lucide-react";
import { labelFor, CLASS_INFO } from "../types/classInfo";

const API_URL = import.meta.env.VITE_API_URL;

const CLASS_OPTIONS = Object.keys(CLASS_INFO);

type VerifiedReview = {
  review_id: number;
  prediction_id: number;
  image_id: number;
  file_name: string;
  file_path: string;
  content_type: string;
  predicted_class: string;
  confidence: number;
  verified_class: string;
  is_correct: boolean;
  comment: string | null;
  reviewed_at: string;
};

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

async function updateReview(reviewId: number, verifiedClass: string, comment: string | null) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/reviews/${reviewId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      verified_class: verifiedClass,
      comment: comment || null,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Le serveur a répondu avec le code ${res.status}.`);
  }
  return res.json();
}

export default function VerificationView() {
  const [items, setItems] = useState<VerifiedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVerified() {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/reviews/verified`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Le serveur a répondu avec le code ${res.status}.`);
        }
        const data: VerifiedReview[] = await res.json();
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

    loadVerified();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdated = (updatedReview: {
    id: number;
    verified_class: string;
    is_correct: boolean;
    comment: string | null;
  }) => {
    setItems((prev) =>
      prev.map((item) =>
        item.review_id === updatedReview.id
          ? {
              ...item,
              verified_class: updatedReview.verified_class,
              is_correct: updatedReview.is_correct,
              comment: updatedReview.comment,
            }
          : item
      )
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
        <h1 className="cd-display text-2xl sm:text-3xl font-semibold">Prédictions vérifiées</h1>
        {!isLoading && !error && (
          <span className="cd-mono text-xs opacity-60">
            {items.length} vérifiée{items.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-xs sm:text-sm mb-6 opacity-60">
        Liste complète des prédictions vérifiées par l'expert avec possibilité de modification.
      </p>

      {isLoading && (
        <div className="cd-tag rounded-md p-8 sm:p-10 flex flex-col items-center justify-center gap-2 opacity-60">
          <Loader2 size={22} className="animate-spin" />
          <p className="text-sm">Chargement des prédictions vérifiées...</p>
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
          <p className="text-sm">Aucune prédiction vérifiée pour le moment.</p>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <VerifiedCard
              key={item.review_id}
              item={item}
              onUpdated={handleUpdated}
              onImageClick={(url, title) => setSelectedImage({ url, title })}
            />
          ))}
        </div>
      )}

      {/* Modale d'agrandissement de l'image */}
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

function VerifiedCard({
  item,
  onUpdated,
  onImageClick,
}: {
  item: VerifiedReview;
  onUpdated: (updatedReview: any) => void;
  onImageClick: (url: string, title: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [correctedClass, setCorrectedClass] = useState(item.verified_class);
  const [comment, setComment] = useState(item.comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const saveUpdate = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await updateReview(item.review_id, correctedClass, comment);
      onUpdated(result);
      setIsEditing(false);
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
            <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <p className="cd-display text-base sm:text-lg font-semibold leading-tight truncate">
                  {labelFor(item.verified_class)}
                </p>
                <p className="cd-mono text-xs mt-0.5 truncate opacity-60">
                  IA : {labelFor(item.predicted_class)} ({(item.confidence * 100).toFixed(1)}%)
                </p>
              </div>

              {/* Indicateur de statut */}
              <div
                className="flex items-center gap-1 text-xs cd-mono px-2 py-0.5 rounded-md shrink-0 mt-0.5"
                style={{
                  background: item.is_correct ? "rgba(46, 125, 50, 0.1)" : "rgba(193, 68, 14, 0.1)",
                  color: item.is_correct ? "var(--leaf)" : "var(--rust)",
                }}
              >
                {item.is_correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                <span>{item.is_correct ? "Correct" : "Corrigé"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 cd-mono text-xs opacity-50">
              <Clock size={12} className="shrink-0" />
              <span className="truncate">{formatDate(item.reviewed_at)}</span>
            </div>

            <p className="cd-mono text-xs mt-1 truncate opacity-40">
              {item.file_name}
            </p>
          </div>
        </div>

        {/* Commentaire de l'expert */}
        {item.comment && !isEditing && (
          <div
            className="mt-3.5 p-2.5 sm:p-3 rounded-md text-xs italic"
            style={{ background: "var(--paper)", border: "1px solid var(--line)", opacity: 0.85 }}
          >
            <span className="font-semibold not-italic block mb-0.5 cd-mono opacity-60">
              Note de l'expert :
            </span>
            "{item.comment}"
          </div>
        )}
      </div>

      {submitError && (
        <div
          className="mt-3 flex items-start gap-2 text-xs rounded-md p-2.5"
          style={{ background: "rgba(193,68,14,0.08)", color: "var(--rust)" }}
        >
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Mode affichage / Édition */}
      {!isEditing ? (
        <div className="flex gap-2 mt-4 pt-3.5 border-t" style={{ borderColor: "var(--line)" }}>
          <button
            onClick={() => {
              setCorrectedClass(item.verified_class);
              setComment(item.comment || "");
              setIsEditing(true);
            }}
            className="cd-mono text-xs tracking-wide uppercase rounded-md py-2.5 flex-1 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            style={{ border: "1px solid var(--line)", color: "var(--ink)", opacity: 0.8 }}
          >
            <Pencil size={13} />
            Modifier la vérification
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5 pt-3.5 border-t" style={{ borderColor: "var(--line)" }}>
          <div>
            <label className="block text-xs font-medium cd-mono uppercase mb-1 opacity-60">
              Nouvelle classe observée
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
              onClick={saveUpdate}
              disabled={isSubmitting}
              className="cd-mono text-xs tracking-wide uppercase rounded-md py-2.5 flex-1 flex items-center justify-center gap-1.5 transition-opacity cursor-pointer disabled:cursor-not-allowed touch-manipulation"
              style={{ background: "var(--ink)", color: "var(--paper)", opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Mettre à jour
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
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