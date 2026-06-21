#!/usr/bin/env python3
"""
测试微信公众号API配置
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from wechat_api import WechatAPI, WechatAPIError

# 从环境或配置中获取真实的测试值
try:
    from config import WECHAT_APP_ID, WECHAT_APP_SECRET
    print(f"配置的 AppID: {WECHAT_APP_ID}")
    print(f"配置的 AppSecret: {'*' * len(WECHAT_APP_SECRET) if WECHAT_APP_SECRET else '空'}")

    if not WECHAT_APP_ID or not WECHAT_APP_SECRET:
        print("\n❌ 错误：AppID 或 AppSecret 未配置")
        print("请检查 .env 文件中的 WECHAT_APP_ID 和 WECHAT_APP_SECRET")
        sys.exit(1)

    # 创建API实例
    api = WechatAPI()

    print("\n正在测试获取 access_token...")
    try:
        token = api.get_access_token()
        print(f"✅ 成功获取 token: {token[:20]}...")
        print("微信公众号配置正确！")
    except WechatAPIError as e:
        print(f"❌ 微信API错误 [{e.errcode}]: {e.errmsg}")
        print("\n可能的解决方案:")
        print("1. 检查 AppID 和 AppSecret 是否正确")
        print("2. 确认公众号是否已认证")
        print("3. 检查 AppSecret 是否已重置")
        print("4. 确认是否已开通权限")
    except Exception as e:
        print(f"❌ 其他错误: {e}")

except ImportError as e:
    print(f"导入错误: {e}")
    print("请确保所有依赖已安装: pip install httpx")