/**
 * 抖音图文发布 — 上传图片 + 标题 + 描述/话题
 * 图文 URL: /creator-micro/content/upload?default-tab=3
 */
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  CdpConnection,
  DY_IMAGE_UPLOAD_URL,
  DY_MANAGE_URL,
  findChromeExecutable,
  findExistingChromeDebugPort,
  getDefaultProfileDir,
  killChromeByProfile,
  launchChrome,
  sleep,
  waitForChromeDebugPort,
} from './douyin-utils.js';

interface DyMeta {
  title?: string;
  content?: string;
  images?: string[];
  topics?: string[];
  profile?: string;
}

const log = (msg: string) => console.log(`[dy] ${msg}`);

const exec = async (cdp: CdpConnection, sid: string, expression: string) => {
  const r = await cdp.send<{ result: { value: string } }>(
    'Runtime.evaluate',
    { expression, returnByValue: true, timeout: 15000 },
    { sessionId: sid },
  );
  return r.result?.value || '';
};

const poll = async (
  fn: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs = 1500,
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return true;
    await sleep(intervalMs);
  }
  return false;
};

const clickByText = async (cdp: CdpConnection, sid: string, texts: string[]) => {
  const jsonTexts = JSON.stringify(texts);
  const r = await exec(
    cdp,
    sid,
    `(() => {
      const targets = ${jsonTexts};
      for (const el of document.querySelectorAll('button,a,div,span,li,p')) {
        const t = (el.textContent || '').trim();
        for (const target of targets) {
          if (t === target || t.includes(target)) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.width < 500) {
              el.click();
              return target;
            }
          }
        }
      }
      return '';
    })()`,
  );
  if (r) log(`Clicked: ${r}`);
  return Boolean(r);
};

const dismissDialogs = async (cdp: CdpConnection, sid: string) => {
  for (const text of ['我知道了', '确定', '知道了', '关闭']) {
    await clickByText(cdp, sid, [text]);
    await sleep(300);
  }
};

const navigateToImageUpload = async (cdp: CdpConnection, sid: string) => {
  log('Navigate to image-text upload page...');
  await cdp.send('Page.navigate', { url: DY_MANAGE_URL }, { sessionId: sid });
  await sleep(4000);
  await dismissDialogs(cdp, sid);

  // 高清发布 → 发布图文
  const hovered = await exec(
    cdp,
    sid,
  `(() => {
      for (const el of document.querySelectorAll('button,div,span,a')) {
        if ((el.textContent || '').trim().includes('高清发布')) {
          el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          return 'ok';
        }
      }
      return '';
    })()`);
  if (hovered) {
    await sleep(1200);
    if (await clickByText(cdp, sid, ['发布图文'])) {
      await sleep(4000);
    }
  }

  let url = await exec(cdp, sid, 'location.href');
  if (!url.includes('/upload')) {
    log('Fallback: direct image upload URL');
    await cdp.send('Page.navigate', { url: DY_IMAGE_UPLOAD_URL }, { sessionId: sid });
    await sleep(5000);
  }

  url = await exec(cdp, sid, 'location.href');
  log(`Upload page: ${url.substring(0, 100)}`);
};

const waitForFileInputs = async (cdp: CdpConnection, sid: string) => {
  const ready = await poll(async () => {
    const count = await exec(
      cdp,
      sid,
      `document.querySelectorAll('input[type="file"]').length`,
    );
    return Number.parseInt(count || '0', 10) > 0;
  }, 45_000, 2000);
  if (!ready) throw new Error('未找到图片上传控件，请确认已进入图文发布页');
};

