import shutil
from pathlib import Path

from sqlalchemy.orm import Session

from database.connection import SessionLocal
from database.models import Image, Prediction, ExpertReview


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOADS_DIR = BASE_DIR / "uploads" / "predictions"
DATASETS_DIR = BASE_DIR / "uploads" / "datasets"

ALLOWED_CLASSES = {
    "black_spot",
    "canker",
    "greening",
    "healthy",
    "rot",
    "scab",
}


# ============================================================
# NORMALISATION DES CLASSES
# ============================================================

def normalize_class(label: str) -> str:
    """
    Normalise le nom de la classe fourni par l'expert.
    """
    return label.strip().lower().replace(" ", "_")


# ============================================================
# GENERATION DU NUMERO DE VERSION
# ============================================================

def get_next_dataset_version() -> str:
    """
    Retourne automatiquement la prochaine version du dataset.

    Exemple :
        aucun dataset       -> v1
        v1 existe            -> v2
        v1, v2 existent      -> v3
    """

    DATASETS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    existing_versions = []

    for directory in DATASETS_DIR.iterdir():

        if not directory.is_dir():
            continue

        name = directory.name

        if name.startswith("v"):
            try:
                version_number = int(name[1:])
                existing_versions.append(version_number)
            except ValueError:
                pass

    if not existing_versions:
        return "v1"

    return f"v{max(existing_versions) + 1}"


def get_latest_dataset_version():
    """
    Retourne la dernière version existante du dataset.

    Exemple :
        v1, v2, v3 -> retourne v3

    Retourne None si aucun dataset n'existe.
    """

    if not DATASETS_DIR.exists():
        return None

    existing_versions = []

    for directory in DATASETS_DIR.iterdir():

        if not directory.is_dir():
            continue

        name = directory.name

        if name.startswith("v"):
            try:
                version_number = int(name[1:])
                existing_versions.append(
                    (version_number, directory)
                )
            except ValueError:
                pass

    if not existing_versions:
        return None

    return max(existing_versions, key=lambda x: x[0])[1]


# ============================================================
# CREATION DU DOSSIER DATASET
# ============================================================

def create_dataset_directory(dataset_version: str) -> Path:
    """
    Crée l'arborescence du nouveau dataset.

    Exemple :

        uploads/datasets/
            v2/
                black_spot/
                canker/
                greening/
                healthy/
                rot/
                scab/
    """

    dataset_dir = DATASETS_DIR / dataset_version

    dataset_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    for class_name in ALLOWED_CLASSES:

        class_dir = dataset_dir / class_name

        class_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

    return dataset_dir


# ============================================================
# COPIE DU DERNIER DATASET
# ============================================================

def copy_previous_dataset(
    previous_dataset_dir: Path,
    new_dataset_dir: Path,
):
    """
    Copie intégralement le dernier dataset dans le nouveau.

    Ainsi :
        v1 + nouvelles prédictions -> v2
        v2 + nouvelles prédictions -> v3
        etc.

    Les images déjà présentes dans le dernier dataset
    sont donc conservées.
    """

    if previous_dataset_dir is None:
        print("ℹ️ Aucun dataset précédent trouvé.")
        return 0

    copied_count = 0

    print()
    print(
        f"📦 Copie du dataset précédent : "
        f"{previous_dataset_dir.name}"
    )

    for class_name in ALLOWED_CLASSES:

        source_class_dir = (
            previous_dataset_dir / class_name
        )

        destination_class_dir = (
            new_dataset_dir / class_name
        )

        if not source_class_dir.exists():
            continue

        for source_file in source_class_dir.iterdir():

            if not source_file.is_file():
                continue

            destination_file = (
                destination_class_dir
                / source_file.name
            )

            shutil.copy2(
                source_file,
                destination_file,
            )

            copied_count += 1

    print(
        f"✅ {copied_count} images copiées "
        f"depuis {previous_dataset_dir.name}"
    )

    return copied_count


