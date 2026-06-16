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
             adapted_contents: list[PlatformContent] = None,
             user_id: str = None) -> ContentItem:
        """保存内容"""
        item_id = str(uuid.uuid4())
        created_at = datetime.now()

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 插入主内容
            cursor.execute("""
                INSERT INTO content_items (id, user_id, original_text, original_image, created_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (item_id, user_id, original_text, original_image, created_at))

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

    def get(self, item_id: str, user_id: str = None) -> Optional[ContentItem]:
        """获取单个内容"""
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # 获取主内容
            if user_id:
                cursor.execute("""
                    SELECT id, original_text, original_image, created_at
                    FROM content_items WHERE id = %s AND user_id = %s
                """, (item_id, user_id))
            else:
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

    def list(self, limit: int = 20, offset: int = 0, user_id: str = None) -> list[ContentItem]:
        """获取内容列表"""
        items = []
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            if user_id:
                cursor.execute("""
                    SELECT id, original_text, original_image, created_at
                    FROM content_items
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (user_id, limit, offset))
            else:
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

    def count(self, user_id: str = None) -> int:
        """获取总数"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if user_id:
                cursor.execute("SELECT COUNT(*) FROM content_items WHERE user_id = %s", (user_id,))
            else:
                cursor.execute("SELECT COUNT(*) FROM content_items")
            return cursor.fetchone()[0]

    def delete(self, item_id: str, user_id: str = None) -> bool:
        """删除内容（级联删除适配内容）"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if user_id:
                cursor.execute("SELECT id FROM content_items WHERE id = %s AND user_id = %s", (item_id, user_id))
                if not cursor.fetchone():
                    return False
            cursor.execute("DELETE FROM adapted_contents WHERE item_id = %s", (item_id,))
            cursor.execute("DELETE FROM content_items WHERE id = %s", (item_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ===== 推送日志 =====

    def log_push(self, adapted_content_id: str, platform: str, platform_name: str,
                 status: str, content_id: str = None, message: str = None,
                 user_id: str = None) -> str:
        """记录推送日志"""
        log_id = str(uuid.uuid4())

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO push_logs (id, user_id, adapted_content_id, platform, platform_name, status, content_id, message)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (log_id, user_id, adapted_content_id, platform, platform_name, status, content_id, message))
            conn.commit()

        return log_id

    def get_push_logs(self, platform: str = None, status: str = None,
                      limit: int = 50, offset: int = 0, user_id: str = None) -> list:
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

            if user_id:
                query += " AND user_id = %s"
                params.append(user_id)

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

            self._init_auth_tables(cursor)

            conn.commit()
            print("[OK] database tables initialized")

    def _ensure_column(self, cursor, table: str, column: str, definition: str):
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """, (table, column))
        if cursor.fetchone()[0] == 0:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    # ===== 用户与平台绑定 =====

    def create_user(self, email: str, password_hash: str,
                    nickname: str = None, phone: str = None) -> dict:
        user_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (id, email, phone, password_hash, nickname)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, email, phone, password_hash, nickname))
            conn.commit()
        return self.get_user_by_id(user_id)

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, email, phone, password_hash, nickname, status, created_at
                FROM users WHERE id = %s
            """, (user_id,))
            return cursor.fetchone()

    def get_user_by_email(self, email: str) -> Optional[dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, email, phone, password_hash, nickname, status, created_at
                FROM users WHERE email = %s
            """, (email,))
            return cursor.fetchone()

    def get_user_by_phone(self, phone: str) -> Optional[dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, email, phone, password_hash, nickname, status, created_at
                FROM users WHERE phone = %s
            """, (phone,))
            return cursor.fetchone()

    def upsert_platform_account(self, user_id: str, platform: str, app_id: str,
                                app_secret_enc: str, account_id: str = None,
                                account_name: str = None) -> dict:
        account_id_val = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT id FROM platform_accounts
                WHERE user_id = %s AND platform = %s
            """, (user_id, platform))
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE platform_accounts
                    SET app_id = %s, app_secret_enc = %s, account_id = %s,
                        account_name = %s, status = 1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (app_id, app_secret_enc, account_id, account_name, existing["id"]))
                account_id_val = existing["id"]
            else:
                cursor.execute("""
                    INSERT INTO platform_accounts
                    (id, user_id, platform, app_id, app_secret_enc, account_id, account_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (account_id_val, user_id, platform, app_id, app_secret_enc, account_id, account_name))
            conn.commit()

        return self.get_platform_account(user_id, platform)

    def get_platform_account(self, user_id: str, platform: str) -> Optional[dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, user_id, platform, account_name, app_id, app_secret_enc,
                       account_id, status, created_at, updated_at
                FROM platform_accounts
                WHERE user_id = %s AND platform = %s AND status = 1
            """, (user_id, platform))
            return cursor.fetchone()

    def delete_platform_account(self, user_id: str, platform: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM platform_accounts
                WHERE user_id = %s AND platform = %s
            """, (user_id, platform))
            conn.commit()
            return cursor.rowcount > 0

    def _init_auth_tables(self, cursor):
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(20) UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                nickname VARCHAR(100),
                status TINYINT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS platform_accounts (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                platform VARCHAR(50) NOT NULL,
                account_name VARCHAR(100),
                app_id VARCHAR(100) NOT NULL,
                app_secret_enc TEXT NOT NULL,
                account_id VARCHAR(100),
                status TINYINT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_user_platform (user_id, platform),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)

        self._ensure_column(cursor, "content_items", "user_id", "VARCHAR(36) NULL")
        self._ensure_column(cursor, "push_logs", "user_id", "VARCHAR(36) NULL")


# 全局存储服务实例
storage_service = MySQLStorageService()