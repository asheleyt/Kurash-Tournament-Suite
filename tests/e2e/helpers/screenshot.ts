import { type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Capture a named screenshot
 */
export async function captureScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {}
): Promise<string> {
  const screenshotDir = path.resolve(__dirname, '../reports/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const timestamp = Date.now();
  const filename = `${name.replace(/\s+/g, '-')}-${timestamp}.png`;
  const filepath = path.join(screenshotDir, filename);

  await page.screenshot({
    path: filepath,
    fullPage: options.fullPage ?? true,
  });

  console.log(`[Screenshot] Saved: ${filepath}`);
  return filepath;
}

/**
 * Capture screenshots of multiple pages
 */
export async function captureMultipleScreenshots(
  pages: { name: string; page: Page }[],
  prefix: string = ''
): Promise<string[]> {
  const paths: string[] = [];

  for (const { name, page } of pages) {
    try {
      const path = await captureScreenshot(page, `${prefix}-${name}`);
      paths.push(path);
    } catch (error) {
      console.error(`[Screenshot] Failed to capture ${name}:`, error);
    }
  }

  return paths;
}
