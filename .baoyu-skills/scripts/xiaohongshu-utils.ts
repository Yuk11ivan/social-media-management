/**
 * 小红书 CDP 自动化 — 共享工具函数
 * 复用 weibo-utils.ts 中的 Chrome 启动/连接逻辑，适配小红书场景
 */
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  CdpConnection,
  findChromeExecutable as findChromeExecutableBase,
  findExistingChromeDebugPort as findExistingChromeDebugPortBase,
  getFreePort as getFreePortBase,
  launchChrome as launchChromeBase,
  resolveSharedChromeProfileDir,
  sleep,
  waitForChromeDebugPort,
  type PlatformCandidates,
} from 'baoyu-chrome-cdp';

export { CdpConnection, sleep, waitForChromeDebugPort };

export const CHROME_CANDIDATES: PlatformCandidates = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  default: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ],
};

// ============ WSL 支持 ============

let wslHome: string | null | undefined;
function getWslWindowsHome(): string | null {
  if (wslHome !== undefined) return wslHome;
  if (!process.env.WSL_DISTRO_NAME) {
    wslHome = null;
    return null;
  }
  try {
    const raw = execSync('cmd.exe /C "echo %USERPROFILE%"', {
      encoding: 'utf-8',
      timeout: 5_000,
    }).trim().replace(/\r/g, '');
    wslHome = execSync(`wslpath -u "${raw}"`, {
      encoding: 'utf-8',
      timeout: 5_000,
    }).trim() || null;
  } catch {
    wslHome = null;
  }
  return wslHome;
}

// ============ Chrome 管理 ============

export function findChromeExecutable(chromePathOverride?: string): string | undefined {
  if (chromePathOverride?.trim()) return chromePathOverride.trim();
  return findChromeExecutableBase({
    candidates: CHROME_CANDIDATES,
    envNames: ['XHS_BROWSER_CHROME_PATH', 'WEIBO_BROWSER_CHROME_PATH'],
  });
}

export async function findExistingChromeDebugPort(profileDir: string): Promise<number | null> {
  return await findExistingChromeDebugPortBase({ profileDir });
}

export function killChromeByProfile(profileDir: string): void {
  try {
    if (process.platform === 'win32') {
      // Windows: 使用 wmic 查找包含该 profileDir 的 chrome 进程
      const result = spawnSync('wmic', [
        'process', 'where',
        `CommandLine LIKE '%${profileDir.replace(/\\/g, '\\\\')}%' AND Name LIKE '%chrome%'`,
        'get', 'ProcessId',
      ], { encoding: 'utf-8', timeout: 5_000, shell: true });
      if (result.status === 0 && result.stdout) {
        for (const line of result.stdout.split('\n')) {
          const pid = line.trim();
          if (pid && /^\d+$/.test(pid)) {
            try {
              process.kill(Number(pid), 'SIGTERM');
            } catch {}
          }
        }
      }
    } else {
      // Unix/macOS
      const result = spawnSync('ps', ['aux'], { encoding: 'utf-8', timeout: 5_000 });
      if (result.status !== 0 || !result.stdout) return;
      for (const line of result.stdout.split('\n')) {
        if (!line.includes(profileDir) || !line.includes('--remote-debugging-port=')) continue;
        const pid = line.trim().split(/\s+/)[1];
        if (pid) {
          try {
            process.kill(Number(pid), 'SIGTERM');
          } catch {}
        }
      }
    }
  } catch {}
}

export function getDefaultProfileDir(): string {
  return resolveSharedChromeProfileDir({
    envNames: ['XHS_CHROME_PROFILE_DIR', 'BAOYU_CHROME_PROFILE_DIR'],
    wslWindowsHome: getWslWindowsHome(),
  });
}

export async function getFreePort(): Promise<number> {
  // 优先使用 XHS_CHROME_DEBUG_PORT（与 Python 端 config.py 一致），其次 XHS_BROWSER_DEBUG_PORT
  for (const envName of ['XHS_CHROME_DEBUG_PORT', 'XHS_BROWSER_DEBUG_PORT']) {
    const val = Number.parseInt(process.env[envName] ?? '', 10);
    if (Number.isInteger(val) && val > 0) return val;
  }
  return await getFreePortBase();
}

export async function launchChrome(
  url: string,
  profileDir: string,
  chromePathOverride?: string,
): Promise<number> {
  const chromePath = findChromeExecutable(chromePathOverride);
  if (!chromePath) throw new Error('Chrome not found. Set XHS_BROWSER_CHROME_PATH env var.');

  const port = await getFreePort();
  console.log(`[xhs-cdp] Launching Chrome (profile: ${profileDir})`);
  await launchChromeBase({
    chromePath,
    profileDir,
    port,
    url,
    extraArgs: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
  });
  return port;
}

export function getScriptDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

// ============ 小红书特定工具 ============

/** 小红书创作者中心 URL */
export const XHS_CREATOR_URL = 'https://creator.xiaohongshu.com';

/** 小红书发布页 URL */
export const XHS_PUBLISH_URL = 'https://creator.xiaohongshu.com/publish';

/** 小红书首页 URL（用于检测登录态） */
export const XHS_HOME_URL = 'https://www.xiaohongshu.com';

/** 小红书内容限制 */
export const XHS_LIMITS = {
  TITLE_MAX_CHARS: 20,
  CONTENT_MAX_CHARS: 1000,
  IMAGES_MIN: 1,
  IMAGES_MAX: 18,
  TOPICS_MAX: 5,
} as const;

/**
 * 截断文本到指定长度（中文友好，按字符数而非字节数）
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + '…';
}
