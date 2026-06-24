"""
微博发布服务
"""
from pathlib import Path
from typing import Optional
import subprocess
import json
import os
import shutil
import uuid
import base64
from config import WEIBO_PROFILES_DIR, WEIBO_CHROME_PATH, WEIBO_BUN_COMMAND, WEIBO_SKILLS_DIR
from auth.security import decrypt_secret
from storage_mysql import storage_service


class WeiboPublisherError(Exception):
    """微博发布错误"""
    pass


def _find_chrome() -> Optional[str]:
    """检测 Chrome/Chromium/Edge 是否可用，返回可执行文件路径或 None"""
    if WEIBO_CHROME_PATH:
        return WEIBO_CHROME_PATH if os.path.exists(WEIBO_CHROME_PATH) else None
    possible_paths = [
        # Google Chrome
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        # Microsoft Edge (Chromium-based, supports CDP)
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
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


def _find_bun_command() -> str | None:
    """找到可用的 bun 运行命令，返回命令字符串或 None"""
    if WEIBO_BUN_COMMAND:
        return WEIBO_BUN_COMMAND
    # 优先直接用 bun
    if shutil.which("bun"):
        return "bun"
    # 其次用 npx -y bun
    if shutil.which("npx"):
        return "npx -y bun"
    return None


def check_runtime() -> dict:
    """检查运行时环境（Chrome/Edge + bun + 脚本依赖）"""
    chrome_path = _find_chrome()
    chrome_ready = chrome_path is not None
    bun_cmd = _find_bun_command()
    bun_ready = bun_cmd is not None

    # 检查微博发布脚本是否存在
    deps_ready = False
    scripts_dir = _resolve_scripts_dir()
    if scripts_dir and scripts_dir.exists():
        # 至少需要 weibo-post.ts
        deps_ready = (scripts_dir / "weibo-post.ts").exists()

    return {
        "chrome_ready": chrome_ready,
        "bun_ready": bun_ready,
        "deps_ready": deps_ready,
        "chrome_path": chrome_path or WEIBO_CHROME_PATH or "not found",
        "bun_command": bun_cmd or "not found",
        "scripts_dir": str(scripts_dir) if scripts_dir else "not configured",
    }


def _resolve_scripts_dir() -> Path | None:
    """解析微博发布脚本目录"""
    # 优先使用配置的 WEIBO_SKILLS_DIR
    if WEIBO_SKILLS_DIR and WEIBO_SKILLS_DIR.exists():
        return WEIBO_SKILLS_DIR
    # 回退到 .baoyu-skills/scripts
    fallback = Path(__file__).resolve().parent.parent.parent / ".baoyu-skills" / "scripts"
    if fallback.exists():
        return fallback
    return WEIBO_SKILLS_DIR  # 返回配置值（即使不存在，便于错误提示）


def get_default_profile_dir(user_id: str) -> Path:
    """获取默认的用户配置目录"""
    return WEIBO_PROFILES_DIR / f"user_{user_id}"


def resolve_profile_dir(user_id: str, encrypted_dir: str) -> Path:
    """解析配置目录路径"""
    profile_dir = Path(encrypted_dir)
    if not profile_dir.is_absolute():
        profile_dir = get_default_profile_dir(user_id) / profile_dir
    profile_dir = profile_dir.resolve()
    profile_dir.mkdir(parents=True, exist_ok=True)
    return profile_dir


def profile_has_session(profile_dir: Path) -> bool:
    """检查 Chrome Profile 是否有有效的登录会话

    检测策略（任一满足即认为有登录态）：
    1. baoyu 格式的 session.json（旧方案）
    2. Chrome Profile 的 Default 目录存在且有会话数据
    """
    profile_dir = Path(profile_dir)

    # 策略1: baoyu session.json（兼容旧方案）
    session_file = profile_dir / "session.json"
    if session_file.exists():
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
            if "cookies" in session_data and len(session_data["cookies"]) > 0:
                return True
        except (json.JSONDecodeError, IOError):
            pass

    # 策略2: Chrome Profile — Default 目录存在且有 Cookies/Session 数据
    default_dir = profile_dir / "Default"
    if default_dir.is_dir():
        # Chrome 登录后会生成 Cookies、Login Data、Local Storage 等文件
        has_cookies = (default_dir / "Cookies").exists()
        has_login_data = (default_dir / "Login Data").exists()
        has_local_storage = (default_dir / "Local Storage").is_dir()
        if has_cookies or (has_login_data and has_local_storage):
            return True

    return False


def open_login_browser(profile_dir: Path) -> None:
    """打开 Chrome/Edge 浏览器进行微博登录"""
    chrome_path = _find_chrome()
    if not chrome_path:
        raise WeiboPublisherError(
            "无法找到 Chrome 或 Edge 浏览器，请安装浏览器或设置 WEIBO_CHROME_PATH 环境变量"
        )

    # 创建配置目录
    profile_dir.mkdir(parents=True, exist_ok=True)

    # 启动浏览器
    subprocess.Popen([
        chrome_path,
        f"--remote-debugging-port=9222",
        f"--user-data-dir={profile_dir}",
        "https://weibo.com"
    ])


def _save_temp_image(image_b64: str, name_prefix: str = "img") -> Optional[Path]:
    """将 base64 图片保存为临时文件，返回文件路径"""
    try:
        # 去掉 data:image/xxx;base64, 前缀
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


def _run_script(cmd: list[str], cwd: str) -> subprocess.CompletedProcess:
    """执行脚本命令"""
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=300,
        cwd=cwd,
        shell=(os.name == "nt"),  # Windows 下需要 shell=True 才能找到 .cmd 文件
    )


