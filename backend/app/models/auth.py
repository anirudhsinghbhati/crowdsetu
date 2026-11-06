from typing import Optional, Literal
from pydantic import BaseModel, Field

UserRole = Literal["admin", "operator", "viewer"]

class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    role: UserRole
    username: str

class User(BaseModel):
    username: str
    role: UserRole
    name: Optional[str] = None
    lastLogin: Optional[str] = None

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: UserRole = "operator"
    name: Optional[str] = None

