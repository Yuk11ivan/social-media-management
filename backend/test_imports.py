#!/usr/bin/env python3
"""
测试后端所有模块导入
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 50)
print("测试后端模块导入")
print("=" * 50)

modules_to_test = [
    "config",
    "models",
    "auth.models",
    "auth.security",
    "auth.dependencies",
    "auth.router",
    "storage_mysql",
    "main"
]

success_count = 0
failed_count = 0

for module in modules_to_test:
    try:
        __import__(module)
        print(f"✓ {module}")
        success_count += 1
    except Exception as e:
        print(f"✗ {module}: {e}")
        failed_count += 1

print("\n" + "=" * 50)
print(f"导入结果: {success_count} 成功, {failed_count} 失败")
print("=" * 50)

# 测试数据库连接
print("\n测试数据库连接...")
try:
    from storage_mysql import storage_service
    conn = storage_service._get_connection()
    print("✓ 数据库连接成功")
    conn.close()
except Exception as e:
    print(f"✗ 数据库连接失败: {e}")
    print("可能的原因:")
    print("1. MySQL 服务未启动")
    print("2. 网络无法访问腾讯云数据库")
    print("3. .env 文件中的数据库配置错误")
    print("4. 需要配置数据库IP白名单")