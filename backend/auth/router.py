"""
用户注册与登录 API
"""
from fastapi import APIRouter, HTTPException, Depends

from .models import (
    UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse,
    UpdateProfileRequest, ChangePasswordRequest,
)
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


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """修改个人资料（昵称、手机号）"""
    updates = {}
    if request.nickname is not None:
        updates["nickname"] = request.nickname
    if request.phone is not None:
        if request.phone and storage_service.get_user_by_phone(request.phone):
            existing = storage_service.get_user_by_phone(request.phone)
            if existing and existing["id"] != current_user["id"]:
                raise HTTPException(status_code=400, detail="该手机号已被其他账号使用")
        updates["phone"] = request.phone
    if not updates:
        raise HTTPException(status_code=400, detail="未提供任何修改内容")

    user = storage_service.update_user(current_user["id"], **updates)
    return UserResponse(
        id=user["id"],
        email=user["email"],
        nickname=user.get("nickname"),
        phone=user.get("phone"),
        created_at=user["created_at"],
    )


@router.put("/password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """修改密码"""
    if not verify_password(request.old_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="原密码错误")
    storage_service.update_user(current_user["id"], password_hash=hash_password(request.new_password))
    return {"message": "密码修改成功"}
