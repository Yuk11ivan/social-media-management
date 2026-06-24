/**
 * 小红书 CDP 自动化发布脚本（重写版）
 *
 * 流程：启动 Chrome → 导航到发布页 → 上传图片 → 填标题 → 填正文 → 存草稿
 * 参数通过 --meta JSON 文件传递，避免 Windows shell 多行文本转义问题
 *
 * 用法:
 *   npx -y bun xiaohongshu-post.ts --meta /path/to/meta.json
 */
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
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
} from './xiaohongshu-utils.js';

// ============ 类型 ============

interface XhsMeta {
  title?: string;
  content?: string;
  images?: string[];
  topics?: string[];
  profile?: string;
}

// ============ 辅助函数 ============

/** 通过 Runtime.evaluate 获取当前页面 URL */
async function getUrl(cdp: CdpConnection, sessionId: string): Promise<string> {
  const r = await cdp.send<{ result: { value: string } }>(
    'Runtime.evaluate',
    { expression: 'window.location.href', returnByValue: true },
    { sessionId },
  );
  return r.result.value || '';
}

/** 等待条件为真，每 intervalMs 检查一次 */
async function poll(
  fn: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs: number = 1500,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return true;
    await sleep(intervalMs);
  }
  return false;
}

// ============ 核心发布函数 ============

