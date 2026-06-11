"""
配置文件
"""
import os

# DeepSeek API配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-7e48c8e6b5b342728bf3b5c18071c0b1")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

# 服务配置
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000