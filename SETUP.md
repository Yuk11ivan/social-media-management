# SQL Server 数据库设置指南

## 前置要求

1. ✅ SQL Server 已安装并运行（MSSQLSERVER）
2. ✅ ODBC Driver for SQL Server
3. ✅ Python 3.8+

---

## 步骤 1: 创建数据库

运行 PowerShell 脚本（推荐）:

```powershell
cd d:\pythonpro\automatic\multi-platform-agnet\database
.\setup.ps1
```

或手动执行 SQL:

1. 打开 **SQL Server Management Studio (SSMS)**
2. 连接到服务器（用户名: `sa`）
3. 打开文件: `database/create_database.sql`
4. 点击 **执行** (或按 F5)

---

## 步骤 2: 配置环境变量

### 方式 A: 创建 .env 文件（推荐）

在项目根目录创建 `.env` 文件:

```env
# DeepSeek AI 配置
DEEPSEEK_API_KEY=sk-你的API密钥

# SQL Server 数据库配置
SQL_SERVER=localhost
SQL_PORT=1433
SQL_DATABASE=AI_Content_Platform
SQL_USERNAME=sa
SQL_PASSWORD=你的sa密码

# 服务配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

### 方式 B: PowerShell 设置

```powershell
$env:SQL_USERNAME="sa"
$env:SQL_PASSWORD="你的密码"
```

---

## 步骤 3: 安装 Python 依赖

```bash
E:\python3\python.exe -m pip install -r backend/requirements.txt
```

---

## 步骤 4: 启动后端服务

```bash
cd backend
E:\python3\python.exe main.py
```

访问:
- API 服务: http://localhost:8000
- API 文档: http://localhost:8000/docs

---

## 验证数据库连接

访问 http://localhost:8000/ 查看状态:

```json
{
  "service": "多平台账号自动化运营系统API",
  "status": "running",
  "ai_configured": true,
  "database": "SQL Server"
}
```

如果 `database` 显示 `"未连接"`，请检查:
- SQL Server 服务是否运行
- 用户名密码是否正确
- ODBC Driver 是否已安装

---

## 朋友协作配置

### 方案 1: 共享远程数据库

让朋友连接你的 SQL Server:

1. **启用 TCP/IP**:
   ```
   SQL Server Configuration Manager
   → 网络配置
   → MSSQLSERVER 的协议
   → TCP/IP → 启用
   ```

2. **重启 SQL Server 服务**

3. **配置防火墙** (允许 1433 端口)

4. **朋友配置**:
   ```env
   SQL_SERVER=你的IP地址
   SQL_USERNAME=新创建的共享账户
   SQL_PASSWORD=共享账户密码
   ```

### 方案 2: 云数据库 (推荐)

使用阿里云 RDS、腾讯云 SQL Server 等:

1. 购买云 SQL Server 实例
2. 获取连接信息
3. 创建共享账户
4. 朋友配置连接信息

### 方案 3: 本地同步

各自使用本地 SQL Server，定期导出数据同步（不推荐实时协作）

---

## 数据库表结构

| 表名 | 用途 |
|------|------|
| `content_items` | 原始内容记录 |
| `adapted_contents` | 平台适配内容 |
| `push_logs` | 推送日志 |
| `materials` | 素材管理 |

---

## 常见问题

**Q: 提示 "Login failed for user 'sa'"**
A: 检查 sa 账户是否启用，密码是否正确

**Q: 提示 "ODBC Driver not found"**
A: 下载安装 ODBC Driver 18 for SQL Server

**Q: 如何重置 sa 密码?**
```sql
USE master;
ALTER LOGIN sa WITH PASSWORD = '新密码';
```

**Q: 如何创建新的数据库用户?**
```sql
USE AI_Content_Platform;
CREATE LOGIN 运营助手 WITH PASSWORD = '密码';
CREATE USER 运营助手 FOR LOGIN 运营助手;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_items TO 运营助手;
GRANT SELECT, INSERT, UPDATE, DELETE ON adapted_contents TO 运营助手;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_logs TO 运营助手;
GRANT SELECT, INSERT, UPDATE, DELETE ON materials TO 运营助手;
```