export async function postToXiaohongshu(meta: XhsMeta): Promise<void> {
  const {
    title,
    content,
    images = [],
    topics = [],
  } = meta;

  const profileDir = meta.profile || getDefaultProfileDir();
  const timeoutMs = 180_000;

  // 参数校验
  if (!title && !content && images.length === 0) {
    throw new Error('请提供至少 title、content 或 images');
  }

  if (images.length > 18) {
    throw new Error(`图片数量超限: ${images.length}（最多 18 张）`);
  }

  await mkdir(profileDir, { recursive: true });

  const chromePath = findChromeExecutable();
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
      console.log('[xhs-post] No XHS tab found, creating new one...');
      const { targetId } = await cdp.send<{ targetId: string }>(
        'Target.createTarget',
        { url: XHS_PUBLISH_URL },
      );
      pageTarget = { targetId, url: XHS_PUBLISH_URL, type: 'page' };
    }

    let { sessionId } = await cdp.send<{ sessionId: string }>(
      'Target.attachToTarget',
      { targetId: pageTarget.targetId, flatten: true },
    );
    await cdp.send('Target.activateTarget', { targetId: pageTarget.targetId });

    // 启用 CDP 域
    await cdp.send('Page.enable', {}, { sessionId });
    await cdp.send('Runtime.enable', {}, { sessionId });
    await cdp.send('Input.setIgnoreInputEvents', { ignore: false }, { sessionId });

    // ========== 导航到创作者中心 ==========
    let currentUrl = await getUrl(cdp, sessionId);
    console.log(`[xhs-post] Current URL: ${currentUrl}`);

    // 确保在创作者中心（不是 /publish，而是首页）
    if (!currentUrl.includes('creator.xiaohongshu.com') || currentUrl.includes('/publish')) {
      console.log('[xhs-post] Navigating to creator center...');
      await cdp.send('Page.navigate', { url: XHS_CREATOR_URL }, { sessionId });
      await sleep(5000);
      currentUrl = await getUrl(cdp, sessionId);
      console.log(`[xhs-post] After navigate: ${currentUrl}`);
    }

    // ========== 检测登录态 ==========
    if (currentUrl.includes('login') || currentUrl.includes('passport')) {
      console.log('[xhs-post] ============================================');
      console.log('[xhs-post] 检测到登录页面，请在浏览器中完成登录！');
      console.log('[xhs-post] 登录后脚本会自动继续...');
      console.log('[xhs-post] ============================================');

      const loggedIn = await poll(async () => {
        const url = await getUrl(cdp!, sessionId);
        console.log(`[xhs-post] Waiting... URL: ${url}`);
        return !url.includes('login') && !url.includes('passport');
      }, timeoutMs, 3000);

      if (!loggedIn) {
        throw new Error('登录超时，请在浏览器中完成登录后重试');
      }

      console.log('[xhs-post] ✅ 登录成功，等待页面加载...');
      await sleep(3000);
      currentUrl = await getUrl(cdp, sessionId);
    }

    // ========== 等待页面完全加载 ==========
    console.log('[xhs-post] Waiting for page to fully load...');

    // 等待 document.readyState === 'complete'
    const ready = await poll(async () => {
      const r = await cdp!.send<{ result: { value: string } }>(
        'Runtime.evaluate',
        { expression: `document.readyState`, returnByValue: true },
        { sessionId },
      );
      return r.result.value === 'complete';
    }, 30_000, 1000);

    if (!ready) {
      console.warn('[xhs-post] ⚠ Page readyState not complete, continuing anyway...');
    }

    // 额外等待确保 JS 渲染完成
    await sleep(3000);

    // 探测页面状态
    currentUrl = await getUrl(cdp, sessionId);
    const pageInfo = await cdp.send<{ result: { value: string } }>(
      'Runtime.evaluate',
      {
        expression: `JSON.stringify({
          url: location.href,
          bodyLen: document.body?.innerText?.length || 0,
          buttons: Array.from(document.querySelectorAll('button, a')).map(e => (e.textContent?.trim() || '').substring(0, 20)).filter(Boolean).slice(0, 20),
        })`,
        returnByValue: true,
      },
      { sessionId },
    );
    const pInfo = JSON.parse(pageInfo.result.value);
    console.log(`[xhs-post] Page ready: url=${pInfo.url}, bodyLen=${pInfo.bodyLen}`);
    console.log(`[xhs-post] All buttons/links: ${JSON.stringify(pInfo.buttons)}`);

    // ========== 点击「发布图文」按钮 ==========
    console.log('[xhs-post] Looking for "发布图文" button...');

    // 轮询等待按钮渲染完成（React SPA 异步渲染，可能需要 10 秒以上）
    const buttonReady = await poll(async () => {
      const r = await cdp!.send<{ result: { value: number } }>(
        'Runtime.evaluate',
        {
          expression: `(() => {
            const texts = ['发布图文笔记', '发布图文', '发布笔记'];
            const els = document.querySelectorAll('a, button, div, span, li, section, aside, p');
            for (const el of els) {
              const txt = (el.textContent?.trim() || '').substring(0, 30);
              if (texts.includes(txt)) {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) return 1;
              }
            }
            return 0;
          })()`,
          returnByValue: true,
        },
        { sessionId },
      );
      return r.result.value > 0;
    }, 30_000, 2000);

    if (!buttonReady) {
      console.log('[xhs-post] Button not found after 30s, will try direct navigation');
    }

    // 用 JS 查找按钮坐标，再用 CDP Input.dispatchMouseEvent 模拟真实点击
    // 注意：小红书创作者中心的按钮可能是 div/span 等非标准元素
    async function tryClickPublishButton(): Promise<string> {
      // 第一步：找到按钮元素并获取其中心坐标
      // 优先级：发布图文笔记 > 发布图文 > a[href*="publish"] > 发布笔记（侧边栏降级）
      const findResult = await cdp!.send<{ result: { value: string } }>(
        'Runtime.evaluate',
        {
          expression: `(() => {
            // 第一优先：精确匹配"发布图文笔记"（主内容区的卡片按钮）
            const primaryTexts = ['发布图文笔记', '发布图文'];
            const allEls = document.querySelectorAll('a, button, div, span, li, section, aside, p, h1, h2, h3, h4');
            for (const el of allEls) {
              const txt = (el.textContent?.trim() || '').substring(0, 30);
              for (const t of primaryTexts) {
                if (txt === t) {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0 && rect.width < 500) {
                    const cx = Math.round(rect.left + rect.width / 2);
                    const cy = Math.round(rect.top + rect.height / 2);
                    return JSON.stringify({x: cx, y: cy, text: t, tag: el.tagName.toLowerCase()});
                  }
                }
              }
            }
            // 第二优先：a[href*="publish"] 链接
            const links = document.querySelectorAll('a[href*="publish"]');
            for (const link of links) {
              const rect = link.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                const cx = Math.round(rect.left + rect.width / 2);
                const cy = Math.round(rect.top + rect.height / 2);
                return JSON.stringify({x: cx, y: cy, text: (link.textContent?.trim()||'').substring(0,20), tag: 'a'});
              }
            }
            // 第三优先：侧边栏"发布笔记"（点击后可能弹出选择菜单）
            for (const el of allEls) {
              const txt = (el.textContent?.trim() || '').substring(0, 30);
              if (txt === '发布笔记') {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.width < 300) {
                  const cx = Math.round(rect.left + rect.width / 2);
                  const cy = Math.round(rect.top + rect.height / 2);
                  return JSON.stringify({x: cx, y: cy, text: '发布笔记(侧边栏)', tag: el.tagName.toLowerCase()});
                }
              }
            }
            return JSON.stringify({x: 0, y: 0, text: 'not_found'});
          })()`,
          returnByValue: true,
        },
        { sessionId },
      );
      const info = JSON.parse(findResult?.result?.value || '{}');
      if (!info.x || !info.y) {
        return 'not_found';
      }

      console.log(`[xhs-post] Found button "${info.text}" at (${info.x}, ${info.y}), simulating mouse click...`);

      // 第二步：用 CDP Input.dispatchMouseEvent 模拟真实鼠标点击
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x: info.x, y: info.y, button: 'left', clickCount: 1,
      }, { sessionId });
      await sleep(50);
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', x: info.x, y: info.y, button: 'left', clickCount: 1,
      }, { sessionId });

      return 'clicked: ' + info.text + ' at (' + info.x + ',' + info.y + ')';
    }

    let clickValue = await tryClickPublishButton();
    console.log(`[xhs-post] Click result: ${clickValue}`);

    // 如果没找到按钮，多等几秒再试一次（页面可能还在渲染）
    if (clickValue.startsWith('not_found')) {
      console.log('[xhs-post] Button not found on first try, waiting 5s and retrying...');
      await sleep(5000);
      clickValue = await tryClickPublishButton();
      console.log(`[xhs-post] Click result (retry): ${clickValue}`);
    }

    // 等待导航发生（按钮点击可能触发 React 客户端路由）
    if (!clickValue.startsWith('not_found')) {
      console.log('[xhs-post] Waiting for navigation after click...');
      const navigated = await poll(async () => {
        const url = await getUrl(cdp!, sessionId);
        return url.includes('/publish') || url.includes('target=image');
      }, 15_000, 1000);
      if (!navigated) {
        console.log('[xhs-post] No navigation after click, trying direct URL...');
        // 使用完整 URL（不含 openFilePicker=true，避免自动弹出文件选择器）
        await cdp.send('Page.navigate', { url: XHS_PUBLISH_URL + '/publish?from=homepage&target=image' }, { sessionId });
      }
    } else {
      console.log('[xhs-post] Button not found, navigating directly to publish page...');
      await cdp.send('Page.navigate', { url: XHS_PUBLISH_URL + '/publish?from=homepage&target=image' }, { sessionId });
    }

    await sleep(3000);
    currentUrl = await getUrl(cdp, sessionId);
    console.log(`[xhs-post] After click/navigate: ${currentUrl}`);

    // 关闭自动弹出的原生文件选择器对话框
    // 原生文件对话框是 OS 级窗口，CDP 事件无法直接关闭
    // 使用 PowerShell 发送 Escape 键到前台窗口
    try {
      const { execSync } = await import('node:child_process');
      // 方法1：用 PowerShell 发送 Escape 键到前台窗口
      execSync(
        'powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'{ESC}\')"',
        { timeout: 5000, stdio: 'pipe' },
      );
      await sleep(500);
      // 方法2：再发一次确保关闭
      execSync(
        'powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'{ESC}\')"',
        { timeout: 5000, stdio: 'pipe' },
      );
      console.log('[xhs-post] Sent OS-level Escape to dismiss file picker');
    } catch (e) {
      console.warn(`[xhs-post] Failed to send OS Escape: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ========== 步骤 1: 等待页面加载，找到 file input ==========
    console.log('[xhs-post] Step 1: Waiting for publish page to load...');

    // 探测函数：获取页面关键信息（容错 CDP 超时）
    async function getPageInfo(): Promise<{url: string; fileInputs: number; allInputs: number; editables: number; bodyText: string; buttons: string[]}> {
      try {
        const r = await cdp!.send<{ result: { value: string } }>(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const inputs = document.querySelectorAll('input[type="file"]');
              const allInputs = document.querySelectorAll('input');
              const editables = document.querySelectorAll('[contenteditable="true"]');
              const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean);
              return JSON.stringify({
                url: location.href,
                fileInputs: inputs.length,
                allInputs: allInputs.length,
                editables: editables.length,
                buttons: buttons.slice(0, 10),
                bodyText: document.body?.innerText?.substring(0, 500) || '',
              });
            })()`,
            returnByValue: true,
          },
          { sessionId },
        );
        return JSON.parse(r.result.value);
      } catch (err) {
        console.warn(`[xhs-post] getPageInfo failed: ${err instanceof Error ? err.message : String(err)}`);
        return { url: 'unknown', fileInputs: 0, allInputs: 0, editables: 0, bodyText: '', buttons: [] };
      }
    }

    // 等待页面加载完成
    await sleep(3000);
    let info = await getPageInfo();
    console.log(`[xhs-post] Page: url=${info.url}, fileInputs=${info.fileInputs}, allInputs=${info.allInputs}, editables=${info.editables}`);
    console.log(`[xhs-post] Buttons: ${JSON.stringify(info.buttons)}`);
    console.log(`[xhs-post] Body: ${info.bodyText.substring(0, 200)}`);

    // 检测是否需要登录（页面无输入元素 + 无编辑器 = 可能未登录或页面加载失败）
    if (info.allInputs === 0 && info.editables === 0) {
      // 先检查当前 URL 是否确实是登录页
      currentUrl = await getUrl(cdp, sessionId);
      const isLoginPage = currentUrl.includes('login') || currentUrl.includes('passport');

      if (isLoginPage) {
        console.log('[xhs-post] ============================================');
        console.log('[xhs-post] 检测到登录页面，请在浏览器中完成登录！');
        console.log('[xhs-post] 登录后脚本会自动继续...');
        console.log('[xhs-post] ============================================');
      } else {
        console.log('[xhs-post] ============================================');
        console.log('[xhs-post] 页面无输入元素，可能页面加载失败或需要登录');
        console.log('[xhs-post] 请检查浏览器，如需登录请完成登录...');
        console.log('[xhs-post] ============================================');
      }

      // 等待页面变化：轮询直到页面出现输入元素或 file input
      const loggedIn = await poll(async () => {
        const i = await getPageInfo();
        console.log(`[xhs-post] Waiting... fileInputs=${i.fileInputs}, allInputs=${i.allInputs}, editables=${i.editables}`);
        return i.fileInputs > 0 || i.allInputs > 0 || i.editables > 0;
      }, timeoutMs, 5000);

      if (!loggedIn) {
        throw new Error('登录超时。请在浏览器中登录小红书后重试。');
      }

      // 检查当前页面状态：如果已经在发布页且有 file input，无需重新导航
      info = await getPageInfo();
      currentUrl = await getUrl(cdp, sessionId);
      console.log(`[xhs-post] Poll ended: url=${currentUrl}, fileInputs=${info.fileInputs}`);

      if (info.fileInputs > 0 && currentUrl.includes('/publish')) {
        console.log('[xhs-post] ✅ 已在发布页且有文件上传入口，继续...');
      } else {
        // 需要导航到发布页
        console.log('[xhs-post] 导航到发布页...');
        await cdp.send('Page.navigate', { url: XHS_PUBLISH_URL }, { sessionId });
        await sleep(5000);

        // 页面导航后 CDP session 可能失效，重新 attach
        console.log('[xhs-post] Re-attaching to target after navigation...');
        try {
          const { sessionId: newSessionId } = await cdp.send<{ sessionId: string }>(
            'Target.attachToTarget',
            { targetId: pageTarget.targetId, flatten: true },
          );
          sessionId = newSessionId;
          await cdp.send('Page.enable', {}, { sessionId });
          await cdp.send('Runtime.enable', {}, { sessionId });
          await cdp.send('Input.setIgnoreInputEvents', { ignore: false }, { sessionId });
        } catch (reattachErr) {
          console.warn(`[xhs-post] Re-attach failed: ${reattachErr instanceof Error ? reattachErr.message : String(reattachErr)}`);
        }
        await sleep(2000);
        info = await getPageInfo();
        console.log(`[xhs-post] After reload: fileInputs=${info.fileInputs}, allInputs=${info.allInputs}`);
      }
    }

    // 等待 file input 出现
    const fileInputReady = await poll(async () => {
      const i = await getPageInfo();
      return i.fileInputs > 0;
    }, 30_000);

    if (!fileInputReady) {
      info = await getPageInfo();
      console.log(`[xhs-post] Final page state: ${JSON.stringify(info)}`);
      throw new Error('发布页加载超时，未找到文件上传入口。' +
        `页面有 ${info.allInputs} 个 input, ${info.editables} 个编辑器。` +
        `按钮: ${JSON.stringify(info.buttons)}`);
    }
    console.log('[xhs-post] ✅ File input found');

    // ========== 步骤 2: 上传图片 ==========
    console.log('[xhs-post] Step 2: Uploading images...');

    // 准备图片路径
    let imagePaths: string[] = [];
    const validImages = images.filter((f) => fs.existsSync(f));

    if (validImages.length > 0) {
      imagePaths = validImages.map((f) => path.resolve(f));
    } else {
      // 无图片时生成白色占位图（小红书要求至少 1 张图）
      console.log('[xhs-post] No images provided, generating placeholder...');
      const placeholderPath = path.join(os.tmpdir(), `xhs_placeholder_${Date.now()}.png`);
      const whitePng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64',
      );
      fs.writeFileSync(placeholderPath, whitePng);
      imagePaths = [placeholderPath];
    }

    // 通过 DOM 找到 file input 并上传
    await cdp.send('DOM.enable', {}, { sessionId });
    const { root } = await cdp.send<{ root: { nodeId: number } }>(
      'DOM.getDocument',
      {},
      { sessionId },
    );

    const { nodeId: fileNodeId } = await cdp.send<{ nodeId: number }>(
      'DOM.querySelector',
      { nodeId: root.nodeId, selector: 'input[type="file"]' },
      { sessionId },
    );

    if (!fileNodeId || fileNodeId === 0) {
      throw new Error('未找到文件上传 input 元素');
    }

    await cdp.send(
      'DOM.setFileInputFiles',
      { nodeId: fileNodeId, files: imagePaths },
      { sessionId },
    );
    console.log(`[xhs-post] ${imagePaths.length} image(s) set. Waiting for upload...`);

    // 等待图片上传完成（检测预览图出现）
    const uploadDone = await poll(async () => {
      const r = await cdp!.send<{ result: { value: number } }>(
        'Runtime.evaluate',
        {
          expression: `document.querySelectorAll('img[src^="blob:"], img[src^="data:"], .img-container img, .upload-preview img, .c-image-item img').length`,
          returnByValue: true,
        },
        { sessionId },
      );
      return r.result.value > 0;
    }, 15_000);

    if (uploadDone) {
      console.log('[xhs-post] ✅ Image upload verified');
    } else {
      console.warn('[xhs-post] ⚠ Upload verification timeout, continuing...');
    }

    // 等待编辑器出现（图片上传后，小红书新版会通过客户端路由跳转到编辑页面）
    console.log('[xhs-post] Waiting for editor to appear after upload...');

    // 轮询等待：编辑器出现（contenteditable 或 标题输入框）
    const editorReady = await poll(async () => {
      const r = await cdp!.send<{ result: { value: string } }>(
        'Runtime.evaluate',
        {
          expression: `(() => {
            const editables = document.querySelectorAll('[contenteditable="true"]');
            const titleInput = document.querySelector('input[placeholder*="标题"]');
            const textbox = document.querySelector('[role="textbox"]');
            return JSON.stringify({
              editables: editables.length,
              hasTitle: !!titleInput,
              hasTextbox: !!textbox,
              url: location.href,
            });
          })()`,
          returnByValue: true,
        },
        { sessionId },
      );
      const info = JSON.parse(r.result.value);
      if (info.editables > 0 || info.hasTitle || info.hasTextbox) {
        console.log(`[xhs-post] Editor detected: editables=${info.editables}, hasTitle=${info.hasTitle}, hasTextbox=${info.hasTextbox}`);
        return true;
      }
      return false;
    }, 30_000, 2000);

    if (!editorReady) {
      console.warn('[xhs-post] ⚠ Editor not detected after 30s, checking page state...');
      // 探测当前页面状态
      const pageState = await cdp!.send<{ result: { value: string } }>(
        'Runtime.evaluate',
        {
          expression: `JSON.stringify({
            url: location.href,
            editables: document.querySelectorAll('[contenteditable="true"]').length,
            inputs: document.querySelectorAll('input').length,
            bodyText: document.body?.innerText?.substring(0, 300) || '',
          })`,
          returnByValue: true,
        },
        { sessionId },
      );
      console.log(`[xhs-post] Page state: ${pageState.result.value}`);
    }

    // 额外等待确保 JS 渲染完成
    await sleep(2000);

    // ========== 步骤 3: 填写标题 ==========
    if (title) {
      console.log(`[xhs-post] Step 3: Filling title: "${title}"`);

      // 先探测页面上所有 input 和 contenteditable 元素
      const editorProbe = await cdp.send<{ result: { value: string } }>(
        'Runtime.evaluate',
        {
          expression: `(() => {
            const inputs = Array.from(document.querySelectorAll('input')).map(e => ({
              tag: e.tagName, type: e.type, ph: e.placeholder, class: (e.className||'').toString().substring(0,50),
              w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height)
            }));
            const editables = Array.from(document.querySelectorAll('[contenteditable]')).map(e => ({
              tag: e.tagName, ph: e.getAttribute('placeholder')||e.getAttribute('data-placeholder')||'',
              class: (e.className||'').toString().substring(0,50),
              w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height),
              text: (e.textContent||'').substring(0,30)
            }));
            return JSON.stringify({inputs, editables});
          })()`,
          returnByValue: true,
        },
        { sessionId },
      );
      console.log(`[xhs-post] Editor probe: ${editorProbe.result.value}`);

      // 尝试多种选择器找到标题输入框
      // 注意：小红书新版标题输入框 placeholder 为"填写标题会有更多赞哦"，不含"标题"二字
      const titleSelectors = [
        'input[placeholder*="标题"]',
        'input[placeholder*="填写标题"]',
        'input[placeholder*="title"]',
        'input.d-text[type="text"]',
        '#title',
        '.title-input input',
        '.note-title input',
        '[data-testid="note-title"]',
      ];

      let titleFilled = false;
      for (const sel of titleSelectors) {
        try {
          const r = await cdp.send<{ result?: { value?: string; type?: string }; exceptionDetails?: object }>(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(sel)});
                if (!el) return '{"found":false}';
                try {
                  el.focus();
                  if ('value' in el) el.value = '';
                  return '{"found":true,"tag":"' + el.tagName + '","type":"' + (el.type||'') + '"}';
                } catch(e) {
                  return '{"found":true,"error":"' + String(e).replace(/"/g, '\\"') + '"}';
                }
              })()`,
              returnByValue: true,
            },
            { sessionId },
          );
          if (r.exceptionDetails || !r.result?.value) {
            // CDP 报错或返回 undefined，跳过
            continue;
          }
          const detail = JSON.parse(r.result.value);
          if (detail.found && !detail.error) {
            console.log(`[xhs-post] Title selector "${sel}" matched: ${JSON.stringify(detail)}`);
            await sleep(200);
            await cdp.send('Input.insertText', { text: title }, { sessionId });
            await sleep(500);

            // 验证
            const check = await cdp.send<{ result?: { value?: string } }>(
              'Runtime.evaluate',
              {
                expression: `(document.querySelector(${JSON.stringify(sel)})?.value) || ''`,
                returnByValue: true,
              },
              { sessionId },
            );
            const checkVal = check.result?.value || '';
            console.log(`[xhs-post] Title verify: "${checkVal.substring(0, 30)}" (${checkVal.length} chars)`);
            if (checkVal.length > 0) {
              console.log(`[xhs-post] ✅ Title filled (${checkVal.length} chars)`);
              titleFilled = true;
              break;
            }
          } else if (detail.found && detail.error) {
            console.warn(`[xhs-post] Title selector "${sel}" found but error: ${detail.error}`);
          }
        } catch (err) {
          console.warn(`[xhs-post] Title selector "${sel}" exception: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (!titleFilled) {
        // 降级：查找所有 contenteditable 元素中较短的（可能是标题）
        console.warn('[xhs-post] Standard title selectors failed, trying contenteditable...');
        const r = await cdp.send<{ result: { value: string } }>(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const editables = document.querySelectorAll('[contenteditable="true"]');
              const info = Array.from(editables).map(e => ({
                tag: e.tagName, text: (e.textContent||'').length,
                ph: e.getAttribute('placeholder')||e.getAttribute('data-placeholder')||'',
                w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height)
              }));
              // 标题通常是第一个较短的 contenteditable
              for (const el of editables) {
                if (el.textContent?.length === 0 || el.getAttribute('placeholder')?.includes('标题')) {
                  el.focus();
                  return JSON.stringify({found: true, method: 'empty_or_title_ph', info});
                }
              }
              // 退而求其次，用第一个 contenteditable
              if (editables.length > 0) {
                editables[0].focus();
                return JSON.stringify({found: true, method: 'first_editable', info});
              }
              return JSON.stringify({found: false, info});
            })()`,
            returnByValue: true,
          },
          { sessionId },
        );
        const titleFallback = JSON.parse(r.result.value);
        console.log(`[xhs-post] Title fallback result: ${JSON.stringify(titleFallback)}`);
        if (titleFallback.found) {
          await sleep(200);
          await cdp.send('Input.insertText', { text: title }, { sessionId });
          await sleep(500);
          // 验证
          const checkR = await cdp.send<{ result: { value: string } }>(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const editables = document.querySelectorAll('[contenteditable="true"]');
                for (const el of editables) {
                  if (el.textContent && el.textContent.length > 0) return el.textContent.substring(0, 50);
                }
                return '';
              })()`,
              returnByValue: true,
            },
            { sessionId },
          );
          if (checkR.result.value.length > 0) {
            console.log(`[xhs-post] ✅ Title filled via contenteditable fallback: "${checkR.result.value}"`);
          } else {
            console.warn('[xhs-post] ⚠ Title contenteditable fill may have failed');
          }
        } else {
          console.warn('[xhs-post] ⚠ Could not find title input. Please fill manually.');
        }
      }
    }

    // ========== 步骤 4: 填写正文 ==========
    if (content) {
      console.log(`[xhs-post] Step 4: Filling content (${content.length} chars)...`);

      // 小红书正文编辑器：tiptap ProseMirror 或 contenteditable div
      const contentSelectors = [
        '.ProseMirror[contenteditable="true"]',
        '.tiptap[contenteditable="true"]',
        'div[contenteditable="true"][data-placeholder*="正文"]',
        'div[contenteditable="true"][placeholder*="正文"]',
        '.ql-editor',
        '.note-content div[contenteditable]',
        '[data-testid="note-content"]',
      ];

      let contentFilled = false;

      // 先尝试精确选择器
      for (const sel of contentSelectors) {
        try {
          const r = await cdp.send<{ result: { value: boolean } }>(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(sel)});
                if (!el) return false;
                (el as HTMLElement).focus();
                return true;
              })()`,
              returnByValue: true,
            },
            { sessionId },
          );
          if (r.result.value === true) {
            await sleep(200);
            await cdp.send('Input.insertText', { text: content }, { sessionId });
            await sleep(500);

            const check = await cdp.send<{ result: { value: string } }>(
              'Runtime.evaluate',
              {
                expression: `(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`,
                returnByValue: true,
              },
              { sessionId },
            );
            if (check.result.value.length > 0) {
              console.log(`[xhs-post] ✅ Content filled (${check.result.value.length} chars)`);
              contentFilled = true;
              break;
            }
          }
        } catch {
          // 选择器无效，继续
        }
      }

      // 降级：用所有 contenteditable 中最大的那个（排除标题）
      if (!contentFilled) {
        console.warn('[xhs-post] Standard selectors failed, trying largest contenteditable...');
        const r = await cdp.send<{ result: { value: string } }>(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
              if (editables.length === 0) return JSON.stringify({found: false, reason: 'no_editables'});
              // 按面积排序，取最大的（正文编辑器通常最大）
              editables.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                return (rb.width * rb.height) - (ra.width * ra.height);
              });
              const el = editables[0];
              el.focus();
              return JSON.stringify({
                found: true,
                tag: el.tagName,
                class: (el.className||'').toString().substring(0,50),
                w: Math.round(el.getBoundingClientRect().width),
                h: Math.round(el.getBoundingClientRect().height),
                text: (el.textContent||'').substring(0,30)
              });
            })()`,
            returnByValue: true,
          },
          { sessionId },
        );
        const contentFallback = JSON.parse(r.result.value);
        console.log(`[xhs-post] Content fallback: ${JSON.stringify(contentFallback)}`);
        if (contentFallback.found) {
          await sleep(200);
          await cdp.send('Input.insertText', { text: content }, { sessionId });
          await sleep(500);
          // 验证
          const checkR = await cdp.send<{ result: { value: string } }>(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
                editables.sort((a, b) => {
                  const ra = a.getBoundingClientRect();
                  const rb = b.getBoundingClientRect();
                  return (rb.width * rb.height) - (ra.width * ra.height);
                });
                return editables.length > 0 ? (editables[0].textContent||'').substring(0, 50) : '';
              })()`,
              returnByValue: true,
            },
            { sessionId },
          );
          if (checkR.result.value.length > 0) {
            console.log(`[xhs-post] ✅ Content filled via largest contenteditable: "${checkR.result.value}"`);
            contentFilled = true;
          } else {
            console.warn('[xhs-post] ⚠ Content fill may have failed');
          }
        }
      }

      if (!contentFilled) {
        // 不再抛出异常，降级为警告（用户可以手动填写）
        console.warn('[xhs-post] ⚠ 未找到正文编辑器，请手动填写内容');
      }
    }

    // ========== 步骤 5: 添加话题标签 ==========
    if (topics.length > 0) {
      console.log(`[xhs-post] Step 5: Adding ${topics.length} topic(s)...`);

      // 小红书话题通常通过在正文中输入 #关键词 触发
      // 找到正文编辑器，在末尾追加 #话题
      const topicText = topics
        .slice(0, 5)
        .map((t) => (t.startsWith('#') ? t : `#${t}`))
        .join(' ');

      // 尝试找到话题输入框
      const topicSelectors = [
        'input[placeholder*="话题"]',
        'input[placeholder*="标签"]',
        'input[placeholder*="topic"]',
      ];

      let topicAdded = false;
      for (const sel of topicSelectors) {
        try {
          const r = await cdp.send<{ result: { value: boolean } }>(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(sel)});
                if (!el) return false;
                (el as HTMLElement).focus();
                return true;
              })()`,
              returnByValue: true,
            },
            { sessionId },
          );
          if (r.result.value === true) {
            await sleep(200);
            await cdp.send('Input.insertText', { text: topicText }, { sessionId });
            await sleep(500);
            // 按 Enter 确认
            await cdp.send('Input.dispatchKeyEvent', {
              type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13,
            }, { sessionId });
            await cdp.send('Input.dispatchKeyEvent', {
              type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13,
            }, { sessionId });
            console.log('[xhs-post] ✅ Topics added via topic input');
            topicAdded = true;
            break;
          }
        } catch {}
      }

      if (!topicAdded) {
        console.warn('[xhs-post] ⚠ Topic input not found. Please add topics manually.');
      }
    }

    // ========== 步骤 6: 自动存草稿 ==========
    console.log('[xhs-post] Step 6: Saving as draft...');
    await sleep(1000);

    // 先探测所有可见按钮
    const draftBtnProbe = await cdp!.send<{ result: { value: string } }>(
      'Runtime.evaluate',
      {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'))
            .filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            })
            .map(el => (el.textContent?.trim() || '').substring(0, 30))
            .filter(Boolean);
          return JSON.stringify(btns.slice(0, 20));
        })()`,
        returnByValue: true,
      },
      { sessionId },
    );
    console.log(`[xhs-post] Visible buttons: ${draftBtnProbe.result.value}`);

    const draftSaved = await (async () => {
      // 搜索更多文本变体
      const draftTexts = ['存草稿', '保存草稿', '保存', '草稿'];
      for (const text of draftTexts) {
        const r = await cdp!.send<{ result: { value: boolean } }>(
          'Runtime.evaluate',
          {
            expression: `(() => {
              const els = document.querySelectorAll('button, a, div, span');
              for (const el of els) {
                const txt = el.textContent?.trim() || '';
                if (txt === ${JSON.stringify(text)} || txt.includes(${JSON.stringify(text)})) {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    (el as HTMLElement).click();
                    return true;
                  }
                }
              }
              return false;
            })()`,
            returnByValue: true,
          },
          { sessionId },
        );
        if (r.result.value === true) {
          console.log(`[xhs-post] Clicked "${text}"`);
          return true;
        }
      }
      // 降级：尝试 Ctrl+S 快捷键保存
      console.log('[xhs-post] Trying Ctrl+S shortcut...');
      await cdp!.send('Input.dispatchKeyEvent', {
        type: 'keyDown', key: 's', code: 'KeyS', windowsVirtualKeyCode: 83,
        modifiers: 2, // Ctrl
      }, { sessionId });
      await cdp!.send('Input.dispatchKeyEvent', {
        type: 'keyUp', key: 's', code: 'KeyS', windowsVirtualKeyCode: 83,
        modifiers: 2,
      }, { sessionId });
      await sleep(2000);
      // 检查是否出现了保存确认
      return false;
    })();

    if (draftSaved) {
      console.log('');
      console.log('══════════════════════════════════════════════');
      console.log('  ✅ 小红书笔记已自动保存为草稿');
      console.log('  📝 请在创作者中心的草稿箱中审核并发布');
      console.log('══════════════════════════════════════════════');
    } else {
      console.log('');
      console.log('══════════════════════════════════════════════');
      console.log('  ✅ 内容已填入编辑器');
      console.log('  ⚠  未找到「存草稿」按钮，请手动点击');
      console.log('══════════════════════════════════════════════');
    }
  } finally {
    if (cdp) {
      cdp.close();
    }
  }
}

