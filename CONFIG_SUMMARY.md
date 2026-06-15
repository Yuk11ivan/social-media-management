# 配置总结

## 已完成的配置

✅ 本地 SQL Server 已配置（可选）
✅ 腾讯云 MySQL 支持已添加
✅ Python 代码已更新

---

## 腾讯云 MySQL 配置步骤

### 1️⃣ 在腾讯云控制台操作

1. **登录腾讯云**: https://console.cloud.tencent.com
2. **找到云数据库**: 搜索 "云数据库 MySQL"
3. **点击你的实例**
4. **开启外网访问**:
   - 进入 **数据库管理** → **连接地址**
   - 点击 **外网地址** 旁的 **开启**
   - 等待 1-2 分钟生效

5. **创建数据库**:
   - 进入 **数据库管理** → **创建数据库**
   - 数据库名: `ai_content_platform`
   - 字符集: `utf8mb4`
   - 排序规则: `utf8mb4_unicode_ci`

6. **创建表**（复制 SQL 到 SQL 窗口执行）:

```sql
-- 内容表
CREATE TABLE content_items (
    id VARCHAR(36) PRIMARY KEY,
    original_text TEXT NOT NULL,
    original_image VARCHAR(512) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 平台适配内容表
CREATE TABLE adapted_contents (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 推送日志表
CREATE TABLE push_logs (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 素材表
CREATE TABLE materials (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    platform VARCHAR(50) NULL,
    file_size BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_platform (platform),
    INDEX idx_type (file_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 2️⃣ 在本地配置

#### 方式 A: 创建 .env 文件（推荐）

在项目根目录创建 `.env` 文件：

```env
# DeepSeek AI 配置
DEEPSEEK_API_KEY=sk-7e48c8e6b5b342728bf3b5c18071c0b1

# 腾讯云 MySQL 配置
MYSQL_HOST=mysql-xxxx.sql.tencentcdb.com  # 你的外网地址
MYSQL_PORT=3306
MYSQL_DATABASE=ai_content_platform
MYSQL_USERNAME=root
MYSQL_PASSWORD=你的数据库密码

# 服务配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

#### 方式 B: 使用 PowerShell 设置

```powershell
$env:MYSQL_HOST="mysql-xxxx.sql.tencentcdb.com"
$env:MYSQL_PORT="3306"
$env:MYSQL_DATABASE="ai_content_platform"
$env:MYSQL_USERNAME="root"
$env:MYSQL_PASSWORD="你的密码"
```

---

### 3️⃣ 安装依赖并启动

```powershell
# 进入后端目录
cd d:\pythonpro\automatic\multi-platform-agnet\backend

# 安装依赖
E:\python3\python.exe -m pip install -r requirements.txt

# 测试数据库连接
E:\python3\python.exe test_mysql.py

# 启动服务
E:\python3\python.exe main.py
```

---

### 4️⃣ 给朋友的配置

#### 方式 1: 创建共享账户（推荐）

在腾讯云 SQL 窗口执行：

```sql
-- 创建用户
CREATE USER 'ai_writer'@'%' IDENTIFIED BY '共享密码123';

-- 授权
GRANT ALL PRIVILEGES ON ai_content_platform.* TO 'ai_writer'@'%';

-- 刷新
FLUSH PRIVILEGES;
```

#### 方式 2: 直接分享 root（简单但不推荐）

直接告诉朋友外网地址和密码即可。

---

### 给朋友的消息模板

```
我的云数据库配置（免费试用30天）：

外网地址: mysql-xxxx.sql.tencentcdb.com
端口: 3306
数据库: ai_content_platform
用户名: ai_writer
密码: 密码123

项目地址: [你的 GitHub 地址]

配置步骤:
1. 创建 .env 文件
2. 填写上面的数据库信息
3. 运行 python test_mysql.py 测试连接
4. 运行 python main.py 启动服务

有问题随时问我！
```

---

## 代码结构

```
backend/
├── config.py              # 配置文件
├── main.py                # FastAPI 主应用
├── models.py              # 数据模型
├── ai_service.py          # AI 服务
├── storage_mysql.py       # MySQL 存储服务
├── storage_sqlserver.py   # SQL Server 存储服务（保留）
├── test_mysql.py          # 数据库测试脚本
└── requirements.txt       # 依赖包

项目根目录/
├── .env                   # 环境变量（需要创建）
├── .env.example           # 配置模板
├── SETUP.md               # 旧设置指南
├── TENCENT_MYSQL_SETUP.md # 腾讯云配置指南
└── CONFIG_SUMMARY.md      # 本文件
```

---

## API 端点

| 接口 | 方法 | 用途 |
|------|------|------|
| `/` | GET | 服务状态 |
| `/api/content/generate` | POST | AI 生成内容 |
| `/api/content/save` | POST | 保存内容 |
| `/api/content/list` | GET | 内容列表 |
| `/api/content/{id}` | GET | 内容详情 |
| `/api/content/{id}` | DELETE | 删除内容 |
| `/api/platform/push` | POST | 推送到平台 |
| `/api/push/logs` | GET | 推送日志 |
| `/api/materials` | GET | 素材列表 |
| `/api/materials` | POST | 保存素材 |
| `/api/materials/{id}` | DELETE | 删除素材 |

访问 http://localhost:8000/docs 查看完整 API 文档

---

## 常见问题

**Q: 提示 "Can't connect to MySQL server"**
A:
1. 检查是否开启了外网访问
2. 检查安全组是否允许你的 IP
3. 检查地址和端口是否正确

**Q: 提示 "Access denied for user"**
A: 用户名或密码错误

**Q: 提示 "Unknown database"**
A: 数据库名拼写错误或未创建

**Q: 如何查看我的外网 IP？**
A: 访问 https://ipinfo.io/json

**Q: 本地 SQL Server 还需要吗？**
A: 不需要了，可以删除或保留（代码同时支持）

---

## 下一步

1. ⬜ 登录腾讯云控制台
2. ⬜ 开启外网访问
3. ⬜ 创建数据库和表
4. ⬜ 配置 .env 文件
5. ⬜ 测试连接
6. ⬜ 给朋友配置信息
7. ⬜ 开始使用！

---

## 技术支持

有问题随时问我！😊