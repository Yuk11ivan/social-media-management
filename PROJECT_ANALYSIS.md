# 项目核心需求分析

## 项目概述

**多平台账号自动化运营系统** — 一个基于 AI 的内容生成和跨平台分发系统。

**核心价值:**
- 输入一次内容，AI 自动生成多平台适配版本
- 统一管理内容创作、存储、分发
- 节省跨平台运营的人力成本

---

## 核心功能模块

### 1. AI 内容智能改写

**需求:**
- 用户输入原始文本（可选图片）
- AI 根据不同平台的风格特性改写内容
- 每个平台生成专属标题、正文、话题标签

**当前实现:**
- 使用 DeepSeek API (`deepseek-chat` 模型)
- 平台提示词工程：
  - **微信公众号**: 专业正式、长文风格、无 emoji
  - **小红书**: 活泼口语、短句、emoji、话题标签
  - **抖音**: 口语化钩子、简洁有力、悬念互动

**技术栈:**
```python
from openai import OpenAI

client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com/v1"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[...],
    temperature=0.7,
    max_tokens=1000
)
```

---

### 2. 第三方平台对接（关键）

#### 2.1 对接方式选择

**当前状态:** Mock 推送，未对接真实平台

**真实对接需要:**

| 平台 | 官方开放平台 | 认证方式 | 能力 |
|------|------------|---------|------|
| **微信公众号** | 微信公众平台 API | AppID + AppSecret | 文章发布、草稿箱、素材管理 |
| **小红书** | 暂无开放 API | 需逆向工程 | 难度高，风险大 |
| **抖音** | 开放平台 | Client Key + Client Secret | 视频发布、数据查询 |

#### 2.2 微信公众号对接方案

**申请流程:**
1. 注册/登录微信公众平台
2. 开发 → 基本配置 → 获取 AppID / AppSecret
3. 服务器配置（接收/处理微信事件）
4. 获取 access_token（2小时有效）

**核心 API:**
```python
# 获取 access_token
GET https://api.weixin.qq.com/cgi-bin/token
?grant_type=client_credential
&appid=APPID
&secret=SECRET

# 新增永久素材
POST https://api.weixin.qq.com/cgi-bin/material/add_material
?access_token=TOKEN
Content-Type: multipart/form-data

# 新增草稿
POST https://api.weixin.qq.com/cgi-bin/draft/add
?access_token=TOKEN
{
  "articles": [
    {
      "title": "标题",
      "content": "HTML内容",
      "thumb_media_id": "缩略图media_id"
    }
  ]
}
```

**Python 实现:**
```python
import requests

class WeChatClient:
    def __init__(self, appid, secret):
        self.appid = appid
        self.secret = secret
        self.access_token = None
        self.token_expires_at = 0
    
    def get_access_token(self):
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
        
        url = "https://api.weixin.qq.com/cgi-bin/token"
        params = {
            "grant_type": "client_credential",
            "appid": self.appid,
            "secret": self.secret
        }
        resp = requests.get(url, params=params).json()
        self.access_token = resp["access_token"]
        self.token_expires_at = time.time() + 7200 - 300  # 提前5分钟刷新
        return self.access_token
    
    def upload_image(self, image_path):
        """上传图片素材"""
        token = self.get_access_token()
        url = f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={token}&type=image"
        
        with open(image_path, "rb") as f:
            files = {"media": f}
            resp = requests.post(url, files=files).json()
        
        return resp["media_id"]  # 用于文章封面
    
    def create_draft(self, title, content, thumb_media_id):
        """创建草稿"""
        token = self.get_access_token()
        url = f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={token}"
        
        data = {
            "articles": [{
                "title": title,
                "content": content,  # 需要转HTML
                "thumb_media_id": thumb_media_id,
                "author": "AI运营助手"
            }]
        }
        
        resp = requests.post(url, json=data).json()
        return resp["media_id"]  # 草稿ID
```

#### 2.3 抖音对接方案

**申请流程:**
1. 注册字节跳动开放平台
2. 创建应用，获取 Client Key / Client Secret
3. 授权用户账号
4. 获取 access_token

**核心 API:**
```python
# 发布视频（草稿）
POST https://developer.toutiao.com/apps/v2/video/publish_video/

# 获取用户信息
GET https://developer.toutiao.com/apps/v2/user/info/
```

**Python 实现:**
```python
class DouyinClient:
    def __init__(self, client_key, client_secret):
        self.client_key = client_key
        self.client_secret = client_secret
    
    def get_access_token(self, code):
        # 使用授权码获取 token
        url = "https://developer.toutiao.com/apps/v2/token"
        params = {
            "app_id": self.client_key,
            "secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code"
        }
        return requests.get(url, params=params).json()
    
    def upload_video(self, video_path, access_token):
        """上传视频"""
        url = f"https://developer.toutiao.com/apps/v2/video/upload/?access_token={access_token}"
        
        with open(video_path, "rb") as f:
            files = {"video": f}
            resp = requests.post(url, files=files).json()
        
        return resp["video_id"]
    
    def publish_video(self, video_id, caption, access_token):
        """发布视频到草稿箱"""
        url = f"https://developer.toutiao.com/apps/v2/video/publish_video/?access_token={access_token}"
        data = {
            "video_id": video_id,
            "caption": caption  # 文案
        }
        return requests.post(url, json=data).json()
```

#### 2.4 小红书对接方案

**问题:** 小红书官方不开放公开 API

**替代方案:**
1. **RPA 方案** — 使用 Selenium/Playwright 自动化
2. **第三方服务** — 使用聚合平台（如易撰、爆点）
3. **手动导出** — 生成内容后用户手动发布

