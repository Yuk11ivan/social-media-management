"""
FastAPI 主应用 — 多平台账号自动化运营系统后端 v2.1
"""
import sys

# Windows 控制台默认 GBK，脚本输出含 emoji/特殊字符时 print 会抛 UnicodeEncodeError
if sys.platform == "win32":
    for _stream in (sys.stdout, sys.stderr):
        if hasattr(_stream, "reconfigure"):
            try:
                _stream.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from models import (
    ContentGenerateRequest,
    ContentGenerateResponse,
    ContentSaveRequest,
    ContentItem,
    ContentListResponse,
    PlatformContent,
)
from ai_service import ai_service
from storage_mysql import storage_service
from wechat_api import WechatAPIError, strip_image_placeholders
from datetime import datetime
from pathlib import Path
import uuid
import shutil
import os
import uvicorn
from config import (
    SERVER_HOST, SERVER_PORT, DEEPSEEK_API_KEY, BAILIAN_API_KEY,
    AI_MODEL_STRATEGY,
    WECHAT_DEFAULT_AUTHOR,
    WECHAT_DEFAULT_THEME, WECHAT_NEED_OPEN_COMMENT, WECHAT_ONLY_FANS_CAN_COMMENT,
)
from auth.router import router as auth_router
from auth.dependencies import get_current_user
from platforms.router import router as platforms_router
from platforms.service import get_user_wechat_api, get_user_weibo_profile_dir
from publishers.weibo_publisher import WeiboPublisherError, publish_weibo
from publishers.xiaohongshu_publisher import XiaohongshuPublisherError, publish_xiaohongshu
from publishers.douyin_publisher import DouyinPublisherError, publish_douyin
from image_service import extract_visual_keywords, generate_image

# ===== 文件存储配置 =====
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

app = FastAPI(
    title="多平台账号自动化运营系统API",
    description="智能内容适配与多平台发布服务 — 支持 DeepSeek + 千问双模型",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务 — 供前端访问上传的素材
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(auth_router)
app.include_router(platforms_router)


@app.on_event("startup")
async def startup_event():
    """应用启动：初始化数据库"""
    try:
        storage_service.init_database()
        print("[DB] 数据库初始化完成")
    except Exception as e:
        print(f"[DB] 初始化警告: {e}")

    ds_ok = DEEPSEEK_API_KEY and DEEPSEEK_API_KEY != "sk-..."
    bl_ok = BAILIAN_API_KEY and len(BAILIAN_API_KEY) > 20
    print(f"[AI] DeepSeek: {'[OK]' if ds_ok else '[MISSING]'}")
    print(f"[AI] 百炼千问: {'[OK]' if bl_ok else '[MISSING]'}")
    print(f"[AI] 模型策略: {AI_MODEL_STRATEGY}")
    print(f"[Storage] 上传目录: {UPLOAD_DIR}")
    print(f"[Storage] 已有文件: {len(list(UPLOAD_DIR.glob('*')))}")


def _save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    """保存上传文件到磁盘，返回 (filename, file_path, file_size)"""
    # 生成唯一文件名
    ext = Path(file.filename).suffix.lower() if file.filename else '.jpg'
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {ext}")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name

    # 写入文件
    file_size = 0
    with open(file_path, "wb") as f:
        content = file.file.read()
        if len(content) > MAX_FILE_SIZE:
            file_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="文件超过 10MB 限制")
        f.write(content)
        file_size = len(content)

    return unique_name, str(file_path), file_size


@app.get("/")
async def root():
    """根路径 — 服务状态"""
    db_connected = False
    try:
        conn = storage_service._get_connection()
        conn.close()
        db_connected = True
    except Exception:
        pass

    file_count = len(list(UPLOAD_DIR.glob('*')))
    return {
        "service": "多平台账号自动化运营系统API",
        "status": "running",
        "version": "2.1.0",
        "ai": {
            "strategy": AI_MODEL_STRATEGY,
            "deepseek": DEEPSEEK_API_KEY != "sk-...",
            "bailian_qwen": len(BAILIAN_API_KEY) > 20,
        },
        "database": "MySQL (腾讯云)" if db_connected else "未连接",
        "storage": f"{file_count} 个素材文件",
        "auth": "enabled",
    }


# ===================== 内容生成 =====================

