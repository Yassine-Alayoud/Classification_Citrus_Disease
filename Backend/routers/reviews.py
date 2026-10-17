from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Expert, ExpertReview, Prediction
from routers.auth import get_current_expert
from schemas.review import (
    PendingPredictionResponse,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
    VerifiedPredictionResponse,
)


# ============================================================
# Router
# ============================================================

router = APIRouter(
    prefix="/reviews",
    tags=["Expert Reviews"],
)


# ============================================================
# GET PENDING PREDICTIONS
# ============================================================

@router.get(
    "/pending",
    response_model=list[PendingPredictionResponse],
)
def get_pending_predictions(
    db: Session = Depends(get_db),
    current_expert: Expert = Depends(
        get_current_expert
    ),
):
    """
    Retourne les prédictions qui n'ont pas encore
    été vérifiées par un expert.
    """

    # --------------------------------------------------------
    # Recherche des prédictions non vérifiées
    # --------------------------------------------------------

    results = (
        db.query(Prediction)
        .join(Prediction.image)
        .outerjoin(
            ExpertReview,
            ExpertReview.prediction_id == Prediction.id,
            # (ExpertReview.prediction_id == Prediction.id)
            # & (ExpertReview.expert_id == current_expert.id),
        )
        .filter(
            ExpertReview.id.is_(None)
        )
        .order_by(
            Prediction.created_at.asc()
        )
        .all()
    )

    # --------------------------------------------------------
    # Construction de la réponse
    # --------------------------------------------------------

    pending_predictions = []

    for prediction in results:

        image = prediction.image

        pending_predictions.append(
            PendingPredictionResponse(
                prediction_id=prediction.id,

                image_id=image.id,
                file_name=image.file_name,
                file_path=image.file_path,
                content_type=image.content_type,

                predicted_class=prediction.predicted_class,
                confidence=prediction.confidence,

                black_spot_probability=(
                    prediction.black_spot_probability
                ),
                canker_probability=(
                    prediction.canker_probability
                ),
                greening_probability=(
                    prediction.greening_probability
                ),
                healthy_probability=(
                    prediction.healthy_probability
                ),
                rot_probability=(
                    prediction.rot_probability
                ),
                scab_probability=(
                    prediction.scab_probability
                ),

                created_at=prediction.created_at,
            )
        )

    return pending_predictions


# ============================================================
# CREATE REVIEW
# ============================================================

@router.post(
    "/",
    response_model=ReviewResponse,
)
def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_expert: Expert = Depends(
        get_current_expert
    ),
):
    """
    Permet à l'expert connecté de valider/corriger
    une prédiction.
    """

    # --------------------------------------------------------
    # Recherche de la prédiction
    # --------------------------------------------------------

    prediction = (
        db.query(Prediction)
        .filter(
            Prediction.id
            == review_data.prediction_id
        )
        .first()
    )

    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail="Prédiction introuvable.",
        )

    # --------------------------------------------------------
    # Vérifier si cette prédiction a déjà été vérifiée
    # par un expert
    # --------------------------------------------------------

    existing_review = (
        db.query(ExpertReview)
        .filter(
            ExpertReview.prediction_id
            == review_data.prediction_id,
            # ExpertReview.expert_id
            # == current_expert.id,
        )
        .first()
    )

    # if existing_review is not None:
    #     raise HTTPException(
    #         status_code=400,
    #         detail=(
    #             "Vous avez déjà vérifié cette prédiction."
    #         ),
    #     )

    if existing_review is not None:
        raise HTTPException(
            status_code=400,
            detail="Cette prédiction a déjà été validée par un expert.",
        )

    # --------------------------------------------------------
    # Vérifier la classe
    # --------------------------------------------------------

    verified_class = (
        review_data.verified_class.strip().lower()
    )

    allowed_classes = {
        "black_spot",
        "canker",
        "greening",
        "healthy",
        "rot",
        "scab",
    }

    if verified_class not in allowed_classes:
        raise HTTPException(
            status_code=400,
            detail=(
                "Classe invalide. "
                f"Classes acceptées : {sorted(allowed_classes)}"
            ),
        )

    # --------------------------------------------------------
    # Déterminer automatiquement si le modèle avait raison
    # --------------------------------------------------------

    is_correct = (
        verified_class
        == prediction.predicted_class.lower()
    )

    # --------------------------------------------------------
    # Création de la review
    # --------------------------------------------------------

    expert_review = ExpertReview(
        prediction_id=prediction.id,
        expert_id=current_expert.id,
        verified_class=verified_class,
        is_correct=is_correct,
        comment=review_data.comment,
    )

    db.add(expert_review)

    # --------------------------------------------------------
    # Enregistrement
    # --------------------------------------------------------

    try:

        db.commit()
        db.refresh(expert_review)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Erreur lors de l'enregistrement "
                f"de la validation : {e}"
            ),
        )

    return expert_review


