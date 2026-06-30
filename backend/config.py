"""
配置文件
"""
import os
from pathlib import Path

# 尝试加载 .env 文件（优先项目根目录，其次 backend 目录）
_project_root = Path(__file__).parent.parent
env_path = _project_root / ".env"
if not env_path.exists():
    env_path = Path(__file__).parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)
    print(f"[Config] 已加载环境变量: {env_path}")

# ========== AI 模型配置 ==========

# DeepSeek API
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-7e48c8e6b5b342728bf3b5c18071c0b1")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

# 百炼 / DashScope API (千问系列模型)
BAILIAN_API_KEY = os.getenv(
    "BAILIAN_API_KEY",
    "sk-ws-H.REYLEIR.1P39.MEQCICrLcQkU1Sf2m8wvsha0_BgfxQRd4HbW2nlf_2G4Chc6AiARp9bI-WJhl9Dxm5ECXVKdS9B0yKasGaxdGzX15LF6gg"
)
DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

# 模型选择策略:
# - "auto": 根据任务复杂度自动选择 (推荐)
# - "deepseek": 仅使用 DeepSeek
# - "qwen": 仅使用千问系列
AI_MODEL_STRATEGY = os.getenv("AI_MODEL_STRATEGY", "auto")

# ========== 服务配置 ==========
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

# ========== MySQL 数据库配置 ==========
MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST") or os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT") or os.getenv("DB_PORT") or "3306"),
    "user": os.getenv("MYSQL_USERNAME") or os.getenv("DB_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD") or os.getenv("DB_PASSWORD") or "",
    "database": os.getenv("MYSQL_DATABASE") or os.getenv("DB_NAME", "ai_content_platform"),
}

# ========== 微信公众号 API 配置 ==========
WECHAT_APP_ID = os.getenv("WECHAT_APP_ID", "")
WECHAT_APP_SECRET = os.getenv("WECHAT_APP_SECRET", "")
WECHAT_ACCOUNT_ID = os.getenv("WECHAT_ACCOUNT_ID", "gh_38036387d074")

# 微信发布偏好设置
WECHAT_DEFAULT_AUTHOR = os.getenv("WECHAT_DEFAULT_AUTHOR", "娱乐八卦")
WECHAT_NEED_OPEN_COMMENT = int(os.getenv("WECHAT_NEED_OPEN_COMMENT", "1"))
WECHAT_ONLY_FANS_CAN_COMMENT = int(os.getenv("WECHAT_ONLY_FANS_CAN_COMMENT", "0"))
WECHAT_DEFAULT_THEME = os.getenv("WECHAT_DEFAULT_THEME", "grace")

# ========== JWT 认证配置 ==========
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 默认 7 天

# ========== 微博推送配置 ==========
_project_root = Path(__file__).parent.parent
_default_skills = _project_root / ".baoyu-skills" / "scripts"
WEIBO_SKILLS_DIR = Path(os.getenv("WEIBO_SKILLS_DIR", str(_default_skills)))
WEIBO_PROFILES_DIR = Path(os.getenv("WEIBO_PROFILES_DIR", str(_project_root / "backend" / "weibo_profiles")))
WEIBO_CHROME_PATH = os.getenv("WEIBO_BROWSER_CHROME_PATH", os.getenv("WEIBO_CHROME_PATH", ""))
WEIBO_BUN_COMMAND = os.getenv("WEIBO_BUN_COMMAND", "")

# ========== 小红书推送配置 ==========
XHS_PROFILES_DIR = Path(os.getenv("XHS_PROFILES_DIR", str(_project_root / "backend" / "xiaohongshu_profiles")))
XHS_CHROME_PATH = os.getenv("XHS_BROWSER_CHROME_PATH", os.getenv("XHS_CHROME_PATH", ""))
XHS_BUN_COMMAND = os.getenv("XHS_BUN_COMMAND", "")
XHS_CHROME_DEBUG_PORT = int(os.getenv("XHS_CHROME_DEBUG_PORT", "9223"))

# ========== 抖音推送配置 ==========
DOUYIN_PROFILES_DIR = Path(os.getenv("DOUYIN_PROFILES_DIR", str(_project_root / "backend" / "douyin_profiles")))
DOUYIN_CHROME_PATH = os.getenv("DOUYIN_BROWSER_CHROME_PATH", os.getenv("DOUYIN_CHROME_PATH", ""))
DOUYIN_BUN_COMMAND = os.getenv("DOUYIN_BUN_COMMAND", "")
DOUYIN_CHROME_DEBUG_PORT = int(os.getenv("DOUYIN_CHROME_DEBUG_PORT", "9224"))
