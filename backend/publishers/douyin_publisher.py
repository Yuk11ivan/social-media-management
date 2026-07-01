"""
抖音图文发布服务
基于 Chrome CDP + Bun 脚本的浏览器自动化方案（与小红书/微博架构一致）
"""
from pathlib import Path
from typing import Optional
import subprocess
import json
import os
import shutil
import uuid
import base64
import time
from config import DOUYIN_PROFILES_DIR, DOUYIN_CHROME_PATH, DOUYIN_BUN_COMMAND, DOUYIN_CHROME_DEBUG_PORT
from auth.security import decrypt_secret
from storage_mysql import storage_service


class DouyinPublisherError(Exception):
    """抖音发布错误"""
    pass


# 抖音文章内容限制
DY_TITLE_MAX_CHARS = 55
DY_CONTENT_MAX_CHARS = 5000
DY_IMAGES_MAX = 35
DY_TOPICS_MAX = 5


def _find_chrome() -> Optional[str]:
    """检测 Chrome/Chromium/Edge 是否可用"""
    if DOUYIN_CHROME_PATH:
        return DOUYIN_CHROME_PATH if os.path.exists(DOUYIN_CHROME_PATH) else None
    possible_paths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\\Edge\\Application\\msedge.exe"),
        "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return None


def _find_bun_command() -> Optional[str]:
    """找到可用的 bun 运行命令"""
    if DOUYIN_BUN_COMMAND:
        return DOUYIN_BUN_COMMAND
    if shutil.which("bun"):
        return "bun"
    if shutil.which("npx"):
        return "npx -y bun"
    return None


def _resolve_scripts_dir() -> Optional[Path]:
    """解析脚本目录"""
    fallback = Path(__file__).resolve().parent.parent.parent / ".baoyu-skills" / "scripts"
    if fallback.exists():
        return fallback
    return None


def check_runtime() -> dict:
    """检查运行时环境"""
    chrome_path = _find_chrome()
    bun_cmd = _find_bun_command()
    deps_ready = False
    scripts_dir = _resolve_scripts_dir()
    if scripts_dir and scripts_dir.exists():
        deps_ready = (scripts_dir / "douyin-post.ts").exists()
    return {
        "chrome_ready": chrome_path is not None,
        "bun_ready": bun_cmd is not None,
        "deps_ready": deps_ready,
        "chrome_path": chrome_path or "not found",
        "bun_command": bun_cmd or "not found",
        "scripts_dir": str(scripts_dir) if scripts_dir else "not configured",
    }


def get_default_profile_dir(user_id: str) -> Path:
    """获取默认的用户 Chrome Profile 目录"""
    return DOUYIN_PROFILES_DIR / f"user_{user_id}"


def resolve_profile_dir(user_id: str, stored_path: str) -> Path:
    """解析配置目录路径"""
    profile_dir = Path(stored_path)
    if not profile_dir.is_absolute():
        profile_dir = get_default_profile_dir(user_id) / profile_dir
    profile_dir = profile_dir.resolve()
    profile_dir.mkdir(parents=True, exist_ok=True)
    return profile_dir


def profile_has_session(profile_dir: Path) -> bool:
    """检查 Chrome Profile 中是否有抖音登录态"""
    profile_dir = Path(profile_dir)
    session_file = profile_dir / "session.json"
    if session_file.exists():
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
            if "cookies" in session_data and len(session_data["cookies"]) > 0:
                return True
        except (json.JSONDecodeError, IOError):
            pass

    default_dir = profile_dir / "Default"
    if default_dir.is_dir():
        cookies_file = default_dir / "Cookies"
        login_data_file = default_dir / "Login Data"
        ls_dir = default_dir / "Local Storage" / "leveldb"
        ss_dir = default_dir / "Session Storage"
        has_cookies = cookies_file.exists() and cookies_file.stat().st_size > 0
        has_login_data = login_data_file.exists() and login_data_file.stat().st_size > 0
        has_local_storage = ls_dir.is_dir() and any(ls_dir.glob("*.ldb"))
        has_session_storage = ss_dir.is_dir() and any(ss_dir.iterdir())
        if has_cookies or has_login_data or has_local_storage or has_session_storage:
            return True
    return False


