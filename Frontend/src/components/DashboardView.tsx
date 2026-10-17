import { useEffect, useState } from "react";
import { Leaf, Clock, CheckCircle2, Percent, Inbox } from "lucide-react";
import StatCard from "./StatCard";
import { labelFor } from "../types/classInfo";

const API_URL = import.meta.env.VITE_API_URL;

interface PendingReview {
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
}

interface VerifiedReview {
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
  comment: string;
  reviewed_at: string;
}

interface CalculatedStats {
  totalDiagnostics: number;
  pendingValidation: number;
  validationRate: number;
  avgConfidence: number;
  classDistribution: { key: string; count: number }[];
}

function imageUrl(filePath: string) {
  return `${API_URL}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
}

export default function DashboardView() {
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<CalculatedStats>({
    totalDiagnostics: 0,
    pendingValidation: 0,
    validationRate: 0,
    avgConfidence: 0,
    classDistribution: [],
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const [resPending, resVerified] = await Promise.all([
          fetch(`${API_URL}/reviews/pending`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/reviews/verified`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const pendingData: PendingReview[] = await resPending.json();
        const verifiedData: VerifiedReview[] = await resVerified.json();

        setPending(pendingData);

        // Calcul du total des diagnostics et du taux de validation
        const total = pendingData.length + verifiedData.length;
        const correctCount = verifiedData.filter((v) => v.is_correct).length;
        const validationRate = verifiedData.length > 0 ? (correctCount / verifiedData.length) * 100 : 0;

        // Calcul de la confiance moyenne globale
        const allConfidences = [
          ...pendingData.map((p) => p.confidence),
          ...verifiedData.map((v) => v.confidence),
        ];
        const avgConfidence =
          allConfidences.length > 0
            ? (allConfidences.reduce((acc, val) => acc + val, 0) / allConfidences.length) * 100
            : 0;

        // Calcul de la répartition par classe
        const distributionMap: Record<string, number> = {};
        [...pendingData, ...verifiedData].forEach((item) => {
          const cls = item.predicted_class;
          distributionMap[cls] = (distributionMap[cls] || 0) + 1;
        });

        const classDistribution = Object.entries(distributionMap).map(([key, count]) => ({
          key,
          count,
        }));

        setStats({
          totalDiagnostics: total,
          pendingValidation: pendingData.length,
          validationRate,
          avgConfidence,
          classDistribution,
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const maxClassCount = Math.max(...stats.classDistribution.map((c) => c.count), 1);

  if (loading) {
    return <div className="p-4 sm:p-6 text-sm">Chargement des données du tableau de bord...</div>;
  }

  return (
    <div className="w-full">
      <h1 className="cd-display text-2xl sm:text-3xl font-semibold mb-1">Dashboard</h1>
      <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ opacity: 0.6 }}>
        Vue d'ensemble de l'activité de diagnostic.
      </p>

      {/* Cartes de statistiques responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={Leaf} label="Diagnostics" value={stats.totalDiagnostics.toLocaleString("fr-FR")} sub="depuis le lancement" />
        <StatCard icon={Clock} label="En attente" value={stats.pendingValidation.toString()} sub="à valider" />
        <StatCard icon={CheckCircle2} label="Accuracy" value={`${stats.validationRate.toFixed(1)}%`} sub="prédictions correctes" />
        <StatCard icon={Percent} label="Confiance moyenne" value={`${stats.avgConfidence.toFixed(1)}%`} sub="sur l'ensemble des prédictions" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Répartition par classe */}
        <div className="cd-tag rounded-md p-4 sm:p-6">
          <p className="cd-mono text-xs uppercase tracking-wide mb-4" style={{ opacity: 0.6 }}>
            Répartition par classe
          </p>
          <div className="flex flex-col gap-3">
            {stats.classDistribution.map((c) => (
              <div key={c.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate pr-2">{labelFor(c.key)}</span>
                  <span className="cd-mono shrink-0" style={{ opacity: 0.6 }}>
                    {c.count}
                  </span>
                </div>
                <div className="cd-bar-track h-1.5 rounded-full overflow-hidden">
                  <div
                    className="cd-bar-fill h-full rounded-full"
                    style={{ width: `${Math.max((c.count / maxClassCount) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prédictions en attente */}
        {!loading && pending.length === 0 && (
          <div className="cd-tag rounded-md p-6 flex flex-col items-center justify-center text-center min-h-40">
            <Inbox size={24} className="mb-2" style={{ opacity: 0.6 }} />
            <p className="cd-mono text-xs uppercase tracking-wide" style={{ opacity: 0.6 }}>
              Aucune prédiction en attente de validation.
            </p>
          </div>
        )}

        {!loading && pending.length > 0 && (
          <div className="cd-tag rounded-md p-4 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="cd-mono text-xs uppercase tracking-wide" style={{ opacity: 0.6 }}>
                À valider en priorité
              </p>
              <span className="cd-mono text-xs font-semibold" style={{ color: "var(--rust)" }}>
                {pending.length}
              </span>
            </div>
            <div className="flex flex-col divide-y max-h-80 overflow-y-auto pr-1" style={{ borderColor: "var(--line)" }}>
              {pending.map((p) => (
                <div key={p.prediction_id} className="flex items-center gap-3 py-3 first:pt-0">
                  <div
                    className="rounded-md flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ width: 36, height: 36, background: "var(--paper-dim)", border: "1px solid var(--line)" }}
                  >
                    <img 
                      src={imageUrl(p.file_path)} 
                      alt={p.file_name || labelFor(p.predicted_class)} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{labelFor(p.predicted_class)}</p>
                    <p className="cd-mono text-xs truncate" style={{ opacity: 0.5 }}>
                      {new Date(p.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="cd-mono text-xs shrink-0 font-medium" style={{ opacity: 0.7 }}>
                    {(p.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}