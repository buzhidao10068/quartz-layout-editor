import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { root } from './load-core.mjs';

const require = createRequire(import.meta.url);
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await playwright.chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || undefined, headless: true,
});
const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(6000);
const errors = [];
const network = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
const raw = readFileSync(new URL('../fixtures/default-config.yaml', import.meta.url), 'utf8');
const fileUrl = new URL('../index.html', import.meta.url).href;
const screenshotDirectory = process.env.SCREENSHOT_DIR || join(root, 'scratch', 'screenshots');
mkdirSync(screenshotDirectory, { recursive: true });
const assertNoErrors = () => assert.deepEqual(errors, []);
const status = () => page.locator('#status-text').textContent();
const selectCard = name => page.getByRole('combobox', { name: `移动 ${name} 到槽位`, exact: true });
const loadPaste = async text => {
  await page.locator('#open-paste').click();
  await page.locator('#paste-config').fill(text);
  await page.locator('#load-paste').click();
  if (await page.locator('#confirm-load').count()) await page.locator('#confirm-load').click();
};
const generate = async () => {
  await page.locator('#generate-config').click();
  await page.locator('#output-dialog').waitFor({ state: 'visible' });
  return page.locator('#output-yaml').inputValue();
};
const closeOutput = () => page.getByRole('button', { name: '关闭输出', exact: true }).click();
const independent = (before, after) => {
  const result = spawnSync(process.env.PYTHON || 'python', ['tests/yaml_paths_diff.py'], { cwd: root, input: JSON.stringify({ before, after }), encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).paths;
};

try {
  await page.goto(fileUrl);
  assert.match(await status(), /已载入 45 个插件/);
  assert.equal(await page.locator('.slot').count(), 6);
  assert.equal(await generate(), raw);
  await closeOutput();
  console.log('PASS default snapshot, offline file://, no-op output');

  await page.locator('#renumber-priorities').uncheck();
  await page.locator('#load-default').focus();
  let found = false;
  for (let count = 0; count < 200; count++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    if (label === '移动 Graph 到槽位') { found = true; break; }
  }
  assert.equal(found, true, 'Keyboard Tab can reach Graph position selector');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  assert.match(await status(), /Graph 已移至 左侧栏/);
  assert.equal(await page.locator('#slot-left').getByRole('group', { name: 'Graph 组件', exact: true }).count(), 1);
  const keyboardOutput = await generate();
  assert.ok(independent(raw, keyboardOutput).every(path => path.includes('.layout.')));
  await closeOutput();
  console.log('PASS actual Tab + keyboard cross-slot move and aria-live');

  await page.locator('#load-default').click();
  await page.getByRole('button', { name: '编辑 Table of Contents', exact: true }).click();
  await page.locator('#property-enabled').uncheck();
  assert.match(await page.locator('#transformer-warning').textContent(), /转换器/);
  await page.locator('#clear-right').check();
  await page.locator('#page-template').selectOption('minimal');
  assert.match(await page.locator('#minimal-warning').textContent(), /四个槽位/);
  const overridden = await generate();
  assert.ok(independent(raw, overridden).includes('layout.byPageType.content.positions'));
  await closeOutput();
  console.log('PASS dual-role warning, page overrides and independent YAML validity');

  const fileInput = page.locator('#config-file');
  await fileInput.setInputFiles({ name: 'same-config.yaml', mimeType: 'text/yaml', buffer: Buffer.from(raw) });
  const fileOutput = await generate();
  await closeOutput();
  await loadPaste(raw);
  const pasteOutput = await generate();
  assert.equal(pasteOutput, fileOutput);
  await closeOutput();
  console.log('PASS file and paste equivalence');

  await selectCard('Graph').selectOption('left');
  await page.locator('#load-default').click();
  assert.equal(await page.locator('#dirty-confirmation').count(), 1);
  await page.locator('#cancel-load').click();
  assert.equal(await page.locator('#slot-left').getByRole('group', { name: 'Graph 组件', exact: true }).count(), 1);
  await page.locator('#load-default').click();
  await page.locator('#confirm-load').click();
  console.log('PASS in-page dirty confirmation preserves edits when cancelled');

  const implicit = raw.replace(/    layout:\n      position: right\n      priority: 50\n(?=  - source: "@quartz-community\/article-title")/, '');
  await loadPaste(implicit);
  assert.equal(await page.getByRole('group', { name: 'Backlinks 组件', exact: true }).locator('.card-badges').getByText('隐式布局').count(), 1);
  await page.locator('#load-default').click();
  const graph = page.getByRole('group', { name: 'Graph 组件', exact: true });
  await graph.dragTo(page.locator('#slot-header .slot-body'), { sourcePosition: { x: 20, y: 25 } });
  assert.equal(await page.locator('#slot-header').getByRole('group', { name: 'Graph 组件', exact: true }).count(), 1);
  console.log('PASS implicit defaults and real drag/drop');

  await loadPaste(raw.replace('condition: not-index', 'condition: "<img src=x onerror=globalThis.injected=true>"'));
  await page.getByRole('button', { name: '编辑 Breadcrumbs', exact: true }).click();
  assert.equal(await page.locator('#properties-panel img').count(), 0);
  assert.equal(await page.evaluate(() => globalThis.injected), undefined);
  const injectionOutput = await generate();
  assert.match(injectionOutput, /<img/);
  assert.equal(await page.locator('#modal-host img').count(), 0);
  await page.getByRole('button', { name: '复制完整配置' }).click();
  await page.waitForFunction(() => /已复制|Ctrl\+C/.test(document.getElementById('copy-status').textContent));
  assert.match(await page.locator('#copy-status').textContent(), /已复制|Ctrl\+C/);
  await closeOutput();
  console.log('PASS untrusted text escaped and clipboard fallback');

  await loadPaste(raw.replace('position: right', 'position: body'));
  assert.match(await page.locator('#component-tray').textContent(), /无效槽位 body/);
  await selectCard('Table of Contents').selectOption('right');
  independent(raw, await generate());
  await closeOutput();
  await page.locator('#load-default').click();
  assert.equal(await page.locator('#properties-panel').getByText('组件属性', { exact: true }).count(), 1);

  await page.locator('#theme-toggle').click();
  const theme = await page.locator('html').getAttribute('data-theme');
  assert.ok(['light', 'dark'].includes(theme));
  await page.locator('#theme-toggle').click();
  assert.notEqual(await page.locator('html').getAttribute('data-theme'), theme);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(screenshotDirectory, 'mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: join(screenshotDirectory, 'desktop.png'), fullPage: true });
  console.log('PASS light/dark and mobile without horizontal overflow');
  assert.deepEqual(network, []);
  assertNoErrors();
  console.log('PASS zero HTTP requests and zero browser errors');
} finally { await browser.close(); }