// ============ CLI 入口 ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Post to 小红书 (Xiaohongshu) using real Chrome browser

Usage:
  npx -y bun xiaohongshu-post.ts --meta <path-to-json>

JSON format:
  {
    "title": "笔记标题",
    "content": "正文内容",
    "images": ["img1.png", "img2.png"],
    "topics": ["话题1", "话题2"],
    "profile": "/path/to/chrome/profile"
  }

Options:
  --meta <path>   Path to JSON file with all parameters
  --help          Show this help
`);
    process.exit(0);
  }

  // 解析 --meta 参数
  const metaIdx = args.indexOf('--meta');
  if (metaIdx === -1 || !args[metaIdx + 1]) {
    console.error('Error: --meta <path> is required.');
    process.exit(1);
  }

  const metaPath = args[metaIdx + 1]!;
  let meta: XhsMeta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    console.log(`[xhs-post] Loaded meta from: ${metaPath}`);
    console.log(`[xhs-post] title=${(meta.title || '').length} chars, content=${(meta.content || '').length} chars, images=${(meta.images || []).length}, topics=${(meta.topics || []).length}`);
  } catch (err) {
    console.error(`Error: Failed to read meta file: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  await postToXiaohongshu(meta);
}

await main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[xhs-post] FATAL: ${msg}`);
  console.log(`[xhs-post] FATAL: ${msg}`);
  process.exit(1);
});
