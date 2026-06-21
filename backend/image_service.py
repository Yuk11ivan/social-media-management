"""
AI 图片生成服务 — 基于阿里百炼 DashScope 万相模型
"""
import httpx
import time
import base64
from pathlib import Path
from typing import Optional
from .config import BAILIAN_API_KEY, DASHSCOPE_BASE_URL


# 万相文生图 API（DashScope 专属端点）
WANX_SUBMIT_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"

# 用千问提取视觉关键词
QWEN_URL = f"{DASHSCOPE_BASE_URL}/chat/completions"


async def extract_visual_keywords(content: str, title: str = "") -> dict:
    """从文案中提取视觉关键词，用于生图提示词"""
    prompt = f"""你是一个专业的视觉内容策划师。根据以下社交媒体文案，提取适合生成配图的视觉关键词，并生成中文生图提示词。

标题：{title}
正文：{content[:800]}

请返回 JSON 格式（不要返回其他内容）：
{{
  "scene": "场景描述（中文，10字以内）",
  "style": "图片风格（如：写实摄影、插画、赛博朋克、国潮风、扁平设计、3D渲染、水彩画等）",
  "color_tone": "主色调（如：蓝紫色、暖橙色、黑白灰、马卡龙色等）",
  "subject": "画面主体（中文，20字以内，具体描述画面核心元素）",
  "mood": "氛围（如：震撼、温馨、神秘、活力、梦幻、高级感等）",
  "cn_prompt": "中文生图提示词（50字以内，详细描述画面内容、构图、光线、质感，让AI能直接理解）",
  "negative_prompt": "中文反向提示词（20字以内，描述不想出现的内容如：文字、水印、模糊、变形等）"
}}"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                QWEN_URL,
                headers={
                    "Authorization": f"Bearer {BAILIAN_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "qwen-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"].strip()

            # 提取 JSON
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            import json
            # 尝试找到 JSON 对象
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(text[start:end])
                return result
            return _default_keywords()
    except Exception as e:
        print(f"[ImageService] 关键词提取失败: {e}")
        return _default_keywords()


def _default_keywords() -> dict:
    return {
        "scene": "抽象背景",
        "style": "扁平设计",
        "color_tone": "蓝紫色",
        "subject": "科技感图形",
        "mood": "专业",
        "cn_prompt": "抽象科技背景，蓝紫渐变色调，现代简约设计风格，富有未来感",
        "negative_prompt": "文字、水印、模糊、变形",
    }


async def generate_image(
    prompt: str,
    negative_prompt: str = "",
    size: str = "1024*1024",
    n: int = 1,
) -> list[str]:
    """调用万相模型生成图片，返回 base64 图片列表"""
    headers = {
        "Authorization": f"Bearer {BAILIAN_API_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }

    body = {
        "model": "wanx-v1",
        "input": {
            "prompt": prompt,
        },
        "parameters": {
            "n": n,
            "size": size,
        },
    }
    if negative_prompt:
        body["input"]["negative_prompt"] = negative_prompt

    async with httpx.AsyncClient(timeout=60) as client:
        # 1. 提交任务
        resp = await client.post(WANX_SUBMIT_URL, headers=headers, json=body)
        resp.raise_for_status()
        task_data = resp.json()

        task_id = task_data.get("output", {}).get("task_id")
        if not task_id:
            raise Exception(f"生图任务提交失败: {task_data}")

        # 2. 轮询等待结果
        check_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
        max_wait = 120  # 最长等 2 分钟
        start_time = time.time()

        while time.time() - start_time < max_wait:
            await _async_sleep(2)
            check_resp = await client.get(
                check_url,
                headers={"Authorization": f"Bearer {BAILIAN_API_KEY}"},
            )
            check_resp.raise_for_status()
            result = check_resp.json()

            status = result.get("output", {}).get("task_status")
            if status == "SUCCEEDED":
                results = result.get("output", {}).get("results", [])
                images = []
                for item in results:
                    url = item.get("url", "")
                    if url:
                        # 下载图片转 base64
                        img_resp = await client.get(url)
                        img_resp.raise_for_status()
                        b64 = base64.b64encode(img_resp.content).decode()
                        images.append(f"data:image/png;base64,{b64}")
                    elif item.get("b64_image"):
                        images.append(f"data:image/png;base64,{item['b64_image']}")
                return images

            elif status == "FAILED":
                msg = result.get("output", {}).get("message", "未知错误")
                raise Exception(f"生图失败: {msg}")

        raise Exception("生图超时，请稍后重试")


async def _async_sleep(seconds: float):
    """异步 sleep"""
    import asyncio
    await asyncio.sleep(seconds)
