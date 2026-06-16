"""
数据模型定义
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ContentInput(BaseModel):
    """内容输入模型"""
    text: str
    image: Optional[str] = None      # Base64 编码的单张图片 (兼容旧版)
    images: Optional[List[str]] = None  # Base64 编码的多张图片


class PlatformContent(BaseModel):
    """平台适配内容模型"""
    platform: str
    platform_name: str
    title: str
    content: str
    hashtags: List[str] = []
    image: Optional[str] = None       # 封面图
    images: Optional[List[str]] = None  # 正文配图


class ContentGenerateRequest(BaseModel):
    """内容生成请求"""
    text: str
    image: Optional[str] = None       # 兼容单图
    images: Optional[List[str]] = None  # 多图支持
    platforms: Optional[List[str]] = None


class ContentGenerateResponse(BaseModel):
    """内容生成响应"""
    results: List[PlatformContent]   # 字段名改为 results 与前端匹配
    contents: Optional[List[PlatformContent]] = None  # 兼容旧版字段名
    timestamp: Optional[str] = None
    created_at: Optional[datetime] = None

    def model_post_init(self, __context):
        """兼容旧版 contents 字段"""
        if self.contents is None:
            self.contents = self.results


class ContentSaveRequest(BaseModel):
    """内容保存请求"""
    original_text: str
    original_image: Optional[str] = None
    original_images: Optional[List[str]] = None  # 多图
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
