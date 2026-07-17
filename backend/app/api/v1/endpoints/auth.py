from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.auth import AuthSession, RefreshToken
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.dependencies import get_current_user
from app.config import settings
from app.core.rate_limit import limiter
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import uuid
import json
from urllib.parse import quote
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Audit Logging ────────────────────────────────────────────────────────────

def _audit(event: str, email: str, *, success: bool = True, details: dict | None = None):
    extra = " | ".join(f"{k}={v}" for k, v in (details or {}).items())
    status = "OK" if success else "FAIL"
    logger.info(f"AUDIT: {event} | email={email} | {status} | {extra}")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict
    expires_in: int

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str | None = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _create_tokens(user_id: str, db: Session, session_id: str | None = None) -> tuple[str, str, str, int]:
    access_token = create_access_token(subject=user_id)
    jti = str(uuid.uuid4())
    refresh_token = create_refresh_token(subject=user_id, jti=jti)

    payload_decode = decode_token(access_token, settings.jwt_secret)
    expires_in = payload_decode["exp"]

    payload = decode_token(refresh_token, settings.jwt_refresh_secret)
    rt_record = RefreshToken(
        user_id=user_id,
        token=refresh_token,
        jti=jti,
        session_id=session_id,
        expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
    )
    db.add(rt_record)
    return access_token, refresh_token, jti, expires_in


