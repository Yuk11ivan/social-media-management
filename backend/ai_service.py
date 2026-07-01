"""
多模型 AI 服务 — 智能内容改写 v2.1
支持: DeepSeek + 百炼 DashScope (千问系列) + 千问 VL 视觉分析
根据任务复杂度自动选择最优模型，支持图片内容识别和智能配图
"""
from openai import OpenAI
from config import (
    DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL,
    BAILIAN_API_KEY, DASHSCOPE_BASE_URL,
    AI_MODEL_STRATEGY,
)
from models import PlatformContent
from wechat_api import strip_image_placeholders
import json
import base64
import io


class AIService:
    """多模型 AI 内容改写服务"""

    MODELS = {
        "deepseek": {
            "name": "deepseek-chat",
            "description": "DeepSeek V3 — 性价比高，适合纯文本改写",
            "max_tokens": 4096,
        },
        "qwen-turbo": {
            "name": "qwen-turbo",
            "description": "千问 Turbo — 快速响应",
            "max_tokens": 4096,
        },
        "qwen-plus": {
            "name": "qwen-plus",
            "description": "千问 Plus — 平衡质量与速度",
            "max_tokens": 4096,
        },
        "qwen-max": {
            "name": "qwen-max",
            "description": "千问 Max — 最强能力，适合复杂任务",
            "max_tokens": 8192,
        },
        "qwen-vl-max": {
            "name": "qwen-vl-max",
            "description": "千问 VL Max — 视觉理解，分析图片内容",
            "max_tokens": 2048,
        },
    }

    def __init__(self):
        self.ds_client = OpenAI(
            api_key=DEEPSEEK_API_KEY,
            base_url=DEEPSEEK_BASE_URL,
        )
        self.qw_client = OpenAI(
            api_key=BAILIAN_API_KEY,
            base_url=DASHSCOPE_BASE_URL,
        )

    def _select_model(self, task_complexity: str) -> tuple[str, OpenAI]:
        if AI_MODEL_STRATEGY == "deepseek":
            return "deepseek-chat", self.ds_client
        if AI_MODEL_STRATEGY == "qwen":
            return "qwen-max", self.qw_client

        model_map = {
            "simple": ("deepseek-chat", self.ds_client),
            "medium": ("qwen-plus", self.qw_client),
            "complex": ("qwen-max", self.qw_client),
        }
        return model_map.get(task_complexity, ("deepseek-chat", self.ds_client))

    # ===================== 图片视觉分析 =====================

    def analyze_images(self, images: list[str]) -> list[dict]:
        """
        使用千问 VL 模型分析每张图片的内容
        返回: [{"index": 0, "description": "...", "suggested_position": "..."}, ...]
        """
        if not images or AI_MODEL_STRATEGY == "deepseek":
            # DeepSeek 不支持视觉，返回基于索引的默认描述
            return self._default_image_descriptions(len(images or []))

        descriptions = []
        for i, img_b64 in enumerate(images):
            try:
                # 处理 base64 格式
                img_data = img_b64
                if "," in img_b64:
                    # data:image/xxx;base64,xxx → 提取纯 base64
                    header, b64_content = img_b64.split(",", 1)
                    img_data = b64_content

                print(f"  [视觉分析] 分析图片 {i+1}/{len(images)}...")

                response = self.qw_client.chat.completions.create(
                    model="qwen-vl-max",
                    messages=[{
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {"url": img_b64 if img_b64.startswith("data:") else f"data:image/png;base64,{img_data}"}
                            },
                            {
                                "type": "text",
                                "text": "请用一段话简洁描述这张图片的内容（主题、主体、风格、色调等），然后建议它在微信公众号文章中的最佳插入位置（如：文章开头作为引人注目的封面图、中间段落之间作为配图、结尾作为总结图等）。返回格式：{\"description\": \"...\", \"suggested_position\": \"...\"}"
                            }
                        ]
                    }],
                    max_tokens=300,
                    temperature=0.3,
                )

                result_text = response.choices[0].message.content
                try:
                    if "```json" in result_text:
                        start = result_text.index("```json") + 7
                        end = result_text.index("```", start)
                        result = json.loads(result_text[start:end])
                    elif "```" in result_text:
                        start = result_text.index("```") + 3
                        end = result_text.index("```", start)
                        result = json.loads(result_text[start:end])
                    else:
                        result = json.loads(result_text)
                except (json.JSONDecodeError, ValueError):
                    result = {
                        "description": result_text[:100] if result_text else f"配图 {i+1}",
                        "suggested_position": "文章中部作为配图",
                    }

                descriptions.append({
                    "index": i + 1,
                    "description": result.get("description", f"配图 {i+1}"),
                    "suggested_position": result.get("suggested_position", "文章中适当位置"),
                })
                print(f"    → {descriptions[-1]['description'][:60]}...")

            except Exception as e:
                print(f"  [视觉分析] 图片{i+1}分析失败: {e}")
                descriptions.append({
                    "index": i + 1,
                    "description": f"配图 {i+1}",
                    "suggested_position": "文章中适当位置",
                })

        return descriptions

    def _default_image_descriptions(self, count: int) -> list[dict]:
        """无视觉能力时的默认图片描述"""
        positions = [
            "文章开头作为引人注目的封面图",
            "文章三分之一处作为段落配图",
            "文章中部作为内容配图",
            "文章三分之二处作为段落配图",
            "文章结尾前作为总结配图",
        ]
        return [
            {
                "index": i + 1,
                "description": f"用户提供的配图 {i+1}",
                "suggested_position": positions[i % len(positions)],
            }
            for i in range(count)
        ]

    # ===================== Prompt 构建 =====================

    def _build_image_context(self, image_descriptions: list[dict]) -> str:
        """根据图片分析结果构建配图上下文（微信不使用，见 generate_all_platforms）"""
        if not image_descriptions:
            return ""

        lines = ["\n【可用配图及插入位置建议】"]
        for img in image_descriptions:
            lines.append(
                f"图片{img['index']}: {img['description']}\n"
                f"  → 建议插入位置: {img['suggested_position']}"
            )
        lines.append("\n【重要】请在文章中使用 [插入图片N] 标记来精确标注每张图片的插入位置。")
        lines.append("例如：第一张图用作封面放在标题下方，第二张在第二段之后...")
        lines.append("每张图片必须有一个对应的 [插入图片N] 占位符。")
        return "\n".join(lines)

    def _wechat_prompt(self, image_descriptions: list[dict] = None) -> str:
        _ = image_descriptions  # 微信不根据配图生成占位符，配图由推送时追加到文末
        base = """你是一个微信公众号专业内容编辑。请将以下内容改写为适合微信公众号发布的完整文章：

【标题要求】
1. 吸引读者点击但不标题党，字数15-25字
2. 可适当使用疑问句、感叹句等形式

【内容要求】
1. 开头：用引人入胜的导语引入话题
2. 正文：分段清晰，每段不超过5行
3. 使用## 二级标题分隔不同主题段落
4. 结尾：总结观点 + 引导互动
5. 风格：专业但不枯燥
6. 正文中禁止出现任何图片占位符或配图标记（如 [插入图片1]、[配图1] 等），配图由系统自动处理
"""
        base += '\n请返回JSON：{"title": "标题", "content": "文章内容(Markdown)", "hashtags": []}'
        return base

    @staticmethod
    def _xiaohongshu_prompt(image_descriptions: list[dict] = None) -> str:
        img_count = len(image_descriptions or [])
        base = """你是小红书爆款笔记创作专家。请将以下内容改写为小红书风格的种草笔记：

【平台核心规则】
- 标题：不超过20个汉字，必须包含emoji，要有吸引力和点击欲
- 正文：不超过1000字，短句排版，每段1-3行，段落之间用空行分隔
- 标签：3-5个精准话题标签，兼顾热度与精准度

【标题创作技巧】
1. 数字法："3天瘦5斤！"、"人均50r！"
2. 悬念法："姐妹们谁懂啊！"、"后悔没早知道！"
3. 对比法："之前vs之后"、"普通版vs升级版"
4. 场景法："通勤党必入！"、"学生党福音！"
5. 情绪法："太绝了！"、"真的会谢！"

【正文结构】
1. 开头（黄金3秒）：一句话抓住注意力，可以是结论先行、痛点共鸣、或颠覆认知
2. 中段（信息输出）：分点阐述，用emoji做视觉分隔符（✨💡📌🔥💯）
3. 结尾（互动引导）：抛出问题引导评论，如"你们觉得呢？""有同款吗？"

【写作风格】
- 口语化：像在跟闺蜜/姐妹聊天，多用"姐妹们"、"咱就是说"、"真的绝绝子"
- 短句：每句不超过20字，多用换行制造呼吸感
- 真实感：用具体数字和细节增加可信度，避免假大空
- emoji法则：每2-3行至少一个相关emoji，但不要过度堆砌

【内容类型适配】
- 好物种草：使用体验 + 效果展示 + 对比评测 + 购买渠道
- 旅游攻略：路线规划 + 花费明细 + 避坑指南 + 拍照机位
- 美食探店：环境描述 + 招牌菜品 + 价格分量 + 排队建议
- 护肤美妆：肤质说明 + 使用手法 + before/after + 成分解析
- 穿搭分享：身材参考 + 单品链接 + 搭配思路 + 场合建议
- 知识干货：问题引入 + 方法论 + 实操步骤 + 常见误区
"""
        if img_count > 0:
            base += f"""
【配图要求】
用户提供了{img_count}张配图。请严格按照以下要求插入图片占位符：
1. 每张图片必须有一个对应的 [插入图片N] 占位符（N从1开始）
2. [插入图片N] 必须独占一行
3. 参考图片内容描述来决定每张图的最佳插入位置
4. 第1张图通常是最吸引眼球的封面图，放在标题下方第一行
5. 确保{img_count}个占位符全部出现在内容中
"""
        base += """
【话题标签策略】
1. 1-2个大流量标签（如#好物分享 #护肤 #穿搭）
2. 1-2个精准长尾标签（如#混油皮护肤 #小个子穿搭）
3. 1个品牌/产品相关标签（如#兰蔻 #MUJI）
4. 标签之间用英文逗号分隔

请返回JSON格式（不要包含markdown代码块标记）：
{"title": "20字以内标题+emoji", "content": "正文内容（含[插入图片N]占位符）", "hashtags": ["#标签1", "#标签2", "#标签3"]}"""
        return base

    @staticmethod
    def _douyin_prompt() -> str:
        return """你是抖音图文内容专家。为抖音创作者平台「发布图文」撰写文案（图片会由系统单独上传，正文不要写【图】占位符）：
1. 标题简洁有力（15-30字），突出核心看点
2. 正文为作品描述（200-500字），分段清晰，适合移动端阅读
3. 语言简洁有感染力，可适当使用 emoji
4. 结尾附带3-5个抖音热门话题标签（放在 hashtags 字段，不要全部堆在正文里）
返回JSON：{"title": "标题", "content": "作品描述正文", "hashtags": ["#标签1", "#标签2"]}"""

    @staticmethod
    def _weibo_prompt() -> str:
        return """你是微博内容运营专家。改写为微博风格：
1. 带#话题词#  2. 140-2000字  3. 带2-3个话题标签
返回JSON：{"title": "标题", "content": "内容", "hashtags": ["#标签"]}"""

    def _get_prompt(self, platform: str, image_descriptions: list[dict] = None) -> str:
        prompts = {
            "wechat": self._wechat_prompt(image_descriptions),
            "xiaohongshu": self._xiaohongshu_prompt(image_descriptions),
            "douyin": self._douyin_prompt(),
            "weibo": self._weibo_prompt(),
        }
        return prompts.get(platform, prompts["wechat"])

    def _build_user_message(self, text: str, image_context: str) -> str:
        parts = [f"原始内容：\n{text}"]
        if image_context:
            parts.append(image_context)
        return "\n".join(parts)

    # ===================== 内容生成 =====================

    def adapt_for_platform(
        self, text: str, platform: str, image_descriptions: list[dict] = None
    ) -> PlatformContent:
        """为指定平台改写内容（含图片上下文）"""
        img_count = len(image_descriptions or [])
        prompt = self._get_prompt(platform, image_descriptions)
        image_context = self._build_image_context(image_descriptions or [])
        user_msg = self._build_user_message(text, image_context)

        complexity = "medium" if img_count > 0 else "simple"
        model_name, client = self._select_model(complexity)
        model_config = self.MODELS.get(model_name, self.MODELS["deepseek"])

        platform_names = {
            "wechat": "微信公众号",
            "xiaohongshu": "小红书",
            "douyin": "抖音",
            "weibo": "微博",
        }

        try:
            print(f"  [{platform}] 模型: {model_config['description']}, 配图: {img_count}张")
            response = client.chat.completions.create(
                model=model_config["name"],
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.7,
                max_tokens=model_config["max_tokens"],
            )

            result_text = response.choices[0].message.content
            try:
                if "```json" in result_text:
                    start = result_text.index("```json") + 7
                    end = result_text.index("```", start)
                    result = json.loads(result_text[start:end])
                elif "```" in result_text:
                    start = result_text.index("```") + 3
                    end = result_text.index("```", start)
                    result = json.loads(result_text[start:end])
                else:
                    result = json.loads(result_text)
            except (json.JSONDecodeError, ValueError):
                result = {
                    "title": text[:30] + "..." if len(text) > 30 else text,
                    "content": result_text,
                    "hashtags": [],
                }

            content = result.get("content", "")
            if platform not in ("douyin", "wechat") and img_count > 0:
                before = content
                content = self._inject_image_placeholders(content, img_count)
                if content != before:
                    print(f"  ⚠ [{platform}] 缺少图片占位符，已均匀插入 {img_count} 处")

            if platform == "wechat":
                content = strip_image_placeholders(content)

            return PlatformContent(
                platform=platform,
                platform_name=platform_names.get(platform, platform),
                title=result.get("title", ""),
                content=content,
                hashtags=result.get("hashtags", []),
            )

        except Exception as e:
            print(f"  AI调用失败 [{platform}]: {e}")
            return self._fallback_generate(text, platform, platform_names, prompt, user_msg)

    @staticmethod
    def _inject_image_placeholders(content: str, img_count: int) -> str:
        """将缺失的 [插入图片N] 均匀插入段落之间"""
        import re
        if img_count <= 0:
            return content

        missing = [
            i for i in range(1, img_count + 1)
            if not re.search(rf'\[插入图片\s*{i}\]', content, re.IGNORECASE)
        ]
        if not missing:
            return content

        paragraphs = [p for p in re.split(r'\n\n+', content) if p.strip()]
        if not paragraphs:
            return content + '\n\n' + '\n\n'.join(f'[插入图片{i}]' for i in missing)

        n_missing = len(missing)
        n_paras = len(paragraphs)
        insert_after = []
        for k in range(n_missing):
            pos = int((k + 1) * n_paras / (n_missing + 1))
            pos = max(0, min(n_paras - 1, pos - 1))
            insert_after.append(pos)

        result: list[str] = []
        mi = 0
        for pi, para in enumerate(paragraphs):
            result.append(para)
            while mi < n_missing and insert_after[mi] == pi:
                result.append(f'[插入图片{missing[mi]}]')
                mi += 1

        while mi < n_missing:
            result.append(f'[插入图片{missing[mi]}]')
            mi += 1

        return '\n\n'.join(result)

    def _fallback_generate(self, text: str, platform: str, platform_names: dict, prompt: str, user_msg: str) -> PlatformContent:
        """降级生成"""
        # 尝试备选模型
        for fallback_model, fallback_client in [
            ("deepseek-chat", self.ds_client),
            ("qwen-plus", self.qw_client),
        ]:
            try:
                response = fallback_client.chat.completions.create(
                    model=fallback_model,
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": user_msg},
                    ],
                    temperature=0.7,
                    max_tokens=2048,
                )
                result_text = response.choices[0].message.content
                try:
                    result = json.loads(result_text)
                except json.JSONDecodeError:
                    result = {"title": text[:30] + "...", "content": result_text, "hashtags": []}

                content = result.get("content", "")
                if platform == "wechat":
                    content = strip_image_placeholders(content)

                return PlatformContent(
                    platform=platform,
                    platform_name=platform_names.get(platform, platform),
                    title=result.get("title", ""),
                    content=content,
                    hashtags=result.get("hashtags", []),
                )
            except Exception:
                continue

        # 最终降级
        fallback_content = strip_image_placeholders(text) if platform == "wechat" else text
        return PlatformContent(
            platform=platform,
            platform_name=platform_names.get(platform, platform),
            title=text[:30] + "..." if len(text) > 30 else text,
            content=fallback_content,
            hashtags=[],
        )

    def generate_all_platforms(
        self, text: str, image: str = None,
        images: list = None, platforms: list = None,
    ) -> list[PlatformContent]:
        """生成指定平台的适配内容（含图片视觉分析）"""
        if platforms is None:
            platforms = ["wechat"]

        # 合并图片（去重）
        all_images = []
        seen = set()
        if images:
            for img in images:
                key = img[:100] if img else ""
                if key and key not in seen:
                    all_images.append(img)
                    seen.add(key)
        elif image:
            all_images.append(image)

        # 视觉分析图片
        image_descriptions = []
        if all_images:
            print(f"[AI] 开始分析 {len(all_images)} 张图片...")
            image_descriptions = self.analyze_images(all_images)
            print(f"[AI] 图片分析完成: {len(image_descriptions)} 张")

        complexity = self._assess_complexity(text, platforms, len(all_images))
        print(f"[AI] 任务复杂度: {complexity}, 平台: {len(platforms)}, 图片: {len(all_images)}")

        results = []
        for platform in platforms:
            # 微信正文不含配图占位符，配图在推送时统一追加到文末
            descs = image_descriptions if platform != "wechat" else []
            content = self.adapt_for_platform(text, platform, descs)
            if all_images:
                content.image = all_images[0]
                content.images = all_images
            results.append(content)

        return results

    def _assess_complexity(self, text: str, platforms: list, image_count: int) -> str:
        text_len = len(text)
        platform_count = len(platforms)
        if platform_count >= 3 or (text_len > 500 and image_count >= 2):
            return "complex"
        if platform_count >= 2 or image_count >= 1 or text_len > 300:
            return "medium"
        return "simple"


# 全局服务实例
ai_service = AIService()
