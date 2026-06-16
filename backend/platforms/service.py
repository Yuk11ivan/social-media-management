"""
平台绑定业务逻辑
"""
from fastapi import HTTPException

from auth.security import decrypt_secret
from storage_mysql import storage_service
from wechat_api import WechatAPI, WechatAPIError


def get_user_wechat_api(user_id: str) -> WechatAPI:
    account = storage_service.get_platform_account(user_id, "wechat")
    if not account:
        raise HTTPException(status_code=400, detail="请先绑定微信公众号 AppID 和 AppSecret")

    secret = decrypt_secret(account["app_secret_enc"])
    return WechatAPI(app_id=account["app_id"], app_secret=secret)


def test_wechat_credentials(app_id: str, app_secret: str) -> None:
    api = WechatAPI(app_id=app_id, app_secret=app_secret)
    try:
        api.get_access_token()
    except WechatAPIError as e:
        raise HTTPException(
            status_code=400,
            detail=f"微信公众号凭证验证失败: [{e.errcode}] {e.errmsg}",
        )
