"""
多平台账号绑定 API
"""
from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from auth.security import encrypt_secret
from .models import (
    WechatBindRequest,
    WechatStatusResponse,
    WeiboBindRequest,
    WeiboStatusResponse,
)
from .service import (
    bind_weibo_account,
    get_user_wechat_api,
    get_weibo_status_data,
    open_weibo_login,
    test_wechat_credentials,
)
from publishers.weibo_publisher import check_runtime
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


@router.post("/weibo/bind", response_model=WeiboStatusResponse)
async def bind_weibo(
    request: WeiboBindRequest,
    current_user: dict = Depends(get_current_user),
):
    """绑定微博（Chrome Profile 登录态）"""
    bind_weibo_account(
        user_id=current_user["id"],
        account_name=request.account_name,
        profile_dir=request.profile_dir,
    )
    data = get_weibo_status_data(current_user["id"])
    data["message"] = "微博绑定成功，请打开浏览器完成登录"
    return WeiboStatusResponse(**data)


@router.get("/weibo/status", response_model=WeiboStatusResponse)
async def weibo_status(current_user: dict = Depends(get_current_user)):
    """查看当前用户的微博绑定状态"""
    return WeiboStatusResponse(**get_weibo_status_data(current_user["id"]))


@router.post("/weibo/test")
async def test_weibo(current_user: dict = Depends(get_current_user)):
    """测试微博运行环境与登录态"""
    data = get_weibo_status_data(current_user["id"])
    if not data["bound"]:
        return {"success": False, "message": "尚未绑定微博"}

    issues = []
    runtime = check_runtime()
    if not data["bun_ready"]:
        issues.append("未找到 bun/npx 运行时")
    if not data["chrome_ready"]:
        issues.append("未找到 Chrome 浏览器")
    if not runtime.get("deps_ready"):
        issues.append("微博脚本依赖未安装，请联系管理员执行 npm install")
    if not data["connected"]:
        issues.append("Chrome Profile 中未检测到微博登录态，请先打开浏览器登录")

    if issues:
        return {"success": False, "message": "；".join(issues)}

    return {"success": True, "message": "微博环境正常，登录态有效"}


