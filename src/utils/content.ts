/** 移除正文中的图片占位符（微信公众号等场景） */
export function stripImagePlaceholders(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[插入图片\s*\d+\]/gi, '')
    .replace(/\[配图\s*\d+\]/gi, '')
    .replace(/\[图片\s*\d+\]/gi, '')
    .replace(/\[配图建议[：:][^\]]*\]/gi, '')
    .replace(/\[插入图\s*\d+\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeWechatContent(content: string): string {
  return stripImagePlaceholders(content);
}
