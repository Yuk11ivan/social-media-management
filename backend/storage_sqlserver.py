"""
SQL Server 内容存储服务
"""
from models import ContentItem, PlatformContent
from datetime import datetime
import uuid
import pyodbc
from typing import Optional, List
from config import SQL_CONNECTION_STRING
import json


class SQLServerStorageService:
    """SQL Server 存储服务"""

    def __init__(self, connection_string: str = SQL_CONNECTION_STRING):
        self.connection_string = connection_string

    def _get_connection(self):
        """获取数据库连接"""
        try:
            conn = pyodbc.connect(self.connection_string)
            return conn
        except Exception as e:
            print(f"数据库连接失败: {e}")
            raise

    def save(self, original_text: str, original_image: str = None, adapted_contents: list[PlatformContent] = None) -> ContentItem:
        """保存内容"""
        item_id = str(uuid.uuid4())
        created_at = datetime.now()

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 插入主内容
            cursor.execute("""
                INSERT INTO content_items (id, original_text, original_image, created_at)
                VALUES (?, ?, ?, ?)
            """, (item_id, original_text, original_image, created_at))

            # 插入平台适配内容
            if adapted_contents:
                for adapted in adapted_contents:
                    adapted_id = str(uuid.uuid4())
                    hashtags_json = json.dumps(adapted.hashtags, ensure_ascii=False)
                    cursor.execute("""
                        INSERT INTO adapted_contents
                        (id, item_id, platform, platform_name, title, content, hashtags, image, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        adapted_id, item_id, adapted.platform, adapted.platform_name,
                        adapted.title, adapted.content, hashtags_json,
                        adapted.image, created_at
                    ))

            conn.commit()

        return ContentItem(
            id=item_id,
            original_text=original_text,
            original_image=original_image,
            adapted_contents=adapted_contents or [],
            created_at=created_at
        )

    def get(self, item_id: str) -> Optional[ContentItem]:
        """获取单个内容"""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 获取主内容
            cursor.execute("""
                SELECT id, original_text, original_image, created_at
                FROM content_items WHERE id = ?
            """, (item_id,))

            row = cursor.fetchone()
            if not row:
                return None

            # 获取适配内容
            cursor.execute("""
                SELECT platform, platform_name, title, content, hashtags, image
                FROM adapted_contents WHERE item_id = ?
            """, (item_id,))

            adapted_contents = []
            for arow in cursor.fetchall():
                hashtags = json.loads(arow[4]) if arow[4] else []
                adapted_contents.append(PlatformContent(
                    platform=arow[0],
                    platform_name=arow[1],
                    title=arow[2],
                    content=arow[3],
                    hashtags=hashtags,
                    image=arow[5]
                ))

            return ContentItem(
                id=row[0],
                original_text=row[1],
                original_image=row[2],
                created_at=row[3],
                adapted_contents=adapted_contents
            )

    def list(self, limit: int = 20, offset: int = 0) -> list[ContentItem]:
        """获取内容列表"""
        items = []
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 获取内容列表
            cursor.execute("""
                SELECT id, original_text, original_image, created_at
                FROM content_items
                ORDER BY created_at DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """, (offset, limit))

            for row in cursor.fetchall():
                # 简化版，不加载适配内容
                items.append(ContentItem(
                    id=row[0],
                    original_text=row[1][:100] + "..." if len(row[1]) > 100 else row[1],
                    original_image=row[2],
                    adapted_contents=[],
                    created_at=row[3]
                ))

        return items

    def count(self) -> int:
        """获取总数"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM content_items")
            return cursor.fetchone()[0]

    def delete(self, item_id: str) -> bool:
        """删除内容（级联删除适配内容）"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM content_items WHERE id = ?", (item_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ===== 推送日志 =====

    def log_push(self, adapted_content_id: str, platform: str, platform_name: str,
                 status: str, content_id: str = None, message: str = None) -> str:
        """记录推送日志"""
        log_id = str(uuid.uuid4())

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO push_logs (id, adapted_content_id, platform, platform_name, status, content_id, message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (log_id, adapted_content_id, platform, platform_name, status, content_id, message))
            conn.commit()

        return log_id

    def get_push_logs(self, platform: str = None, status: str = None,
                      limit: int = 50, offset: int = 0) -> list:
        """获取推送日志"""
        logs = []
        with self._get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT id, platform, platform_name, status, content_id, message, created_at
                FROM push_logs
                WHERE 1=1
            """
            params = []

            if platform:
                query += " AND platform = ?"
                params.append(platform)

            if status:
                query += " AND status = ?"
                params.append(status)

            query += " ORDER BY created_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
            params.extend([offset, limit])

            cursor.execute(query, params)

            for row in cursor.fetchall():
                logs.append({
                    "id": row[0],
                    "platform": row[1],
                    "platform_name": row[2],
                    "status": row[3],
                    "content_id": row[4],
                    "message": row[5],
                    "created_at": row[6]
                })

        return logs

    # ===== 素材管理 =====

    def save_material(self, name: str, file_path: str, file_type: str,
                      platform: str = None, file_size: int = 0) -> str:
        """保存素材"""
        material_id = str(uuid.uuid4())

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO materials (id, name, file_path, file_type, platform, file_size)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (material_id, name, file_path, file_type, platform, file_size))
            conn.commit()

        return material_id

    def list_materials(self, file_type: str = None, platform: str = None,
                        limit: int = 100, offset: int = 0) -> list:
        """获取素材列表"""
        materials = []
        with self._get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT id, name, file_path, file_type, platform, file_size, created_at
                FROM materials
                WHERE 1=1
            """
            params = []

            if file_type:
                query += " AND file_type = ?"
                params.append(file_type)

            if platform:
                query += " AND platform = ?"
                params.append(platform)

            query += " ORDER BY created_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
            params.extend([offset, limit])

            cursor.execute(query, params)

            for row in cursor.fetchall():
                materials.append({
                    "id": row[0],
                    "name": row[1],
                    "file_path": row[2],
                    "file_type": row[3],
                    "platform": row[4],
                    "file_size": row[5],
                    "created_at": row[6]
                })

        return materials

    def delete_material(self, material_id: str) -> bool:
        """删除素材"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM materials WHERE id = ?", (material_id,))
            conn.commit()
            return cursor.rowcount > 0


# 全局存储服务实例
storage_service = SQLServerStorageService()