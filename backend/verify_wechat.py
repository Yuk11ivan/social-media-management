#!/usr/bin/env python3
"""
验证微信公众号配置
"""

import requests
import json

APP_ID = "wxeec2ea964f12129e"
# 这里需要真实的 AppSecret
APP_SECRET = "请填入真实的AppSecret"

TOKEN_URL = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APP_ID}&secret={APP_SECRET}"

print("=" * 50)
print("微信公众号配置验证")
print("=" * 50)
print(f"AppID: {APP_ID}")
print(f"AppSecret: {'*' * len(APP_SECRET) if APP_SECRET else '未设置'}")

if not APP_SECRET or APP_SECRET == "请填入真实的AppSecret":
    print("\n❌ 错误：请设置正确的 AppSecret")
    print("\n获取 AppSecret 的步骤:")
    print("1. 登录微信公众平台: https://mp.weixin.qq.com")
    print("2. 进入「设置」-「公众号设置」")
    print("3. 找到「开发」-「基本配置」")
    print("4. 复制 AppSecret")
    sys.exit(1)

try:
    print("\n正在获取 access_token...")
    response = requests.get(TOKEN_URL, timeout=10)
    data = response.json()

    if "errcode" in data:
        print(f"❌ 微信API错误 [{data['errcode']}]: {data['errmsg']}")
        print("\n可能的原因:")
        print("1. AppSecret 错误")
        print("2. AppSecret 已过期（需要重置）")
        print("3. 公众号未认证或功能受限")
    else:
        token = data.get("access_token", "")
        print(f"✅ 成功获取 token: {token[:20]}...")
        print(f"有效期: {data.get('expires_in')} 秒")
        print("\n微信公众号配置正确！")

except requests.RequestException as e:
    print(f"❌ 网络错误: {e}")
except Exception as e:
    print(f"❌ 其他错误: {e}")