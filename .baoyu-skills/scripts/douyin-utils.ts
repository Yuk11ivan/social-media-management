/**
 * 抖音 CDP 自动化 — 共享工具函数
 * 复用 xiaohongshu-utils 的 Windows 兼容逻辑
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
    '/usr/bin/microsoft-edge',
  ],
};

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

export function findChromeExecutable(chromePathOverride?: string): string | undefined {
  if (chromePathOverride?.trim()) return chromePathOverride.trim();
  return findChromeExecutableBase({
    candidates: CHROME_CANDIDATES,
    envNames: ['DOUYIN_BROWSER_CHROME_PATH', 'DOUYIN_CHROME_PATH', 'WEIBO_BROWSER_CHROME_PATH'],
  });
}

export async function findExistingChromeDebugPort(profileDir: string): Promise<number | null> {
  return await findExistingChromeDebugPortBase({ profileDir });
}

export function killChromeByProfile(profileDir: string): void {
  try {
    if (process.platform === 'win32') {
      const escaped = profileDir.replace(/\\/g, '\\\\');
      const result = spawnSync('wmic', [
        'process', 'where',
        `CommandLine LIKE '%${escaped}%' AND (Name LIKE '%chrome%' OR Name LIKE '%msedge%')`,
        'get', 'ProcessId',
      ], { encoding: 'utf-8', timeout: 10_000, shell: true });
      if (result.status === 0 && result.stdout) {
        for (const line of result.stdout.split('\n')) {
          const pid = line.trim();
          if (pid && /^\d+$/.test(pid)) {
            try {
              spawnSync('taskkill', ['/PID', pid, '/F'], { timeout: 5_000, shell: true });
            } catch {}
          }
        }
      }
    } else {
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
    envNames: ['DOUYIN_CHROME_PROFILE_DIR', 'BAOYU_CHROME_PROFILE_DIR'],
    wslWindowsHome: getWslWindowsHome(),
  });
}

export async function getFreePort(): Promise<number> {
  for (const envName of ['DY_CHROME_DEBUG_PORT', 'DOUYIN_CHROME_DEBUG_PORT', 'DOUYIN_BROWSER_DEBUG_PORT']) {
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
  if (!chromePath) throw new Error('Chrome not found. Set DOUYIN_CHROME_PATH env var.');

  const port = await getFreePort();
  console.log(`[dy-cdp] Launching Chrome (profile: ${profileDir}, port: ${port})`);
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

/** 抖音创作者中心 — 内容管理页 */
export const DY_MANAGE_URL = 'https://creator.douyin.com/creator-micro/content/manage';

/** 抖音图文上传页（default-tab=3 为图文） */
export const DY_IMAGE_UPLOAD_URL =
  'https://creator.douyin.com/creator-micro/content/upload?default-tab=3&enter_from=publish_page';

/** 抖音图文限制 */
export const DY_LIMITS = {
  TITLE_MAX_CHARS: 30,
  DESC_MAX_CHARS: 1000,
  IMAGES_MAX: 35,
  TOPICS_MAX: 5,
} as const;