const uploadImages = async (cdp: CdpConnection, sid: string, imagePaths: string[]) => {
  if (imagePaths.length === 0) {
    log('No images to upload');
    return;
  }

  await cdp.send('DOM.enable', {}, { sessionId: sid });
  const doc = await cdp.send<{ root: { nodeId: number } }>(
    'DOM.getDocument',
    { depth: -1 },
    { sessionId: sid },
  );

  const inputs = await cdp.send<{ nodeIds: number[] }>(
    'DOM.querySelectorAll',
    { nodeId: doc.root.nodeId, selector: 'input[type="file"]' },
    { sessionId: sid },
  );

  log(`Found ${inputs.nodeIds.length} file input(s)`);
  if (inputs.nodeIds.length === 0) {
    throw new Error('页面上没有 file input，无法上传图片');
  }

  // 优先选择接受图片的 input
  let targetNodeId = inputs.nodeIds[0];
  for (const nodeId of inputs.nodeIds) {
    const desc = await cdp.send<{ node: { attributes?: string[] } }>(
      'DOM.describeNode',
      { nodeId },
      { sessionId: sid },
    );
    const attrs = desc.node.attributes || [];
    const accept = attrs[attrs.indexOf('accept') + 1] || '';
    if (/image|png|jpg|jpeg|webp/i.test(accept) || accept === '') {
      targetNodeId = nodeId;
      break;
    }
  }

  await cdp.send(
    'DOM.setFileInputFiles',
    { nodeId: targetNodeId, files: imagePaths },
    { sessionId: sid },
  );
  log(`Uploaded ${imagePaths.length} image(s)`);

  const uploaded = await poll(async () => {
    const info = await exec(
      cdp,
      sid,
      `JSON.stringify({
        imgs: document.querySelectorAll('img[src^="blob:"], img[src^="data:"], .upload img, [class*="upload"] img, [class*="image"] img').length,
        previews: document.querySelectorAll('[class*="preview"], [class*="thumb"]').length
      })`,
    );
    try {
      const d = JSON.parse(info || '{}');
      return (d.imgs || 0) > 0 || (d.previews || 0) > 0;
    } catch {
      return false;
    }
  }, 60_000, 2000);

  if (!uploaded) {
    log('Upload preview not detected, waiting extra time...');
    await sleep(imagePaths.length * 2500 + 3000);
  } else {
    log('Image upload preview detected');
  }
};

const fillTitle = async (cdp: CdpConnection, sid: string, title: string) => {
  if (!title) return;
  const filled = await exec(
    cdp,
    sid,
    `(() => {
      const sels = [
        'input[placeholder*="作品标题"]',
        'input[placeholder*="标题"]',
        'input[placeholder*="添加作品标题"]',
      ];
      for (const s of sels) {
        const el = document.querySelector(s);
        if (!el) continue;
        el.focus();
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.value = '';
        }
        return s;
      }
      return '';
    })()`,
  );
  if (!filled) {
    log('Title input not found');
    return;
  }
  await sleep(300);
  await cdp.send('Input.insertText', { text: title }, { sessionId: sid });
  log(`Title filled: ${title.substring(0, 30)}`);
};

const fillDescription = async (cdp: CdpConnection, sid: string, text: string) => {
  if (!text) return;
  const focused = await exec(
    cdp,
    sid,
    `(() => {
      const sels = [
        '[contenteditable="true"]',
        'textarea[placeholder*="描述"]',
        'textarea[placeholder*="作品"]',
        'textarea',
      ];
      for (const s of sels) {
        const el = document.querySelector(s);
        if (!el) continue;
        el.focus();
        if (el instanceof HTMLElement && el.isContentEditable) {
          el.innerText = '';
        } else if (el instanceof HTMLTextAreaElement) {
          el.value = '';
        }
        return s;
      }
      return '';
    })()`,
  );
  if (!focused) {
    log('Description editor not found');
    return;
  }
  await sleep(300);
  await cdp.send('Input.insertText', { text }, { sessionId: sid });
  log(`Description filled (${text.length} chars)`);
};