@app.post("/api/content/generate", response_model=ContentGenerateResponse)
async def generate_content(
    request: ContentGenerateRequest,
    current_user: dict = Depends(get_current_user),
):
    """内容生成接口（需登录）— 支持多图 + 双模型智能选择"""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="内容不能为空")

    platforms = request.platforms or ["wechat"]
    all_images = []
    if request.image:
        all_images.append(request.image)
    if request.images:
        all_images.extend(request.images)

    try:
        results = ai_service.generate_all_platforms(
            text=request.text,
            image=all_images[0] if len(all_images) == 1 else None,
            images=all_images if len(all_images) > 1 else None,
            platforms=platforms,
        )
        return ContentGenerateResponse(
            results=results,
            contents=results,
            timestamp=datetime.now().isoformat(),
            created_at=datetime.now(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内容生成失败: {str(e)}")


@app.post("/api/content/save", response_model=ContentItem)
async def save_content(
    request: ContentSaveRequest,
    current_user: dict = Depends(get_current_user),
):
    """内容保存接口（需登录）"""
    try:
        item = storage_service.save(
            original_text=request.original_text,
            original_image=request.original_image,
            original_images=request.original_images,
            adapted_contents=request.adapted_contents,
            user_id=current_user["id"],
        )
        return item
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内容保存失败: {str(e)}")


@app.get("/api/content/list", response_model=ContentListResponse)
async def list_content(
    limit: int = 20,
    offset: int = 0,
    platform: str = None,
    current_user: dict = Depends(get_current_user),
):
    try:
        items = storage_service.list(
            limit=limit, offset=offset,
            user_id=current_user["id"], platform=platform or None,
        )
        total = storage_service.count(user_id=current_user["id"], platform=platform or None)
        return ContentListResponse(items=items, total=total)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取列表失败: {str(e)}")


@app.get("/api/content/{item_id}", response_model=ContentItem)
async def get_content(
    item_id: str,
    current_user: dict = Depends(get_current_user),
):
    item = storage_service.get(item_id, user_id=current_user["id"])
    if not item:
        raise HTTPException(status_code=404, detail="内容不存在")
    return item


@app.delete("/api/content/{item_id}")
async def delete_content(
    item_id: str,
    current_user: dict = Depends(get_current_user),
):
    success = storage_service.delete(item_id, user_id=current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="内容不存在")
    return {"message": "删除成功", "id": item_id}


@app.get("/api/push/logs")
async def get_push_logs(
    platform: str = None,
    status: str = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    try:
        logs = storage_service.get_push_logs(
            platform=platform, status=status,
            limit=limit, offset=offset, user_id=current_user["id"],
        )
        return {"logs": logs, "total": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取推送日志失败: {str(e)}")


# ===================== 素材管理 =====================

@app.get("/api/materials")
async def list_materials(
    file_type: str = None,
    platform: str = None,
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    """获取素材列表 — 返回可访问的 URL"""
    try:
        materials = storage_service.list_materials(
            file_type=file_type, platform=platform, limit=limit, offset=offset
        )
        # 返回相对路径，由前端 Vite 代理 /uploads 访问
        for m in materials:
            fp = m.get("file_path", "")
            if fp and not fp.startswith("http") and not fp.startswith("/"):
                m["file_path"] = f"/uploads/{Path(fp).name}"
            m["file_type"] = m.get("file_type", "image")
        return {"materials": materials, "total": len(materials)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取素材列表失败: {str(e)}")


@app.post("/api/materials")
async def upload_material(
    file: UploadFile = File(...),
    platform: str = Form(""),
    current_user: dict = Depends(get_current_user),
):
    """上传素材 — 保存文件到磁盘并写入数据库"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="未选择文件")

    try:
        # 保存文件到磁盘
        unique_name, file_path, file_size = _save_upload_file(file)

        # 推断文件类型
        ext = Path(file.filename).suffix.lower()
        mime_map = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
        }
        file_type = mime_map.get(ext, 'application/octet-stream')

        # 保存到数据库
        material_id = storage_service.save_material(
            name=file.filename,
            file_path=unique_name,  # 存储相对文件名
            file_type=file_type,
            platform=platform or None,
            file_size=file_size,
        )

        return {
            "id": material_id,
            "name": file.filename,
            "file_path": f"/uploads/{unique_name}",
            "file_type": file_type,
            "file_size": file_size,
            "message": "素材上传成功",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")


@app.delete("/api/materials/{material_id}")
async def delete_material(
    material_id: str,
    current_user: dict = Depends(get_current_user),
):
    """删除素材 — 从数据库和磁盘同时删除"""
    try:
        # 先获取文件路径
        materials = storage_service.list_materials(limit=1000)
        target = next((m for m in materials if m["id"] == material_id), None)

        if target:
            # 删除磁盘文件
            fp = target.get("file_path", "")
            if fp and not fp.startswith("http"):
                file_path = UPLOAD_DIR / fp
                file_path.unlink(missing_ok=True)

        # 从数据库删除
        success = storage_service.delete_material(material_id)
        if not success:
            raise HTTPException(status_code=404, detail="素材不存在")
        return {"message": "删除成功", "id": material_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


# ===================== AI 图片生成 =====================

@app.post("/api/image/extract-keywords")
async def api_extract_keywords(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """从文案中提取视觉关键词"""
    content = body.get("content", "")
    title = body.get("title", "")
    if not content:
        raise HTTPException(status_code=400, detail="内容不能为空")
    try:
        keywords = await extract_visual_keywords(content, title)
        return {"keywords": keywords}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"关键词提取失败: {str(e)}")


@app.post("/api/image/generate")
async def api_generate_image(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """根据提示词生成图片"""
    prompt = body.get("prompt", "")
    negative_prompt = body.get("negative_prompt", "")
    size = body.get("size", "1024*1024")
    n = body.get("n", 1)
    if not prompt:
        raise HTTPException(status_code=400, detail="提示词不能为空")
    try:
        images = await generate_image(
            prompt=prompt,
            negative_prompt=negative_prompt,
            size=size,
            n=min(n, 4),
        )
        return {"images": images, "count": len(images)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图片生成失败: {str(e)}")


# ===================== 平台推送 =====================

@app.post("/api/platform/push")
async def push_to_platform(
    platform: str,
    content: PlatformContent,
    adapted_content_id: str = None,
    current_user: dict = Depends(get_current_user),
):
    """推送到平台草稿箱（需登录）"""
    platform_names = {
        "wechat": "微信公众号",
        "xiaohongshu": "小红书",
        "douyin": "抖音",
        "weibo": "微博",
    }
    platform_name = platform_names.get(platform, platform)
    user_id = current_user["id"]

    if platform == "wechat":
        try:
            wechat_api = get_user_wechat_api(user_id)

            # 收集所有图片
            body_images = []
            if content.images:
                for i, img_b64 in enumerate(content.images):
                    body_images.append((img_b64, f"body_{i+1}.png"))
            elif content.image:
                body_images.append((content.image, "body_1.png"))

            # 封面图
            cover_img = None
            if content.image:
                cover_img = content.image
            elif content.images and len(content.images) > 0:
                cover_img = content.images[0]

            # 摘要
            raw_content = strip_image_placeholders(content.content or "")
            digest = raw_content[:100].replace("#", "").replace("*", "").strip()
            if len(raw_content) > 100:
                digest += "..."

            result = wechat_api.publish_article(
                title=content.title,
                content=raw_content,
                author=WECHAT_DEFAULT_AUTHOR,
                digest=digest,
                body_images_b64=body_images if body_images else None,
                cover_image_b64=cover_img,
                theme=WECHAT_DEFAULT_THEME,
                article_type="news",
                need_open_comment=WECHAT_NEED_OPEN_COMMENT,
                only_fans_can_comment=WECHAT_ONLY_FANS_CAN_COMMENT,
            )

            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="success",
                content_id=result.get("media_id", ""),
                message=f"已发布到微信公众号草稿箱",
                user_id=user_id,
            )
            return {
                "success": True,
                "message": f"已成功推送至{platform_name}草稿箱",
                "platform": platform,
                "media_id": result.get("media_id"),
            }

        except WechatAPIError as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=f"微信API错误[{e.errcode}]: {e.errmsg}",
                user_id=user_id,
            )
            raise HTTPException(status_code=500, detail=f"微信推送失败: {e.errmsg}")
        except HTTPException:
            raise
        except Exception as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed", message=str(e), user_id=user_id,
            )
            raise HTTPException(status_code=500, detail=f"推送失败: {str(e)}")

    if platform == "weibo":
        try:
            result = publish_weibo(user_id, content.content, content.images, title=content.title)

            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="success",
                content_id=result.get("content_id", ""),
                message=result.get("message", "微博内容已填入编辑器"),
                user_id=user_id,
            )
            return {
                "success": True,
                "message": result.get("message", f"已成功推送至{platform_name}"),
                "platform": platform,
                "content_id": result.get("content_id"),
                "post_type": result.get("post_type"),
            }

        except WeiboPublisherError as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=str(e),
                user_id=user_id,
            )
            raise HTTPException(status_code=500, detail=f"微博推送失败: {e}")
        except HTTPException:
            raise
        except Exception as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=str(e),
                user_id=user_id,
            )
            raise HTTPException(status_code=500, detail=f"推送失败: {str(e)}")

    if platform == "xiaohongshu":
        try:
            # 收集图片：优先用 images 列表，降级用 image 封面图
            xhs_images = content.images if content.images else (
                [content.image] if content.image else None
            )

            # 调试日志：记录图片传递情况
            img_count = len(xhs_images) if xhs_images else 0
            img_preview = ""
            if xhs_images and len(xhs_images) > 0:
                img_preview = xhs_images[0][:80] + "..." if len(xhs_images[0]) > 80 else xhs_images[0]
            print(f"[XHS Push] title={content.title!r}, images_raw={content.images is not None}({len(content.images) if content.images else 0}), image_single={content.image is not None}, xhs_images={img_count}, preview={img_preview!r}")

            result = publish_xiaohongshu(
                user_id=user_id,
                content=content.content,
                title=content.title,
                images=xhs_images,
                topics=content.hashtags,
            )

            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="success",
                content_id=result.get("content_id", ""),
                message=result.get("message", "小红书笔记已填入编辑器"),
                user_id=user_id,
            )
            return {
                "success": True,
                "message": result.get("message", f"已成功推送至{platform_name}"),
                "platform": platform,
                "content_id": result.get("content_id"),
            }

        except XiaohongshuPublisherError as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=str(e),
                user_id=user_id,
            )
            raise HTTPException(status_code=500, detail=f"小红书推送失败: {e}")
        except HTTPException:
            raise
        except Exception as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=str(e),
                user_id=user_id,
            )
            raise HTTPException(status_code=500, detail=f"推送失败: {str(e)}")

    if platform == "douyin":
        try:
            dy_images = content.images if content.images else (
                [content.image] if content.image else None
            )
            img_count = len(dy_images) if dy_images else 0
            img_preview = ""
            if dy_images and len(dy_images) > 0:
                img_preview = dy_images[0][:80] + "..." if len(dy_images[0]) > 80 else dy_images[0]
            print(f"[DY Push] title={content.title!r}, images={img_count}, preview={img_preview!r}")

            result = publish_douyin(
                user_id=user_id,
                content=content.content,
                title=content.title,
                images=dy_images,
                topics=content.hashtags,
            )

            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="success",
                content_id=result.get("content_id", ""),
                message=result.get("message", "抖音图文已填入编辑器"),
                user_id=user_id,
            )
            return {
                "success": True,
                "message": result.get("message", f"已成功推送至{platform_name}"),
                "platform": platform,
                "content_id": result.get("content_id"),
            }

        except DouyinPublisherError as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=str(e),
                user_id=user_id,
            )
            raise HTTPException(status_code=500, detail=f"抖音推送失败: {e}")
        except HTTPException:
            raise
        except Exception as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=str(e),
                user_id=user_id,
            )
            raise HTTPException(status_code=500, detail=f"推送失败: {str(e)}")

    # 其他平台 Mock
    try:
        content_id = f"mock_{datetime.now().timestamp()}"
        storage_service.log_push(
            adapted_content_id=adapted_content_id,
            platform=platform,
            platform_name=platform_name,
            status="success",
            content_id=content_id,
            message=f"Mock推送成功",
            user_id=user_id,
        )
        return {
            "success": True,
            "message": f"已成功推送至{platform_name}（Mock）",
            "platform": platform,
            "content_id": content_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"推送失败: {str(e)}")


if __name__ == "__main__":
    print("=" * 55)
    print("  多平台账号自动化运营系统 — 后端服务 v2.1")
    print("=" * 55)
    print(f"  服务地址: http://{SERVER_HOST}:{SERVER_PORT}")
    print(f"  API文档:  http://{SERVER_HOST}:{SERVER_PORT}/docs")
    print(f"  AI 模型: DeepSeek + 百炼千问")
    print(f"  素材存储: {UPLOAD_DIR}")
    print("=" * 55)
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)
