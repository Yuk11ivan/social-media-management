"""
MySQL 数据库连接测试
"""
import sys
from pathlib import Path

# 加载配置
sys.path.insert(0, str(Path(__file__).parent))

def test_connection():
    """测试数据库连接"""
    print("=" * 50)
    print(" MySQL 数据库连接测试")
    print("=" * 50)
    print()

    # 检查配置
    try:
        from config import MYSQL_CONFIG
        print(f"数据库配置:")
        print(f"  主机: {MYSQL_CONFIG['host']}")
        print(f"  端口: {MYSQL_CONFIG['port']}")
        print(f"  用户: {MYSQL_CONFIG['user']}")
        print(f"  数据库: {MYSQL_CONFIG['database']}")
        print()
    except Exception as e:
        print(f"✗ 配置加载失败: {e}")
        print("  请检查 config.py 或 .env 文件")
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
        print("  请运行: pip install mysql-connector-python")
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