async function main() {
  const args = process.argv.slice(2);
  const metaIdx = args.indexOf('--meta');
  if (metaIdx === -1 || !args[metaIdx + 1]) {
    log('Usage: bun douyin-post.ts --meta <path>');
    process.exit(1);
  }

  const meta: DyMeta = JSON.parse(fs.readFileSync(args[metaIdx + 1]!, 'utf-8'));
  const { title, content, images = [], topics = [] } = meta;
  const profileDir = meta.profile || getDefaultProfileDir();

  const cleanContent = (content || '')
    .replace(/\[插入图片\d*\]/gi, '')
    .replace(/\[图片\]/gi, '')
    .replace(/【图】/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const topicLine = topics
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
    .join(' ');
  const description = [cleanContent, topicLine].filter(Boolean).join('\n\n');

  const validImages = images
    .filter((f) => fs.existsSync(f))
    .map((f) => path.resolve(f).replace(/\\/g, '/'));

  log(
    `mode=image-text title="${(title || '').substring(0, 40)}" desc=${description.length}c images=${validImages.length}`,
  );

  if (validImages.length === 0) {
    throw new Error('图文模式至少需要 1 张图片');
  }

  await mkdir(profileDir, { recursive: true });
  const chromePath = findChromeExecutable();
  if (!chromePath) throw new Error('Chrome not found');

  try {
    killChromeByProfile(profileDir);
    await sleep(3000);
  } catch {}

  let port: number;
  const existingPort = await findExistingChromeDebugPort(profileDir);
  if (existingPort) {
    try {
      const ws = await waitForChromeDebugPort(existingPort, 15_000);
      const test = await CdpConnection.connect(ws, 15_000, { defaultTimeoutMs: 15_000 });
      await test.send('Target.getTargets');
      test.close();
      port = existingPort;
    } catch {
      killChromeByProfile(profileDir);
      await sleep(4000);
      port = await launchChrome(DY_MANAGE_URL, profileDir, chromePath);
    }
  } else {
    port = await launchChrome(DY_MANAGE_URL, profileDir, chromePath);
  }

  let cdp: CdpConnection | null = null;
  try {
    const wsUrl = await waitForChromeDebugPort(port, 60_000);
    cdp = await CdpConnection.connect(wsUrl, 30_000, { defaultTimeoutMs: 20_000 });

    const targets = await cdp.send<{
      targetInfos: Array<{ targetId: string; url: string; type: string }>;
    }>('Target.getTargets');

    let pageTarget = targets.targetInfos.find(
      (t) => t.type === 'page' && t.url.includes('douyin.com'),
    );
    if (!pageTarget) {
      const { targetId } = await cdp.send<{ targetId: string }>('Target.createTarget', {
        url: DY_MANAGE_URL,
      });
      pageTarget = { targetId, url: DY_MANAGE_URL, type: 'page' };
    }

    let { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', {
      targetId: pageTarget.targetId,
      flatten: true,
    });
    await cdp.send('Target.activateTarget', { targetId: pageTarget.targetId });
    await cdp.send('Page.enable', {}, { sessionId });
    await cdp.send('Runtime.enable', {}, { sessionId });
    await cdp.send('Input.setIgnoreInputEvents', { ignore: false }, { sessionId });
    await sleep(3000);

    const url = await exec(cdp, sessionId, 'location.href');
    if (url.includes('login') || url.includes('sso') || url.includes('account')) {
      log('Waiting for login (5min)...');
      const start = Date.now();
      while (Date.now() - start < 300_000) {
        await sleep(5000);
        const u = await exec(cdp, sessionId, 'location.href');
        if (!u.includes('login') && !u.includes('sso') && !u.includes('account')) break;
      }
      await sleep(3000);
    }

    await navigateToImageUpload(cdp, sessionId);
    await dismissDialogs(cdp, sessionId);
    await waitForFileInputs(cdp, sessionId);
    await uploadImages(cdp, sessionId, validImages);
    await sleep(2000);
    await fillTitle(cdp, sessionId, title || '');
    await fillDescription(cdp, sessionId, description);
    await dismissDialogs(cdp, sessionId);

    log('DONE! Image-text draft ready — review and publish in browser.');
  } finally {
    if (cdp) cdp.close();
  }
}

await main().catch((err) => {
  console.error(`[dy] FATAL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