# ============================================================
# RECUPERATION DES DONNEES VALIDEES
# ============================================================

def get_verified_data(
    db: Session,
):
    """
    Récupère les prédictions qui ont été vérifiées
    par l'expert.

    Une ligne correspond à :

        image + prediction + verified_class
    """

    results = (
        db.query(
            Image,
            Prediction,
            ExpertReview,
        )
        .join(
            Prediction,
            Prediction.image_id == Image.id,
        )
        .join(
            ExpertReview,
            ExpertReview.prediction_id
            == Prediction.id,
        )
        .order_by(
            ExpertReview.reviewed_at.asc()
        )
        .all()
    )

    return results


# ============================================================
# IDENTIFICATION DES NOUVELLES PREDICTIONS
# ============================================================

def get_existing_prediction_ids(
    dataset_dir: Path,
):
    """
    Recherche les IDs de prédictions déjà ajoutées
    dans les versions précédentes.

    Les images ajoutées par ce script portent le nom :

        prediction_<prediction_id>_review_<review_id>.jpg

    Cela permet d'éviter de recopier une prédiction
    déjà présente dans un dataset précédent.
    """

    existing_prediction_ids = set()

    if not dataset_dir or not dataset_dir.exists():
        return existing_prediction_ids

    for class_name in ALLOWED_CLASSES:

        class_dir = dataset_dir / class_name

        if not class_dir.exists():
            continue

        for file_path in class_dir.iterdir():

            if not file_path.is_file():
                continue

            filename = file_path.stem

            # Exemple :
            # prediction_15_review_8
            if not filename.startswith("prediction_"):
                continue

            parts = filename.split("_")

            # prediction + ID + review + ID
            if len(parts) < 4:
                continue

            try:
                prediction_id = int(parts[1])
                existing_prediction_ids.add(
                    prediction_id
                )
            except ValueError:
                continue

    return existing_prediction_ids


# ============================================================
# CONSTRUCTION DU DATASET
# ============================================================