def open_login_browser(profile_dir: Path) -> None:
    """打开 Chrome 浏览器供用户扫码登录抖音创作者平台"""
    chrome_path = _find_chrome()
    if not chrome_path:
        raise DouyinPublisherError(
            "无法找到 Chrome 或 Edge 浏览器，请安装 Chrome 或设置 DOUYIN_CHROME_PATH 环境变量"
        )
    profile_dir.mkdir(parents=True, exist_ok=True)
    subprocess.Popen([
        chrome_path,
        f"--remote-debugging-port={DOUYIN_CHROME_DEBUG_PORT}",
        f"--user-data-dir={profile_dir}",
        "--disable-blink-features=AutomationControlled",
        "--start-maximized",
        "https://creator.douyin.com"
    ])


def _save_temp_image(image_b64: str, name_prefix: str = "dy_img") -> Optional[Path]:
    """将 base64 图片保存为临时文件"""
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
    """截断文本"""
    if len(text) <= max_chars:
        return text
    return text[:max_chars - 1] + "…"


def _kill_chrome_by_profile(profile_dir: Path) -> None:
    """推送前关闭占用该 Profile 的 Chrome/Edge，避免 debug port 无法就绪"""
    profile_str = str(profile_dir.resolve())
    if os.name == "nt":
        try:
            ps = (
                "Get-CimInstance Win32_Process | "
                "Where-Object { $_.Name -match 'chrome|msedge' -and $_.CommandLine -like "
                f"'*{profile_str.replace(chr(39), chr(39)*2)}*' }} | "
                "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
            )
            subprocess.run(
                ["powershell", "-NoProfile", "-Command", ps],
                timeout=20,
                capture_output=True,
            )
        except Exception:
            pass
    else:
        try:
            result = subprocess.run(
                ["ps", "aux"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            for line in (result.stdout or "").split("\n"):
                if profile_str in line and "--remote-debugging-port=" in line:
                    parts = line.split()
                    if len(parts) > 1:
                        subprocess.run(["kill", parts[1]], timeout=5)
        except Exception:
            pass


def _safe_log(message: str) -> None:
    """安全输出日志，避免 Windows GBK 控制台编码错误"""
    try:
        print(message)
    except UnicodeEncodeError:
        print(message.encode("utf-8", errors="replace").decode("utf-8", errors="replace"))


def _run_script(cmd_parts: list[str], cwd: str) -> subprocess.CompletedProcess:
    """执行 Bun 脚本命令"""
    env = os.environ.copy()
    env["DY_CHROME_DEBUG_PORT"] = str(DOUYIN_CHROME_DEBUG_PORT)
    env["DOUYIN_CHROME_DEBUG_PORT"] = str(DOUYIN_CHROME_DEBUG_PORT)
    env["PYTHONIOENCODING"] = "utf-8"
    if os.name == "nt":
        cmd_str = subprocess.list2cmdline(cmd_parts)
        shell = True
    else:
        cmd_str = cmd_parts
        shell = False
    _safe_log(f"[DY] 执行命令: {cmd_str[:300]}...")
    result = subprocess.run(
        cmd_str, capture_output=True, text=True, encoding="utf-8",
        errors="replace", timeout=300, cwd=cwd, shell=shell, env=env,
    )
    _safe_log(f"[DY] 退出码: {result.returncode}")
    if result.stdout:
        stdout = result.stdout
        if len(stdout) > 1000:
            _safe_log(f"[DY] stdout 前200: {stdout[:200]}")
            _safe_log(f"[DY] stdout 后800: {stdout[-800:]}")
        else:
            _safe_log(f"[DY] stdout: {stdout}")
    if result.stderr:
        _safe_log(f"[DY] stderr: {result.stderr[-800:]}")
    return result


def publish_douyin(
    user_id: str,
    content: str,
    title: str,
    images: Optional[list[str]] = None,
    topics: Optional[list[str]] = None,
) -> dict:
    """发布抖音图文

    通过 Chrome CDP 自动填入图文内容到抖音创作者平台编辑器。
    不自动点击发布按钮，浏览器保持打开供用户审核。

    Args:
        user_id: 用户 ID
        content: 图文正文
        title: 图文标题
        images: base64 编码的图片列表
        topics: 话题标签列表

    Returns:
        dict: {"success": True, "message": "...", "output": "..."}
    """
    img_count = len(images) if images else 0
    print(f"[DY Publisher] 推送请求: title={title!r}, content_len={len(content) if content else 0}, images={img_count}, topics={topics}")

    # 1. 验证运行环境
    runtime = check_runtime()
    if not runtime["chrome_ready"]:
        raise DouyinPublisherError("Chrome 浏览器未找到，请安装 Chrome 或配置 DOUYIN_CHROME_PATH 环境变量")
    if not runtime["bun_ready"]:
        raise DouyinPublisherError("Bun 运行时未找到，请安装 Bun 或配置 DOUYIN_BUN_COMMAND 环境变量")
    if not runtime["deps_ready"]:
        raise DouyinPublisherError(f"抖音发布脚本不存在，请确认 {runtime['scripts_dir']}/douyin-post.ts 文件存在")

    # 2. 获取用户绑定记录
    account = storage_service.get_platform_account(user_id, "douyin")
    if not account:
        raise DouyinPublisherError("请先绑定抖音账号")

    profile_dir = resolve_profile_dir(user_id, decrypt_secret(account["app_secret_enc"]))

    # 3. 检查登录态
    if not profile_has_session(profile_dir):
        raise DouyinPublisherError(
            "抖音未登录或登录态已失效，请先通过「打开浏览器登录」完成扫码登录，"
            "登录成功后请手动关闭浏览器（点击 X），再进行推送"
        )

    # 3.5 图文模式必须有配图
    if not images or len(images) == 0:
        raise DouyinPublisherError(
            "抖音图文模式至少需要 1 张配图。请在内容生成页上传图片后重新生成，再推送。"
        )

    # 3.6 推送前关闭可能占用 Profile 的浏览器进程
    _kill_chrome_by_profile(profile_dir)
    time.sleep(2)

    # 4. 内容预处理
    safe_title = _truncate_text(title or "", DY_TITLE_MAX_CHARS)
    safe_content = _truncate_text(content or "", DY_CONTENT_MAX_CHARS)

    # 5. 构建脚本命令
    scripts_dir = _resolve_scripts_dir()
    if not scripts_dir or not scripts_dir.exists():
        raise DouyinPublisherError("抖音发布脚本目录不存在")

    dy_script = scripts_dir / "douyin-post.ts"
    if not dy_script.exists():
        raise DouyinPublisherError("douyin-post.ts 脚本不存在")

    bun_cmd = _find_bun_command()
    if not bun_cmd:
        raise DouyinPublisherError("未找到 bun/npx 运行时")

    script_str = str(dy_script).replace("\\", "/")
    cmd_parts = bun_cmd.split() + [script_str]

    temp_files = []
    temp_meta = None
    try:
        image_paths = []
        if images:
            for img_b64 in images[:DY_IMAGES_MAX]:
                temp_file = _save_temp_image(img_b64, "dy")
                if temp_file:
                    temp_files.append(temp_file)
                    image_paths.append(str(temp_file).replace("\\", "/"))

        safe_topics = []
        if topics:
            safe_topics = [t for t in topics[:DY_TOPICS_MAX] if t]

        meta = {
            "title": safe_title,
            "content": safe_content,
            "images": image_paths,
            "topics": safe_topics,
            "profile": str(profile_dir).replace("\\", "/"),
        }
        temp_dir = Path(__file__).parent.parent / "uploads" / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_meta = temp_dir / f"dy_meta_{uuid.uuid4().hex[:8]}.json"
        temp_meta.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[DY] 参数文件: {temp_meta}")

        cmd_parts.extend(["--meta", str(temp_meta).replace("\\", "/")])

        cwd = str(scripts_dir)
        result = _run_script(cmd_parts, cwd)

        if result.returncode != 0:
            stderr_msg = (result.stderr or "").strip()
            stdout_msg = (result.stdout or "").strip()
            fatal_line = ""
            for line in stdout_msg.split("\n"):
                if "FATAL" in line or "Error" in line or "error" in line:
                    fatal_line = line.strip()
                    break
            error_msg = fatal_line or stderr_msg or stdout_msg or "未知错误（脚本无输出）"
            raise DouyinPublisherError(f"发布失败: {error_msg}")

        return {
            "success": True,
            "message": "抖音图文已上传图片并填入编辑器，请在创作者中心审核后发布",
            "output": result.stdout,
            "has_images": bool(images),
        }

    except subprocess.TimeoutExpired:
        raise DouyinPublisherError("发布超时（超过 5 分钟），请检查浏览器状态")
    except DouyinPublisherError:
        raise
    except Exception as e:
        raise DouyinPublisherError(f"发布失败: {str(e)}")
    finally:
        for tf in temp_files:
            if tf.exists():
                tf.unlink(missing_ok=True)
        if temp_meta and temp_meta.exists():
            temp_meta.unlink(missing_ok=True)
