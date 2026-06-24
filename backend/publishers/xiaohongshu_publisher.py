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
from config import XHS_PROFILES_DIR, XHS_CHROME_PATH, XHS_BUN_COMMAND, XHS_CHROME_DEBUG_PORT
from auth.security import decrypt_secret
from storage_mysql import storage_service


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
    2. Chrome Profile 的 Default/ 目录存在且有有效的 Cookies/Login Data
    3. Local Storage 目录存在且非空（小红书使用 Local Storage 存储登录信息）
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
        # Cookies 文件存在且大小 > 0（Chrome 正常退出后才会写入）
        cookies_file = default_dir / "Cookies"
        has_cookies = cookies_file.exists() and cookies_file.stat().st_size > 0

        # Login Data 文件存在且大小 > 0
        login_data_file = default_dir / "Login Data"
        has_login_data = login_data_file.exists() and login_data_file.stat().st_size > 0

        # Local Storage 目录存在且有 leveldb 文件（小红书登录信息存储于此）
        ls_dir = default_dir / "Local Storage" / "leveldb"
        has_local_storage = ls_dir.is_dir() and any(ls_dir.glob("*.ldb"))

        # Session Storage 目录存在且有文件
        ss_dir = default_dir / "Session Storage"
        has_session_storage = ss_dir.is_dir() and any(ss_dir.iterdir())

        if has_cookies or has_login_data or has_local_storage or has_session_storage:
            return True

    return False


def open_login_browser(profile_dir: Path) -> None:
    """打开 Chrome/Edge 浏览器供用户扫码/手机登录小红书

    注意：登录完成后请手动关闭浏览器（点击 X），Chrome 会自动将 Cookies 写入磁盘。
    不要通过任务管理器强制结束进程，否则登录态可能丢失。
    """
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


def _run_script(cmd_parts: list[str], cwd: str) -> subprocess.CompletedProcess:
    """执行 Bun 脚本命令"""
    # 继承当前环境变量，并确保 XHS_CHROME_DEBUG_PORT 传递给 Bun 脚本
    env = os.environ.copy()
    env["XHS_CHROME_DEBUG_PORT"] = str(XHS_CHROME_DEBUG_PORT)
    # 确保子进程也用 UTF-8
    env["PYTHONIOENCODING"] = "utf-8"

    if os.name == "nt":
        # Windows: 用 list2cmdline 正确转义参数（处理换行、空格、引号等）
        cmd_str = subprocess.list2cmdline(cmd_parts)
        shell = True
    else:
        cmd_str = cmd_parts
        shell = False

    print(f"[XHS] 执行命令: {cmd_str[:300]}...")
    print(f"[XHS] 工作目录: {cwd}")

    result = subprocess.run(
        cmd_str,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",  # 遇到无法解码的字符用 ? 替代，而不是崩溃
        timeout=300,  # 5 分钟超时
        cwd=cwd,
        shell=shell,
        env=env,
    )

    print(f"[XHS] 退出码: {result.returncode}")
    if result.stdout:
        # 只打印最后 1000 字符（关键信息通常在最后）
        stdout = result.stdout
        if len(stdout) > 1000:
            print(f"[XHS] stdout (前200): {stdout[:200]}")
            print(f"[XHS] stdout (后800): {stdout[-800:]}")
        else:
            print(f"[XHS] stdout: {stdout}")
    if result.stderr:
        print(f"[XHS] stderr: {result.stderr[-800:]}")

    return result


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
    # 0. 日志：记录收到的参数
    img_count = len(images) if images else 0
    print(f"[XHS Publisher] 收到推送请求: title={title!r}, content_len={len(content) if content else 0}, images={img_count}, topics={topics}")

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
            "小红书未登录或登录态已失效，请先通过「打开浏览器登录」完成扫码/手机验证登录，"
            "登录成功后请手动关闭浏览器（点击 X），再进行推送"
        )

    # 3.5 检查 Chrome 是否正在使用该 Profile（Lock 文件）
    lock_file = profile_dir / "Default" / "lockfile"
    if lock_file.exists():
        # Chrome 可能正在运行，Bun 脚本会尝试复用或重启
        # 这里只记录日志，不阻断流程
        print(f"[XHS] 检测到 Chrome Profile 锁文件，Chrome 可能正在运行")

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

    # 构建命令行参数 — Windows 下用正斜杠
    script_str = str(xhs_script).replace("\\", "/")
    cmd_parts = bun_cmd.split() + [script_str]

    # 处理图片 — 保存 base64 为临时文件，传递路径
    temp_files = []
    temp_meta = None
    try:
        image_paths = []
        if images:
            for img_b64 in images[:XHS_IMAGES_MAX]:
                temp_file = _save_temp_image(img_b64, "xhs")
                if temp_file:
                    temp_files.append(temp_file)
                    image_paths.append(str(temp_file).replace("\\", "/"))

        # 处理话题标签
        safe_topics = []
        if topics:
            safe_topics = [t for t in topics[:XHS_TOPICS_MAX] if t]

        # ===== 用临时 JSON 文件传递参数（彻底避免 shell 转义问题） =====
        meta = {
            "title": safe_title,
            "content": safe_content,
            "images": image_paths,
            "topics": safe_topics,
            "profile": str(profile_dir).replace("\\", "/"),
        }
        temp_dir = Path(__file__).parent.parent / "uploads" / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_meta = temp_dir / f"xhs_meta_{uuid.uuid4().hex[:8]}.json"
        temp_meta.write_text(
            json.dumps(meta, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"[XHS] 参数文件: {temp_meta}")

        cmd_parts.extend(["--meta", str(temp_meta).replace("\\", "/")])

        # 6. 执行脚本
        cwd = str(scripts_dir.parent)
        result = _run_script(cmd_parts, cwd)

        if result.returncode != 0:
            stderr_msg = (result.stderr or "").strip()
            stdout_msg = (result.stdout or "").strip()
            # 优先从 stdout 中提取 FATAL 错误
            fatal_line = ""
            for line in stdout_msg.split("\n"):
                if "FATAL" in line or "Error" in line or "error" in line:
                    fatal_line = line.strip()
                    break
            error_msg = fatal_line or stderr_msg or stdout_msg or "未知错误（脚本无输出）"
            raise XiaohongshuPublisherError(f"发布失败: {error_msg}")

        return {
            "success": True,
            "message": "小红书笔记已自动保存为草稿，请在创作者中心草稿箱中审核发布",
            "output": result.stdout,
            "has_images": bool(images),
        }

    except subprocess.TimeoutExpired:
        raise XiaohongshuPublisherError("发布超时（超过 5 分钟），请检查浏览器状态")
    except XiaohongshuPublisherError:
        raise
    except Exception as e:
        raise XiaohongshuPublisherError(f"发布失败: {str(e)}")
    finally:
        # 7. 清理临时文件
        for tf in temp_files:
            if tf.exists():
                tf.unlink(missing_ok=True)
        if temp_meta and temp_meta.exists():
            temp_meta.unlink(missing_ok=True)
