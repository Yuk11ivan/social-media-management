"""
用户注册与登录 API
"""
from fastapi import APIRouter, HTTPException, Depends

from .models import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse
from .security import hash_password, verify_password, create_access_token
from .dependencies import get_current_user
from storage_mysql import storage_service

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=TokenResponse)
async def register(request: UserRegisterRequest):
    """平台用户注册"""
    if storage_service.get_user_by_email(request.email):
        raise HTTPException(status_code=400, detail="该邮箱已注册")

    if request.phone and storage_service.get_user_by_phone(request.phone):
        raise HTTPException(status_code=400, detail="该手机号已注册")

    user = storage_service.create_user(
        email=request.email,
        password_hash=hash_password(request.password),
        nickname=request.nickname or request.email.split("@")[0],
        phone=request.phone,
    )

    token = create_access_token(user["id"], user["email"])
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLoginRequest):
    """平台用户登录"""
    user = storage_service.get_user_by_email(request.email)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="邮箱或密码错误")

    if user.get("status") != 1:
        raise HTTPException(status_code=403, detail="账号已被禁用")

    token = create_access_token(user["id"], user["email"])
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        nickname=current_user.get("nickname"),
        phone=current_user.get("phone"),
        created_at=current_user["created_at"],
    )
