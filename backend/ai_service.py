"""
DeepSeek AI服务 - 智能内容改写
"""
from openai import OpenAI
from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL
from models import PlatformContent
import json


class AIService:
    """AI内容改写服务"""
    
    def __init__(self):
        self.client = OpenAI(
            api_key=DEEPSEEK_API_KEY,
            base_url=DEEPSEEK_BASE_URL
        )
    
    def adapt_for_platform(self, text: str, platform: str) -> PlatformContent:
        """根据平台特性改写内容"""
        
        platform_prompts = {
            "wechat": """
你是一个微信公众号内容编辑专家。请将以下内容改写为适合微信公众号发布的格式：
1. 标题要吸引眼球，但不过于夸张
2. 内容保持专业、正式的风格
3. 段落清晰，适合长文阅读
4. 可以适当添加小标题分隔内容
5. 不需要添加emoji和话题标签

请返回JSON格式：{"title": "标题", "content": "改写后的内容", "hashtags": []}
""",
            "xiaohongshu": """
你是一个小红书内容创作专家。请将以下内容改写为适合小红书发布的格式：
1. 标题要吸睛，可以使用emoji
2. 内容活泼、口语化，多用短句
3. 每段开头可以加emoji符号
4. 结尾添加3-5个相关话题标签（如#分享 #好物推荐）
5. 整体风格轻松、亲切

请返回JSON格式：{"title": "标题", "content": "改写后的内容", "hashtags": ["#标签1", "#标签2"]}
""",
            "douyin": """
你是一个抖音短视频文案创作专家。请将以下内容改写为适合抖音短视频的文案：
1. 开头要有吸引人的钩子（如"家人们谁懂啊！"、"今天这个绝了！"）
2. 内容口语化、接地气，适合短视频节奏
3. 文字简洁有力，每句不要太长
4. 结尾添加2-3个话题标签
5. 可以适当设置悬念或互动引导

请返回JSON格式：{"title": "抖音短视频", "content": "改写后的文案", "hashtags": ["#标签1", "#标签2"]}
"""
        }
        
        prompt = platform_prompts.get(platform, platform_prompts["wechat"])
        
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": text}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            result_text = response.choices[0].message.content
            
            # 解析JSON结果
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # 如果不是JSON格式，手动构建
                result = {
                    "title": text[:30] + "..." if len(text) > 30 else text,
                    "content": result_text,
                    "hashtags": []
                }
            
            platform_names = {
                "wechat": "微信公众号",
                "xiaohongshu": "小红书",
                "douyin": "抖音"
            }
            
            return PlatformContent(
                platform=platform,
                platform_name=platform_names.get(platform, platform),
                title=result.get("title", ""),
                content=result.get("content", ""),
                hashtags=result.get("hashtags", [])
            )
            
        except Exception as e:
            # 如果AI调用失败，返回原始内容
            print(f"AI调用失败: {e}")
            platform_names = {
                "wechat": "微信公众号",
                "xiaohongshu": "小红书",
                "douyin": "抖音"
            }
            return PlatformContent(
                platform=platform,
                platform_name=platform_names.get(platform, platform),
                title=text[:30] + "..." if len(text) > 30 else text,
                content=text,
                hashtags=[]
            )
    
    def generate_all_platforms(self, text: str, image: str = None) -> list[PlatformContent]:
        """生成所有平台的适配内容"""
        platforms = ["wechat", "xiaohongshu", "douyin"]
        results = []
        
        for platform in platforms:
            content = self.adapt_for_platform(text, platform)
            if image:
                content.image = image
            results.append(content)
        
        return results


# 全局AI服务实例
ai_service = AIService()