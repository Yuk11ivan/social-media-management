"""
平台绑定相关数据模型
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WechatBindRequest(BaseModel):
    app_id: str = Field(min_length=10, max_length=100)
    app_secret: str = Field(min_length=10, max_length=200)
    account_id: Optional[str] = Field(default=None, max_length=100)
    account_name: Optional[str] = Field(default=None, max_length=100)


class WechatStatusResponse(BaseModel):
    bound: bool
    app_id: Optional[str] = None
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    connected: bool = False
    message: Optional[str] = None
    bound_at: Optional[datetime] = None


class WeiboBindRequest(BaseModel):
    account_name: Optional[str] = Field(default=None, max_length=100)
    profile_dir: Optional[str] = Field(default=None, max_length=500)


class WeiboStatusResponse(BaseModel):
    bound: bool
    account_name: Optional[str] = None
    profile_dir: Optional[str] = None
    connected: bool = False
    chrome_ready: bool = False
    bun_ready: bool = False
    message: Optional[str] = None
    bound_at: Optional[datetime] = None


# ========== 小红书 ==========

class XiaohongshuBindRequest(BaseModel):
    account_name: Optional[str] = Field(default=None, max_length=100)
    profile_dir: Optional[str] = Field(default=None, max_length=500)


class XiaohongshuStatusResponse(BaseModel):
    bound: bool
    account_name: Optional[str] = None
    profile_dir: Optional[str] = None
    connected: bool = False
    chrome_ready: bool = False
    bun_ready: bool = False
    deps_ready: bool = False
    message: Optional[str] = None
    bound_at: Optional[datetime] = None
