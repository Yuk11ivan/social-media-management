"""
微信公众号 API 客户端
支持：草稿创建、图文发布、图片上传
基于 baoyu-post-to-wechat skill 的 Python 实现
"""
import os
import json
import base64
from typing import Optional, List, Dict, Tuple
from pathlib import Path
import httpx
from config import WECHAT_APP_ID, WECHAT_APP_SECRET

UPLOAD_DIR = Path(__file__).parent / "uploads"


# 微信 API 端点
TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token"
UPLOAD_IMG_URL = "https://api.weixin.qq.com/cgi-bin/media/uploadimg"
UPLOAD_MATERIAL_URL = "https://api.weixin.qq.com/cgi-bin/material/add_material"
DRAFT_ADD_URL = "https://api.weixin.qq.com/cgi-bin/draft/add"

IMAGE_PLACEHOLDER_PATTERNS = [
    r"\[插入图片\s*\d+\]",
    r"\[配图\s*\d+\]",
    r"\[图片\s*\d+\]",
    r"\[配图建议[：:][^\]]*\]",
    r"\[插入图\s*\d+\]",
]


def strip_image_placeholders(text: str) -> str:
    """移除正文中所有图片占位符标记"""
    import re
    if not text:
        return text
    result = text
    for pat in IMAGE_PLACEHOLDER_PATTERNS:
        result = re.sub(pat, "", result, flags=re.IGNORECASE)
    return re.sub(r"\n{3,}", "\n\n", result).strip()


def _b64_decode_loose(data: str) -> bytes:
    payload = data.strip()
    if "," in payload and payload.startswith("data:"):
        payload = payload.split(",", 1)[1]
    missing = len(payload) % 4
    if missing:
        payload += "=" * (4 - missing)
    return base64.b64decode(payload)


def resolve_image_bytes(image_ref: str, client: httpx.Client = None) -> bytes:
    """
    将多种图片引用解析为二进制：
    - data:image/...;base64,...
    - /uploads/drafts/... 本地路径
    - http(s):// URL
    - 纯 base64 字符串
    """
    ref = (image_ref or "").strip()
    if not ref:
        raise ValueError("图片为空")

    if ref.startswith("data:"):
        return _b64_decode_loose(ref)

    uploads_prefix = "/uploads/"
    if ref.startswith(uploads_prefix):
        local = UPLOAD_DIR / ref[len(uploads_prefix):].replace("/", os.sep)
        if not local.exists():
            raise FileNotFoundError(f"图片文件不存在: {ref}")
        return local.read_bytes()

    if ref.startswith("http://") or ref.startswith("https://"):
        http = client or httpx.Client(timeout=60.0)
        own_client = client is None
        try:
            resp = http.get(ref)
            resp.raise_for_status()
            return resp.content
        finally:
            if own_client:
                http.close()

    if ref.startswith("uploads/"):
        local = UPLOAD_DIR / ref[len("uploads/"):].replace("/", os.sep)
        if local.exists():
            return local.read_bytes()

    return _b64_decode_loose(ref)


def guess_image_filename(image_ref: str, default: str = "image.png") -> str:
    ref = (image_ref or "").split("?")[0]
    if "/uploads/" in ref or ref.startswith("http"):
        name = Path(ref).name
        if name and "." in name:
            return name
    return default


class WechatAPIError(Exception):
    """微信 API 异常"""
    def __init__(self, errcode: int, errmsg: str):
        self.errcode = errcode
        self.errmsg = errmsg
        super().__init__(f"WeChat API Error [{errcode}]: {errmsg}")


