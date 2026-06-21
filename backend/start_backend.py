#!/usr/bin/env python3
"""
启动后端服务器
"""

import sys
import os
import traceback

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("正在启动后端服务器...")

    # 导入并启动应用
    from main import app
    import uvicorn

    print("✓ 成功导入应用")
    print(f"服务器将在 http://0.0.0.0:8000 启动")
    print("API文档地址: http://0.0.0.0:8000/docs")
    print("=" * 50)

    # 启动服务器
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

except ImportError as e:
    print(f"✗ 导入错误: {e}")
    traceback.print_exc()
except Exception as e:
    print(f"✗ 启动失败: {e}")
    traceback.print_exc()
    print("\n可能的原因:")
    print("1. 缺少依赖包 - 运行: pip install mysql-connector-python python-dotenv")
    print("2. 数据库连接问题 - 请检查 .env 文件中的数据库配置")
    print("3. 端口被占用 - 尝试使用其他端口")