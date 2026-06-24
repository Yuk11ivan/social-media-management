/**
 * 小红书 CDP 自动化发布脚本
 *
 * 通过 Chrome DevTools Protocol 自动填入小红书笔记编辑器。
 * 与微博方案一致：仅填入内容到编辑器，不自动点击发布按钮，
 * 浏览器保持打开供用户人工审核后手动发布。
 *
 * 用法:
 *   npx -y bun xiaohongshu-post.ts \
 *     --title "笔记标题" \
 *     --content "正文内容" \
 *     --images "img1.png,img2.png" \
 *     --topics "话题1,话题2" \
 *     --profile "C:\path\to\chrome\profile"
 */
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  CdpConnection,
  findChromeExecutable,
  findExistingChromeDebugPort,
  getDefaultProfileDir,
  killChromeByProfile,
  launchChrome,
  sleep,
  waitForChromeDebugPort,
  XHS_CREATOR_URL,
  XHS_PUBLISH_URL,
  XHS_LIMITS,
  truncateText,
} from './xiaohongshu-utils.js';

// ============ 类型定义 ============

interface XhsPostOptions {
  title?: string;
  content?: string;
  images?: string[];
  topics?: string[];
  timeoutMs?: number;
  profileDir?: string;
  chromePath?: string;
}

// ============ 选择器配置（按优先级排列，小红书 DOM 变化时可快速调整） ============

const SELECTORS = {
  // 标题输入框 — 多种可能的匹配
  titleInput: [
    'input[placeholder*="标题"]',
    'input[placeholder*="title"]',
    '#title',
    '.title-input input',
    '.note-title input',
    '[data-testid="note-title"]',
  ],

  // 正文编辑器 — 小红书使用富文本编辑器
  contentEditor: [
    'div[contenteditable="true"]',
    'div[placeholder*="正文"]',
    'div[placeholder*="内容"]',
    '#content',
    '.ql-editor',
    '.note-content div[contenteditable]',
    '[data-testid="note-content"]',
  ],

  // 正文 textarea（降级方案 — 某些版本可能用纯 textarea）
  contentTextarea: [
    'textarea[placeholder*="正文"]',
    'textarea[placeholder*="内容"]',
    'textarea.note-content',
  ],

  // 图片上传 input
  imageInput: [
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
    '.upload-input input[type="file"]',
    '[data-testid="image-upload"]',
  ],

  // 话题标签输入
  topicInput: [
    'input[placeholder*="话题"]',
    'input[placeholder*="标签"]',
    'input[placeholder*="topic"]',
    '.topic-input input',
  ],

  // 登录状态检测 — 页面中应当存在发布相关元素
  loggedInIndicator: [
    'a[href*="publish"]',
    'button:has-text("发布笔记")',
    '.publish-btn',
    '[data-testid="publish-button"]',
  ],

  // 发布按钮（用于检测编辑器已加载，但不自动点击）
  publishButton: [
    'button:has-text("发布")',
    '.publish-btn',
    '[data-testid="publish-button"]',
    'button.publish',
  ],
} as const;

// ============ DOM 操作辅助函数 ============

/**
 * 尝试多个选择器查找元素，返回第一个匹配的 nodeId
 */
async function findElement(
  cdp: CdpConnection,
  sessionId: string,
  selectors: readonly string[],
): Promise<{ nodeId: number; selector: string } | null> {
  await cdp.send('DOM.enable', {}, { sessionId });

  const { root } = await cdp.send<{ root: { nodeId: number } }>(
    'DOM.getDocument',
    {},
    { sessionId },
  );

  for (const selector of selectors) {
    try {
      const { nodeId } = await cdp.send<{ nodeId: number }>(
        'DOM.querySelector',
        { nodeId: root.nodeId, selector },
        { sessionId },
      );
      if (nodeId && nodeId !== 0) {
        console.log(`[xhs-post] Found element: "${selector}"`);
        return { nodeId, selector };
      }
    } catch {
      // 选择器无效，继续尝试下一个
    }
  }
  return null;
}