def build_dataset(
    db: Session,
):
    """
    Construit un nouveau dataset en suivant le principe :

        nouveau dataset =
            dernier dataset
            +
            nouvelles prédictions validées

    Exemple :

        v1 = dataset initial
        v2 = v1 + nouvelles validations
        v3 = v2 + nouvelles validations
        etc.
    """

    # --------------------------------------------------------
    # Vérifier le dernier dataset
    # --------------------------------------------------------

    previous_dataset_dir = (
        get_latest_dataset_version()
    )

    # --------------------------------------------------------
    # Nouvelle version
    # --------------------------------------------------------

    dataset_version = get_next_dataset_version()

    dataset_dir = create_dataset_directory(
        dataset_version
    )

    print()
    print("=" * 70)
    print(
        f"Construction du dataset {dataset_version}"
    )
    print("=" * 70)

    # --------------------------------------------------------
    # Copier le dernier dataset
    # --------------------------------------------------------

    previous_images_count = copy_previous_dataset(
        previous_dataset_dir,
        dataset_dir,
    )

    # --------------------------------------------------------
    # Identifier les prédictions déjà présentes
    # --------------------------------------------------------

    existing_prediction_ids = (
        get_existing_prediction_ids(
            dataset_dir
        )
    )

    print(
        f"Prédictions déjà présentes : "
        f"{len(existing_prediction_ids)}"
    )

    # --------------------------------------------------------
    # Récupération des données validées
    # --------------------------------------------------------

    verified_data = get_verified_data(db)

    print(
        f"Validations trouvées dans PostgreSQL : "
        f"{len(verified_data)}"
    )

    # --------------------------------------------------------
    # Compteurs
    # --------------------------------------------------------

    class_counts = {
        class_name: 0
        for class_name in ALLOWED_CLASSES
    }

    new_predictions = 0
    skipped_images = 0
    already_present = 0

    # --------------------------------------------------------
    # Traitement des validations
    # --------------------------------------------------------

    for image, prediction, review in verified_data:

        # ----------------------------------------------------
        # Ne pas ajouter une prédiction déjà présente
        # ----------------------------------------------------

        if prediction.id in existing_prediction_ids:

            already_present += 1

            print(
                f"⏭️ Prédiction {prediction.id} "
                f"déjà présente dans le dataset."
            )

            continue

        # ----------------------------------------------------
        # Classe validée par l'expert
        # ----------------------------------------------------

        verified_class = normalize_class(
            review.verified_class
        )

        if verified_class not in ALLOWED_CLASSES:

            print(
                f"⚠️ Classe inconnue : "
                f"{review.verified_class}"
            )

            skipped_images += 1
            continue

        # ----------------------------------------------------
        # Localisation de l'image
        # ----------------------------------------------------

        image_path = Path(
            image.file_path
        )

        # Si le chemin enregistré dans PostgreSQL
        # commence par "uploads/"
        if image_path.parts[:1] == ("uploads",):

            relative_path = Path(
                *image_path.parts[1:]
            )

            source_path = (
                BASE_DIR
                / "uploads"
                / relative_path
            )

        else:

            source_path = (
                BASE_DIR
                / image_path
            )

        # ----------------------------------------------------
        # Vérifier que le fichier existe
        # ----------------------------------------------------

        if not source_path.exists():

            print(
                f"⚠️ Image introuvable : "
                f"{source_path}"
            )

            skipped_images += 1
            continue

        # ----------------------------------------------------
        # Destination
        # ----------------------------------------------------

        extension = source_path.suffix.lower()

        destination_dir = (
            dataset_dir
            / verified_class
        )

        destination_filename = (
            f"prediction_{prediction.id}"
            f"_review_{review.id}"
            f"{extension}"
        )

        destination_path = (
            destination_dir
            / destination_filename
        )

        # ----------------------------------------------------
        # Sécurité supplémentaire contre les doublons
        # ----------------------------------------------------

        if destination_path.exists():

            print(
                f"⏭️ Fichier déjà présent : "
                f"{destination_filename}"
            )

            already_present += 1
            existing_prediction_ids.add(
                prediction.id
            )

            continue

        # ----------------------------------------------------
        # Copier la nouvelle image
        # ----------------------------------------------------

        shutil.copy2(
            source_path,
            destination_path,
        )

        existing_prediction_ids.add(
            prediction.id
        )

        class_counts[
            verified_class
        ] += 1

        new_predictions += 1

        print(
            f"🆕 {source_path.name} "
            f"→ {verified_class}"
        )

    # ========================================================
    # RESULTAT
    # ========================================================

    total_images = (
        previous_images_count
        + new_predictions
    )

    print()
    print("=" * 70)
    print(
        f"Dataset {dataset_version} terminé"
    )
    print("=" * 70)

    print(
        f"Images héritées du dataset précédent : "
        f"{previous_images_count}"
    )

    print(
        f"Nouvelles prédictions ajoutées : "
        f"{new_predictions}"
    )

    print(
        f"Prédictions déjà présentes ignorées : "
        f"{already_present}"
    )

    print(
        f"Images ignorées : "
        f"{skipped_images}"
    )

    print(
        f"Total d'images dans {dataset_version} : "
        f"{total_images}"
    )

    print()
    print(
        "Nouvelles images ajoutées par classe :"
    )

    for class_name, count in sorted(
        class_counts.items()
    ):

        print(
            f"  {class_name:15} : {count}"
        )

    print()
    print(
        f"📁 Dataset : {dataset_dir}"
    )

    print()


# ============================================================
# MAIN
# ============================================================

def main():

    db = SessionLocal()

    try:

        build_dataset(db)

    except Exception as e:

        print()
        print(
            f"❌ Erreur lors de la construction "
            f"du dataset : {e}"
        )

        db.rollback()

        raise

    finally:

        db.close()


# ============================================================
# EXECUTION
# ============================================================

if __name__ == "__main__":
    main()