# ============================================================
# GET VERIFIED REVIEWS
# ============================================================

@router.get(
    "/verified",
    response_model=list[VerifiedPredictionResponse],
)
def get_verified_reviews(
    db: Session = Depends(get_db),
    # current_expert: Expert = Depends(get_current_expert),
):
    """
    Retourne la liste des prédictions déjà vérifiées par l'expert.
    """

    results = (
        db.query(ExpertReview)
        .join(ExpertReview.prediction)
        .join(Prediction.image)
        # .filter(ExpertReview.expert_id == current_expert.id)
        .order_by(ExpertReview.reviewed_at.desc())
        .all()
    )

    verified_predictions = []

    for review in results:
        prediction = review.prediction
        image = prediction.image

        verified_predictions.append(
            VerifiedPredictionResponse(
                review_id=review.id,
                prediction_id=prediction.id,
                image_id=image.id,
                file_name=image.file_name,
                file_path=image.file_path,
                content_type=image.content_type,
                predicted_class=prediction.predicted_class,
                confidence=prediction.confidence,
                verified_class=review.verified_class,
                is_correct=review.is_correct,
                comment=review.comment,
                reviewed_at=review.reviewed_at,
            )
        )

    return verified_predictions


# ============================================================
# UPDATE REVIEW
# ============================================================

@router.put(
    "/{review_id}",
    response_model=ReviewResponse,
)
def update_review(
    review_id: int,
    review_data: ReviewUpdate,
    db: Session = Depends(get_db),
    # current_expert: Expert = Depends(get_current_expert),
):
    """
    Permet à l'expert connecté de modifier une vérification existante.
    """

    # 1. Recherche de la review
    existing_review = (
        db.query(ExpertReview)
        .filter(
            ExpertReview.id == review_id,
            # ExpertReview.expert_id == current_expert.id,
        )
        .first()
    )

    if existing_review is None:
        raise HTTPException(
            status_code=404,
            detail="Avis d'expert introuvable ou non autorisé.",
        )

    # 2. Validation de la classe fournie
    verified_class = review_data.verified_class.strip().lower()

    allowed_classes = {
        "black_spot",
        "canker",
        "greening",
        "healthy",
        "rot",
        "scab",
    }

    if verified_class not in allowed_classes:
        raise HTTPException(
            status_code=400,
            detail=(
                "Classe invalide. "
                f"Classes acceptées : {sorted(allowed_classes)}"
            ),
        )

    # 3. Récupération de la prédiction associée pour recalculer `is_correct`
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == existing_review.prediction_id)
        .first()
    )

    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail="Prédiction associée introuvable.",
        )

    # 4. Mise à jour des données
    existing_review.verified_class = verified_class
    existing_review.is_correct = (
        verified_class == prediction.predicted_class.lower()
    )
    existing_review.comment = review_data.comment

    try:
        db.commit()
        db.refresh(existing_review)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la mise à jour de la vérification : {e}",
        )

    return existing_review