"""
FastAPI主应用 - 多平台账号自动化运营系统后端
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    ContentGenerateRequest,
    ContentGenerateResponse,
    ContentSaveRequest,
    ContentItem,
    ContentListResponse,
    PlatformContent
)
from ai_service import ai_service
from storage_mysql import storage_service
from wechat_api import wechat_api, WechatAPIError
from datetime import datetime
import uvicorn
from config import (
    SERVER_HOST, SERVER_PORT, DEEPSEEK_API_KEY,
    WECHAT_APP_ID, WECHAT_APP_SECRET, WECHAT_DEFAULT_AUTHOR,
    WECHAT_DEFAULT_THEME, WECHAT_NEED_OPEN_COMMENT, WECHAT_ONLY_FANS_CAN_COMMENT
)

# 创建FastAPI应用
app = FastAPI(
    title="多平台账号自动化运营系统API",
    description="智能内容适配与多平台发布服务",
    version="1.0.0"
)

# 配置CORS（允许前端跨域访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
)


@app.get("/")
async def root():
    """根路径 - 服务状态"""
    # 检查数据库连接
    db_connected = False
    try:
        conn = storage_service._get_connection()
        conn.close()
        db_connected = True
    except:
        pass

    return {
        "service": "多平台账号自动化运营系统API",
        "status": "running",
        "ai_configured": DEEPSEEK_API_KEY != "sk-...",
        "database": "MySQL (腾讯云)" if db_connected else "未连接",
        "database_status": "已连接" if db_connected else "未连接"
    }


@app.post("/api/content/generate", response_model=ContentGenerateResponse)
async def generate_content(request: ContentGenerateRequest):
    """
    内容生成接口
    - 接收用户输入的文字和图片
    - 使用DeepSeek AI进行智能改写
    - 返回三个平台的适配内容
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="内容不能为空")
    
    try:
        # 调用AI服务生成适配内容
        contents = ai_service.generate_all_platforms(
            text=request.text,
            image=request.image
        )
        
        return ContentGenerateResponse(
            contents=contents,
            created_at=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内容生成失败: {str(e)}")


@app.post("/api/content/save", response_model=ContentItem)
async def save_content(request: ContentSaveRequest):
    """
    内容保存接口
    - 保存用户原始内容和适配后的内容
    - 返回保存的记录
    """
    try:
        item = storage_service.save(
            original_text=request.original_text,
            original_image=request.original_image,
            adapted_contents=request.adapted_contents
        )
        return item
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内容保存失败: {str(e)}")


@app.get("/api/content/list", response_model=ContentListResponse)
async def list_content(limit: int = 20, offset: int = 0):
    """
    内容列表接口
    - 获取历史生成的内容记录
    """
    try:
        items = storage_service.list(limit=limit, offset=offset)
        total = storage_service.count()
        
        return ContentListResponse(
            items=items,
            total=total
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取列表失败: {str(e)}")


@app.get("/api/content/{item_id}", response_model=ContentItem)
async def get_content(item_id: str):
    """
    获取单个内容详情
    """
    item = storage_service.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="内容不存在")
    return item


@app.delete("/api/content/{item_id}")
async def delete_content(item_id: str):
    """
    删除内容记录
    """
    success = storage_service.delete(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="内容不存在")
    return {"message": "删除成功", "id": item_id}


# ===== 推送日志接口 =====

@app.get("/api/push/logs")
async def get_push_logs(platform: str = None, status: str = None, limit: int = 50, offset: int = 0):
    """
    获取推送日志
    """
    try:
        logs = storage_service.get_push_logs(platform=platform, status=status, limit=limit, offset=offset)
        return {
            "logs": logs,
            "total": len(logs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取推送日志失败: {str(e)}")


# ===== 素材管理接口 =====

@app.get("/api/materials")
async def list_materials(file_type: str = None, platform: str = None, limit: int = 100, offset: int = 0):
    """
    获取素材列表
    """
    try:
        materials = storage_service.list_materials(file_type=file_type, platform=platform, limit=limit, offset=offset)
        return {
            "materials": materials,
            "total": len(materials)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取素材列表失败: {str(e)}")


@app.post("/api/materials")
async def save_material(name: str, file_path: str, file_type: str, platform: str = None, file_size: int = 0):
    """
    保存素材
    """
    try:
        material_id = storage_service.save_material(name, file_path, file_type, platform, file_size)
        return {
            "id": material_id,
            "message": "素材保存成功"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存素材失败: {str(e)}")


@app.delete("/api/materials/{material_id}")
async def delete_material(material_id: str):
    """
    删除素材
    """
    success = storage_service.delete_material(material_id)
    if not success:
        raise HTTPException(status_code=404, detail="素材不存在")
    return {"message": "删除成功", "id": material_id}


@app.post("/api/platform/push")
async def push_to_platform(platform: str, content: PlatformContent, adapted_content_id: str = None):
    """
    推送到平台草稿箱
    - wechat: 对接微信公众号 API，发布到草稿箱
    - xiaohongshu: 暂未对接
    - douyin: 暂未对接
    """
    platform_names = {
        "wechat": "微信公众号",
        "xiaohongshu": "小红书",
        "douyin": "抖音"
    }
    platform_name = platform_names.get(platform, platform)

    # 仅微信公众号支持真实 API 推送
    if platform == "wechat":
        try:
            # 检查是否配置了微信 API 凭证
            if not WECHAT_APP_ID or not WECHAT_APP_SECRET:
                raise HTTPException(
                    status_code=400,
                    detail="微信公众号 API 未配置。请在 .env 中设置 WECHAT_APP_ID 和 WECHAT_APP_SECRET"
                )

            # 处理图片
            body_images = []
            if content.image:
                body_images.append((content.image, "body_image.png"))

            # 调用微信 API 发布
            result = wechat_api.publish_article(
                title=content.title,
                content=content.content,
                author=WECHAT_DEFAULT_AUTHOR,
                digest=content.content[:100] + "..." if len(content.content) > 100 else content.content,
                body_images_b64=body_images if body_images else None,
                cover_image_b64=content.image,
                theme=WECHAT_DEFAULT_THEME,
                article_type="news",
                need_open_comment=WECHAT_NEED_OPEN_COMMENT,
                only_fans_can_comment=WECHAT_ONLY_FANS_CAN_COMMENT,
            )

            # 记录推送日志
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="success",
                content_id=result.get("media_id", ""),
                message=f"已发布到微信公众号草稿箱，media_id: {result.get('media_id')}"
            )

            return {
                "success": True,
                "message": f"已成功推送至{platform_name}草稿箱",
                "platform": platform,
                "media_id": result.get("media_id"),
                "detail": result
            }

        except WechatAPIError as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=f"微信API错误[{e.errcode}]: {e.errmsg}"
            )
            raise HTTPException(status_code=500, detail=f"微信推送失败: {e.errmsg}")

        except HTTPException:
            raise
        except Exception as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=str(e)
            )
            raise HTTPException(status_code=500, detail=f"推送失败: {str(e)}")

    # 其他平台暂用模拟（Mock）
    else:
        try:
            content_id = f"mock_{datetime.now().timestamp()}"
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="success",
                content_id=content_id,
                message=f"Mock推送成功（{platform_name} API 待对接）"
            )
            return {
                "success": True,
                "message": f"已成功推送至{platform_name}草稿箱（Mock）",
                "platform": platform,
                "content_id": content_id,
                "note": f"{platform_name}真实API待对接，当前为模拟推送"
            }
        except Exception as e:
            storage_service.log_push(
                adapted_content_id=adapted_content_id,
                platform=platform,
                platform_name=platform_name,
                status="failed",
                message=str(e)
            )
            raise HTTPException(status_code=500, detail=f"推送失败: {str(e)}")


# ===== 微信配置检查接口 =====

@app.get("/api/wechat/status")
async def check_wechat_status():
    """检查微信公众号 API 配置状态"""
    return {
        "configured": bool(WECHAT_APP_ID and WECHAT_APP_SECRET),
        "app_id": WECHAT_APP_ID[:6] + "****" if WECHAT_APP_ID else "未配置",
        "default_author": WECHAT_DEFAULT_AUTHOR,
        "default_theme": WECHAT_DEFAULT_THEME,
        "comment_open": bool(WECHAT_NEED_OPEN_COMMENT),
        "only_fans_comment": bool(WECHAT_ONLY_FANS_CAN_COMMENT),
    }


@app.post("/api/wechat/test")
async def test_wechat_api(title: str = "测试文章", content: str = "这是一篇测试内容"):
    """测试微信 API 连接"""
    if not WECHAT_APP_ID or not WECHAT_APP_SECRET:
        raise HTTPException(status_code=400, detail="微信 API 未配置")

    try:
        token = wechat_api.get_access_token()
        return {
            "success": True,
            "message": "微信 API 连接正常",
            "token_valid": bool(token)
        }
    except WechatAPIError as e:
        raise HTTPException(status_code=500, detail=f"微信 API 连接失败: [{e.errcode}] {e.errmsg}")


if __name__ == "__main__":
    print("=" * 50)
    print("多平台账号自动化运营系统 - 后端服务")
    print("=" * 50)
    print(f"服务地址: http://{SERVER_HOST}:{SERVER_PORT}")
    print(f"API文档: http://{SERVER_HOST}:{SERVER_PORT}/docs")
    print("=" * 50)
    
    uvicorn.run(
        app,
        host=SERVER_HOST,
        port=SERVER_PORT
    )