@router.post("/weibo/open-login")
async def weibo_open_login(current_user: dict = Depends(get_current_user)):
    """打开 Chrome 供用户登录微博（首次绑定或 session 过期时）"""
    account = storage_service.get_platform_account(current_user["id"], "weibo")
    if not account:
        return {"success": False, "message": "请先绑定微博"}

    try:
        open_weibo_login(current_user["id"])
        return {
            "success": True,
            "message": "已打开 Chrome，请在浏览器中登录微博后关闭窗口",
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.delete("/weibo/unbind")
async def unbind_weibo(current_user: dict = Depends(get_current_user)):
    """解绑微博"""
    removed = storage_service.delete_platform_account(current_user["id"], "weibo")
    if not removed:
        return {"success": False, "message": "当前未绑定微博"}
    return {"success": True, "message": "已解绑微博"}


# ========== 小红书 平台绑定 ==========

from .models import XiaohongshuBindRequest, XiaohongshuStatusResponse
from .service import (
    bind_xiaohongshu_account,
    get_xiaohongshu_status_data,
    open_xiaohongshu_login,
)
from publishers.xiaohongshu_publisher import check_runtime as xhs_check_runtime


@router.post("/xiaohongshu/bind", response_model=XiaohongshuStatusResponse)
async def bind_xiaohongshu(
    request: XiaohongshuBindRequest,
    current_user: dict = Depends(get_current_user),
):
    """绑定小红书（创建 Chrome Profile 用于浏览器自动化登录）"""
    account = bind_xiaohongshu_account(
        user_id=current_user["id"],
        account_name=request.account_name,
        profile_dir=request.profile_dir,
    )

    data = get_xiaohongshu_status_data(current_user["id"])
    data["message"] = "小红书绑定成功，请打开浏览器完成扫码/手机验证登录"
    return XiaohongshuStatusResponse(**data)


@router.get("/xiaohongshu/status", response_model=XiaohongshuStatusResponse)
async def xiaohongshu_status(current_user: dict = Depends(get_current_user)):
    """查看当前用户的小红书绑定状态"""
    return XiaohongshuStatusResponse(**get_xiaohongshu_status_data(current_user["id"]))


@router.post("/xiaohongshu/test")
async def test_xiaohongshu(current_user: dict = Depends(get_current_user)):
    """测试小红书运行环境与登录态"""
    data = get_xiaohongshu_status_data(current_user["id"])
    if not data["bound"]:
        return {"success": False, "message": "尚未绑定小红书"}

    issues = []
    if not data["chrome_ready"]:
        issues.append("未找到 Chrome 浏览器")
    if not data["bun_ready"]:
        issues.append("未找到 bun/npx 运行时")
    if not data["deps_ready"]:
        issues.append("小红书发布脚本 xiaohongshu-post.ts 不存在，请联系管理员")
    if not data["connected"]:
        issues.append("Chrome Profile 中未检测到小红书登录态，请先打开浏览器扫码登录")

    if issues:
        return {"success": False, "message": "；".join(issues)}

    return {"success": True, "message": "小红书运行环境正常，登录态有效"}


@router.post("/xiaohongshu/open-login")
async def xiaohongshu_open_login(current_user: dict = Depends(get_current_user)):
    """打开 Chrome 供用户扫码/手机验证登录小红书（首次绑定或 session 过期时）"""
    account = storage_service.get_platform_account(current_user["id"], "xiaohongshu")
    if not account:
        return {"success": False, "message": "请先绑定小红书"}

    try:
        open_xiaohongshu_login(current_user["id"])
        return {
            "success": True,
            "message": "已打开 Chrome，请在浏览器中扫码或手机验证登录小红书后关闭窗口",
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.delete("/xiaohongshu/unbind")
async def unbind_xiaohongshu(current_user: dict = Depends(get_current_user)):
    """解绑小红书"""
    removed = storage_service.delete_platform_account(current_user["id"], "xiaohongshu")
    if not removed:
        return {"success": False, "message": "当前未绑定小红书"}
    return {"success": True, "message": "已解绑小红书"}


# ========== 抖音 平台绑定 ==========

from .models import DouyinBindRequest, DouyinStatusResponse
from .service import (
    bind_douyin_account,
    get_douyin_status_data,
    open_douyin_login,
)
from publishers.douyin_publisher import check_runtime as dy_check_runtime


@router.post("/douyin/bind", response_model=DouyinStatusResponse)
async def bind_douyin(
    request: DouyinBindRequest,
    current_user: dict = Depends(get_current_user),
):
    """绑定抖音（创建 Chrome Profile 用于浏览器自动化登录）"""
    account = bind_douyin_account(
        user_id=current_user["id"],
        account_name=request.account_name,
        profile_dir=request.profile_dir,
    )
    data = get_douyin_status_data(current_user["id"])
    data["message"] = "抖音绑定成功，请打开浏览器完成扫码登录"
    return DouyinStatusResponse(**data)


@router.get("/douyin/status", response_model=DouyinStatusResponse)
async def douyin_status(current_user: dict = Depends(get_current_user)):
    """查看当前用户的抖音绑定状态"""
    return DouyinStatusResponse(**get_douyin_status_data(current_user["id"]))


@router.post("/douyin/test")
async def test_douyin(current_user: dict = Depends(get_current_user)):
    """测试抖音运行环境与登录态"""
    data = get_douyin_status_data(current_user["id"])
    if not data["bound"]:
        return {"success": False, "message": "尚未绑定抖音"}

    issues = []
    if not data["chrome_ready"]:
        issues.append("未找到 Chrome 浏览器")
    if not data["bun_ready"]:
        issues.append("未找到 bun/npx 运行时")
    if not data["deps_ready"]:
        issues.append("抖音发布脚本 douyin-post.ts 不存在，请联系管理员")
    if not data["connected"]:
        issues.append("Chrome Profile 中未检测到抖音登录态，请先打开浏览器扫码登录")

    if issues:
        return {"success": False, "message": "；".join(issues)}
    return {"success": True, "message": "抖音运行环境正常，登录态有效"}


@router.post("/douyin/open-login")
async def douyin_open_login(current_user: dict = Depends(get_current_user)):
    """打开 Chrome 供用户扫码登录抖音（首次绑定或 session 过期时）"""
    account = storage_service.get_platform_account(current_user["id"], "douyin")
    if not account:
        return {"success": False, "message": "请先绑定抖音"}

    try:
        open_douyin_login(current_user["id"])
        return {
            "success": True,
            "message": "已打开 Chrome，请在浏览器中扫码登录抖音后关闭窗口",
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.delete("/douyin/unbind")
async def unbind_douyin(current_user: dict = Depends(get_current_user)):
    """解绑抖音"""
    removed = storage_service.delete_platform_account(current_user["id"], "douyin")
    if not removed:
        return {"success": False, "message": "当前未绑定抖音"}
    return {"success": True, "message": "已解绑抖音"}