class WechatAPI:
    """微信公众号 API 客户端"""

    def __init__(self, app_id: str = None, app_secret: str = None):
        self.app_id = app_id or WECHAT_APP_ID
        self.app_secret = app_secret or WECHAT_APP_SECRET
        self._access_token: Optional[str] = None
        self._client = httpx.Client(timeout=60.0)

    # ========== Access Token ==========

    def get_access_token(self) -> str:
        """获取微信 access_token"""
        if self._access_token:
            return self._access_token

        url = f"{TOKEN_URL}?grant_type=client_credential&appid={self.app_id}&secret={self.app_secret}"
        resp = self._client.get(url)
        data = resp.json()

        if "errcode" in data and data["errcode"] != 0:
            raise WechatAPIError(data["errcode"], data.get("errmsg", "Unknown error"))

        self._access_token = data["access_token"]
        return self._access_token

    def _ensure_token(self):
        if not self._access_token:
            self.get_access_token()

    # ========== 图片上传 ==========

    def upload_body_image(self, image_path: str) -> str:
        """
        上传正文图片（media/uploadimg）
        返回图片 URL
        """
        self._ensure_token()
        url = f"{UPLOAD_IMG_URL}?access_token={self._access_token}"

        abs_path = Path(image_path).resolve()
        if not abs_path.exists():
            raise FileNotFoundError(f"图片不存在: {image_path}")

        with open(abs_path, "rb") as f:
            files = {"media": (abs_path.name, f, self._guess_content_type(str(abs_path)))}
            resp = self._client.post(url, files=files)

        data = resp.json()
        if "errcode" in data and data["errcode"] != 0:
            raise WechatAPIError(data["errcode"], data.get("errmsg", ""))

        return self._ensure_https(data["url"])

    def upload_cover_image(self, image_path: str) -> str:
        """
        上传封面/素材图片（material/add_material）
        返回 media_id
        """
        abs_path = Path(image_path).resolve()
        if not abs_path.exists():
            raise FileNotFoundError(f"封面图不存在: {image_path}")

        with open(abs_path, "rb") as f:
            image_data = self._normalize_cover_bytes(f.read())

        self._ensure_token()
        url = f"{UPLOAD_MATERIAL_URL}?type=image&access_token={self._access_token}"
        files = {"media": ("cover.jpg", image_data, "image/jpeg")}
        resp = self._client.post(url, files=files)

        data = resp.json()
        if "errcode" in data and data["errcode"] != 0:
            raise WechatAPIError(data["errcode"], data.get("errmsg", ""))

        return data["media_id"]

    def upload_base64_image(self, image_b64: str, filename: str = "image.png") -> str:
        """
        上传图片作为正文图片（支持 base64、/uploads/ 路径、URL）
        返回图片 URL
        """
        self._ensure_token()
        url = f"{UPLOAD_IMG_URL}?access_token={self._access_token}"

        image_data = resolve_image_bytes(image_b64, self._client)
        filename = guess_image_filename(image_b64, filename)
        content_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"

        files = {"media": (filename, image_data, content_type)}
        resp = self._client.post(url, files=files)

        data = resp.json()
        if "errcode" in data and data["errcode"] != 0:
            raise WechatAPIError(data["errcode"], data.get("errmsg", ""))

        return self._ensure_https(data["url"])

    def upload_base64_cover(self, image_b64: str, filename: str = "cover.jpg") -> str:
        """
        上传图片作为封面素材（支持 base64、/uploads/ 路径、URL）
        返回 media_id
        """
        self._ensure_token()
        url = f"{UPLOAD_MATERIAL_URL}?type=image&access_token={self._access_token}"

        image_data = self._normalize_cover_bytes(
            resolve_image_bytes(image_b64, self._client)
        )
        files = {"media": ("cover.jpg", image_data, "image/jpeg")}
        resp = self._client.post(url, files=files)

        data = resp.json()
        if "errcode" in data and data["errcode"] != 0:
            raise WechatAPIError(data["errcode"], data.get("errmsg", ""))

        return data["media_id"]

    # ========== 草稿发布 ==========

    def create_news_draft(
        self,
        title: str,
        content_html: str,
        thumb_media_id: str,
        author: str = "",
        digest: str = "",
        content_source_url: str = "",
        need_open_comment: int = 1,
        only_fans_can_comment: int = 0,
    ) -> Dict:
        """
        创建图文（news）草稿
        """
        self._ensure_token()
        url = f"{DRAFT_ADD_URL}?access_token={self._access_token}"

        article = {
            "article_type": "news",
            "title": title,
            "content": content_html,
            "thumb_media_id": thumb_media_id,
            "need_open_comment": need_open_comment,
            "only_fans_can_comment": only_fans_can_comment,
        }

        if author:
            article["author"] = author
        if digest:
            article["digest"] = digest[:120]  # 微信限制120字符
        if content_source_url:
            article["content_source_url"] = content_source_url

        resp = self._client.post(
            url,
            headers={"Content-Type": "application/json"},
            content=json.dumps({"articles": [article]}, ensure_ascii=False).encode("utf-8")
        )

        data = resp.json()
        if "errcode" in data and data["errcode"] != 0:
            raise WechatAPIError(data["errcode"], data.get("errmsg", ""))

        return data

    def create_newspic_draft(
        self,
        title: str,
        text_content: str,
        image_media_ids: List[str],
        author: str = "",
        need_open_comment: int = 1,
        only_fans_can_comment: int = 0,
    ) -> Dict:
        """
        创建图片消息（newspic）草稿
        支持最多 9 张图片
        """
        self._ensure_token()
        url = f"{DRAFT_ADD_URL}?access_token={self._access_token}"

        article = {
            "article_type": "newspic",
            "title": title,
            "content": text_content,
            "need_open_comment": need_open_comment,
            "only_fans_can_comment": only_fans_can_comment,
            "image_info": {
                "image_list": [{"image_media_id": mid} for mid in image_media_ids[:9]]
            },
        }

        if author:
            article["author"] = author

        resp = self._client.post(
            url,
            headers={"Content-Type": "application/json"},
            content=json.dumps({"articles": [article]}, ensure_ascii=False).encode("utf-8")
        )

        data = resp.json()
        if "errcode" in data and data["errcode"] != 0:
            raise WechatAPIError(data["errcode"], data.get("errmsg", ""))

        return data

    # ========== Markdown 转微信 HTML ==========

    def markdown_to_wechat_html(
        self,
        title: str,
        content: str,
        author: str = "",
        theme: str = "default",
    ) -> str:
        """
        将内容转换为微信公众号兼容的 HTML 格式
        支持内置主题：default, grace, simple, modern
        """
        from html import escape

        # 主题色配置
        themes = {
            "default": {"bg": "#ffffff", "color": "#333333", "header": "#222222", "accent": "#576b95"},
            "grace": {"bg": "#fbf9f7", "color": "#555555", "header": "#3e3e3e", "accent": "#b8a08a"},
            "simple": {"bg": "#ffffff", "color": "#333333", "header": "#111111", "accent": "#000000"},
            "modern": {"bg": "#ffffff", "color": "#2c3e50", "header": "#1a1a2e", "accent": "#0f3460"},
        }

        t = themes.get(theme, themes["default"])

        # 处理 Markdown 内容为微信兼容 HTML
        html_content = self._parse_markdown_to_html(content)

        author_html = ""
        if author:
            author_html = f'<p style="color:#888;font-size:14px;margin-bottom:10px;">作者：{escape(author)}</p>'

        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>{escape(title)}</title>
</head>
<body style="background:{t['bg']};color:{t['color']};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',sans-serif;font-size:16px;line-height:1.8;padding:20px;max-width:680px;margin:0 auto;">
<div id="content">
<h1 style="color:{t['header']};font-size:22px;font-weight:bold;margin-bottom:20px;border-bottom:2px solid {t['accent']};padding-bottom:12px;">{escape(title)}</h1>
{author_html}
{html_content}
</div>
</body>
</html>"""

    def _parse_markdown_to_html(self, text: str) -> str:
        """简单的 Markdown 转 HTML（微信兼容版）"""
        import re
        from html import escape

        lines = text.strip().split("\n")
        result = []
        in_list = False
        list_type = None

        for line in lines:
            stripped = line.strip()

            # 空行
            if not stripped:
                if in_list:
                    result.append("</ul>" if list_type == "ul" else "</ol>")
                    in_list = False
                continue

            # 已是 HTML 图片块（占位符替换后）
            if stripped.startswith("<") and "<img" in stripped:
                if in_list:
                    result.append("</ul>" if list_type == "ul" else "</ol>")
                    in_list = False
                result.append(stripped)
                continue

            # 图片占位符（未替换的残留，跳过）
            if re.match(r"^\[插入图片\s*\d+\]", stripped, re.IGNORECASE):
                continue

            # H2 ## Title
            h2_match = re.match(r"^##\s+(.+)", stripped)
            if h2_match:
                if in_list:
                    result.append("</ul>" if list_type == "ul" else "</ol>")
                    in_list = False
                result.append(
                    f'<h2 style="font-size:18px;font-weight:bold;margin:24px 0 12px;padding-bottom:8px;'
                    f'border-bottom:1px solid #eee;">{escape(h2_match.group(1))}</h2>'
                )
                continue

            # H3 ### Title
            h3_match = re.match(r"^###\s+(.+)", stripped)
            if h3_match:
                if in_list:
                    result.append("</ul>" if list_type == "ul" else "</ol>")
                    in_list = False
                result.append(
                    f'<h3 style="font-size:16px;font-weight:bold;margin:20px 0 10px;">'
                    f'{escape(h3_match.group(1))}</h3>'
                )
                continue

            # 无序列表
            ul_match = re.match(r"^[-*+]\s+(.+)", stripped)
            if ul_match:
                if not in_list or list_type != "ul":
                    if in_list:
                        result.append("</ul>" if list_type == "ul" else "</ol>")
                    result.append('<ul style="padding-left:20px;margin:8px 0;">')
                    in_list = True
                    list_type = "ul"
                result.append(f"<li>{self._inline_md(ul_match.group(1))}</li>")
                continue

            # 有序列表
            ol_match = re.match(r"^\d+[.)]\s+(.+)", stripped)
            if ol_match:
                if not in_list or list_type != "ol":
                    if in_list:
                        result.append("</ul>" if list_type == "ul" else "</ol>")
                    result.append('<ol style="padding-left:20px;margin:8px 0;">')
                    in_list = True
                    list_type = "ol"
                result.append(f"<li>{self._inline_md(ol_match.group(1))}</li>")
                continue

            # 引用
            quote_match = re.match(r"^>\s*(.*)", stripped)
            if quote_match:
                if in_list:
                    result.append("</ul>" if list_type == "ul" else "</ol>")
                    in_list = False
                result.append(
                    f'<blockquote style="border-left:3px solid #ddd;padding:8px 16px;'
                    f'margin:12px 0;color:#666;background:#f9f9f9;">'
                    f'{self._inline_md(quote_match.group(1))}</blockquote>'
                )
                continue

            # 分隔线
            if re.match(r"^[-*_]{3,}$", stripped):
                if in_list:
                    result.append("</ul>" if list_type == "ul" else "</ol>")
                    in_list = False
                result.append('<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">')
                continue

            # 普通段落
            if in_list:
                result.append("</ul>" if list_type == "ul" else "</ol>")
                in_list = False

            # 处理图片
            img_match = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", stripped)
            if img_match:
                alt_text = img_match.group(1) or "image"
                img_url = img_match.group(2)
                result.append(
                    f'<p style="text-align:center;margin:16px 0;">'
                    f'<img src="{img_url}" alt="{escape(alt_text)}" '
                    f'style="max-width:100%;border-radius:4px;display:block;margin:0 auto;">'
                    f'</p>'
                )
                continue

            # 普通段落
            result.append(
                f'<p style="margin:8px 0;text-indent:2em;">{self._inline_md(stripped)}</p>'
            )

        # 关闭未闭合的列表
        if in_list:
            result.append("</ul>" if list_type == "ul" else "</ol>")

        return "\n".join(result)

    def _inline_md(self, text: str) -> str:
        """处理行内 Markdown 格式"""
        import re
        from html import escape

        # 链接 [text](url)
        text = re.sub(
            r"\[([^\]]+)\]\(([^)]+)\)",
            lambda m: f'<a href="{m.group(2)}" style="color:#576b95;text-decoration:none;">{escape(m.group(1))}</a>',
            text
        )

        # 粗体 **text**
        text = re.sub(
            r"\*\*(.+?)\*\*",
            lambda m: f"<strong>{escape(m.group(1))}</strong>",
            text
        )

        # 斜体 *text*
        text = re.sub(
            r"\*(.+?)\*",
            lambda m: f"<em>{m.group(1)}</em>",
            text
        )

        # 行内代码 `code`
        text = re.sub(
            r"`([^`]+)`",
            lambda m: f'<code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-family:monospace;">{escape(m.group(1))}</code>',
            text
        )

        return text

    # ========== 完整发布流程 ==========

    def publish_article(
        self,
        title: str,
        content: str,
        author: str = "",
        digest: str = "",
        source_url: str = "",
        cover_image_b64: str = None,
        cover_image_path: str = None,
        body_images_b64: List[Tuple[str, str]] = None,
        theme: str = "default",
        article_type: str = "news",
        need_open_comment: int = 1,
        only_fans_can_comment: int = 0,
    ) -> Dict:
        """
        完整发布流程：
        1. 上传所有图片到微信 CDN
        2. 清理正文中的图片占位符
        3. 将所有图片追加到文末
        4. 生成 HTML → 创建草稿
        """
        import re

        # ===== Step 1: 上传所有图片 =====
        body_image_urls = []
        if body_images_b64:
            for i, (img_b64, filename) in enumerate(body_images_b64):
                try:
                    img_url = self.upload_base64_image(img_b64, filename)
                    body_image_urls.append(img_url)
                    print(f"[wechat_api] 图片{i+1} 上传成功")
                except Exception as e:
                    print(f"[wechat_api] 图片{i+1} 上传失败: {e}")
                    body_image_urls.append(None)

        valid_urls = [u for u in body_image_urls if u is not None]
        print(f"[wechat_api] 图片上传: {len(valid_urls)}/{len(body_image_urls)} 成功")

        # ===== Step 2: 清理正文中的占位符 =====
        processed = strip_image_placeholders(content)

        # ===== Step 3: 所有图片追加到文末 =====
        if valid_urls:
            image_blocks = '\n\n'.join(
                f'![配图{i + 1}]({url})' for i, url in enumerate(body_image_urls) if url
            )
            processed = f"{processed}\n\n{image_blocks}" if processed else image_blocks
            print(f"[wechat_api] ✓ {len(valid_urls)} 张配图已追加到文末")

        # ===== Step 4: 生成微信 HTML =====
        html_content = self.markdown_to_wechat_html(title, processed, author, theme)

        # ===== Step 5: 上传封面 =====
        thumb_media_id = ""
        if cover_image_b64:
            thumb_media_id = self.upload_base64_cover(cover_image_b64, "cover.png")
        elif cover_image_path:
            thumb_media_id = self.upload_cover_image(cover_image_path)
        else:
            thumb_media_id = self._create_placeholder_cover(title)

        # ===== Step 6: 创建草稿 =====
        result = self.create_news_draft(
            title=title,
            content_html=html_content,
            thumb_media_id=thumb_media_id,
            author=author,
            digest=digest,
            content_source_url=source_url,
            need_open_comment=need_open_comment,
            only_fans_can_comment=only_fans_can_comment,
        )

        print(f"[wechat_api] 草稿创建成功, media_id: {result.get('media_id', 'N/A')}")
        return {
            "media_id": result.get("media_id", ""),
            "title": title,
            "article_type": article_type,
        }

    def _normalize_cover_bytes(self, image_data: bytes) -> bytes:
        """将封面图裁剪为微信公众号要求的 900×383（约 2.35:1）"""
        import io
        from PIL import Image

        img = Image.open(io.BytesIO(image_data))
        if img.mode == "RGBA":
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        target_w, target_h = 900, 383
        w, h = img.size
        target_ratio = target_w / target_h
        current_ratio = w / h

        if current_ratio > target_ratio:
            new_w = int(h * target_ratio)
            left = (w - new_w) // 2
            img = img.crop((left, 0, left + new_w, h))
        else:
            new_h = int(w / target_ratio)
            top = (h - new_h) // 2
            img = img.crop((0, top, w, top + new_h))

        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=88)
        return buf.getvalue()

    def _create_placeholder_cover(self, title: str) -> str:
        """创建符合微信比例要求的占位封面图"""
        import io
        from PIL import Image, ImageDraw, ImageFont

        width, height = 900, 383
        img = Image.new("RGB", (width, height), (16, 185, 129))
        draw = ImageDraw.Draw(img)

        text = (title or "AI 运营工坊")[:20]
        try:
            font = ImageFont.truetype("msyh.ttc", 42)
        except Exception:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((width - tw) // 2, (height - th) // 2), text, fill=(255, 255, 255), font=font)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=88)
        png_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return self.upload_base64_cover(png_b64, "cover_placeholder.jpg")

    # ========== 工具方法 ==========

    @staticmethod
    def _guess_content_type(filepath: str) -> str:
        ext = Path(filepath).suffix.lower()
        mapping = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        return mapping.get(ext, "application/octet-stream")

    @staticmethod
    def _ensure_https(url: str) -> str:
        if url.startswith("http://"):
            return url.replace("http://", "https://", 1)
        return url

    def close(self):
        self._client.close()


# 单例
wechat_api = WechatAPI()
