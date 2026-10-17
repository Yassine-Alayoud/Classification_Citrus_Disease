import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# ============================================================
# Chargement des variables d'environnement
# ============================================================

load_dotenv()


# ============================================================
# Configuration PostgreSQL
# ============================================================

DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")
DB_NAME = os.getenv("POSTGRES_DB")


# URL de connexion PostgreSQL
DATABASE_URL = (
    f"postgresql+psycopg2://"
    f"{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


# ============================================================
# Engine SQLAlchemy
# ============================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


# ============================================================
# Session SQLAlchemy
# ============================================================

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ============================================================
# Base pour les modèles SQLAlchemy
# ============================================================

class Base(DeclarativeBase):
    pass


# ============================================================
# Dépendance FastAPI pour obtenir une session DB
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# Création des tables
# ============================================================

def create_tables():
    """
    Crée les tables définies dans database.models
    si elles n'existent pas encore.
    """

    # Import nécessaire pour que SQLAlchemy connaisse
    # tous les modèles avant de créer les tables.
    from database import models  # noqa: F401

    Base.metadata.create_all(bind=engine)