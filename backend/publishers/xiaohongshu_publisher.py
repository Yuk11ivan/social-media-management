"""
小红书发布服务
基于 Chrome CDP + Bun 脚本的浏览器自动化发布方案（与微博架构一致）
"""
from pathlib import Path
from typing import Optional
import subprocess
import json
import os
import shutil
import uuid
import base64
from ..config import XHS_PROFILES_DIR, XHS_CHROME_PATH, XHS_BUN_COMMAND, XHS_CHROME_DEBUG_PORT
from ..auth.security import decrypt_secret
from ..storage_mysql import storage_service


class XiaohongshuPublisherError(Exception):
    """小红书发布错误"""
    pass


# 小红书内容限制
XHS_TITLE_MAX_CHARS = 20
XHS_CONTENT_MAX_CHARS = 1000
XHS_IMAGES_MAX = 18
XHS_TOPICS_MAX = 5


def _find_chrome() -> Optional[str]:
    """检测 Chrome/Chromium/Edge 是否可用，返回可执行文件路径或 None"""
    if XHS_CHROME_PATH:
        return XHS_CHROME_PATH if os.path.exists(XHS_CHROME_PATH) else None
    possible_paths = [
        # Google Chrome
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        # Microsoft Edge (Chromium-based, supports CDP)
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\\Application\\msedge.exe"),
        # Linux / macOS
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/microsoft-edge",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return None


def _find_bun_command() -> Optional[str]:
    """找到可用的 bun 运行命令，返回命令字符串或 None"""
    if XHS_BUN_COMMAND:
        return XHS_BUN_COMMAND
    if shutil.which("bun"):
        return "bun"
    if shutil.which("npx"):
        return "npx -y bun"
    return None


def _resolve_scripts_dir() -> Optional[Path]:
    """解析小红书发布脚本目录"""
    fallback = Path(__file__).resolve().parent.parent.parent / ".baoyu-skills" / "scripts"
    if fallback.exists():
        return fallback
    return None


def check_runtime() -> dict:
    """检查运行时环境（Chrome/Edge + bun + 脚本依赖）

    返回 dict 包含 chrome_ready, bun_ready, deps_ready 等字段
    """
    chrome_path = _find_chrome()
    chrome_ready = chrome_path is not None
    bun_cmd = _find_bun_command()
    bun_ready = bun_cmd is not None

    deps_ready = False
    scripts_dir = _resolve_scripts_dir()
    if scripts_dir and scripts_dir.exists():
        deps_ready = (scripts_dir / "xiaohongshu-post.ts").exists()

    return {
        "chrome_ready": chrome_ready,
        "bun_ready": bun_ready,
        "deps_ready": deps_ready,
        "chrome_path": chrome_path or XHS_CHROME_PATH or "not found",
        "bun_command": bun_cmd or "not found",
        "scripts_dir": str(scripts_dir) if scripts_dir else "not configured",
    }


def get_default_profile_dir(user_id: str) -> Path:
    """获取默认的用户 Chrome Profile 目录"""
    return XHS_PROFILES_DIR / f"user_{user_id}"


def resolve_profile_dir(user_id: str, stored_path: str) -> Path:
    """解析配置目录路径"""
    profile_dir = Path(stored_path)
    if not profile_dir.is_absolute():
        profile_dir = get_default_profile_dir(user_id) / profile_dir
    profile_dir = profile_dir.resolve()
    profile_dir.mkdir(parents=True, exist_ok=True)
    return profile_dir


def profile_has_session(profile_dir: Path) -> bool:
    """检查 Chrome Profile 中是否有小红书登录态

    检测策略（任一满足即认为有登录态）：
    1. baoyu 格式的 session.json（旧方案兼容）
    2. Chrome Profile 的 Default/ 目录存在且有 Cookies/Login Data
    3. Local Storage 目录存在（小红书使用 Local Storage 存储登录信息）
    """
    profile_dir = Path(profile_dir)

    # 策略1: session.json（兼容旧方案）
    session_file = profile_dir / "session.json"
    if session_file.exists():
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
            if "cookies" in session_data and len(session_data["cookies"]) > 0:
                return True
        except (json.JSONDecodeError, IOError):
            pass

    # 策略2: Chrome Profile — Default 目录存在且有会话数据
    default_dir = profile_dir / "Default"
    if default_dir.is_dir():
        has_cookies = (default_dir / "Cookies").exists()
        has_login_data = (default_dir / "Login Data").exists()
        has_local_storage = (default_dir / "Local Storage").is_dir()
        has_session_storage = (default_dir / "Session Storage").is_dir()
        if has_cookies or has_login_data or has_local_storage or has_session_storage:
            return True

    return False


def open_login_browser(profile_dir: Path) -> None:
    """打开 Chrome/Edge 浏览器供用户扫码/手机登录小红书"""
    chrome_path = _find_chrome()
    if not chrome_path:
        raise XiaohongshuPublisherError(
            "无法找到 Chrome 或 Edge 浏览器，请安装 Chrome 或设置 XHS_CHROME_PATH 环境变量"
        )

    profile_dir.mkdir(parents=True, exist_ok=True)

    subprocess.Popen([
        chrome_path,
        f"--remote-debugging-port={XHS_CHROME_DEBUG_PORT}",
        f"--user-data-dir={profile_dir}",
        "--disable-blink-features=AutomationControlled",
        "--start-maximized",
        "https://creator.xiaohongshu.com"
    ])


def _save_temp_image(image_b64: str, name_prefix: str = "xhs_img") -> Optional[Path]:
    """将 base64 图片保存为临时文件，返回文件路径"""
    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(image_b64)
        temp_dir = Path(__file__).parent.parent / "uploads" / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / f"{name_prefix}_{uuid.uuid4().hex[:8]}.png"
        temp_file.write_bytes(img_bytes)
        return temp_file
    except Exception:
        return None


def _truncate_text(text: str, max_chars: int) -> str:
    """截断文本（中文字符友好）"""
    if len(text) <= max_chars:
        return text
    return text[:max_chars - 1] + "…"


def _run_script(cmd: list[str], cwd: str) -> subprocess.CompletedProcess:
    """执行 Bun 脚本命令"""
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=300,  # 5 分钟超时
        cwd=cwd,
        shell=(os.name == "nt"),  # Windows 下需要 shell=True
    )