**RPA 示例（高风险，仅供参考）:**
```python
from playwright.sync_api import sync_playwright

class XiaohongshuRPA:
    def __init__(self):
        self.browser = None
        self.page = None
    
    def login(self, phone, code):
        """登录"""
        with sync_playwright() as p:
            self.browser = p.chromium.launch(headless=False)
            self.page = self.browser.new_page()
            self.page.goto("https://www.xiaohongshu.com")
            
            # 填写手机号，获取验证码
            self.page.fill('input[placeholder*="手机号"]', phone)
            self.page.click('button:has-text("获取验证码")')
            
            # 输入验证码
            code_input = input("请输入验证码: ")
            self.page.fill('input[placeholder*="验证码"]', code_input)
            self.page.click('button:has-text("登录")')
    
    def publish(self, title, content, image_path):
        """发布笔记"""
        self.page.click('button:has-text("发布笔记")')
        self.page.fill('textarea[placeholder*="填写标题"]', title)
        self.page.fill('textarea[placeholder*="填写正文"]', content)
        
        # 上传图片
        self.page.set_input_files('input[type="file"]', image_path)
        
        # 点击发布到草稿
        self.page.click('button:has-text("存草稿")')
```

⚠️ **注意:** RPA 方案不稳定，官方会更新反爬策略，需谨慎使用。

---

### 3. 自动化推文实现流程

**完整流程:**

```
用户输入内容
    ↓
AI 改写（3个平台版本）
    ↓
用户选择要推送的平台
    ↓
调用平台 API 推送
    ↓
返回草稿ID/发布结果
    ↓
记录推送日志
```

**API 接口设计:**
```python
# /api/platform/push
@app.post("/api/platform/push")
async def push_to_platform(platform: str, content: PlatformContent):
    # 根据平台调用对应的客户端
    if platform == "wechat":
        result = wechat_client.create_draft(...)
    elif platform == "douyin":
        result = douyin_client.publish_video(...)
    # ...
    
    # 记录日志
    log_push(platform, result)
    
    return {
        "success": True,
        "message": f"已推送至{platform_name}草稿箱",
        "platform": platform,
        "content_id": result.get("media_id"),
        "note": "真实推送"
    }
```

---

### 4. 内容存储

**当前实现:** 内存存储（Demo 用）

**生产环境建议:**

| 方案 | 适用场景 |
|------|---------|
| **SQLite** | 小规模、单机部署 |
| **MySQL/PostgreSQL** | 中等规模、团队协作 |
| **MongoDB** | 大规模、非结构化数据 |
| **Redis** | 缓存 + 临时存储 |

**MySQL 表结构设计:**
```sql
CREATE TABLE content_items (
    id VARCHAR(36) PRIMARY KEY,
    original_text TEXT,
    original_image VARCHAR(512),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adapted_contents (
    id VARCHAR(36) PRIMARY KEY,
    item_id VARCHAR(36),
    platform VARCHAR(20),
    platform_name VARCHAR(50),
    title VARCHAR(200),
    content TEXT,
    hashtags JSON,
    image VARCHAR(512),
    FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE
);

CREATE TABLE push_logs (
    id VARCHAR(36) PRIMARY KEY,
    adapted_content_id VARCHAR(36),
    platform VARCHAR(20),
    status VARCHAR(20),  -- success/failed/pending
    content_id VARCHAR(100),
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5. 定时任务（可选）

**需求:** 定时自动推送内容

**实现方案:**
- **APScheduler** — Python 定时任务库
- **Celery + Redis** — 分布式任务队列

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour='9', minute='0')
async def daily_push():
    """每天上午9点自动推送"""
    items = get_pending_items()
    for item in items:
        await push_to_platform(item.platform, item.content)

scheduler.start()
```

---

## 技术架构图

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React/Vue)                     │
│   - 内容输入   - 平台选择   - 结果预览   - 推送管理       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP API
┌────────────────────────▼────────────────────────────────┐
│              FastAPI 后端服务                           │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ AI Service  │  │ Storage      │  │ Push Service  │   │
│  │ DeepSeek    │  │ MySQL/Redis  │  │ 平台 API 适配  │   │
│  └─────────────┘  └──────────────┘  └───────┬───────┘   │
└───────────────────────────────────────────────┘       │
                          │                              │
         ┌────────────────┼────────────────┐              │
         ▼                ▼                ▼              │
┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   微信公众号   │  │   小红书     │  │    抖音       │    │
│  (官方 API)  │  │  (RPA/第三方) │  │ (官方 API)  │    │
└──────────────┘  └──────────────┘  └──────────────┘    │
```

---

## 开发建议

### 短期（MVP）
1. ✅ 完善 AI 改写功能
2. ⬜ 对接微信公众号 API
3. ⬜ 替换内存存储为 SQLite
4. ⬜ 添加推送日志功能

### 中期
1. ⬜ 对接抖音 API
2. ⬜ 实现定时推送任务
3. ⬜ 添加用户认证
4. ⬜ 支持图片上传处理

### 长期
1. ⬜ 小红书 RPA 集成（风险提示）
2. ⬜ 数据统计分析
3. ⬜ 多账号管理
4. ⬜ A/B 测试功能

---

## 第三方平台对接注意事项

1. **API 限流** — 各平台都有调用频率限制
2. **access_token 有效期** — 需定期刷新（通常2小时）
3. **内容审核** — 推送后可能被平台审核
4. **版权问题** — AI 生成内容需人工审核
5. **账号风控** - 频繁推送可能触发风控