def publish_weibo(user_id: str, content: str, images: Optional[list[str]] = None,
                  title: Optional[str] = None) -> dict:
    """发布微博

    - 内容 ≤ 4000 字符且无 markdown 标记 → 普通微博（weibo-post.ts）
    - 内容 > 4000 字符或含 markdown 格式 → 头条文章（weibo-article.ts）
    """
    runtime = check_runtime()
    if not runtime["chrome_ready"]:
        raise WeiboPublisherError("Chrome 浏览器未找到，请安装 Chrome 或配置 WEIBO_CHROME_PATH")

    if not runtime["bun_ready"]:
        raise WeiboPublisherError("Bun 未找到，请安装 Bun 或配置 WEIBO_BUN_COMMAND")

    # 获取用户配置目录
    account = storage_service.get_platform_account(user_id, "weibo")
    if not account:
        raise WeiboPublisherError("请先绑定微博账号")

    profile_dir = resolve_profile_dir(user_id, decrypt_secret(account["app_secret_enc"]))

    # 检查登录状态
    if not profile_has_session(profile_dir):
        raise WeiboPublisherError("微博未登录，请先完成登录")

    # 构建发布脚本命令
    script_dir = Path(__file__).resolve().parent.parent.parent / ".baoyu-skills" / "scripts"
    if not script_dir.exists():
        raise WeiboPublisherError("微博发布脚本不存在")

    bun_cmd = _find_bun_command()
    if not bun_cmd:
        raise WeiboPublisherError("未找到 bun/npx 运行时，请安装 bun 或 Node.js")

    # 判断使用普通微博还是头条文章
    # 普通微博有字数限制，且命令行长度有限制；长内容/Markdown 内容用头条文章
    use_article = (
        len(content) > 4000
        or "\n#" in content          # Markdown 标题
        or "\n**" in content         # Markdown 加粗
        or content.count("\n") > 10  # 多段落长文
    )

    temp_file = None
    try:
        if use_article:
            # 头条文章模式 — 内容写入临时 .md 文件
            weibo_script = script_dir / "weibo-article.ts"
            if not weibo_script.exists():
                raise WeiboPublisherError("weibo-article.ts 脚本不存在")

            temp_dir = Path(__file__).parent.parent / "uploads" / "temp"
            temp_dir.mkdir(parents=True, exist_ok=True)
            temp_file = temp_dir / f"weibo_{uuid.uuid4().hex[:8]}.md"
            # 写入 frontmatter 标题 + 正文，确保脚本能提取到正确标题
            frontmatter = f"---\ntitle: \"{(title or '').replace('\"', '\\\"')[:32]}\"\n---\n\n"
            temp_file.write_text(frontmatter + content, encoding="utf-8")

            cmd = bun_cmd.split() + [str(weibo_script), str(temp_file)]
            # 传标题
            if title:
                cmd.extend(["--title", title[:32]])  # 微博标题限 32 字
            # 传封面图（取第一张图片）
            if images and len(images) > 0:
                cover_path = _save_temp_image(images[0], "cover")
                if cover_path:
                    cmd.extend(["--cover", str(cover_path)])
            cmd.extend(["--profile", str(profile_dir)])
            post_type = "头条文章"
        else:
            # 普通微博模式
            weibo_script = script_dir / "weibo-post.ts"
            if not weibo_script.exists():
                raise WeiboPublisherError("weibo-post.ts 脚本不存在")

            cmd = bun_cmd.split() + [str(weibo_script), content]

            # 添加图片参数
            if images:
                for image in images:
                    cmd.extend(["--image", image])

            cmd.extend(["--profile", str(profile_dir)])
            post_type = "普通微博"

        # 执行命令
        result = _run_script(cmd, str(script_dir.parent))

        if result.returncode != 0:
            raise WeiboPublisherError(f"发布失败: {result.stderr}")

        return {
            "success": True,
            "message": f"微博{post_type}内容已填充到浏览器，请手动发布",
            "post_type": post_type,
            "output": result.stdout,
        }
    except subprocess.TimeoutExpired:
        raise WeiboPublisherError("发布超时")
    except WeiboPublisherError:
        raise
    except Exception as e:
        raise WeiboPublisherError(f"发布失败: {str(e)}")
    finally:
        # 清理临时文件
        if temp_file and temp_file.exists():
            temp_file.unlink(missing_ok=True)


