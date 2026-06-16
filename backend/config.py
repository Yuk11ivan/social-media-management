"""
配置文件
"""
import os
from pathlib import Path

# 尝试从项目根目录加载 .env 文件
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

# DeepSeek API配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-7e48c8e6b5b342728bf3b5c18071c0b1")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

# 服务配置
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

# MySQL 数据库配置（支持 MYSQL_* 与 DB_* 两种 .env 变量名）
MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST") or os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT") or os.getenv("DB_PORT") or "3306"),
    "user": os.getenv("MYSQL_USERNAME") or os.getenv("DB_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD") or os.getenv("DB_PASSWORD") or "",
    "database": os.getenv("MYSQL_DATABASE") or os.getenv("DB_NAME", "ai_content_platform"),
}

# 微信公众号 API 配置
WECHAT_APP_ID = os.getenv("WECHAT_APP_ID", "")
WECHAT_APP_SECRET = os.getenv("WECHAT_APP_SECRET", "")
WECHAT_ACCOUNT_ID = os.getenv("WECHAT_ACCOUNT_ID", "gh_38036387d074")

# 微信发布偏好设置
WECHAT_DEFAULT_AUTHOR = os.getenv("WECHAT_DEFAULT_AUTHOR", "娱乐八卦")
WECHAT_NEED_OPEN_COMMENT = int(os.getenv("WECHAT_NEED_OPEN_COMMENT", "1"))
WECHAT_ONLY_FANS_CAN_COMMENT = int(os.getenv("WECHAT_ONLY_FANS_CAN_COMMENT", "0"))
WECHAT_DEFAULT_THEME = os.getenv("WECHAT_DEFAULT_THEME", "grace")

# JWT 认证配置
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 默认 7 天
