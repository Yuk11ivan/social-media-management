"""
多平台账号绑定 API
"""
from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from auth.security import encrypt_secret
from platforms.models import WechatBindRequest, WechatStatusResponse
from platforms.service import get_user_wechat_api, test_wechat_credentials
from storage_mysql import storage_service
from wechat_api import WechatAPIError

router = APIRouter(prefix="/api/platforms", tags=["平台绑定"])


@router.post("/wechat/bind", response_model=WechatStatusResponse)
async def bind_wechat(
    request: WechatBindRequest,
    current_user: dict = Depends(get_current_user),
):
    """绑定微信公众号（第二层权限：AppID + AppSecret）"""
    test_wechat_credentials(request.app_id, request.app_secret)

    account = storage_service.upsert_platform_account(
        user_id=current_user["id"],
        platform="wechat",
        app_id=request.app_id,
        app_secret_enc=encrypt_secret(request.app_secret),
        account_id=request.account_id,
        account_name=request.account_name,
    )

    return WechatStatusResponse(
        bound=True,
        app_id=account["app_id"][:6] + "****",
        account_id=account.get("account_id"),
        account_name=account.get("account_name"),
        connected=True,
        message="微信公众号绑定成功",
        bound_at=account.get("created_at"),
    )


@router.get("/wechat/status", response_model=WechatStatusResponse)
async def wechat_status(current_user: dict = Depends(get_current_user)):
    """查看当前用户的微信公众号绑定状态"""
    account = storage_service.get_platform_account(current_user["id"], "wechat")
    if not account:
        return WechatStatusResponse(
            bound=False,
            connected=False,
            message="尚未绑定微信公众号",
        )

    connected = False
    message = "已绑定，待验证连接"
    try:
        api = get_user_wechat_api(current_user["id"])
        api.get_access_token()
        connected = True
        message = "微信公众号连接正常"
    except (WechatAPIError, Exception) as e:
        message = f"已绑定但连接失败: {e}"

    return WechatStatusResponse(
        bound=True,
        app_id=account["app_id"][:6] + "****",
        account_id=account.get("account_id"),
        account_name=account.get("account_name"),
        connected=connected,
        message=message,
        bound_at=account.get("created_at"),
    )


@router.post("/wechat/test")
async def test_wechat(current_user: dict = Depends(get_current_user)):
    """测试当前用户绑定的微信公众号 API 连接"""
    try:
        api = get_user_wechat_api(current_user["id"])
        token = api.get_access_token()
        return {
            "success": True,
            "message": "微信 API 连接正常",
            "token_valid": bool(token),
        }
    except WechatAPIError as e:
        return {
            "success": False,
            "message": f"微信 API 连接失败: [{e.errcode}] {e.errmsg}",
        }


@router.delete("/wechat/unbind")
async def unbind_wechat(current_user: dict = Depends(get_current_user)):
    """解绑微信公众号"""
    removed = storage_service.delete_platform_account(current_user["id"], "wechat")
    if not removed:
        return {"success": False, "message": "当前未绑定微信公众号"}
    return {"success": True, "message": "已解绑微信公众号"}
