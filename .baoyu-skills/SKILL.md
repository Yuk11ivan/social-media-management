# baoyu-post-to-wechat

将内容发布到微信公众号的技能。支持文章（news）和图文（newspic）两种形式。

## 版本
1.0.0

## 发布方式

| 方式 | 速度 | 要求 |
|------|------|------|
| API（推荐） | 快 | WeChat AppID + AppSecret，服务器 IP 在白名单 |
| Browser | 慢 | Chrome + 已登录微信公众平台 |

## 快速开始

### 配置凭证

在项目根目录 `.env` 文件中设置：

```env
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=your_app_secret_here
```

### 通过 API 发布

```bash
# 启动后端服务
cd backend
pip install -r requirements.txt
python main.py

# 测试微信连接
curl "http://localhost:8000/api/wechat/test"

# 推送内容
curl -X POST "http://localhost:8000/api/platform/push?platform=wechat" \
  -H "Content-Type: application/json" \
  -d '{"platform":"wechat","platform_name":"微信公众号","title":"测试标题","content":"测试内容","hashtags":[]}'
```

## Markdown 转微信 HTML

支持将 Markdown 内容转换为微信公众号兼容的 HTML 格式，包括：
- 标题（H1-H3）
- 粗体、斜体、行内代码
- 图片、链接
- 引用、列表

## 主题

- `default` — 经典白色，蓝色强调
- `grace` — 优雅暖灰，棕色强调  
- `simple` — 极简黑白
- `modern` — 深蓝商务

## 功能

- 创建图文草稿（news）
- 创建图片消息草稿（newspic）
- 图片上传到微信 CDN
- Markdown → 微信兼容 HTML
- 封面图自动生成
- 推送日志记录