def _create_session(user_id: str, request: Request, db: Session) -> AuthSession:
    session = AuthSession(
        user_id=user_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    db.flush()
    return session


def _build_user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "is_email_verified": user.is_email_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@router.post("/register")
@limiter.limit("3/minute")
async def register(
    request: Request,
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    if not user_in.email or not user_in.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    if len(user_in.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if db.query(User).filter(User.email == user_in.email).first():
        logger.warning(f"Registration attempt with existing email: {user_in.email}")
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        full_name=user_in.full_name,
        is_email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    ip = request.client.host if request.client else None
    _audit("Register", user.email, details={"ip": ip})

    session = _create_session(user.id, request, db)
    access_token, refresh_token, jti, expires_in = _create_tokens(user.id, db, session.id)
    db.commit()

    logger.info(f"User registered and logged in: {user.email} (id={user.id})")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _build_user_dict(user),
        "expires_in": expires_in,
    }


@router.post("/login")
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    logger.info(f"Login attempt: username={form_data.username}")

    ip = request.client.host if request.client else None
    if not form_data.username or not form_data.password:
        _audit("Login", form_data.username or "unknown", success=False, details={"reason": "missing_fields", "ip": ip})
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        _audit("Login", form_data.username, success=False, details={"reason": "not_found", "ip": ip})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.password_hash:
        _audit("Login", user.email, success=False, details={"reason": "oauth_only", "ip": ip})
        raise HTTPException(status_code=401, detail="This account uses Google Sign In. Please sign in with Google.")

    if not verify_password(form_data.password, user.password_hash):
        _audit("Login", user.email, success=False, details={"reason": "wrong_password", "ip": ip})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    session = _create_session(user.id, request, db)
    access_token, refresh_token, jti, expires_in = _create_tokens(user.id, db, session.id)
    db.commit()

    _audit("Login", user.email, details={"ip": ip})
    logger.info(f"Login successful: {user.email} (id={user.id})")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _build_user_dict(user),
        "expires_in": expires_in,
    }


@router.post("/refresh")
def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    if not req.refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token is required")

    try:
        payload = decode_token(req.refresh_token, settings.jwt_refresh_secret)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
    except ValueError as e:
        logger.warning(f"Token refresh failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))

    jti = payload.get("jti")
    user_id = payload.get("sub")
    if not jti or not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    rt_record = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if not rt_record or rt_record.is_revoked:
        logger.warning(f"Token refresh failed: token revoked or not found (jti={jti})")
        raise HTTPException(status_code=401, detail="Refresh token revoked or invalid")

    rt_record.is_revoked = True

    access_token = create_access_token(subject=user_id)
    new_jti = str(uuid.uuid4())
    new_refresh_token = create_refresh_token(subject=user_id, jti=new_jti)

    payload_new = decode_token(new_refresh_token, settings.jwt_refresh_secret)
    new_rt_record = RefreshToken(
        user_id=user_id,
        token=new_refresh_token,
        jti=new_jti,
        session_id=rt_record.session_id,
        expires_at=datetime.fromtimestamp(payload_new["exp"], tz=timezone.utc),
    )
    db.add(new_rt_record)
    db.commit()

    access_payload = decode_token(access_token, settings.jwt_secret)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": access_payload["exp"],
    }


@router.post("/logout")
def logout(
    request: Request,
    req: LogoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip = request.client.host if request.client else None
    session_id = None

    if req.refresh_token:
        try:
            payload = decode_token(req.refresh_token, settings.jwt_refresh_secret)
            jti = payload.get("jti")
            if jti:
                rt_record = db.query(RefreshToken).filter(
                    RefreshToken.jti == jti,
                    RefreshToken.user_id == current_user.id,
                ).first()
                if rt_record:
                    rt_record.is_revoked = True
                    session_id = rt_record.session_id
        except Exception as e:
            logger.warning(f"Logout: could not decode refresh token: {e}")

    if session_id:
        db.query(AuthSession).filter(
            AuthSession.id == session_id,
            AuthSession.user_id == current_user.id,
        ).update({"is_active": False})
    else:
        db.query(AuthSession).filter(
            AuthSession.user_id == current_user.id,
            AuthSession.is_active == True,
        ).update({"is_active": False})

    _audit("Logout", current_user.email, details={"session_id": session_id, "ip": ip})
    db.commit()
    return {"msg": "Logged out successfully"}


@router.post("/logout-all")
def logout_all(
    request: Request,
    req: LogoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip = request.client.host if request.client else None

    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.is_revoked == False,
    ).update({"is_revoked": True})

    db.query(AuthSession).filter(
        AuthSession.user_id == current_user.id,
        AuthSession.is_active == True,
    ).update({"is_active": False})

    _audit("Logout All", current_user.email, details={"ip": ip})
    db.commit()
    return {"msg": "Logged out from all devices"}


# ─── OAuth ────────────────────────────────────────────────────────────────────

@router.get("/login/google")
async def google_login(request: Request):
    from app.core.oauth import oauth
    client = oauth.create_client("google")
    if not client:
        raise HTTPException(status_code=400, detail="Google Sign In is not configured on the server")

    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/auth/google/callback"
    logger.info(f"Google OAuth login: authorization_url will be built by authlib")
    logger.info(f"Google OAuth login: redirect_uri={redirect_uri}")
    logger.info(f"Google OAuth login: client_id={settings.google_client_id[:20]}...")
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/callback/google")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    from app.core.oauth import oauth
    client = oauth.create_client("google")
    if not client:
        raise HTTPException(status_code=400, detail="Google Sign In not configured")

    frontend_url = settings.cors_origin_list[0] if settings.cors_origin_list else "http://localhost:5173"
    logger.info(f"Google OAuth callback: received, redirecting to frontend at {frontend_url}")

    try:
        logger.info("Google OAuth callback: exchanging authorization code for tokens...")
        token = await client.authorize_access_token(request)
        logger.info("Google OAuth callback: token exchange successful")

        userinfo = token.get("userinfo")
        if not userinfo:
            logger.info("Google OAuth callback: no userinfo in token, trying parse_id_token...")
            userinfo = await client.parse_id_token(request, token)
            logger.info("Google OAuth callback: parse_id_token successful")

        email = userinfo.get("email") if userinfo else token.get("email")
        name = userinfo.get("name") if userinfo else token.get("name", "Google User")

        if not email:
            logger.error("Google OAuth: could not retrieve email")
            return RedirectResponse(url=f"{frontend_url}/login?error=Could not retrieve email from Google")

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

    ip = request.client.host if request.client else None
    user = db.query(User).filter(User.email == email).first()
    is_new = False

    if not user:
        user = User(
            email=email,
            password_hash=None,
            full_name=name,
            is_email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new = True
        logger.info(f"Google OAuth: new user created: {email}")
    else:
        user.is_email_verified = True
        if name and not user.full_name:
            user.full_name = name
        logger.info(f"Google OAuth: existing user logged in: {email}")

    _audit("Google Login", email, details={"new_user": str(is_new), "ip": ip})

    session = _create_session(user.id, request, db)
    access_token, refresh_token, jti, expires_in = _create_tokens(user.id, db, session.id)
    db.commit()

    params = (
        f"access_token={access_token}"
        f"&refresh_token={refresh_token}"
        f"&token_type=bearer"
        f"&expires_in={expires_in}"
        f"&user={quote(json.dumps(_build_user_dict(user)))}"
    )
    logger.info(f"Google OAuth callback: redirecting to frontend at {frontend_url}/auth/callback")
    return RedirectResponse(url=f"{frontend_url}/auth/callback#{params}")


# ─── User Profile ─────────────────────────────────────────────────────────────

@router.get("/me")
def get_profile(current_user: User = Depends(get_current_user)):
    return _build_user_dict(current_user)


@router.get("/sessions")
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(AuthSession).filter(
        AuthSession.user_id == current_user.id,
    ).order_by(AuthSession.last_active_at.desc()).limit(20).all()

    return [
        {
            "id": s.id,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_active_at": s.last_active_at.isoformat() if s.last_active_at else None,
        }
        for s in sessions
    ]
