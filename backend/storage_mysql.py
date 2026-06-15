"""
MySQL 内容存储服务（支持腾讯云 MySQL）
"""
from models import ContentItem, PlatformContent
from datetime import datetime
import uuid
import json
import mysql.connector
from typing import Optional, List
from config import MYSQL_CONFIG


class MySQLStorageService:
    """MySQL 存储服务"""

    def __init__(self, config: dict = MYSQL_CONFIG):
        self.config = config

    def _get_connection(self):
        """获取数据库连接"""
        try:
            conn = mysql.connector.connect(
                host=self.config["host"],
                port=self.config["port"],
                user=self.config["user"],
                password=self.config["password"],
                database=self.config["database"],
                charset='utf8mb4',
                use_unicode=True,
                connection_timeout=10
            )
            return conn
        except Exception as e:
            print(f"数据库连接失败: {e}")
            raise

    def save(self, original_text: str, original_image: str = None,
             adapted_contents: list[PlatformContent] = None) -> ContentItem:
        """保存内容"""
        item_id = str(uuid.uuid4())
        created_at = datetime.now()

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 插入主内容
            cursor.execute("""
                INSERT INTO content_items (id, original_text, original_image, created_at)
                VALUES (%s, %s, %s, %s)
            """, (item_id, original_text, original_image, created_at))

            # 插入平台适配内容
            if adapted_contents:
                for adapted in adapted_contents:
                    adapted_id = str(uuid.uuid4())
                    hashtags_json = json.dumps(adapted.hashtags, ensure_ascii=False)
                    cursor.execute("""
                        INSERT INTO adapted_contents
                        (id, item_id, platform, platform_name, title, content, hashtags, image, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            cursor = conn.cursor(dictionary=True)

            # 获取主内容
            cursor.execute("""
                SELECT id, original_text, original_image, created_at
                FROM content_items WHERE id = %s
            """, (item_id,))

            row = cursor.fetchone()
            if not row:
                return None

            # 获取适配内容
            cursor.execute("""
                SELECT platform, platform_name, title, content, hashtags, image
                FROM adapted_contents WHERE item_id = %s
            """, (item_id,))

            adapted_contents = []
            for arow in cursor.fetchall():
                hashtags = json.loads(arow["hashtags"]) if arow["hashtags"] else []
                adapted_contents.append(PlatformContent(
                    platform=arow["platform"],
                    platform_name=arow["platform_name"],
                    title=arow["title"],
                    content=arow["content"],
                    hashtags=hashtags,
                    image=arow["image"]
                ))

            return ContentItem(
                id=row["id"],
                original_text=row["original_text"],
                original_image=row["original_image"],
                created_at=row["created_at"],
                adapted_contents=adapted_contents
            )

    def list(self, limit: int = 20, offset: int = 0) -> list[ContentItem]:
        """获取内容列表"""
        items = []
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # 获取内容列表
            cursor.execute("""
                SELECT id, original_text, original_image, created_at
                FROM content_items
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))

            for row in cursor.fetchall():
                # 简化版，不加载适配内容
                items.append(ContentItem(
                    id=row["id"],
                    original_text=row["original_text"][:100] + "..." if len(row["original_text"]) > 100 else row["original_text"],
                    original_image=row["original_image"],
                    adapted_contents=[],
                    created_at=row["created_at"]
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
            # 先删除适配内容
            cursor.execute("DELETE FROM adapted_contents WHERE item_id = %s", (item_id,))
            # 再删除主内容
            cursor.execute("DELETE FROM content_items WHERE id = %s", (item_id,))
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
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (log_id, adapted_content_id, platform, platform_name, status, content_id, message))
            conn.commit()

        return log_id

    def get_push_logs(self, platform: str = None, status: str = None,
                      limit: int = 50, offset: int = 0) -> list:
        """获取推送日志"""
        logs = []
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            query = """
                SELECT id, platform, platform_name, status, content_id, message, created_at
                FROM push_logs
                WHERE 1=1
            """
            params = []

            if platform:
                query += " AND platform = %s"
                params.append(platform)

            if status:
                query += " AND status = %s"
                params.append(status)

            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cursor.execute(query, params)

            for row in cursor.fetchall():
                logs.append({
                    "id": row["id"],
                    "platform": row["platform"],
                    "platform_name": row["platform_name"],
                    "status": row["status"],
                    "content_id": row["content_id"],
                    "message": row["message"],
                    "created_at": row["created_at"]
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
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (material_id, name, file_path, file_type, platform, file_size))
            conn.commit()

        return material_id

    def list_materials(self, file_type: str = None, platform: str = None,
                        limit: int = 100, offset: int = 0) -> list:
        """获取素材列表"""
        materials = []
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            query = """
                SELECT id, name, file_path, file_type, platform, file_size, created_at
                FROM materials
                WHERE 1=1
            """
            params = []

            if file_type:
                query += " AND file_type = %s"
                params.append(file_type)

            if platform:
                query += " AND platform = %s"
                params.append(platform)

            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cursor.execute(query, params)

            for row in cursor.fetchall():
                materials.append({
                    "id": row["id"],
                    "name": row["name"],
                    "file_path": row["file_path"],
                    "file_type": row["file_type"],
                    "platform": row["platform"],
                    "file_size": row["file_size"],
                    "created_at": row["created_at"]
                })

        return materials

    def delete_material(self, material_id: str) -> bool:
        """删除素材"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM materials WHERE id = %s", (material_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ===== 数据库初始化 =====

    def init_database(self):
        """初始化数据库表"""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 创建内容表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS content_items (
                    id VARCHAR(36) PRIMARY KEY,
                    original_text TEXT NOT NULL,
                    original_image VARCHAR(512) NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # 创建平台适配内容表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS adapted_contents (
                    id VARCHAR(36) PRIMARY KEY,
                    item_id VARCHAR(36) NOT NULL,
                    platform VARCHAR(50) NOT NULL,
                    platform_name VARCHAR(100) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    hashtags JSON NULL,
                    image VARCHAR(512) NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_item_id (item_id),
                    INDEX idx_platform (platform),
                    FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # 创建推送日志表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS push_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    adapted_content_id VARCHAR(36) NULL,
                    platform VARCHAR(50) NOT NULL,
                    platform_name VARCHAR(100) NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    content_id VARCHAR(100) NULL,
                    message TEXT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_platform (platform),
                    INDEX idx_status (status),
                    INDEX idx_created (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # 创建素材表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS materials (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    file_path VARCHAR(512) NOT NULL,
                    file_type VARCHAR(50) NOT NULL,
                    platform VARCHAR(50) NULL,
                    file_size BIGINT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_platform (platform),
                    INDEX idx_type (file_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            conn.commit()
            print("✓ 数据库表创建成功")


# 全局存储服务实例
storage_service = MySQLStorageService()