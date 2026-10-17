from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.connection import Base


# ============================================================
# EXPERT
# ============================================================

class Expert(Base):
    __tablename__ = "experts"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # Relation avec les validations des experts
    reviews: Mapped[list["ExpertReview"]] = relationship(
        "ExpertReview",
        back_populates="expert",
        cascade="all, delete-orphan",
    )


# ============================================================
# IMAGE
# ============================================================

class Image(Base):
    __tablename__ = "images"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    content_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # Relation avec la prédiction
    prediction: Mapped["Prediction | None"] = relationship(
        "Prediction",
        back_populates="image",
        uselist=False,
        cascade="all, delete-orphan",
    )


# ============================================================
# PREDICTION
# ============================================================

class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # Relation vers l'image
    # --------------------------------------------------------

    image_id: Mapped[int] = mapped_column(
        ForeignKey("images.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # --------------------------------------------------------
    # Version du modèle utilisée
    # --------------------------------------------------------

    model_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("model_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # --------------------------------------------------------
    # Résultat principal
    # --------------------------------------------------------

    predicted_class: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    # --------------------------------------------------------
    # Probabilités des six classes
    # --------------------------------------------------------

    black_spot_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    canker_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    greening_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    healthy_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    rot_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    scab_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # --------------------------------------------------------
    # Relations
    # --------------------------------------------------------

    image: Mapped["Image"] = relationship(
        "Image",
        back_populates="prediction",
    )

    model_version: Mapped["ModelVersion | None"] = relationship(
        "ModelVersion",
        back_populates="predictions",
    )

    reviews: Mapped[list["ExpertReview"]] = relationship(
        "ExpertReview",
        back_populates="prediction",
        cascade="all, delete-orphan",
    )


# ============================================================
# EXPERT REVIEW
# ============================================================

class ExpertReview(Base):
    __tablename__ = "expert_reviews"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # Prediction vérifiée
    # --------------------------------------------------------

    prediction_id: Mapped[int] = mapped_column(
        ForeignKey("predictions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,
    )

    # --------------------------------------------------------
    # Expert ayant effectué la validation
    # --------------------------------------------------------

    expert_id: Mapped[int] = mapped_column(
        ForeignKey("experts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # Classe réellement observée selon l'expert
    # --------------------------------------------------------

    verified_class: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # --------------------------------------------------------
    # La prédiction IA était-elle correcte ?
    # --------------------------------------------------------

    is_correct: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    # --------------------------------------------------------
    # Commentaire facultatif
    # --------------------------------------------------------

    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # --------------------------------------------------------
    # Relations
    # --------------------------------------------------------

    prediction: Mapped["Prediction"] = relationship(
        "Prediction",
        back_populates="reviews",
    )

    expert: Mapped["Expert"] = relationship(
        "Expert",
        back_populates="reviews",
    )


# ============================================================
# MODEL VERSION
# ============================================================

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # Exemple : v1.0.0, v1.1.0...
    version: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # Chemin vers le fichier .keras ou identifiant MLflow
    model_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    # --------------------------------------------------------
    # Métriques du modèle
    # --------------------------------------------------------

    accuracy: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    precision: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    recall: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    f1_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # --------------------------------------------------------
    # Statut
    # --------------------------------------------------------

    # Exemple :
    # training
    # candidate
    # production
    # rejected

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="candidate",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # --------------------------------------------------------
    # Relation avec les prédictions
    # --------------------------------------------------------

    predictions: Mapped[list["Prediction"]] = relationship(
        "Prediction",
        back_populates="model_version",
    )

    # --------------------------------------------------------
    # Relation avec les entraînements
    # --------------------------------------------------------

    training_runs: Mapped[list["TrainingRun"]] = relationship(
        "TrainingRun",
        back_populates="model_version",
    )


# ============================================================
# TRAINING RUN
# ============================================================

class TrainingRun(Base):
    __tablename__ = "training_runs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # Version du modèle produite
    # --------------------------------------------------------

    model_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("model_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # --------------------------------------------------------
    # Dataset utilisé
    # --------------------------------------------------------

    dataset_version: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # --------------------------------------------------------
    # Paramètres d'entraînement
    # --------------------------------------------------------

    epochs: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    learning_rate: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    batch_size: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # --------------------------------------------------------
    # Statut du training
    # --------------------------------------------------------

    # Exemple :
    # running
    # completed
    # failed

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="running",
    )

    # --------------------------------------------------------
    # Métriques finales
    # --------------------------------------------------------

    accuracy: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    precision: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    recall: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    f1_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # --------------------------------------------------------
    # Dates
    # --------------------------------------------------------

    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # --------------------------------------------------------
    # Relation
    # --------------------------------------------------------

    model_version: Mapped["ModelVersion | None"] = relationship(
        "ModelVersion",
        back_populates="training_runs",
    )