# 腾讯云 MySQL 配置指南

## 🎯 你的选择

✅ **MySQL** - 比 SQL Server 更适合协作
✅ **免费试用 30 天** - 完全够用
✅ **云数据库** - 你和朋友都能访问

---

## 步骤 1: 获取连接信息

1. 登录 **腾讯云控制台**
2. 进入 **云数据库 MySQL** (https://console.cloud.tencent.com/cynosdb)
3. 点击你的数据库实例
4. 进入 **数据库管理** 或 **连接地址**
5. 记录以下信息：

```
内网地址: cynosdbmysql-xxxx.sql.tencentcdb.com  # 服务器间访问
外网地址: mysql-xxxx.sql.tencentcdb.com        # 电脑访问
端口: 3306
用户名: root
密码: 你创建数据库时设置的密码
```

⚠️ **注意**: 默认只能内网访问，需要 **开启外网访问** 才能让你们的电脑连接！

### 开启外网访问

1. 进入数据库实例
2. 点击 **数据库管理** → **连接地址**
3. 找到 **外网地址** 并点击 **开启**
4. 等待 1-2 分钟生效
5. 记录外网地址（类似 `mysql-xxxx.sql.tencentcdb.com`）

---

## 步骤 2: 创建数据库和表

### 方法 A: 使用腾讯云控制台

1. 进入数据库实例
2. 点击 **数据库管理** → **创建数据库**
3. 输入数据库名: `ai_content_platform`
4. 选择字符集: `utf8mb4`
5. 点击确定

### 方法 B: 使用 SQL 命令

在腾讯云控制台的 **SQL 窗口** 中执行：

```sql
-- 创建数据库
CREATE DATABASE ai_content_platform
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE ai_content_platform;
```

然后执行以下 SQL 创建表：

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

-- 创建索引
CREATE INDEX idx_content_created ON content_items(created_at);
CREATE INDEX idx_push_created ON push_logs(created_at);
CREATE INDEX idx_material_created ON materials(created_at);
```

---

## 步骤 3: 配置本地项目

### 1. 创建 .env 文件

在 `d:\pythonpro\automatic\multi-platform-agnet\` 目录下创建 `.env` 文件：

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

### 2. 安装 Python 依赖

```powershell
cd d:\pythonpro\automatic\multi-platform-agnet\backend
E:\python3\python.exe -m pip install -r requirements.txt
```

### 3. 测试连接

```powershell
E:\python3\python.exe test_mysql.py
```

---

## 步骤 4: 让朋友连接

### 给朋友的信息

把以下内容发给你的朋友：

```
我的云数据库配置（免费试用30天）：

外网地址: mysql-xxxx.sql.tencentcdb.com
端口: 3306
数据库: ai_content_platform
用户名: ai_writer
密码: 密码123

项目地址: [你的 GitHub 或文件路径]
配置方式:
1. 创建 .env 文件
2. 填写上面的数据库信息
3. 运行 python main.py
```

### 创建共享账户（推荐）

为了安全，建议给朋友创建专用账户，而不是用 root：

在腾讯云 SQL 窗口执行：

```sql
-- 创建用户
CREATE USER 'ai_writer'@'%' IDENTIFIED BY '密码123';

-- 授权访问数据库
GRANT ALL PRIVILEGES ON ai_content_platform.* TO 'ai_writer'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

---

## 步骤 5: 启动服务

```powershell
# 1. 进入后端目录
cd d:\pythonpro\automatic\multi-platform-agnet\backend

# 2. 安装依赖（首次）
E:\python3\python.exe -m pip install -r requirements.txt

# 3. 测试数据库连接
E:\python3\python.exe test_mysql.py

# 4. 启动服务
E:\python3\python.exe main.py
```

访问:
- API 服务: http://localhost:8000
- API 文档: http://localhost:8000/docs

---

## 数据库架构

```
content_items (原始内容)
    ↓
adapted_contents (平台适配内容)
    ↓
push_logs (推送日志)

materials (素材库)
```

---

## 常见问题

**Q: 为什么我的电脑连不上数据库？**

A: 检查以下几点：
1. 是否开启了外网访问
2. IP 白名单是否添加了你的 IP
3. 外网地址是否正确

**Q: 如何添加 IP 白名单？**

A: 在腾讯云控制台：
1. 进入数据库实例
2. 点击 **数据库管理** → **安全组**
3. 添加规则：TCP 3306 端口，允许来源 `0.0.0.0/0`（或你的 IP）

**Q: 免费试用到期怎么办？**

A: 
- 数据会保留，但需要付费
- 可以导出数据到本地 SQL Server
- 或者继续付费使用（按量计费很便宜）

**Q: SQL Server 还需要吗？**

A: 不需要了，可以删除本地 SQL Server 的配置。云数据库更方便多人协作。

**Q: 数据量大了怎么办？**

A: 
- 腾讯云可以升级配置
- 也可以考虑阿里云、华为云
- 30 天试用够你们测试和开发了

---

## 下一步

1. ✅ 创建数据库和表（步骤 2）
2. ✅ 配置 .env 文件（步骤 3）
3. ✅ 给朋友共享账户（步骤 4）
4. ⬜ 测试内容生成功能
5. ⬜ 实现真实平台对接
6. ⬜ 部署到公网服务器