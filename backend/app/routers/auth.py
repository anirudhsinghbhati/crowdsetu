from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.auth import LoginRequest, AuthResponse, User, CreateUserRequest
from app.services.auth_service import (
    authenticate_user,
    get_current_user,
    require_role,
    list_users,
    create_user,
    delete_user,
)

router = APIRouter(prefix="", tags=["Auth & Users"])

@router.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    return authenticate_user(req.username, req.password)

@router.get("/users", response_model=List[User])
def get_users(current_user: User = Depends(get_current_user)):
    return list_users()

@router.post("/users", response_model=User, status_code=status.HTTP_201_CREATED)
def add_user(req: CreateUserRequest, current_user: User = Depends(require_role(["admin"]))):
    return create_user(req.username, req.password, req.role, req.name)

@router.delete("/users/{username}")
def remove_user(username: str, current_user: User = Depends(require_role(["admin"]))):
    if current_user.username.lower() == username.lower():
        raise HTTPException(status_code=400, detail="Cannot delete your own user account")
    success = delete_user(username)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {username} deleted successfully"}

