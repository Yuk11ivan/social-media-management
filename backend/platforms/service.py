"""
平台绑定业务逻辑
"""
from pathlib import Path

from fastapi import HTTPException

from ..auth.security import decrypt_secret, encrypt_secret
from ..config import WEIBO_PROFILES_DIR
from ..publishers.weibo_publisher import (
    check_runtime,
    get_default_profile_dir,
    open_login_browser,
    profile_has_session,
    resolve_profile_dir,
)
from ..storage_mysql import storage_service
from ..wechat_api import WechatAPI, WechatAPIError


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


def get_user_weibo_profile_dir(user_id: str) -> Path:
    account = storage_service.get_platform_account(user_id, "weibo")
    if not account:
        raise HTTPException(status_code=400, detail="请先绑定微博账号")

    stored = decrypt_secret(account["app_secret_enc"])
    return resolve_profile_dir(user_id, stored)


def bind_weibo_account(user_id: str, account_name: str = None, profile_dir: str = None) -> dict:
    if profile_dir:
        profile_path = Path(profile_dir)
        if not profile_path.is_absolute():
            profile_path = Path(__file__).resolve().parent.parent / profile_path
    else:
        profile_path = get_default_profile_dir(user_id)
    profile_path = profile_path.resolve()
    profile_path.mkdir(parents=True, exist_ok=True)
    WEIBO_PROFILES_DIR.mkdir(parents=True, exist_ok=True)

    return storage_service.upsert_platform_account(
        user_id=user_id,
        platform="weibo",
        app_id="weibo",
        app_secret_enc=encrypt_secret(str(profile_path)),
        account_name=account_name,
    )


def get_weibo_status_data(user_id: str) -> dict:
    account = storage_service.get_platform_account(user_id, "weibo")
    runtime = check_runtime()

    if not account:
        return {
            "bound": False,
            "connected": False,
            "chrome_ready": runtime["chrome_ready"],
            "bun_ready": runtime["bun_ready"],
            "message": "尚未绑定微博",
        }

    profile_dir = resolve_profile_dir(user_id, decrypt_secret(account["app_secret_enc"]))
    connected = profile_has_session(profile_dir)
    masked = str(profile_dir)
    if len(masked) > 20:
        masked = masked[:8] + "****" + masked[-8:]

    message = "微博已绑定，登录态正常" if connected else "微博已绑定，请打开浏览器完成首次登录"
    return {
        "bound": True,
        "account_name": account.get("account_name"),
        "profile_dir": masked,
        "connected": connected,
        "chrome_ready": runtime["chrome_ready"],
        "bun_ready": runtime["bun_ready"],
        "message": message,
        "bound_at": account.get("created_at"),
    }


def open_weibo_login(user_id: str) -> None:
    profile_dir = get_user_weibo_profile_dir(user_id)
    open_login_browser(profile_dir)


# ========== 小红书绑定服务 ==========

from ..config import XHS_PROFILES_DIR
from ..publishers.xiaohongshu_publisher import (
    check_runtime as xhs_check_runtime,
    get_default_profile_dir as xhs_get_default_profile_dir,
    open_login_browser as xhs_open_login_browser,
    profile_has_session as xhs_profile_has_session,
    resolve_profile_dir as xhs_resolve_profile_dir,
)


def get_user_xiaohongshu_profile_dir(user_id: str) -> Path:
    """获取用户的小红书 Chrome Profile 目录"""
    account = storage_service.get_platform_account(user_id, "xiaohongshu")
    if not account:
        raise HTTPException(status_code=400, detail="请先绑定小红书账号")

    stored = decrypt_secret(account["app_secret_enc"])
    return xhs_resolve_profile_dir(user_id, stored)


def bind_xiaohongshu_account(user_id: str, account_name: str = None, profile_dir: str = None) -> dict:
    """绑定小红书账号（创建 Chrome Profile 目录）"""
    if profile_dir:
        profile_path = Path(profile_dir)
        if not profile_path.is_absolute():
            profile_path = Path(__file__).resolve().parent.parent / profile_dir
    else:
        profile_path = xhs_get_default_profile_dir(user_id)
    profile_path = profile_path.resolve()
    profile_path.mkdir(parents=True, exist_ok=True)
    XHS_PROFILES_DIR.mkdir(parents=True, exist_ok=True)

    return storage_service.upsert_platform_account(
        user_id=user_id,
        platform="xiaohongshu",
        app_id="xiaohongshu",
        app_secret_enc=encrypt_secret(str(profile_path)),
        account_name=account_name,
    )


def get_xiaohongshu_status_data(user_id: str) -> dict:
    """获取小红书绑定状态与运行环境信息"""
    account = storage_service.get_platform_account(user_id, "xiaohongshu")
    runtime = xhs_check_runtime()

    if not account:
        return {
            "bound": False,
            "connected": False,
            "chrome_ready": runtime["chrome_ready"],
            "bun_ready": runtime["bun_ready"],
            "deps_ready": runtime["deps_ready"],
            "message": "尚未绑定小红书",
        }

    profile_dir = xhs_resolve_profile_dir(user_id, decrypt_secret(account["app_secret_enc"]))
    connected = xhs_profile_has_session(profile_dir)
    masked = str(profile_dir)
    if len(masked) > 20:
        masked = masked[:8] + "****" + masked[-8:]

    message = "小红书已绑定，登录态正常" if connected else "小红书已绑定，请打开浏览器完成首次登录"
    return {
        "bound": True,
        "account_name": account.get("account_name"),
        "profile_dir": masked,
        "connected": connected,
        "chrome_ready": runtime["chrome_ready"],
        "bun_ready": runtime["bun_ready"],
        "deps_ready": runtime["deps_ready"],
        "message": message,
        "bound_at": account.get("created_at"),
    }


def open_xiaohongshu_login(user_id: str) -> None:
    """打开 Chrome 浏览器供用户登录小红书"""
    profile_dir = get_user_xiaohongshu_profile_dir(user_id)
    xhs_open_login_browser(profile_dir)
