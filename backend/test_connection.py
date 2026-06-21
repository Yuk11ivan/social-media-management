#!/usr/bin/env python3
"""
测试数据库连接
"""
import mysql.connector
from config import MYSQL_CONFIG

try:
    print("尝试连接数据库...")
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    print("✓ 数据库连接成功！")

    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as user_count FROM users")
    result = cursor.fetchone()
    print(f"当前用户数量: {result[0]}")

    cursor.execute("SELECT id, email, nickname, created_at FROM users LIMIT 5")
    users = cursor.fetchall()
    print("\n现有用户:")
    for user in users:
        print(f"  - ID: {user[0]}, Email: {user[1]}, Nickname: {user[2]}, Created: {user[3]}")

    conn.close()
    print("\n连接测试完成！")

except Exception as e:
    print(f"✗ 连接失败: {e}")
    print("\n请检查:")
    print("1. 数据库白名单是否已添加当前IP: 58.48.148.120")
    print("2. 数据库用户名和密码是否正确")
    print("3. 数据库实例是否正常运行")