/**
 * 通过 JavaScript 查找元素并检查可见性
 */
async function elementExists(
  cdp: CdpConnection,
  sessionId: string,
  selectors: readonly string[],
): Promise<boolean> {
  const joined = selectors.map((s) => `document.querySelector(${JSON.stringify(s)})`).join(' || ');
  const result = await cdp.send<{ result: { value: boolean } }>(
    'Runtime.evaluate',
    {
      expression: `!!(${joined})`,
      returnByValue: true,
    },
    { sessionId },
  );
  return result.result.value === true;
}

/**
 * 等待指定元素出现（轮询检测）
 */
async function waitForElement(
  cdp: CdpConnection,
  sessionId: string,
  selectors: readonly string[],
  timeoutMs: number = 120_000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await elementExists(cdp, sessionId, selectors)) return true;
    await sleep(1500);
  }
  return false;
}

// ============ 核心发布函数 ============

export async function postToXiaohongshu(options: XhsPostOptions): Promise<void> {
  const {
    title,
    content,
    images = [],
    topics = [],
    timeoutMs = 180_000,
    profileDir = getDefaultProfileDir(),
  } = options;

  // 参数校验
  if (title && title.length > XHS_LIMITS.TITLE_MAX_CHARS) {
    console.warn(
      `[xhs-post] ⚠ 标题超过 ${XHS_LIMITS.TITLE_MAX_CHARS} 字限制，将自动截断`,
    );
    options.title = truncateText(title, XHS_LIMITS.TITLE_MAX_CHARS);
  }

  if (content && content.length > XHS_LIMITS.CONTENT_MAX_CHARS) {
    console.warn(
      `[xhs-post] ⚠ 正文超过 ${XHS_LIMITS.CONTENT_MAX_CHARS} 字限制，将自动截断`,
    );
    options.content = truncateText(content, XHS_LIMITS.CONTENT_MAX_CHARS);
  }

  if (images.length > XHS_LIMITS.IMAGES_MAX) {
    throw new Error(
      `图片数量超过限制: ${images.length} (最多 ${XHS_LIMITS.IMAGES_MAX} 张)`,
    );
  }

  // 确保 Profile 目录存在
  await mkdir(profileDir, { recursive: true });

  // 查找 Chrome
  const chromePath = findChromeExecutable(options.chromePath);
  if (!chromePath) {
    throw new Error('Chrome not found. Set XHS_BROWSER_CHROME_PATH env var.');
  }

  // ========== 启动/连接 Chrome ==========
  let port: number;
  const existingPort = await findExistingChromeDebugPort(profileDir);

  if (existingPort) {
    console.log(`[xhs-post] Found existing Chrome on port ${existingPort}, checking health...`);
    try {
      const wsUrl = await waitForChromeDebugPort(existingPort, 5_000);
      const testCdp = await CdpConnection.connect(wsUrl, 5_000, { defaultTimeoutMs: 5_000 });
      await testCdp.send('Target.getTargets');
      testCdp.close();
      console.log('[xhs-post] Existing Chrome is responsive, reusing.');
      port = existingPort;
    } catch {
      console.log('[xhs-post] Existing Chrome unresponsive, restarting...');
      killChromeByProfile(profileDir);
      await sleep(2000);
      port = await launchChrome(XHS_CREATOR_URL, profileDir, chromePath);
    }
  } else {
    port = await launchChrome(XHS_CREATOR_URL, profileDir, chromePath);
  }

  let cdp: CdpConnection | null = null;

  try {
    // ========== 连接 CDP ==========
    const wsUrl = await waitForChromeDebugPort(port, 30_000);
    cdp = await CdpConnection.connect(wsUrl, 30_000, { defaultTimeoutMs: 15_000 });

    // ========== 定位/创建页面 ==========
    const targets = await cdp.send<{
      targetInfos: Array<{ targetId: string; url: string; type: string }>;
    }>('Target.getTargets');

    let pageTarget = targets.targetInfos.find(
      (t) => t.type === 'page' && (t.url.includes('xiaohongshu.com') || t.url.includes('xhslink.com')),
    );

    if (!pageTarget) {
      console.log('[xhs-post] No 小红书 tab found, creating new one...');
      const { targetId } = await cdp.send<{ targetId: string }>(
        'Target.createTarget',
        { url: XHS_PUBLISH_URL },
      );
      pageTarget = { targetId, url: XHS_PUBLISH_URL, type: 'page' };
    }

    const { sessionId } = await cdp.send<{ sessionId: string }>(
      'Target.attachToTarget',
      { targetId: pageTarget.targetId, flatten: true },
    );

    await cdp.send('Target.activateTarget', { targetId: pageTarget.targetId });

    // 启用必要的 CDP 域
    await cdp.send('Page.enable', {}, { sessionId });
    await cdp.send('Runtime.enable', {}, { sessionId });
    await cdp.send('Input.setIgnoreInputEvents', { ignore: false }, { sessionId });

    // ========== 检查当前 URL，必要时导航到发布页 ==========
    const urlResult = await cdp.send<{ result: { value: string } }>(
      'Runtime.evaluate',
      { expression: 'window.location.href', returnByValue: true },
      { sessionId },
    );

    const currentUrl = urlResult.result.value || '';
    if (!currentUrl.includes('creator.xiaohongshu.com')) {
      console.log('[xhs-post] Navigating to creator center...');
      await cdp.send('Page.navigate', { url: XHS_PUBLISH_URL }, { sessionId });
      await sleep(5000);
    }

    // ========== 等待编辑器加载 & 检测登录态 ==========
    console.log('[xhs-post] Waiting for 小红书 editor...');

    const editorReady = await waitForElement(
      cdp,
      sessionId,
      SELECTORS.publishButton,
      timeoutMs,
    );

    if (!editorReady) {
      console.log(
        '[xhs-post] Editor/publish button not found. You may need to log in.',
      );
      console.log('[xhs-post] Please log in to 小红书 in the browser window.');
      console.log('[xhs-post] Waiting for login (re-checking every 3s)...');

      // 再等一轮，给用户时间登录
      const loggedIn = await waitForElement(
        cdp,
        sessionId,
        SELECTORS.publishButton,
        timeoutMs,
      );
      if (!loggedIn) {
        throw new Error(
          'Timed out waiting for 小红书 editor. Please log in to creator.xiaohongshu.com first.',
        );
      }
    }

    console.log('[xhs-post] ✅ Editor detected, starting to fill content...');
    await sleep(2000);

    // ========== 步骤 1: 上传图片 ==========
    if (images.length > 0) {
      const missing = images.filter((f) => !fs.existsSync(f));
      if (missing.length > 0) {
        console.warn(`[xhs-post] ⚠ Some images not found: ${missing.join(', ')}`);
      }

      const validImages = images.filter((f) => fs.existsSync(f));
      if (validImages.length > 0) {
        const absolutePaths = validImages.map((f) => path.resolve(f));
        console.log(`[xhs-post] Uploading ${absolutePaths.length} image(s)...`);

        const fileInput = await findElement(cdp, sessionId, SELECTORS.imageInput);
        if (fileInput) {
          await cdp.send(
            'DOM.setFileInputFiles',
            { nodeId: fileInput.nodeId, files: absolutePaths },
            { sessionId },
          );
          console.log('[xhs-post] Images set on file input. Waiting for upload...');
          await sleep(3000);

          // 验证上传
          const uploadCheck = await cdp.send<{ result: { value: number } }>(
            'Runtime.evaluate',
            {
              expression:
                "document.querySelectorAll('img[src^=\"blob:\"], img[src^=\"data:\"], .upload-preview img, .image-item img').length",
              returnByValue: true,
            },
            { sessionId },
          );

          if (uploadCheck.result.value > 0) {
            console.log(
              `[xhs-post] ✅ Upload verified (${uploadCheck.result.value} preview(s) detected)`,
            );
          } else {
            console.warn(
              '[xhs-post] ⚠ Upload may still be in progress. Please verify in browser.',
            );
          }
        } else {
          console.warn(
            '[xhs-post] ⚠ Image upload input not found. Please upload images manually.',
          );
        }
      }
    }

    // ========== 步骤 2: 填写标题 ==========
    if (title) {
      console.log(`[xhs-post] Filling title: "${title}"`);

      const titleEl = await findElement(cdp, sessionId, SELECTORS.titleInput);
      if (titleEl) {
        // 先聚焦并清空
        await cdp.send(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const el = document.querySelector(${JSON.stringify(titleEl.selector)});
              if (el) { el.focus(); el.value = ''; }
            })()`,
          },
          { sessionId },
        );
        await sleep(300);

        // CDP 输入
        await cdp.send('Input.insertText', { text: title }, { sessionId });
        await sleep(500);

        // 验证
        const titleCheck = await cdp.send<{ result: { value: string } }>(
          'Runtime.evaluate',
          {
            expression: `(document.querySelector(${JSON.stringify(titleEl.selector)})?.value || '')`,
            returnByValue: true,
          },
          { sessionId },
        );

        if (titleCheck.result.value.length > 0) {
          console.log(`[xhs-post] ✅ Title verified (${titleCheck.result.value.length} chars)`);
        } else {
          // 回退: execCommand
          console.warn('[xhs-post] Title input empty, trying execCommand fallback...');
          await cdp.send(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(titleEl.selector)});
                if (el) { el.focus(); document.execCommand('insertText', false, ${JSON.stringify(title)}); }
              })()`,
            },
            { sessionId },
          );
          await sleep(300);
        }
      } else {
        console.warn('[xhs-post] ⚠ Title input not found. Please fill title manually.');
      }
    }

    // ========== 步骤 3: 填写正文 ==========
    if (content) {
      console.log(`[xhs-post] Filling content (${content.length} chars)...`);

      // 先尝试 contenteditable div（富文本编辑器）
      const editorEl = await findElement(cdp, sessionId, SELECTORS.contentEditor);

      if (editorEl) {
        // 富文本编辑器 — 聚焦并插入文本
        await cdp.send(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const el = document.querySelector(${JSON.stringify(editorEl.selector)});
              if (el) { el.focus(); }
            })()`,
          },
          { sessionId },
        );
        await sleep(300);

        // 对于 contenteditable，使用 execCommand 比 Input.insertText 更可靠
        await cdp.send(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const el = document.querySelector(${JSON.stringify(editorEl.selector)});
              if (el) {
                el.focus();
                // 清空现有内容
                el.innerHTML = '';
                // 插入文本（每行一个段落）
                const lines = ${JSON.stringify(content)}.split('\\n');
                for (const line of lines) {
                  const p = document.createElement('p');
                  p.textContent = line || '\\u00A0';
                  el.appendChild(p);
                }
                // 触发 input 事件让框架感知变化
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
            })()`,
          },
          { sessionId },
        );
        await sleep(500);

        // 验证内容
        const contentCheck = await cdp.send<{ result: { value: string } }>(
          'Runtime.evaluate',
          {
            expression: `(document.querySelector(${JSON.stringify(editorEl.selector)})?.textContent || '').trim()`,
            returnByValue: true,
          },
          { sessionId },
        );

        if (contentCheck.result.value.length > 0) {
          console.log(`[xhs-post] ✅ Content verified (${contentCheck.result.value.length} chars)`);
        } else {
          // 回退: 尝试 Input.insertText
          console.warn('[xhs-post] Content appears empty, trying Input.insertText...');
          await cdp.send(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(editorEl.selector)});
                if (el) { el.focus(); }
              })()`,
            },
            { sessionId },
          );
          await sleep(200);
          await cdp.send('Input.insertText', { text: content }, { sessionId });
          await sleep(300);
        }
      } else {
        // 降级: 尝试普通 textarea
        const textareaEl = await findElement(cdp, sessionId, SELECTORS.contentTextarea);
        if (textareaEl) {
          console.log('[xhs-post] Using textarea fallback...');
          await cdp.send(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(textareaEl.selector)});
                if (el) { el.focus(); el.value = ''; }
              })()`,
            },
            { sessionId },
          );
          await sleep(200);
          await cdp.send('Input.insertText', { text: content }, { sessionId });
          await sleep(500);
        } else {
          console.warn('[xhs-post] ⚠ Content editor not found. Please fill content manually.');
        }
      }
    }

    // ========== 步骤 4: 添加话题标签 ==========
    if (topics.length > 0) {
      console.log(`[xhs-post] Adding ${topics.length} topic(s): ${topics.join(', ')}`);

      const topicInput = await findElement(cdp, sessionId, SELECTORS.topicInput);
      if (topicInput) {
        for (const topic of topics.slice(0, XHS_LIMITS.TOPICS_MAX)) {
          // 确保标签以 # 开头
          const tag = topic.startsWith('#') ? topic : `#${topic}`;
          const topicText = tag.startsWith('#') ? tag.slice(1) : tag;

          await cdp.send(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(topicInput.selector)});
                if (el) {
                  el.focus();
                  el.value = ${JSON.stringify(topicText)};
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  // 尝试触发搜索/下拉选择
                  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                }
              })()`,
            },
            { sessionId },
          );
          await sleep(800);
        }
        console.log(`[xhs-post] ✅ Topics added`);
      } else {
        console.warn('[xhs-post] ⚠ Topic input not found. Please add topics manually.');
      }
    }

    // ========== 完成 ==========
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  ✅ 小红书笔记内容已填入编辑器');
    console.log('  ⚠  请在浏览器中审核内容后手动点击「发布」');
    console.log('  📱 浏览器将保持打开状态');
    console.log('══════════════════════════════════════════════');
  } finally {
    if (cdp) {
      cdp.close();
    }
  }
}

// ============ CLI 入口 ============

function printUsage(): never {
  console.log(`Post to 小红书 (Xiaohongshu) using real Chrome browser

