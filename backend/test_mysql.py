"""
MySQL 数据库连接测试
"""
import sys
from pathlib import Path
from dotenv import load_dotenv
import os

# 加载当前目录下的.env配置文件
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

def test_connection():
    """测试数据库连接"""
    print("=" * 50)
    print(" MySQL 数据库连接测试")
    print("=" * 50)
    print()

    # 从.env读取配置
    try:
        MYSQL_CONFIG = {
            "host": os.getenv("DB_HOST"),
            "port": int(os.getenv("DB_PORT")),
            "user": os.getenv("DB_USER"),
            "password": os.getenv("DB_PASSWORD"),
            "database": os.getenv("DB_NAME")
        }
        # 校验配置是否读取完整
        if not all(MYSQL_CONFIG.values()):
            raise Exception(".env中数据库配置存在空值，请检查")

        print(f"数据库配置:")
        print(f"  主机: {MYSQL_CONFIG['host']}")
        print(f"  端口: {MYSQL_CONFIG['port']}")
        print(f"  用户: {MYSQL_CONFIG['user']}")
        print(f"  数据库: {MYSQL_CONFIG['database']}")
        print()
    except Exception as e:
        print(f"✗ 配置加载失败: {e}")
        print("  请检查 .env 文件格式与内容")
        return False

    # 测试连接
    try:
        import mysql.connector
        print("正在连接数据库...")

        conn = mysql.connector.connect(
            host=MYSQL_CONFIG["host"],
            port=MYSQL_CONFIG["port"],
            user=MYSQL_CONFIG["user"],
            password=MYSQL_CONFIG["password"],
            database=MYSQL_CONFIG["database"],
            charset='utf8mb4',
            use_unicode=True,
            connection_timeout=10
        )

        print("✓ 数据库连接成功!")

        # 测试查询
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        print(f"✓ MySQL 版本: {version}")

        # 检查表是否存在
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s
            AND table_type = 'BASE TABLE'
        """, (MYSQL_CONFIG["database"],))

        tables = [row[0] for row in cursor.fetchall()]

        print()
        if tables:
            print("已找到的表:")
            for table in tables:
                print(f"  - {table}")
        else:
            print("⚠ 数据库中没有找到表，请先创建表结构")

        cursor.close()
        conn.close()

        print()
        print("=" * 50)
        print(" 测试通过!")
        print("=" * 50)
        return True

    except ImportError:
        print("✗ mysql-connector 未安装")
        print("  请运行: py -m pip install mysql-connector-python")
        return False
    except Exception as e:
        print(f"✗ 连接失败: {e}")
        print()
        print("可能的原因:")
        print("1. 数据库地址错误")
        print("2. 用户名或密码错误")
        print("3. 没有开启外网访问")
        print("4. 防火墙阻止了连接")
        print()
        print("请检查:")
        print("1. 登录腾讯云控制台")
        print("2. 确认数据库实例状态正常")
        print("3. 开启外网访问")
        print("4. 检查安全组规则")
        return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)