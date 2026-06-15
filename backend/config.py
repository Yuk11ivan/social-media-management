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

# SQL Server 数据库配置
SQL_SERVER = os.getenv("SQL_SERVER", "localhost")
SQL_PORT = os.getenv("SQL_PORT", "1433")
SQL_DATABASE = os.getenv("SQL_DATABASE", "AI_Content_Platform")
SQL_USERNAME = os.getenv("SQL_USERNAME", "sa")
SQL_PASSWORD = os.getenv("SQL_PASSWORD", "")

# SQL Server 连接字符串
SQL_CONNECTION_STRING = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={SQL_SERVER},{SQL_PORT};"
    f"DATABASE={SQL_DATABASE};"
    f"UID={SQL_USERNAME};"
    f"PWD={SQL_PASSWORD};"
    f"TrustServerCertificate=yes;"
    f"Encrypt=yes;"
)