def publish_weibo_article(user_id: str, markdown_file: str, title: Optional[str] = None,
                         summary: Optional[str] = None, cover: Optional[str] = None) -> dict:
    """发布微博头条文章"""
    runtime = check_runtime()
    if not runtime["chrome_ready"]:
        raise WeiboPublisherError("Chrome 浏览器未找到，请安装 Chrome 或配置 WEIBO_CHROME_PATH")

    if not runtime["bun_ready"]:
        raise WeiboPublisherError("Bun 未找到，请安装 Bun 或配置 WEIBO_BUN_COMMAND")

    # 获取用户配置目录
    account = storage_service.get_platform_account(user_id, "weibo")
    if not account:
        raise WeiboPublisherError("请先绑定微博账号")

    profile_dir = resolve_profile_dir(user_id, decrypt_secret(account["app_secret_enc"]))

    # 检查登录状态
    if not profile_has_session(profile_dir):
        raise WeiboPublisherError("微博未登录，请先完成登录")

    # 构建发布脚本命令
    script_dir = Path(__file__).resolve().parent.parent.parent / ".baoyu-skills" / "scripts"
    if not script_dir.exists():
        raise WeiboPublisherError("微博发布脚本不存在")

    weibo_script = script_dir / "weibo-article.ts"
    if not weibo_script.exists():
        raise WeiboPublisherError("weibo-article.ts 脚本不存在")

    # 构建命令
    bun_cmd = _find_bun_command()
    if not bun_cmd:
        raise WeiboPublisherError("未找到 bun/npx 运行时，请安装 bun 或 Node.js")

    cmd = bun_cmd.split() + [
        str(weibo_script),
        markdown_file
    ]

    # 添加可选参数
    if title:
        cmd.extend(["--title", title])
    if summary:
        cmd.extend(["--summary", summary])
    if cover:
        cmd.extend(["--cover", cover])

    # 添加配置目录参数
    cmd.extend(["--profile", str(profile_dir)])

    # 执行命令
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(script_dir.parent),
            shell=(os.name == "nt"),  # Windows 下需要 shell=True 才能找到 .cmd 文件
        )

        if result.returncode != 0:
            raise WeiboPublisherError(f"发布失败: {result.stderr}")

        return {
            "success": True,
            "message": "微博头条文章内容已填充到浏览器，请手动发布",
            "output": result.stdout
        }
    except subprocess.TimeoutExpired:
        raise WeiboPublisherError("发布超时")
    except Exception as e:
        raise WeiboPublisherError(f"发布失败: {str(e)}")