"""
API FastAPI pour la détection des maladies des agrumes — projet AGRIDATA Consulting.

Lancement local :
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Documentation interactive :
    http://localhost:8000/docs
"""

from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

import model_utils
from database.connection import get_db
from database.models import Image, Prediction

from routers.auth import router as auth_router
from routers.reviews import router as reviews_router


# ============================================================
# Configuration de l'application
# ============================================================

app = FastAPI(
    title="API de détection des maladies des agrumes",
    description=(
        "Upload une photo de feuille ou de fruit d'agrume pour obtenir "
        "un diagnostic (black_spot, canker, greening, healthy, rot, scab) "
        "via un modèle DenseNet-121."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

# Nécessaire pour permettre à React de communiquer avec FastAPI.
# En production, remplacer "*" par le domaine réel du frontend.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Configuration des uploads
# ============================================================

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
}

MAX_FILE_SIZE_MB = 10

# Dossier où les images seront sauvegardées
UPLOAD_DIR = Path(__file__).parent / "uploads" / "predictions"

# Création automatique du dossier s'il n'existe pas
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR.parent),
    name="uploads",
)

# ============================================================
# Chargement du modèle au démarrage
# ============================================================

@app.on_event("startup")
def preload_model():
    """
    Charge le modèle une seule fois au démarrage du serveur.

    Cela évite de recharger DenseNet-121 à chaque requête.
    """

    model_utils.get_model()
    model_utils.get_class_labels()

    print("✅ Modèle et classes chargés avec succès au démarrage.")


# ============================================================
# Route principale
# ============================================================

@app.get("/")
def root():
    return {
        "message": "API de détection des maladies des agrumes — AGRIDATA Consulting",
        "classes": model_utils.get_class_labels(),
        "docs": "/docs",
    }


# ============================================================
# Health check
# ============================================================

@app.get("/health")
def health_check():
    """
    Vérifie que le serveur et le modèle sont opérationnels.
    """

    try:
        model_utils.get_model()

        return {
            "status": "ok",
            "model_loaded": True,
        }

    except Exception as e:

        return {
            "status": "error",
            "model_loaded": False,
            "detail": str(e),
        }

# ============================================================
# Other APIs
# ============================================================

app.include_router(auth_router)
app.include_router(reviews_router)

# ============================================================
# Prediction
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Reçoit une image, effectue la prédiction avec DenseNet-121,
    sauvegarde l'image et le résultat dans PostgreSQL.

    Réponse :

    {
        "prediction_id": 1,
        "image_id": 1,
        "predicted_class": "canker",
        "confidence": 0.87,
        "probabilities": {
            "black_spot": 0.04,
            "canker": 0.87,
            ...
        }
    }
    """

    # ========================================================
    # 1. Vérification du type de fichier
    # ========================================================

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Type de fichier non supporté : {file.content_type}. "
                f"Formats acceptés : {sorted(ALLOWED_CONTENT_TYPES)}"
            ),
        )

    # ========================================================
    # 2. Lecture de l'image
    # ========================================================

    image_bytes = await file.read()

    # Vérification que le fichier n'est pas vide
    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Le fichier envoyé est vide.",
        )

    # ========================================================
    # 3. Vérification de la taille
    # ========================================================

    size_mb = len(image_bytes) / (1024 * 1024)

    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Fichier trop volumineux ({size_mb:.1f} Mo, "
                f"max {MAX_FILE_SIZE_MB} Mo)."
            ),
        )

    # ========================================================
    # 4. Prédiction avec DenseNet-121
    # ========================================================

    try:
        result = model_utils.predict(image_bytes)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la prédiction : {e}",
        )

    # ========================================================
    # 5. Génération d'un nom unique pour l'image
    # ========================================================

    # Exemple :
    # 550e8400-e29b-41d4-a716-446655440000.jpg

    extension = ".jpg"

    if file.content_type == "image/png":
        extension = ".png"

    unique_filename = f"{uuid4()}{extension}"

    image_path = UPLOAD_DIR / unique_filename

    # Chemin relatif qui sera enregistré dans PostgreSQL
    relative_image_path = (
        Path("uploads") / "predictions" / unique_filename
    )

    # ========================================================
    # 6. Sauvegarde physique de l'image
    # ========================================================

    try:
        with open(image_path, "wb") as buffer:
            buffer.write(image_bytes)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Impossible de sauvegarder l'image : {e}",
        )

    # ========================================================
    # 7. Création de l'objet Image
    # ========================================================

    db_image = Image(
        file_name=file.filename or unique_filename,
        file_path=str(relative_image_path),
        content_type=file.content_type,
        file_size=len(image_bytes),
    )

    db.add(db_image)

    # Flush pour obtenir l'ID de l'image
    # avant de créer la prédiction.
    db.flush()

    # ========================================================
    # 8. Récupération des probabilités
    # ========================================================

    probabilities = result["probabilities"]

    # ========================================================
    # 9. Création de la prédiction
    # ========================================================

    db_prediction = Prediction(
        image_id=db_image.id,

        predicted_class=result["predicted_class"],
        confidence=result["confidence"],

        black_spot_probability=probabilities["black_spot"],
        canker_probability=probabilities["canker"],
        greening_probability=probabilities["greening"],
        healthy_probability=probabilities["healthy"],
        rot_probability=probabilities["rot"],
        scab_probability=probabilities["scab"],
    )

    db.add(db_prediction)

    # ========================================================
    # 10. Enregistrement dans PostgreSQL
    # ========================================================

    try:
        db.commit()

        # Rafraîchir les objets pour récupérer les IDs générés
        db.refresh(db_image)
        db.refresh(db_prediction)

    except Exception as e:

        db.rollback()

        # Si l'enregistrement DB échoue,
        # supprimer également l'image sauvegardée.
        if image_path.exists():
            image_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'enregistrement en base de données : {e}",
        )

    # ========================================================
    # 11. Réponse envoyée à React
    # ========================================================

    return {
        "prediction_id": db_prediction.id,
        "image_id": db_image.id,
        "predicted_class": result["predicted_class"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
    }