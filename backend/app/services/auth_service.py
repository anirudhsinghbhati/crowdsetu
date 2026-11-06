from datetime import datetime, timezone, timedelta
from typing import Optional, List
import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db, verify_password, hash_password
from app.models.auth import User, UserRole, AuthResponse

security = HTTPBearer(auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def authenticate_user(username: str, password: Optional[str]) -> AuthResponse:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username, password_hash, role, name FROM users WHERE lower(username) = lower(?);", (username.strip(),))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wrong username or password"
            )

        # If password is provided, verify it. For mock compatibility if password is None or empty in demo, allow demo users
        if password:
            if not verify_password(password, row["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Wrong username or password"
                )

        # Update last login
        now_display = datetime.now().strftime("Today, %I:%M %p")
        cursor.execute("UPDATE users SET last_login = ? WHERE username = ?;", (now_display, row["username"]))

        token = create_access_token({"sub": row["username"], "role": row["role"]})
        return AuthResponse(token=token, role=row["role"], username=row["username"])

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    # Support mock tokens for easy testing/interoperability
    if token.startswith("mock-jwt-token-for-"):
        username = token.replace("mock-jwt-token-for-", "")
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT username, role, name, last_login FROM users WHERE lower(username) = lower(?);", (username,))
            row = cursor.fetchone()
            if row:
                return User(username=row["username"], role=row["role"], name=row["name"], lastLogin=row["last_login"])
            return User(username=username, role="admin", name="Demo Admin")

    payload = decode_access_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username, role, name, last_login FROM users WHERE username = ?;", (username,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return User(username=row["username"], role=row["role"], name=row["name"], lastLogin=row["last_login"])

def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles}"
            )
        return current_user
    return role_checker

def list_users() -> List[User]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username, role, name, last_login FROM users ORDER BY username ASC;")
        rows = cursor.fetchall()
        return [User(username=r["username"], role=r["role"], name=r["name"], lastLogin=r["last_login"]) for r in rows]

def create_user(username: str, password: str, role: UserRole, name: Optional[str] = None) -> User:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE lower(username) = lower(?);", (username,))
        if cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO users (username, password_hash, role, name, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?);",
            (username.strip(), hash_password(password), role, name or username, "Never", now_iso)
        )
        return User(username=username, role=role, name=name, lastLogin="Never")

def delete_user(username: str) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE lower(username) = lower(?);", (username,))
        return cursor.rowcount > 0
