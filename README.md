# 🍊 La Classification des Maladies des Agrumes

Système de détection et classification des maladies des agrumes par computer vision, développé dans le cadre d'un stage chez **Agridata Consulting**. Le projet couvre l'ensemble du pipeline : préparation des données, entraînement du modèle, API backend et interface web experte (« carnet de terrain »).

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Modèle de Machine Learning](#-modèle-de-machine-learning)
- [Stack technique](#-stack-technique)
- [Installation](#-installation)
- [Utilisation](#-utilisation)
- [MLOps](#-mlops)
- [Structure du projet](#-structure-du-projet)

## 🔎 Aperçu

L'application permet de diagnostiquer automatiquement l'état sanitaire des feuilles d'agrumes à partir d'images, avec une interface dédiée permettant à des experts de valider ou corriger les prédictions du modèle afin d'améliorer continuellement sa performance.

**Classes détectées (6) :**
- `healthy` (saine)
- `scab` (gale)
- `greening` (verdissement / HLB)
- `canker` (chancre)
- `rot` (pourriture)
- `black_spot` (tache noire)

## ✨ Fonctionnalités

- 📸 Upload d'images de feuilles d'agrumes pour diagnostic automatique
- 🧠 Prédiction avec score de confiance par classe
- 🚨 Détection *out-of-distribution* (OOD) — identifie les images qui ne correspondent à aucune classe connue
- 👨‍🔬 Dashboard expert pour valider/corriger les prédictions (`ValidationView`)
- 🔐 Authentification JWT
- 📊 Suivi des versions de modèles et des runs d'entraînement
- 🔁 Ré-entraînement automatisé du modèle à partir des retours experts (MLOps)

## 🏗️ Architecture

```
Frontend (React/TypeScript)  ──►  Backend API (FastAPI)  ──►  PostgreSQL
                                        │
                                        ├── Stockage local (uploads/)
                                        ├── Modèle de classification (.keras)
                                        └── Pipeline MLOps (MLflow)
```

- **Frontend** : interface multi-vues (Dashboard, Validation des prédictions, Paramètres)
- **Backend** : API REST FastAPI avec authentification JWT, stockage de fichiers local basé sur UUID
- **Base de données** : PostgreSQL via SQLAlchemy — modèles `Image`, `Prediction`, `ExpertReview`, `ModelVersion`, `TrainingRun`

## 🤖 Modèle de Machine Learning

Plusieurs architectures ont été comparées :

| Modèle | Statut | Test accuracy |
|---|---|---|
| ResNet50 | Testé | 89.07% |
| MobileNetV2 | Testé | 87.04% |
| EfficientNetB0 | Testé | 89.88% |
| DenseNet-121 | ✅ Modèle de production (Il a atteint la plus haute accuracy parmi les 4 algorithmes) | 92.71% |

## 🛠️ Stack technique

- **Frontend** : React, TypeScript
- **Backend** : FastAPI, SQLAlchemy, PostgreSQL
- **ML** : TensorFlow/Keras (DenseNet-121)
- **MLOps** : MLflow
- **Auth** : JWT

## ⚙️ Installation

### Prérequis
- Python 3.10+
- Node.js 18+
- PostgreSQL

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sous Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Définir la variable d'environnement `VITE_API_URL` pointant vers l'URL de l'API backend.

## 🚀 Utilisation

1. Lancer le backend et le frontend
2. Se connecter au dashboard
3. Uploader une image de feuille d'agrume via la page de diagnostic
4. Consulter la prédiction et le score de confiance
5. Les experts valident ou corrigent les prédictions via la vue **Validation des prédictions**

## 🔁 MLOps

Le dossier `backend/mlops/` automatise le cycle de ré-entraînement :

- `dataset_builder.py` — construit un nouveau dataset versionné (v1, v2...) à partir des retours experts validés
- `train_mlflow.ipynb` — entraîne DenseNet-121 sur le dernier dataset, log les paramètres/métriques/artefacts dans MLflow
- `evaluate_mlflow.ipynb` — évalue le nouveau modèle face au modèle de production sur le même jeu de test, et le promeut s'il obtient un meilleur F1-score

Les modèles sont stockés dans `backend/models/`.

## 📁 Structure du projet

```
.
├── backend/
│   ├── models/              # Modèles entraînés (.keras)
│   ├── mlops/                # Pipeline MLOps (MLflow)
│   ├── routers/               # Endpoints FastAPI (predict, reviews, ...)
│   ├── schemas/                # Schémas Pydantic
│   ├── uploads/                 # Stockage local des images / datasets
│	├── main.py                   # le script principal du backend
│   ├── model_utils.py             # le script du téléchargement du modèle
│   └── requirements.txt            # le fichier de bibliothèques python nécessaires pour le projet
│
├── frontend/
│    └── src/
│        └── components/           # Dashboard, ValidationView, Paramètres, ...
│
├── mlops.yml                      # GitHub Actions pour automatiser le pipeline de ré-entraînement
└── README.md                      # Ce fichier
```

---

*Projet développé dans le cadre du stage PFA chez Agridata Consulting.*
