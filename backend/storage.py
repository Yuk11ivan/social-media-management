"""
内容存储服务（内存存储，用于Demo）
"""
from models import ContentItem, PlatformContent
from datetime import datetime
import uuid


class StorageService:
    """内容存储服务"""
    
    def __init__(self):
        self._items: dict[str, ContentItem] = {}
    
    def save(self, original_text: str, original_image: str = None, adapted_contents: list[PlatformContent] = None) -> ContentItem:
        """保存内容"""
        item_id = str(uuid.uuid4())
        item = ContentItem(
            id=item_id,
            original_text=original_text,
            original_image=original_image,
            adapted_contents=adapted_contents or [],
            created_at=datetime.now()
        )
        self._items[item_id] = item
        return item
    
    def get(self, item_id: str) -> ContentItem | None:
        """获取单个内容"""
        return self._items.get(item_id)
    
    def list(self, limit: int = 20, offset: int = 0) -> list[ContentItem]:
        """获取内容列表"""
        items = sorted(self._items.values(), key=lambda x: x.created_at, reverse=True)
        return items[offset:offset + limit]
    
    def count(self) -> int:
        """获取总数"""
        return len(self._items)
    
    def delete(self, item_id: str) -> bool:
        """删除内容"""
        if item_id in self._items:
            del self._items[item_id]
            return True
        return False


# 全局存储服务实例
storage_service = StorageService()