Usage:
  npx -y bun xiaohongshu-post.ts [options]

Options:
  --title <text>    笔记标题（最多 ${XHS_LIMITS.TITLE_MAX_CHARS} 字）
  --content <text>  笔记正文（最多 ${XHS_LIMITS.CONTENT_MAX_CHARS} 字）
  --images <paths>  图片路径，逗号分隔（最多 ${XHS_LIMITS.IMAGES_MAX} 张）
  --topics <tags>   话题标签，逗号分隔（最多 ${XHS_LIMITS.TOPICS_MAX} 个）
  --profile <dir>   Chrome Profile 目录
  --help            Show this help

Examples:
  npx -y bun xiaohongshu-post.ts --title "今日好物分享" --content "今天给大家推荐..."
  npx -y bun xiaohongshu-post.ts \\
    --title "旅行攻略" \\
    --content "三天两夜澳门攻略来啦..." \\
    --images "./pic1.png,./pic2.png" \\
    --topics "澳门旅游,旅行攻略,周末去哪" \\
    --profile "C:\\xhs_profiles\\user_001"
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  let title: string | undefined;
  let content: string | undefined;
  let profileDir: string | undefined;
  const images: string[] = [];
  const topics: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--title' && args[i + 1]) {
      title = args[++i];
    } else if (arg === '--content' && args[i + 1]) {
      content = args[++i];
    } else if (arg === '--images' && args[i + 1]) {
      const paths = args[++i]!.split(',').map((p) => p.trim()).filter(Boolean);
      images.push(...paths);
    } else if (arg === '--topics' && args[i + 1]) {
      const tags = args[++i]!.split(',').map((t) => t.trim()).filter(Boolean);
      topics.push(...tags);
    } else if (arg === '--profile' && args[i + 1]) {
      profileDir = args[++i];
    }
  }

  if (!title && !content && images.length === 0) {
    console.error('Error: Provide at least --title, --content, or --images.');
    process.exit(1);
  }

  await postToXiaohongshu({ title, content, images, topics, profileDir });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