def publish_xiaohongshu(
    user_id: str,
    content: str,
    title: str,
    images: Optional[list[str]] = None,
    topics: Optional[list[str]] = None,
) -> dict:
    """发布小红书笔记

    通过 Chrome CDP 自动填入笔记内容到小红书编辑器。
    不自动点击发布按钮，浏览器保持打开供用户审核。

    Args:
        user_id: 用户 ID
        content: 笔记正文内容
        title: 笔记标题
        images: base64 编码的图片列表（可选）
        topics: 话题标签列表（可选）

    Returns:
        dict: {"success": True, "message": "...", "output": "..."}

    Raises:
        XiaohongshuPublisherError: 发布失败
    """
    # 1. 验证运行环境
    runtime = check_runtime()
    if not runtime["chrome_ready"]:
        raise XiaohongshuPublisherError(
            "Chrome 浏览器未找到，请安装 Chrome 或配置 XHS_CHROME_PATH 环境变量"
        )
    if not runtime["bun_ready"]:
        raise XiaohongshuPublisherError(
            "Bun 运行时未找到，请安装 Bun 或配置 XHS_BUN_COMMAND 环境变量"
        )
    if not runtime["deps_ready"]:
        raise XiaohongshuPublisherError(
            f"小红书发布脚本不存在，请确认 {runtime['scripts_dir']}/xiaohongshu-post.ts 文件存在"
        )

    # 2. 获取用户绑定记录
    account = storage_service.get_platform_account(user_id, "xiaohongshu")
    if not account:
        raise XiaohongshuPublisherError("请先绑定小红书账号")

    profile_dir = resolve_profile_dir(user_id, decrypt_secret(account["app_secret_enc"]))

    # 3. 检查登录态
    if not profile_has_session(profile_dir):
        raise XiaohongshuPublisherError(
            "小红书未登录，请先通过「打开浏览器登录」完成扫码/手机验证登录"
        )

    # 4. 内容预处理
    safe_title = _truncate_text(title or "", XHS_TITLE_MAX_CHARS)
    safe_content = _truncate_text(content or "", XHS_CONTENT_MAX_CHARS)

    # 5. 构建脚本命令
    scripts_dir = _resolve_scripts_dir()
    if not scripts_dir or not scripts_dir.exists():
        raise XiaohongshuPublisherError("小红书发布脚本目录不存在")

    xhs_script = scripts_dir / "xiaohongshu-post.ts"
    if not xhs_script.exists():
        raise XiaohongshuPublisherError("xiaohongshu-post.ts 脚本不存在")

    bun_cmd = _find_bun_command()
    if not bun_cmd:
        raise XiaohongshuPublisherError("未找到 bun/npx 运行时")

    # 构建命令行参数
    cmd = bun_cmd.split() + [str(xhs_script)]

    if safe_title:
        cmd.extend(["--title", safe_title])
    if safe_content:
        cmd.extend(["--content", safe_content])

    # 处理图片 — 保存 base64 为临时文件，传递路径
    temp_files = []
    try:
        if images:
            image_paths = []
            for img_b64 in images[:XHS_IMAGES_MAX]:
                temp_file = _save_temp_image(img_b64, "xhs")
                if temp_file:
                    temp_files.append(temp_file)
                    image_paths.append(str(temp_file))

            if image_paths:
                cmd.extend(["--images", ",".join(image_paths)])

        # 处理话题标签
        if topics:
            safe_topics = [t for t in topics[:XHS_TOPICS_MAX] if t]
            if safe_topics:
                cmd.extend(["--topics", ",".join(safe_topics)])

        # Chrome Profile 目录
        cmd.extend(["--profile", str(profile_dir)])

        # 6. 执行脚本
        cwd = str(scripts_dir.parent)
        result = _run_script(cmd, cwd)

        if result.returncode != 0:
            error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
            raise XiaohongshuPublisherError(f"发布失败: {error_msg}")

        return {
            "success": True,
            "message": "小红书笔记内容已填入编辑器，请在浏览器中审核后手动点击发布",
            "output": result.stdout,
        }

    except subprocess.TimeoutExpired:
        raise XiaohongshuPublisherError("发布超时（超过 5 分钟），请检查浏览器状态")
    except XiaohongshuPublisherError:
        raise
    except Exception as e:
        raise XiaohongshuPublisherError(f"发布失败: {str(e)}")
    finally:
        # 7. 清理临时图片文件
        for tf in temp_files:
            if tf.exists():
                tf.unlink(missing_ok=True)
