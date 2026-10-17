"""
model_utils.py
==============
Chargement du modèle et logique de prédiction, séparés de l'API elle-même
pour rester faciles à tester indépendamment.

⚠️ Point critique : DenseNet-121 attend un pré-traitement spécifique
(normalisation + standardisation selon les statistiques ImageNet), appliqué via
`tensorflow.keras.applications.densenet.preprocess_input`. C'est la même
fonction utilisée pendant l'entraînement (voir le notebook, section
"Comparaison avec DenseNet-121") — il ne faut surtout pas la remplacer par un
simple `/255.0`, sinon le modèle se comporte comme lors du bug rencontré
avec EfficientNetB0 (prédictions incohérentes, quasi aléatoires).
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from tensorflow.keras.applications.densenet import preprocess_input
from tensorflow.keras.models import load_model


MODEL_PATH = Path(__file__).parent / "models/densenet121_v1.keras"
CLASS_LABELS_PATH = Path(__file__).parent / "class_labels.json"
IMG_SIZE = (224, 224)

# Ordre alphabétique par défaut, identique à celui produit par
# flow_from_directory pendant l'entraînement (voir le notebook). Écrasé
# automatiquement si class_labels.json est présent à côté de ce fichier.
DEFAULT_CLASS_LABELS = ["black_spot", "canker", "greening", "healthy", "rot", "scab"]

_model = None
_class_labels = None


def load_class_labels() -> list[str]:
    """Charge l'ordre des classes depuis class_labels.json si présent,
    sinon retombe sur l'ordre alphabétique par défaut (6 classes du projet)."""
    if CLASS_LABELS_PATH.exists():
        with open(CLASS_LABELS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return DEFAULT_CLASS_LABELS


def get_model():
    """Charge le modèle une seule fois (singleton) — le rechargement à
    chaque requête serait beaucoup trop lent pour un usage réel."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Modèle introuvable : {MODEL_PATH}. "
                "Copie ton fichier best_densenet121.keras entraîné dans le dossier api/."
            )
        _model = load_model(MODEL_PATH)
    return _model


def get_class_labels() -> list[str]:
    global _class_labels
    if _class_labels is None:
        _class_labels = load_class_labels()
    return _class_labels


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Convertit des bytes d'image uploadée en tenseur prêt pour DenseNet-121."""
    image = Image.open(io_bytes(image_bytes)).convert("RGB")
    image = image.resize(IMG_SIZE, Image.BILINEAR)
    array = np.array(image, dtype=np.float32)
    array = np.expand_dims(array, axis=0)  # (1, 224, 224, 3)
    array = preprocess_input(array)        # pré-traitement officiel DenseNet-121
    return array


def io_bytes(data: bytes):
    import io
    return io.BytesIO(data)


def predict(image_bytes: bytes) -> dict:
    """Retourne un diagnostic complet : classe prédite, confiance,
    et probabilités détaillées pour chaque classe."""
    model = get_model()
    class_labels = get_class_labels()

    x = preprocess_image(image_bytes)
    probs = model.predict(x, verbose=0)[0]  # shape (num_classes,)

    predicted_idx = int(np.argmax(probs))
    return {
        "predicted_class": class_labels[predicted_idx],
        "confidence": float(probs[predicted_idx]),
        "probabilities": {
            class_labels[i]: float(probs[i]) for i in range(len(class_labels))
        },
    }
