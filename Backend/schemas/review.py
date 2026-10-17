from datetime import datetime

from pydantic import BaseModel, Field


# ============================================================
# EXPERT REVIEW REQUEST
# ============================================================

class ReviewCreate(BaseModel):
    """
    Données envoyées par l'expert lorsqu'il vérifie
    une prédiction du modèle.
    """

    prediction_id: int

    verified_class: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    comment: str | None = None


# ============================================================
# EXPERT REVIEW RESPONSE
# ============================================================

class ReviewResponse(BaseModel):
    """
    Réponse retournée après l'enregistrement
    de la validation de l'expert.
    """

    id: int
    prediction_id: int
    expert_id: int
    verified_class: str
    is_correct: bool
    comment: str | None
    reviewed_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# PENDING PREDICTION RESPONSE
# ============================================================

class PendingPredictionResponse(BaseModel):
    """
    Une prédiction qui attend encore la validation d'un expert.
    """

    prediction_id: int

    image_id: int
    file_name: str
    file_path: str
    content_type: str

    predicted_class: str
    confidence: float

    black_spot_probability: float
    canker_probability: float
    greening_probability: float
    healthy_probability: float
    rot_probability: float
    scab_probability: float

    created_at: datetime


# ============================================================
# REVIEW UPDATE REQUEST
# ============================================================

class ReviewUpdate(BaseModel):
    """
    Données envoyées par l'expert pour modifier
    une review déjà existante.
    """

    verified_class: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    comment: str | None = None

# ============================================================
# VERIFIED PREDICTION RESPONSE
# ============================================================

class VerifiedPredictionResponse(BaseModel):
    """
    Une prédiction déjà validée/vérifiée par un expert.
    """

    review_id: int
    prediction_id: int

    image_id: int
    file_name: str
    file_path: str
    content_type: str

    predicted_class: str
    confidence: float

    verified_class: str
    is_correct: bool
    comment: str | None
    reviewed_at: datetime

    class Config:
        from_attributes = True