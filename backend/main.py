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
from storage import storage_service
from datetime import datetime
import uvicorn
from config import SERVER_HOST, SERVER_PORT, DEEPSEEK_API_KEY

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
    return {
        "service": "多平台账号自动化运营系统API",
        "status": "running",
        "ai_configured": DEEPSEEK_API_KEY != "sk-..."
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


@app.post("/api/platform/push")
async def push_to_platform(platform: str, content: PlatformContent):
    """
    推送到平台草稿箱（Mock版本）
    - 模拟推送成功
    """
    # Mock推送逻辑
    platform_names = {
        "wechat": "微信公众号",
        "xiaohongshu": "小红书",
        "douyin": "抖音"
    }
    
    return {
        "success": True,
        "message": f"已成功推送至{platform_names.get(platform, platform)}草稿箱",
        "platform": platform,
        "content_id": f"mock_{datetime.now().timestamp()}",
        "note": "这是Mock模拟推送，真实推送需要对接平台API"
    }


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