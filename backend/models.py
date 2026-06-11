"""
数据模型定义
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ContentInput(BaseModel):
    """内容输入模型"""
    text: str
    image: Optional[str] = None  # Base64编码的图片


class PlatformContent(BaseModel):
    """平台适配内容模型"""
    platform: str
    platform_name: str
    title: str
    content: str
    hashtags: List[str] = []
    image: Optional[str] = None


class ContentGenerateRequest(BaseModel):
    """内容生成请求"""
    text: str
    image: Optional[str] = None


class ContentGenerateResponse(BaseModel):
    """内容生成响应"""
    contents: List[PlatformContent]
    created_at: datetime


class ContentSaveRequest(BaseModel):
    """内容保存请求"""
    original_text: str
    original_image: Optional[str] = None
    adapted_contents: List[PlatformContent]


class ContentItem(BaseModel):
    """内容记录项"""
    id: str
    original_text: str
    original_image: Optional[str] = None
    adapted_contents: List[PlatformContent]
    created_at: datetime


class ContentListResponse(BaseModel):
    """内容列表响应"""
    items: List[ContentItem]
    total: int