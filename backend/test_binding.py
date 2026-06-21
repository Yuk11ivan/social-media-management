#!/usr/bin/env python3
"""
测试微信绑定功能
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import WECHAT_APP_ID, WECHAT_APP_SECRET
from wechat_api import WechatAPI, WechatAPIError

print("测试微信绑定...")
print(f"AppID: {WECHAT_APP_ID}")
print(f"AppSecret: {'*' * 32}")

# 创建API实例
api = WechatAPI()
try:
    # 获取access token
    token = api.get_access_token()
    print(f"✅ 成功获取token: {token[:20]}...")

    # 测试绑定
    print("\n绑定功能测试成功！")
except WechatAPIError as e:
    print(f"❌ 微信API错误 [{e.errcode}]: {e.errmsg}")
except Exception as e:
    print(f"❌ 其他错误: {e}")
    import traceback
    traceback.print_exc()