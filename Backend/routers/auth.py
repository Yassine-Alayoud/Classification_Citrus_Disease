import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Expert
from schemas.auth import (
    ExpertResponse,
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
)


# ============================================================
# Configuration
# ============================================================

load_dotenv()

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
    )
)


# ============================================================
# Router
# ============================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# Password hashing
# ============================================================

password_hash = PasswordHash((BcryptHasher(),))

# ============================================================
# OAuth2
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


# ============================================================
# Password utilities
# ============================================================

def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """
    Vérifie si le mot de passe fourni correspond
    au hash stocké dans PostgreSQL.
    """
    # Safely truncate to maximum 72 bytes
    # truncated = plain_password.encode("utf-8")[:72]

    return password_hash.verify(
        plain_password,
        hashed_password,
    )


def get_password_hash(password: str) -> str:
    """
    Transforme un mot de passe en hash sécurisé.
    """
    # truncated = password.encode("utf-8")[:72]

    return password_hash.hash(password)


# ============================================================
# JWT
# ============================================================

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Crée un JWT contenant les informations nécessaires
    à l'authentification de l'expert.
    """

    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = (
            datetime.now(timezone.utc)
            + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

    to_encode.update(
        {
            "exp": expire,
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    return encoded_jwt


# ============================================================
# Authenticate expert
# ============================================================

def authenticate_expert(
    db: Session,
    email: str,
    password: str,
):
    """
    Recherche l'expert et vérifie son mot de passe.
    """

    expert = (
        db.query(Expert)
        .filter(Expert.email == email)
        .first()
    )

    if expert is None:
        return None

    if not verify_password(
        password,
        expert.password_hash,
    ):
        return None

    if not expert.is_active:
        return None

    return expert


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authentifie un expert et retourne un JWT.
    """

    expert = authenticate_expert(
        db=db,
        email=credentials.email,
        password=credentials.password,
    )

    if expert is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    access_token = create_access_token(
        data={
            "sub": str(expert.id),
            "email": expert.email,
        }
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
    )


# ============================================================
# GET CURRENT EXPERT
# ============================================================

def get_current_expert(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Expert:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré.",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        expert_id = payload.get("sub")

        if expert_id is None:
            raise credentials_exception

        expert_id = int(expert_id)

    except (JWTError, ValueError):
        raise credentials_exception

    expert = (
        db.query(Expert)
        .filter(Expert.id == expert_id)
        .first()
    )

    if expert is None:
        raise credentials_exception

    if not expert.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte expert est désactivé.",
        )

    return expert


# ============================================================
# CURRENT EXPERT
# ============================================================

@router.get(
    "/me",
    response_model=ExpertResponse,
)
def get_me(
    current_expert: Expert = Depends(
        get_current_expert
    ),
):
    """
    Retourne les informations de l'expert connecté.
    """

    return current_expert


# ============================================================
# CHANGE PASSWORD
# ============================================================

@router.put(
    "/change-password",
)
def change_password(
    password_data: ChangePasswordRequest,
    current_expert: Expert = Depends(
        get_current_expert
    ),
    db: Session = Depends(get_db),
):
    """
    Permet à l'expert connecté de modifier son mot de passe.

    L'expert doit fournir :
    - son mot de passe actuel
    - son nouveau mot de passe
    - la confirmation du nouveau mot de passe
    """

    # --------------------------------------------------------
    # 1. Vérifier le mot de passe actuel
    # --------------------------------------------------------

    if not verify_password(
        password_data.current_password,
        current_expert.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe actuel est incorrect.",
        )

    # --------------------------------------------------------
    # 2. Vérifier la confirmation du nouveau mot de passe
    # --------------------------------------------------------

    if (
        password_data.new_password
        != password_data.confirm_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Le nouveau mot de passe et sa confirmation "
                "ne correspondent pas."
            ),
        )

    # --------------------------------------------------------
    # 3. Vérifier que le nouveau mot de passe est différent
    # --------------------------------------------------------

    if verify_password(
        password_data.new_password,
        current_expert.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Le nouveau mot de passe doit être différent "
                "du mot de passe actuel."
            ),
        )

    # --------------------------------------------------------
    # 4. Hasher le nouveau mot de passe
    # --------------------------------------------------------

    new_password_hash = get_password_hash(
        password_data.new_password
    )

    # --------------------------------------------------------
    # 5. Mettre à jour le mot de passe
    # --------------------------------------------------------

    current_expert.password_hash = new_password_hash

    # --------------------------------------------------------
    # 6. Sauvegarder dans PostgreSQL
    # --------------------------------------------------------

    try:
        db.commit()

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Erreur lors de la modification "
                f"du mot de passe : {e}"
            ),
        )

    return {
        "message": "Mot de passe modifié avec succès."
    }