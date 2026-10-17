from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# ============================================================
# LOGIN
# ============================================================

class LoginRequest(BaseModel):
    """
    Données envoyées par l'expert pour se connecter.
    """

    email: EmailStr
    password: str


# ============================================================
# LOGIN RESPONSE
# ============================================================

class LoginResponse(BaseModel):
    """
    Réponse retournée après une connexion réussie.
    """

    access_token: str
    token_type: str = "bearer"


# ============================================================
# EXPERT RESPONSE
# ============================================================

class ExpertResponse(BaseModel):
    """
    Informations publiques de l'expert.
    """

    id: int
    first_name: str
    last_name: str
    email: EmailStr
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# CHANGE PASSWORD
# ============================================================

class ChangePasswordRequest(BaseModel):
    """
    Données envoyées par l'expert pour modifier son mot de passe.
    """

    current_password: str = Field(
        ...,
        min_length=1,
    )

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    confirm_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )