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


# 微信 API 端点
TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token"
UPLOAD_IMG_URL = "https://api.weixin.qq.com/cgi-bin/media/uploadimg"
UPLOAD_MATERIAL_URL = "https://api.weixin.qq.com/cgi-bin/material/add_material"
DRAFT_ADD_URL = "https://api.weixin.qq.com/cgi-bin/draft/add"


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
        上传 Base64 编码的图片作为正文图片
        返回图片 URL
        """
        self._ensure_token()
        url = f"{UPLOAD_IMG_URL}?access_token={self._access_token}"

        # 去掉 data:image/xxx;base64, 前缀
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        image_data = base64.b64decode(image_b64)
        content_type = "image/png" if filename.endswith(".png") else "image/jpeg"

        files = {"media": (filename, image_data, content_type)}
        resp = self._client.post(url, files=files)

        data = resp.json()
        if "errcode" in data and data["errcode"] != 0:
            raise WechatAPIError(data["errcode"], data.get("errmsg", ""))

        return self._ensure_https(data["url"])

    def upload_base64_cover(self, image_b64: str, filename: str = "cover.jpg") -> str:
        """
        上传 Base64 编码的图片作为封面素材（自动裁剪为微信要求比例）
        返回 media_id
        """
        self._ensure_token()
        url = f"{UPLOAD_MATERIAL_URL}?type=image&access_token={self._access_token}"

        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        image_data = self._normalize_cover_bytes(base64.b64decode(image_b64))
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
        body_images_b64: List[Tuple[str, str]] = None,  # [(b64, filename), ...]
        theme: str = "default",
        article_type: str = "news",
        need_open_comment: int = 1,
        only_fans_can_comment: int = 0,
    ) -> Dict:
        """
        完整发布流程：
        1. 处理正文中图片 → 上传到微信 CDN
        2. 生成微信兼容 HTML
        3. 上传封面图
        4. 创建草稿

        返回：{"media_id": "xxx", "title": "...", "article_type": "news"}
        """
        # Step 1: 处理正文图片
        html_content = content
        body_image_urls = []

        if body_images_b64:
            for img_b64, filename in body_images_b64:
                try:
                    img_url = self.upload_base64_image(img_b64, filename)
                    body_image_urls.append(img_url)
                except Exception as e:
                    print(f"[wechat_api] 正文图片上传失败（跳过）: {e}")

        # 如果有图片URL，将它们嵌入 HTML
        if body_image_urls:
            img_tags = "".join(
                f'<p style="text-align:center;margin:16px 0;">'
                f'<img src="{url}" style="max-width:100%;border-radius:4px;">'
                f'</p>'
                for url in body_image_urls
            )
            # 将图片插入到内容末尾
            html_content = self.markdown_to_wechat_html(title, content, author, theme)
            html_content = html_content.replace("</div>", f"{img_tags}</div>")
        else:
            html_content = self.markdown_to_wechat_html(title, content, author, theme)

        # Step 2: 上传封面
        thumb_media_id = ""
        if cover_image_b64:
            thumb_media_id = self.upload_base64_cover(cover_image_b64, "cover.png")
        elif cover_image_path:
            thumb_media_id = self.upload_cover_image(cover_image_path)
        else:
            # 无封面图时，创建一个纯色占位封面
            thumb_media_id = self._create_placeholder_cover(title)

        # Step 3: 创建草稿
        if article_type == "newspic" and body_images_b64:
            # 图片消息：需要先上传为 material
            image_media_ids = []
            for img_b64, filename in body_images_b64[:9]:
                try:
                    mid = self.upload_base64_cover(img_b64, filename)
                    image_media_ids.append(mid)
                except Exception as e:
                    print(f"[wechat_api] 图片上传失败: {e}")

            result = self.create_newspic_draft(
                title=title,
                text_content=content,
                image_media_ids=image_media_ids,
                author=author,
                need_open_comment=need_open_comment,
                only_fans_can_comment=only_fans_can_comment,
            )
        else:
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
