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
const context = await browser.newContext({ offline: true, locale: 'zh-CN', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(6000);
const errors = [];
const network = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
const raw = readFileSync(new URL('../fixtures/default-config.yaml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fileUrl = new URL('../index.html', import.meta.url).href;
const screenshotDirectory = process.env.SCREENSHOT_DIR || join(root, 'scratch', 'screenshots');
mkdirSync(screenshotDirectory, { recursive: true });
const assertNoErrors = () => assert.deepEqual(errors, []);
const status = () => page.locator('#status-text').textContent();
const openPanel = async id => {
  if (await page.locator(`#tool-${id}`).getAttribute('aria-expanded') !== 'true') await page.locator(`#tool-${id}`).click();
};
const closePanel = async () => {
  if (await page.locator('.panel.is-pinned').count()) await page.locator('[data-action="close-tool-panel"]').click();
};
const assertDeleteButton = async action => {
  await page.locator('#property-enabled').uncheck();
  for (const locale of ['zh-CN', 'en']) {
    await page.locator('#language-select').selectOption(locale);
    const button = page.locator(`[data-action="${action}"]`);
    assert.equal(await button.evaluate(node => (node.closest('.component-actions') || node).parentElement.lastElementChild === (node.closest('.component-actions') || node)), true, 'Actions are the last item in the properties panel');
    assert.equal(await button.textContent(), locale === 'zh-CN' ? '删除' : 'Delete');
    const geometry = await button.evaluate(node => {
      const field = document.getElementById('property-group');
      const buttonRect = node.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      const style = getComputedStyle(node);
      const actions = node.closest('.component-actions');
      const save = actions?.querySelector('[data-action="footer-link-save"]');
      const saveRect = save?.getBoundingClientRect();
      return { width: buttonRect.width, height: buttonRect.height, fieldWidth: fieldRect.width, fieldHeight: fieldRect.height, color: style.color, border: style.borderTopColor, rowWidth: actions?.getBoundingClientRect().width ?? buttonRect.width, sameRow: !saveRect || Math.abs(saveRect.top - buttonRect.top) < 1, equalWidth: !saveRect || Math.abs(saveRect.width - buttonRect.width) < 1, ordered: !saveRect || saveRect.right < buttonRect.left };
    });
    assert.ok(Math.abs(geometry.rowWidth - geometry.fieldWidth) < 1, 'Actions fill the panel like the group input');
    assert.equal(geometry.sameRow && geometry.equalWidth && geometry.ordered, true, 'Save and Delete share an equal-width row, Save first');
    assert.ok(Math.abs(geometry.height - geometry.fieldHeight) < 1, 'Delete matches the group input height');
    assert.equal(geometry.border, geometry.color);
    const channels = geometry.color.match(/\d+/g).map(Number);
    assert.ok(channels[0] > channels[1] && channels[0] > channels[2], 'Delete uses the red danger color');
  }
  await page.locator('#property-enabled').check();
};
const selectCard = name => ({ selectOption: async value => {
  const selector = page.getByRole('combobox', { name: `移动 ${name} 到槽位`, exact: true });
  if (await selector.isVisible()) { await selector.selectOption(value); return; }
  await openPanel('tray-panel');
  await page.getByRole('button', { name: `编辑 ${name}`, exact: true }).click();
  await page.locator('#property-position').selectOption(value);
  await page.locator('#property-enabled').check();
} });
const loadPaste = async text => {
  await closePanel();
  await page.locator('#open-paste').click();
  await page.locator('#paste-config').fill(text);
  await page.locator('#load-paste').click();
  if (await page.locator('#confirm-load').count()) await page.locator('#confirm-load').click();
};
const generate = async () => {
  await closePanel();
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
  assert.equal(await page.locator('html').getAttribute('data-tool-dock'), 'bottom', 'The seven shortcuts default to a bottom floating bar');
  assert.equal(await page.locator('#project-link').getAttribute('href'), 'https://github.com/buzhidao10068/quartz-layout-editor');
  assert.equal(await page.locator('#project-link').getAttribute('rel'), 'noopener noreferrer');
  assert.match(await page.locator('#project-link').textContent(), /项目地址/);
  assert.match(await status(), /已载入 45 个插件/);
  assert.equal(await page.locator('.slot').count(), 6);
  assert.equal(await page.locator('#beginner-guide').getAttribute('open'), '');
  assert.equal(await page.locator('.workspace .panel:visible').count(), 0, 'No tool panels appear until explicitly opened');
  assert.match(await page.locator('#guide-panel').textContent(), /网站标题（Page Title）/);
  assert.equal(await page.getByRole('button', { name: '编辑 网站标题', exact: true }).count(), 1);
  await page.getByRole('button', { name: '编辑 网站标题', exact: true }).click();
  assert.match(await page.locator('#properties-panel').textContent(), /不是当前文章标题/);
  assert.match(await page.locator('#properties-panel').textContent(), /Page Title/);
  assert.equal(await page.locator('iframe').count(), 0);
  await page.locator('#beginner-guide > summary').click();
  assert.equal(await generate(), raw);
  await closeOutput();
  assert.equal(await page.locator('#beginner-guide').getAttribute('open'), null);
  console.log('PASS default snapshot, offline file://, no-op output');

  await page.locator('#renumber-priorities').uncheck();
  await openPanel('tray-panel');
  await page.getByRole('button', { name: '编辑 关系图谱', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.locator('#property-enabled').check();
  await closePanel();
  await page.locator('#load-default').focus();
  let found = false;
  for (let count = 0; count < 200; count++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    if (label === '移动 关系图谱 到槽位') { found = true; break; }
  }
  assert.equal(found, true, 'Keyboard Tab can reach 关系图谱 position selector');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  assert.match(await status(), /关系图谱 已移至 左侧栏/);
  assert.equal(await page.locator('#slot-left').getByRole('group', { name: '关系图谱 组件', exact: true }).count(), 1);
  assert.equal(await page.locator('.card [data-action="move"], .card-controls button').count(), 0, 'Component cards have no up/down buttons');
  const keyboardCard = page.locator('#slot-left').getByRole('group', { name: '关系图谱 组件', exact: true });
  const originalOrder = await page.locator('#slot-left [data-entry-id]').evaluateAll(nodes => nodes.map(node => node.dataset.entryId));
  await keyboardCard.focus();
  await page.keyboard.press('Alt+ArrowUp');
  const reordered = await page.locator('#slot-left [data-entry-id]').evaluateAll(nodes => nodes.map(node => node.dataset.entryId));
  assert.notDeepEqual(reordered, originalOrder, 'Keyboard shortcut reorders without visible arrow controls');
  await page.keyboard.press('Alt+ArrowDown');
  assert.deepEqual(await page.locator('#slot-left [data-entry-id]').evaluateAll(nodes => nodes.map(node => node.dataset.entryId)), originalOrder);
  const keyboardOutput = await generate();
  assert.ok(independent(raw, keyboardOutput).every(path => path.includes('.layout.')));
  await closeOutput();
  console.log('PASS actual Tab + keyboard cross-slot move and aria-live');

  await closePanel();
  await page.locator('#load-default').click();
  await page.getByRole('button', { name: '编辑 文章目录', exact: true }).click();
  await page.locator('#property-enabled').uncheck();
  assert.match(await page.locator('#transformer-warning').textContent(), /转换器/);
  await openPanel('pages-panel');
  await page.locator('#clear-right').check();
  await page.locator('#page-template').selectOption('minimal');
  assert.match(await page.locator('#minimal-warning').textContent(), /五个槽位/);
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

  await selectCard('关系图谱').selectOption('left');
  await closePanel();
  await page.locator('#load-default').click();
  assert.equal(await page.locator('#dirty-confirmation').count(), 1);
  await page.locator('#cancel-load').click();
  assert.equal(await page.locator('#slot-left').getByRole('group', { name: '关系图谱 组件', exact: true }).count(), 1);
  await page.locator('#load-default').click();
  await page.locator('#confirm-load').click();
  console.log('PASS in-page dirty confirmation preserves edits when cancelled');

  const implicit = raw.replace(/    layout:\n      position: right\n      priority: 50\n(?=  - source: "@quartz-community\/article-title")/, '');
  await loadPaste(implicit);
  assert.equal(await page.getByRole('group', { name: '反向链接 组件', exact: true }).locator('.card-badges').getByText('隐式布局').count(), 1);
  await page.locator('#load-default').click();
  const graph = page.getByRole('group', { name: '关系图谱 组件', exact: true });
  await graph.dragTo(page.locator('#slot-header .slot-body'), { sourcePosition: { x: 20, y: 25 } });
  assert.equal(await page.locator('#slot-header').getByRole('group', { name: '关系图谱 组件', exact: true }).count(), 1);
  console.log('PASS implicit defaults and real drag/drop');

  await loadPaste(raw.replace('condition: not-index', 'condition: "<img src=x onerror=globalThis.injected=true>"'));
  await page.getByRole('button', { name: '编辑 面包屑导航', exact: true }).click();
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
  await openPanel('tray-panel');
  assert.equal(await page.locator('#component-tray').getByRole('button', { name: '编辑 文章目录', exact: true }).count(), 1);
  await selectCard('文章目录').selectOption('right');
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


  await page.locator('#language-select').selectOption('en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.match(await page.title(), /Quartz Layout Editor 0\.4/);
  assert.equal(await page.locator('#generate-config').textContent(), 'Generate config');
  assert.match(await page.locator('#project-link').textContent(), /Project repository/);
  assert.match(await page.locator('#guide-panel').textContent(), /Page Title is the name/);
  assert.equal(await page.locator('#site-preview-panel').count(), 0);
  assert.equal(await page.locator('iframe, #site-preview-panel').count(), 0);
  await page.getByRole('button', { name: 'Edit Page Title', exact: true }).click();
  assert.match(await page.locator('#properties-panel').textContent(), /Not the current article/);
  assert.equal(await page.locator('#property-display option[value="mobile-only"]').textContent(), 'Mobile only');
  const chineseBodyText = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const values = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest('script, option[value="zh-CN"]')) continue;
      if (/[\u4e00-\u9fff]/.test(node.textContent)) values.push(node.textContent);
    }
    return values;
  });
  assert.deepEqual(chineseBodyText, []);
  assert.equal(await generate(), raw);
  await page.locator('#output-language').selectOption('zh-CN');
  assert.equal(await page.locator('#output-yaml').inputValue(), raw);
  assert.match(await page.locator('#output-title').textContent(), /生成的/);
  await page.locator('#output-language').selectOption('en');
  assert.equal(await page.locator('#output-yaml').inputValue(), raw);
  assert.equal(await page.locator('#output-title').textContent(), 'Generated quartz.config.yaml');
  assert.equal(await page.locator('#output-language').evaluate(element => element === document.activeElement), true);
  await page.locator('[data-action="close-output"]').click();
  console.log('PASS complete English UI, canonical enum values, bilingual output dialog without losing YAML');

  await page.getByRole('button', { name: 'Edit Graph', exact: true }).click();
  await page.locator('#property-condition').fill('custom-unsaved');
  await closePanel();
  await page.locator('#open-paste').click();
  await page.locator('#paste-config').fill('# unfinished paste\nconfiguration:');
  await page.locator('#language-select').focus();
  await page.locator('#language-select').selectOption('zh-CN');
  assert.equal(await page.locator('#property-condition').inputValue(), 'custom-unsaved');
  assert.equal(await page.locator('#paste-config').inputValue(), '# unfinished paste\nconfiguration:');
  assert.equal(await page.locator('#language-select').evaluate(element => element === document.activeElement), true);
  await page.locator('#language-select').selectOption('en');
  await openPanel('properties-panel');
  await page.locator('#property-condition').fill('');
  await closePanel();
  await page.locator('#close-paste').click();
  await page.locator('#renumber-priorities').uncheck();
  await page.getByRole('combobox', { name: 'Move Graph to slot', exact: true }).selectOption('left');
  assert.match(await status(), /Graph moved to Left sidebar/);
  await page.locator('#language-select').selectOption('zh-CN');
  assert.match(await status(), /关系图谱 已移至 左侧栏/);
  assert.equal(await page.locator('#slot-left').getByRole('group', { name: '关系图谱 组件', exact: true }).count(), 1);
  await closePanel();
  await page.locator('#load-default').click();
  await page.locator('#language-select').selectOption('en');
  assert.match(await page.locator('#dirty-confirmation').textContent(), /ungenerated changes/);
  await page.locator('#cancel-load').click();
  assert.equal(await page.locator('#slot-left').getByRole('group', { name: 'Graph component', exact: true }).count(), 1);
  const englishEdited = await generate();
  await page.locator('#output-language').selectOption('zh-CN');
  assert.equal(await page.locator('#output-yaml').inputValue(), englishEdited);
  await page.locator('#output-language').selectOption('en');
  assert.equal(await page.locator('#output-yaml').inputValue(), englishEdited);
  await page.locator('[data-action="close-output"]').click();
  console.log('PASS locale changes preserve field/paste drafts, selected component, dirty edits, confirmation and generated output');

  await page.locator('#load-default').click();
  await page.getByRole('button', { name: 'Edit Table of Contents', exact: true }).click();
  await page.locator('#property-enabled').uncheck();
  assert.match(await page.locator('#transformer-warning').textContent(), /transformer is also disabled/);
  await openPanel('pages-panel');
  await page.locator('#clear-right').check();
  await page.locator('#page-template').selectOption('minimal');
  assert.match(await page.locator('#minimal-warning').textContent(), /header, beforeBody, left, right and afterBody/);
  await page.locator('#language-select').selectOption('zh-CN');
  assert.match(await page.locator('#transformer-warning').textContent(), /文章目录/);
  await page.locator('#language-select').selectOption('en');
  await generate();
  await page.locator('[data-action="copy"]').click();
  await page.waitForFunction(() => /Copied|Ctrl\+C/.test(document.getElementById('copy-status').textContent));
  await page.locator('#output-language').selectOption('zh-CN');
  assert.match(await page.locator('#copy-status').textContent(), /已复制|Ctrl\+C/);
  await page.locator('#output-language').selectOption('en');
  assert.match(await page.locator('#copy-status').textContent(), /Copied|Ctrl\+C/);
  await page.locator('[data-action="close-output"]').click();
  console.log('PASS bilingual transformer/template warnings and persistent translated clipboard feedback');

  await page.locator('#open-paste').click();
  await page.locator('#paste-config').fill(raw.replace('enabled: true', 'enabled: yes'));
  await page.locator('#load-paste').click();
  assert.match(await page.locator('#input-error').textContent(), /Line \d+: enabled must be true or false/);
  await page.locator('#language-select').selectOption('zh-CN');
  assert.match(await page.locator('#input-error').textContent(), /第 \d+ 行：enabled 必须是 true 或 false/);
  await page.locator('#language-select').selectOption('en');
  assert.match(await page.locator('#input-error').textContent(), /Line \d+/);
  await page.locator('#load-default').click();
  await openPanel('groups-panel');
  await page.locator('#new-group-name').fill('__proto__');
  await page.locator('[data-action="add-group"]').click();
  assert.match(await page.locator('#input-error').textContent(), /Enter a valid group name/);
  await page.locator('#language-select').selectOption('zh-CN');
  assert.match(await page.locator('#input-error').textContent(), /有效的分组名称/);
  await page.locator('#language-select').selectOption('en');
  console.log('PASS bilingual parser line errors and dynamic validation messages');

  await page.reload();
  assert.equal(await page.locator('#language-select').inputValue(), 'en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.match(await status(), /Loaded 45 plugins/);
  await page.locator('#language-select').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  await page.locator('#language-select').selectOption('en');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(screenshotDirectory, 'mobile-en.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: join(screenshotDirectory, 'desktop-en.png'), fullPage: true });
  console.log('PASS saved language preference, keyboard switching and English mobile layout');

  await page.locator('#board-edit').click();
  assert.equal(await page.locator('.frame-center > #slot-header').count(), 1);
  assert.equal(await page.locator('.frame > #slot-header').count(), 0);
  const editPositions = await page.evaluate(() => {
    const rect = id => { const box = document.getElementById(id).getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, bottom: box.bottom }; };
    return { header: rect('slot-header'), before: rect('slot-beforeBody'), left: rect('slot-left'), footer: rect('slot-footer'), right: rect('slot-right') };
  });
  assert.ok(editPositions.left.x < editPositions.header.x);
  assert.ok(editPositions.header.x < editPositions.right.x);
  assert.equal(editPositions.footer.x, editPositions.header.x);
  assert.equal(editPositions.footer.width, editPositions.header.width);
  assert.ok(editPositions.before.y >= editPositions.header.bottom);
  const originalDraft = await generate();
  await page.locator('[data-action="close-output"]').click();
  await page.locator('#board-effect').click();
  await page.locator('#draft-effect').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.effect-page').evaluate(node => node.getBoundingClientRect().width <= node.parentElement.clientWidth), true);
  await page.locator('#draft-fit').uncheck();
  assert.equal(await page.locator('.frame').isVisible(), false);
  assert.equal(await page.locator('[data-effect-source="graph"]').count(), 1);
  assert.equal(await page.locator('[data-effect-source="spacer"]').count(), 0);
  assert.equal(await page.locator('[data-effect-slot="right"] [data-effect-source="graph"]').count(), 1);
  const mappingRows = await page.locator('.effect-component').evaluateAll(nodes => nodes.map(node => ({ slot: node.dataset.effectPosition, parentSlot: node.closest('[data-effect-slot]').dataset.effectSlot })));
  assert.ok(mappingRows.every(row => row.slot === row.parentSlot));
  const desktopGeometry = await page.evaluate(() => {
    const box = selector => { const value = document.querySelector(selector).getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, bottom: value.bottom }; };
    return { header: box('[data-effect-slot="header"]'), before: box('[data-effect-slot="beforeBody"]'), body: box('[data-effect-body]'), after: box('[data-effect-slot="afterBody"]'), footer: box('[data-effect-slot="footer"]'), left: box('[data-effect-slot="left"]'), right: box('[data-effect-slot="right"]') };
  });
  assert.equal(desktopGeometry.left.width, 320);
  assert.equal(desktopGeometry.right.width, 320);
  assert.equal(desktopGeometry.header.x, desktopGeometry.footer.x);
  assert.equal(desktopGeometry.header.width, desktopGeometry.footer.width);
  assert.ok(desktopGeometry.header.x > desktopGeometry.left.x);
  assert.ok(desktopGeometry.header.x < desktopGeometry.right.x);
  assert.ok(desktopGeometry.before.y >= desktopGeometry.header.bottom);
  assert.ok(desktopGeometry.body.y >= desktopGeometry.before.bottom);
  assert.ok(desktopGeometry.after.y >= desktopGeometry.body.bottom);
  assert.equal(await generate(), originalDraft);
  await page.locator('[data-action="close-output"]').click();
  await page.locator('#draft-fit').check();
  await page.locator('.effect-scroll').screenshot({ path: join(screenshotDirectory, 'effect-desktop.png') });
  await page.locator('#draft-fit').uncheck();
  console.log('PASS Quartz 5 edit/default-frame geometry, one-to-one slot mapping and pure draft viewing');

  await page.locator('#board-edit').click();
  await page.getByRole('combobox', { name: 'Move Graph to slot', exact: true }).selectOption('header');
  await page.locator('#board-effect').click();
  assert.equal(await page.locator('[data-effect-slot="header"] [data-effect-source="graph"]').count(), 1);
  assert.equal(await page.locator('[data-effect-slot="right"] [data-effect-source="graph"]').count(), 0);
  await page.locator('#draft-isIndex').check();
  assert.equal(await page.locator('[data-effect-source="breadcrumbs"]').count(), 0);
  await page.locator('#draft-isIndex').uncheck();
  assert.equal(await page.locator('[data-effect-source="breadcrumbs"]').count(), 1);
  await page.locator('#draft-width').selectOption('1000');
  assert.equal(await page.locator('.effect-page').getAttribute('data-effect-viewport'), 'tablet');
  assert.equal(await page.locator('[data-effect-source="table-of-contents"]').count(), 0);
  const tabletGeometry = await page.evaluate(() => ({ right: document.querySelector('[data-effect-slot="right"]').getBoundingClientRect().y, centerBottom: document.querySelector('.effect-center').getBoundingClientRect().bottom }));
  assert.ok(tabletGeometry.right >= tabletGeometry.centerBottom);
  await page.locator('#draft-width').selectOption('390');
  assert.equal(await page.locator('[data-effect-source="spacer"]').count(), 1);
  const mobileGeometry = await page.evaluate(() => ({ leftBottom: document.querySelector('[data-effect-slot="left"]').getBoundingClientRect().bottom, headerTop: document.querySelector('[data-effect-slot="header"]').getBoundingClientRect().y, leftDirection: getComputedStyle(document.querySelector('[data-effect-slot="left"]')).flexDirection }));
  assert.ok(mobileGeometry.headerTop >= mobileGeometry.leftBottom);
  assert.equal(mobileGeometry.leftDirection, 'row');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.effect-scroll').screenshot({ path: join(screenshotDirectory, 'effect-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#draft-width').selectOption('1440');
  await page.locator('#draft-page-type').selectOption('folder');
  assert.equal(await page.locator('[data-effect-slot="right"] .effect-component').count(), 0);
  assert.equal(await page.locator('[data-effect-source="reader-mode"]').count(), 0);
  await page.locator('#draft-page-type').selectOption('content');
  await page.locator('#draft-regions').check();
  assert.equal(await page.locator('.effect-page').getAttribute('data-effect-regions'), 'true');
  await page.locator('#language-select').selectOption('zh-CN');
  assert.equal(await page.locator('#board-effect').textContent(), '效果预览');
  assert.match(await page.locator('#draft-effect').textContent(), /不是运行中的 Quartz/);
  await page.locator('#language-select').selectOption('en');
  console.log('PASS live draft movement, conditions, desktop/tablet/mobile layout and bilingual page overrides');

  await page.locator('#board-edit').click();
  await openPanel('pages-panel');
  await page.locator('#page-template').selectOption('minimal');
  await page.locator('#board-effect').click();
  assert.equal(await page.locator('.effect-page').getAttribute('data-effect-template'), 'minimal');
  assert.deepEqual(await page.locator('[data-effect-slot]').evaluateAll(nodes => nodes.map(node => node.dataset.effectSlot)), ['footer']);
  assert.equal(await page.locator('[data-effect-body]').count(), 1);
  await page.locator('#page-template').selectOption('full-width');
  assert.equal(await page.locator('[data-effect-slot="left"], [data-effect-slot="right"]').count(), 0);
  assert.equal(await page.locator('[data-effect-slot="beforeBody"]').count(), 1);
  await page.locator('#page-template').selectOption('default');
  await openPanel('groups-panel');
  await page.locator('#edit-group').selectOption('toolbar');
  await page.locator('#group-direction').selectOption('row-reverse');
  assert.equal(await page.locator('[data-effect-group="toolbar"]').evaluate(node => getComputedStyle(node).flexDirection), 'row-reverse');
  await page.locator('#group-wrap').selectOption('wrap');
  assert.equal(await page.locator('[data-effect-group="toolbar"]').evaluate(node => getComputedStyle(node).flexWrap), 'wrap');
  const mapping = page.locator('.effect-mapping');
  await mapping.locator('summary').click();
  await mapping.locator('[data-action="draft-edit"]').filter({ hasText: 'graph → header' }).click();
  assert.equal(await page.locator('#board-edit').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#properties-panel h2').textContent(), 'Graph');
  assert.equal(await page.locator('iframe').count(), 0);
  console.log('PASS actual full-width/minimal frame slots, group flex configuration and mapping-to-editor navigation');

  await page.reload();
  await page.locator('#language-select').selectOption('zh-CN');
  assert.equal(await page.locator('.topbar #project-link svg').count(), 1);
  assert.ok(await page.locator('#project-link path').evaluate(path => path.getTotalLength() > 50));
  assert.match(await page.locator('#project-link').getAttribute('aria-label'), /GitHub/);
  assert.equal(await page.locator('.footer-bar #project-link').count(), 0);
  await openPanel('tray-panel');
  await page.getByRole('button', { name: '编辑 堆叠页面', exact: true }).click();
  for (const id of ['tray-panel', 'properties-panel', 'groups-panel', 'pages-panel']) {
    await openPanel(id);
    const summary = page.locator(`#${id} > summary`);
    await summary.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(id => document.getElementById(id).hidden, id);
  }
  await page.locator('#language-select').selectOption('en');
  await page.locator('#board-effect').click();
  for (const id of ['tray-panel', 'properties-panel', 'groups-panel', 'pages-panel']) {
    assert.equal(await page.locator(`#${id}`).getAttribute('open'), null);
  }
  await page.locator('#board-edit').click();
  await openPanel('tray-panel');
  await page.getByRole('button', { name: 'Edit Stacked Pages', exact: true }).click();
  assert.equal(await page.locator('#properties-panel').getAttribute('open'), '');
  assert.equal(await page.locator('#groups-panel').getAttribute('open'), null);
  await openPanel('groups-panel');
  await page.locator('#new-group-name').fill('draft stays');
  await closePanel();
  await page.locator('#language-select').selectOption('zh-CN');
  await openPanel('groups-panel');
  assert.equal(await page.locator('#new-group-name').inputValue(), 'draft stays');
  const disclosure = page.locator('.frame details.group-container').first();
  await disclosure.locator(':scope > summary').click();
  assert.equal(await disclosure.getAttribute('open'), null);
  await page.locator('#language-select').selectOption('en');
  assert.equal(await disclosure.getAttribute('open'), null);
  assert.equal(await generate(), raw);
  await page.locator('[data-action="close-output"]').click();
  console.log('PASS collapsible panels/groups, keyboard toggles, selected Stacked Pages settings, draft and locale preservation');

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const position of ['top', 'bottom']) {
      await page.evaluate(position => window.scrollTo(0, position === 'top' ? 0 : document.documentElement.scrollHeight), position);
      const bounds = await page.locator('.board-modes').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height);
    }
    await page.locator('#board-effect').click();
    assert.equal(await page.locator('#board-effect').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#draft-effect').isVisible(), true);
    const boardTop = await page.locator('#layout-board').evaluate(node => node.getBoundingClientRect().top);
    assert.ok(boardTop >= 0 && boardTop < viewport.height);
    await page.locator('#board-edit').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.screenshot({ path: join(screenshotDirectory, 'ergonomics-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#theme-toggle').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(screenshotDirectory, 'ergonomics-topbar.png') });
  await page.screenshot({ path: join(screenshotDirectory, 'ergonomics-dark.png') });
  await page.locator('#theme-toggle').click();
  console.log('PASS always-visible edit/effect switch at both page ends, view navigation, mobile bounds and theme');

  const toolPanels = ['tray-panel', 'plugins-panel', 'properties-panel', 'groups-panel', 'pages-panel'];
  await closePanel();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const dockPosition of ['bottom', 'top']) {
      if (await page.locator('html').getAttribute('data-tool-dock') !== dockPosition) {
        const beforeDockMove = await page.evaluate(() => scrollY);
        await page.locator('#dock-position').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => scrollY), beforeDockMove, 'Moving the bar preserves page scroll');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'dock-position');
      }
      const dock = await page.locator('.board-modes').boundingBox();
      assert.ok(dockPosition === 'top' ? dock.y < 30 : dock.y + dock.height > viewport.height - 30, 'Bar floats at the chosen screen edge');
    for (const view of ['edit', 'effect']) {
      await page.locator(`#board-${view}`).click();
      assert.equal(await page.locator('.workspace .panel:visible').count(), 0, 'Closed panels stay absent in both views');
      for (const position of ['top', 'bottom']) {
        await page.evaluate(position => window.scrollTo(0, position === 'top' ? 0 : document.documentElement.scrollHeight), position);
        for (const selector of ['#board-edit', '#board-effect', '#dock-position', ...toolPanels.map(id => `#tool-${id}`)]) {
          const bounds = await page.locator(selector).boundingBox();
          assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, `${selector} stays accessible in ${view} at ${position}, ${viewport.width}x${viewport.height}`);
        }
      }
      for (const id of toolPanels) {
        const beforePanel = await page.locator('#layout-board').boundingBox();
        const beforePanelScroll = await page.evaluate(() => scrollY);
        await page.locator(`#tool-${id}`).click();
        assert.equal(await page.locator(`#tool-${id}`).getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('.panel.is-pinned').count(), 1);
        assert.equal(await page.locator('.workspace .panel:visible').count(), 1, 'Only the requested panel is displayed');
        const panelBounds = await page.locator(`#${id}`).boundingBox();
        const dockBounds = await page.locator('.board-modes').boundingBox();
        assert.ok(panelBounds.y >= 0 && panelBounds.x >= 0 && panelBounds.x + panelBounds.width <= viewport.width && panelBounds.y + panelBounds.height <= viewport.height, `${id} ${viewport.width}x${viewport.height} ${JSON.stringify(panelBounds)}`);
        assert.ok(panelBounds.y + panelBounds.height <= dockBounds.y || panelBounds.y >= dockBounds.y + dockBounds.height, `Pinned panel never covers its dock: ${id}, ${dockPosition}, ${viewport.width}x${viewport.height}, ${JSON.stringify({ panelBounds, dockBounds })}`);
        const boardBounds = await page.locator('#layout-board').boundingBox();
        assert.ok(Object.keys(boardBounds).every(key => Math.abs(boardBounds[key] - beforePanel[key]) < 2), 'Floating panel does not resize or shift the underlying canvas');
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - beforePanelScroll) < 2, 'Opening a floating panel does not move the page');
        assert.equal(await page.locator(`#${id}`).evaluate(node => getComputedStyle(node).position), 'fixed');
        assert.equal(await page.locator(`#${id} > summary`).evaluate(node => getComputedStyle(node).display), 'block', 'Tool panel heading has no disclosure triangle');
        assert.equal(await page.locator(`#${id} > summary`).evaluate(node => getComputedStyle(node).listStyleType), 'none');
        assert.ok(await page.locator(`#${id}`).evaluate(node => Number(getComputedStyle(node).zIndex) > 0), 'Panel sits above the canvas');
        assert.equal(await page.locator(`#${id} .panel-body`).evaluate(node => getComputedStyle(node).overflowY), 'auto');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (dockPosition === 'top' && view === 'edit' && id === 'properties-panel' && [1440, 390].includes(viewport.width)) {
          await page.screenshot({ path: join(screenshotDirectory, `floating-bar-top-${viewport.width}.png`) });
        }
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.panel.is-pinned').count(), 0);
        assert.equal(await page.locator('.workspace .panel:visible').count(), 0, 'Closing does not restore legacy panels');
        assert.equal(await page.evaluate(() => document.activeElement.id), `tool-${id}`);
        const afterPanel = await page.locator('#layout-board').boundingBox();
        assert.ok(Object.keys(afterPanel).every(key => Math.abs(afterPanel[key] - beforePanel[key]) < 2), 'Closing the panel leaves canvas geometry unchanged');
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - beforePanelScroll) < 2, 'Closing a floating panel does not move the page');
      }
    }
    }
  }
  await page.locator('#dock-position').click();
  assert.equal(await page.locator('html').getAttribute('data-tool-dock'), 'bottom');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#board-effect').click();
  await page.locator('#tool-groups-panel').focus();
  await page.keyboard.press('Enter');
  await page.locator('#new-group-name').fill('pinned draft stays');
  await page.locator('#tool-pages-panel').click();
  await page.locator('#language-select').selectOption('zh-CN');
  await page.locator('#board-edit').click();
  await page.locator('#tool-groups-panel').click();
  assert.equal(await page.locator('#new-group-name').inputValue(), 'pinned draft stays');
  const panelBeforeDockMove = await page.locator('#groups-panel > .panel-body').evaluate(node => node.scrollTop);
  await page.locator('#dock-position').click();
  assert.equal(await page.locator('#new-group-name').inputValue(), 'pinned draft stays');
  assert.equal(await page.locator('#groups-panel > .panel-body').evaluate(node => node.scrollTop), panelBeforeDockMove);
  await page.locator('#dock-position').click();
  await page.locator('#tool-groups-panel').click();
  assert.equal(await page.locator('.panel.is-pinned').count(), 0);
  await page.locator('#tool-properties-panel').click();
  await page.screenshot({ path: join(screenshotDirectory, 'persistent-tools-desktop.png') });
  await page.locator('[data-action="close-tool-panel"]').click();
  await page.locator('#tool-plugins-panel').click();
  const pluginBody = page.locator('#plugins-panel > .panel-body');
  await pluginBody.evaluate(node => { node.scrollTop = 200; });
  await page.locator('#language-select').selectOption('en');
  assert.ok(await pluginBody.evaluate(node => node.scrollTop >= 190), 'Pinned panel keeps its scroll position after render');
  await page.locator('#plugins-panel > summary').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('.panel.is-pinned'));
  assert.equal(await page.locator('#plugins-panel').getAttribute('open'), null);
  await page.locator('#language-select').selectOption('zh-CN');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#board-effect').click();
  await page.locator('#tool-tray-panel').click();
  await page.screenshot({ path: join(screenshotDirectory, 'persistent-tools-mobile.png') });
  await page.setViewportSize({ width: 390, height: 640 });
  const pinnedGrip = page.locator('#component-tray .drag-grip').first();
  await pinnedGrip.scrollIntoViewIfNeeded();
  const pinnedGripBounds = await pinnedGrip.boundingBox();
  await page.mouse.move(pinnedGripBounds.x + 4, pinnedGripBounds.y + 4);
  await page.mouse.down();
  await page.mouse.move(pinnedGripBounds.x + 14, pinnedGripBounds.y + 14, { steps: 3 });
  const pinnedBodyBounds = await page.locator('#tray-panel > .panel-body').boundingBox();
  await page.mouse.move(pinnedBodyBounds.x + 30, pinnedBodyBounds.y + pinnedBodyBounds.height / 2);
  const pageBeforePanelWheel = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 200);
  await page.waitForFunction(() => document.querySelector('#tray-panel > .panel-body').scrollTop > 0);
  assert.equal(await page.evaluate(() => scrollY), pageBeforePanelWheel, 'Grip wheel scrolls the pinned tray rather than the page');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  assert.equal(await page.locator('.drag-preview').count(), 0);
  assert.equal(await page.locator('#tray-panel.is-pinned').count(), 1, 'First Escape cancels drag, leaving panel open');
  await page.locator('#tool-properties-panel').click();
  await page.locator('[data-action="close-tool-panel"]').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#board-edit').click();
  assert.equal(await generate(), raw);
  await closeOutput();
  console.log('PASS top/bottom floating bar and all five panels in both views, desktop/tablet/mobile/short-screen bounds, unchanged canvas, dock spacing, keyboard/focus, locale/draft preservation and unchanged YAML');

  await page.setViewportSize({ width: 844, height: 390 });
  for (const id of toolPanels) {
    await openPanel(id);
    const body = page.locator(`#${id} > .panel-body`);
    await body.evaluate(node => { node.scrollTop = 0; });
    const bounds = await body.boundingBox();
    const beforeWheel = await page.evaluate(() => scrollY);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.wheel(0, 120);
    await page.waitForFunction(id => document.querySelector(`#${id} > .panel-body`).scrollTop > 0, id);
    assert.equal(await page.evaluate(() => scrollY), beforeWheel, `${id}: wheel stays inside the panel`);
    await body.evaluate(node => { node.scrollTop = node.scrollHeight; });
    const bottomOffset = await body.evaluate(node => node.scrollTop);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(60);
    assert.equal(await page.evaluate(() => scrollY), beforeWheel, `${id}: bottom edge does not scroll the page`);
    const other = id === 'groups-panel' ? 'plugins-panel' : 'groups-panel';
    await openPanel(other);
    await openPanel(id);
    assert.ok(Math.abs(await body.evaluate(node => node.scrollTop) - bottomOffset) < 2, `${id}: switching remembers its own offset`);
    await closePanel();
    await openPanel(id);
    assert.ok(Math.abs(await body.evaluate(node => node.scrollTop) - bottomOffset) < 2, `${id}: close/reopen remembers its own offset`);
    await body.evaluate(node => { node.scrollTop = 0; });
    const beforeTopWheel = await page.evaluate(() => scrollY);
    const topBounds = await body.boundingBox();
    await page.mouse.move(topBounds.x + 30, topBounds.y + 20);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(60);
    assert.equal(await page.evaluate(() => scrollY), beforeTopWheel, `${id}: top edge does not scroll the page`);
    const summaryBounds = await page.locator(`#${id} > summary`).boundingBox();
    await page.mouse.move(summaryBounds.x + 30, summaryBounds.y + 20);
    await page.mouse.wheel(0, 100);
    await page.waitForFunction(id => document.querySelector(`#${id} > .panel-body`).scrollTop > 0, id);
    assert.equal(await page.evaluate(() => scrollY), beforeTopWheel, `${id}: heading wheel scrolls panel body`);
    const beforeSummaryClose = await body.evaluate(node => node.scrollTop);
    await page.locator(`#${id} > summary`).click();
    await page.waitForFunction(id => document.getElementById(id).hidden, id);
    await openPanel(id);
    assert.ok(Math.abs(await body.evaluate(node => node.scrollTop) - beforeSummaryClose) < 2, `${id}: heading close preserves offset`);
    await closePanel();
  }
  await page.getByRole('button', { name: '编辑 网站标题', exact: true }).click();
  await page.locator('#properties-panel > .panel-body').evaluate(node => { node.scrollTop = 110; });
  const titleOffset = await page.locator('#properties-panel > .panel-body').evaluate(node => node.scrollTop);
  assert.ok(titleOffset > 0);
  await closePanel();
  await page.getByRole('button', { name: '编辑 关系图谱', exact: true }).click();
  assert.equal(await page.locator('#properties-panel > .panel-body').evaluate(node => node.scrollTop), 0, 'Another component starts at its own offset');
  await closePanel();
  await page.getByRole('button', { name: '编辑 网站标题', exact: true }).click();
  assert.equal(await page.locator('#properties-panel > .panel-body').evaluate(node => node.scrollTop), titleOffset, 'Returning to the component restores its offset');
  await closePanel();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPanel('plugins-panel');
  await page.evaluate(() => window.scrollBy(0, 150));
  const beforeToolSwitch = await page.evaluate(() => scrollY);
  await openPanel('properties-panel');
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - beforeToolSwitch) < 2, 'Switching already-visible desktop panels does not realign page');
  await closePanel();
  await page.setViewportSize({ width: 390, height: 844 });
  await openPanel('plugins-panel');
  await page.locator('#layout-board').evaluate(node => window.scrollBy(0, node.getBoundingClientRect().top - 100));
  const boardAnchor = await page.locator('#layout-board').evaluate(node => node.getBoundingClientRect().top);
  await page.locator('#tool-plugins-panel').click();
  const closedBoardAnchor = await page.locator('#layout-board').evaluate(node => node.getBoundingClientRect().top);
  assert.ok(Math.abs(closedBoardAnchor - boardAnchor) < 2, `Closing the mobile overlay retains visible canvas anchor: ${boardAnchor} -> ${closedBoardAnchor}`);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadPaste(raw);
  await openPanel('plugins-panel');
  assert.equal(await page.locator('#plugins-panel > .panel-body').evaluate(node => node.scrollTop), 0, 'Loading another config clears panel scroll history');
  await closePanel();
  assert.equal(await generate(), raw);
  await closeOutput();
  console.log('PASS all five panel scroll memories, wheel/heading routing, top/bottom containment, desktop no-jump, mobile close anchor and source reset');

  const dragCard = page.locator('#slot-right [data-entry-id]').first();
  const dragId = await dragCard.getAttribute('data-entry-id');
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await page.evaluate(() => window.scrollTo(0, 400));
  await dragCard.dispatchEvent('dragstart', { dataTransfer: transfer });
  await page.locator('body').dispatchEvent('dragover', { dataTransfer: transfer, clientX: 10, clientY: 995 });
  await page.waitForFunction(() => scrollY > 750);
  await page.locator('body').dispatchEvent('dragover', { dataTransfer: transfer, clientX: 10, clientY: 3 });
  const downwardPosition = await page.evaluate(() => scrollY);
  await page.waitForFunction(previous => scrollY < previous - 200, downwardPosition);
  await page.locator('body').dispatchEvent('dragover', { dataTransfer: transfer, clientX: 10, clientY: 500 });
  await page.waitForTimeout(80);
  const middlePosition = await page.evaluate(() => scrollY);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scrollY), middlePosition);
  await page.locator('#slot-footer .slot-body').dispatchEvent('drop', { dataTransfer: transfer, clientX: 400, clientY: 500 });
  assert.equal(await page.locator(`#slot-footer [data-entry-id="${dragId}"]`).count(), 1);
  const droppedPosition = await page.evaluate(() => scrollY);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scrollY), droppedPosition);

  const dragged = page.locator(`[data-entry-id="${dragId}"]`);
  await page.evaluate(() => window.scrollTo(0, 400));
  await dragged.dispatchEvent('dragstart', { dataTransfer: transfer });
  await page.locator('body').dispatchEvent('dragover', { dataTransfer: transfer, clientX: 10, clientY: 995 });
  await page.locator('body').dispatchEvent('dragleave', { relatedTarget: null });
  const exitedPosition = await page.evaluate(() => scrollY);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scrollY), exitedPosition);
  await dragged.dispatchEvent('dragend', { dataTransfer: transfer });
  assert.equal(await page.locator('.is-drop-target').count(), 0);

  await dragged.dispatchEvent('dragstart', { dataTransfer: transfer });
  await page.locator('body').dispatchEvent('dragover', { dataTransfer: transfer, clientX: 10, clientY: 995 });
  await page.locator('body').dispatchEvent('drop', { dataTransfer: transfer, clientX: 10, clientY: 995 });
  const invalidDropPosition = await page.evaluate(() => scrollY);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scrollY), invalidDropPosition);
  assert.equal(await page.locator(`#slot-footer [data-entry-id="${dragId}"]`).count(), 1);

  await dragged.dispatchEvent('dragstart', { dataTransfer: transfer });
  await page.locator('body').dispatchEvent('dragover', { dataTransfer: transfer, clientX: 10, clientY: 995 });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const blurredPosition = await page.evaluate(() => scrollY);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scrollY), blurredPosition);

  const hoverGroup = page.locator('.frame details.group-container').first();
  if (await hoverGroup.getAttribute('open') !== null) await hoverGroup.locator(':scope > summary').click();
  await dragged.dispatchEvent('dragstart', { dataTransfer: transfer });
  await hoverGroup.locator(':scope > summary').scrollIntoViewIfNeeded();
  const trayBounds = await hoverGroup.locator(':scope > summary').boundingBox();
  await hoverGroup.locator(':scope > summary').dispatchEvent('dragover', { dataTransfer: transfer, clientX: trayBounds.x + 20, clientY: trayBounds.y + trayBounds.height / 2 });
  await page.waitForFunction(() => document.querySelector('.frame details.group-container').open);
  await dragged.dispatchEvent('dragend', { dataTransfer: transfer });
  assert.equal(await page.locator('.is-drop-target').count(), 0);
  await transfer.dispose();
  console.log('PASS continuous drag edge scrolling in both directions, center pause, off-screen drop, exit/cancel cleanup and group hover-open');

  await page.reload();
  await page.locator('#language-select').selectOption('en');
  const grip = page.locator('#slot-right [data-entry-id]').first().locator('.drag-grip');
  const wheelId = await grip.locator('..').locator('..').getAttribute('data-entry-id');
  await grip.scrollIntoViewIfNeeded();
  const gripBox = await grip.boundingBox();
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(600, 500, { steps: 8 });
  assert.equal(await page.locator('.drag-preview').count(), 1);
  const beforeWheel = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 450);
  await page.waitForFunction(previous => scrollY >= previous + 400, beforeWheel);
  const afterWheel = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -250);
  await page.waitForFunction(previous => scrollY <= previous - 200, afterWheel);
  assert.equal(await page.locator('.drag-preview').count(), 1);
  await page.locator('#slot-header .slot-body').scrollIntoViewIfNeeded();
  const wheelTarget = await page.locator('#slot-header .slot-body').boundingBox();
  await page.mouse.move(wheelTarget.x + wheelTarget.width / 2, wheelTarget.y + wheelTarget.height / 2, { steps: 8 });
  await page.mouse.up();
  assert.equal(await page.locator(`#slot-header [data-entry-id="${wheelId}"]`).count(), 1);
  assert.equal(await page.locator('.drag-preview, .is-dragging, .is-drop-target').count(), 0);
  const cancelGrip = page.locator(`#slot-header [data-entry-id="${wheelId}"] .drag-grip`);
  await cancelGrip.scrollIntoViewIfNeeded();
  const cancelBox = await cancelGrip.boundingBox();
  await page.mouse.move(cancelBox.x + 3, cancelBox.y + 3);
  await page.mouse.down();
  await page.mouse.move(600, 500, { steps: 5 });
  assert.equal(await page.locator('.drag-preview').count(), 1);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  assert.equal(await page.locator('.drag-preview, .is-dragging, .component-dragging').count(), 0);
  assert.equal(await page.locator(`#slot-header [data-entry-id="${wheelId}"]`).count(), 1);
  console.log('PASS real mouse-held grip drag with wheel up/down, retained drag and shared drop placement');

  await page.reload();
  await page.locator('#board-effect').click();
  const sampleYaml = await generate();
  await page.locator('[data-action="close-output"]').click();
  await page.locator('#draft-regions').check();
  const regionStyles = await page.locator('.effect-slot, .effect-body').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor, zoom: parseFloat(getComputedStyle(node.closest('.effect-page')).zoom) };
  }));
  assert.ok(regionStyles.every(item => item.style === 'solid' && item.width * item.zoom >= 2.8));
  assert.equal(await page.locator('.effect-body > .effect-slot-label').isVisible(), true);
  assert.equal(await page.locator('.effect-slot-left > .effect-slot-label').evaluate(node => node.getBoundingClientRect().height < 90), true);
  assert.equal(await page.locator('[data-effect-slot="right"] [data-effect-source="graph"]').evaluate(node => {
    const box = node.getBoundingClientRect();
    const slot = node.closest('[data-effect-slot]').getBoundingClientRect();
    return box.x >= slot.x && box.right <= slot.right;
  }), true);
  assert.match(await page.locator('.effect-page').evaluate(node => getComputedStyle(node).fontFamily), /Segoe UI/);
  assert.ok(await page.locator('.effect-page').evaluate(node => parseFloat(getComputedStyle(node).zoom)) > .8);
  for (const [key, source] of [['hasTags', 'tag-list'], ['hasBacklinks', 'backlinks'], ['hasToc', 'table-of-contents']]) {
    await page.locator(`#draft-${key}`).uncheck();
    assert.match(await page.locator(`[data-context-status="${key}"]`).textContent(), /absent/);
    if (key === 'hasTags') assert.equal(await page.locator('[data-context-unavailable="hasTags"]').count(), 1);
    if (key === 'hasBacklinks') {
      assert.match(await page.locator(`[data-effect-source="${source}"]`).textContent(), /No backlinks yet/);
      assert.equal(await page.locator(`[data-effect-source="${source}"] .effect-link`).count(), 0);
    }
    if (key === 'hasToc') assert.equal(await page.locator(`[data-effect-source="${source}"]`).count(), 0);
    await page.locator(`#draft-${key}`).check();
  }
  assert.equal(await generate(), sampleYaml);
  await page.locator('[data-action="close-output"]').click();
  await page.locator('.effect-scroll').screenshot({ path: join(screenshotDirectory, 'preview-regions-clear.png') });
  await page.locator('#board-edit').click();
  await openPanel('tray-panel');
  await page.getByRole('button', { name: 'Edit Tag List', exact: true }).click();
  await page.locator('#property-enabled').check();
  await page.locator('#board-effect').click();
  assert.equal(await page.locator('[data-effect-source="tag-list"] .effect-tags').count(), 1);
  await page.locator('#draft-hasTags').uncheck();
  assert.equal(await page.locator('[data-effect-source="tag-list"]').count(), 0);
  await page.locator('#draft-hasTags').check();
  assert.equal(await page.locator('[data-effect-source="tag-list"]').count(), 1);
  await page.locator('#board-edit').click();
  await page.getByRole('button', { name: 'Edit Backlinks', exact: true }).click();
  await page.locator('#property-condition').fill('has-backlinks');
  await page.locator('#property-condition').press('Tab');
  await page.locator('#board-effect').click();
  await page.locator('#draft-hasBacklinks').uncheck();
  assert.equal(await page.locator('[data-effect-source="backlinks"]').count(), 0);
  assert.match(await page.locator('#draft-hidden').textContent(), /sample condition is false/);
  await page.locator('#language-select').selectOption('zh-CN');
  assert.match(await page.locator('[data-context-status="hasBacklinks"]').textContent(), /：无/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#draft-width').selectOption('390');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.effect-scroll').screenshot({ path: join(screenshotDirectory, 'preview-regions-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log('PASS high-contrast scale-compensated region boxes, wide crisp preview, three data flags, disabled explanations, explicit conditions and unchanged YAML');

  await loadPaste(raw);
  await page.locator('#board-edit').click();
  await page.getByRole('button', { name: '编辑 页脚', exact: true }).click();
  await page.locator('#board-effect').click();
  await page.locator('#property-priority').fill('51');
  await page.locator('#property-position').click();
  for (const id of ['groups-panel', 'pages-panel', 'properties-panel']) {
    await openPanel(id);
    const panel = page.locator(`#${id}`);
    assert.equal(await panel.getAttribute('open'), '');
    assert.ok(await panel.evaluate(node => node.clientHeight <= node.querySelector('summary').offsetHeight + node.querySelector('.panel-body').offsetHeight + 4), `${id} must hug its own content, not stretch to another panel's height`);
    await page.locator(`#${id} > summary`).click();
    await page.waitForFunction(id => document.getElementById(id).hidden, id);
    assert.equal(await panel.isVisible(), false, `${id} closes without leaving a legacy summary`);
    await openPanel(id);
    assert.equal(await panel.locator('.panel-body').isVisible(), true);
  }
  assert.equal(await page.locator('#footer-links-editor [data-footer-row]').count(), 1);
  assert.equal(await page.locator('#footer-link-label-0').inputValue(), 'GitHub');
  assert.equal(await page.locator('#footer-link-url-0').inputValue(), 'https://github.com/buzhidao10068/quartz-layout-editor');
  assert.doesNotMatch(await page.locator('#footer-links-editor').textContent(), /Discord/);
  assert.equal(await page.locator('[data-action="footer-link-add"], [data-action="footer-link-remove"], [data-action="footer-link-up"], [data-action="footer-link-down"]').count(), 0);
  await page.locator('#footer-link-label-0').fill('关于我们 <&"');
  await page.locator('#footer-link-url-0').fill('/about#team');
  await page.locator('[data-action="footer-link-save"][data-index="0"]').click();
  assert.equal(await page.locator('[data-effect-source="footer"] [data-footer-link="0"]').textContent(), '关于我们 <&"');
  assert.match(await page.locator('[data-effect-source="footer"] [data-footer-link="0"]').getAttribute('title'), /\/about#team/);
  await closePanel();
  await page.locator('[data-effect-source="footer"] [data-footer-link="0"]').click();
  assert.equal(await page.locator('#board-effect').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#footer-link-label-0').inputValue(), '关于我们 <&"');
  await page.locator('#footer-link-url-0').fill('javascript:alert(1)');
  await page.locator('[data-action="footer-link-save"][data-index="0"]').click();
  assert.match(await status(), /地址/);
  await page.locator('#footer-link-url-0').fill('/about#team');
  await page.locator('[data-action="footer-link-save"][data-index="0"]').click();
  const footerOutput = await generate();
  assert.ok(independent(raw, footerOutput).every(path => /\.options\.links|\.layout\.priority/.test(path)));
  await closeOutput();
  await page.locator('#language-select').selectOption('en');
  assert.match(await page.locator('#footer-links-editor').textContent(), /Each independent component has one button/);
  await openPanel('properties-panel');
  assert.equal(await page.locator('#footer-link-label-0').inputValue(), '关于我们 <&"');
  await page.locator('#footer-link-url-0').fill('/about#updated');
  await page.locator('#language-select').selectOption('zh-CN');
  assert.equal(await page.locator('#footer-link-url-0').inputValue(), '/about#updated');
  await page.locator('[data-action="footer-link-save"][data-index="0"]').focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('[data-effect-source="footer"] [data-footer-link="0"]').getAttribute('title'), /\/about#updated/);
  await page.locator('#property-enabled').uncheck();
  assert.equal(await page.locator('[data-effect-source="footer"]').count(), 0);
  await page.locator('#property-enabled').check();
  assert.equal(await page.locator('[data-effect-source="footer"] [data-footer-link]').count(), 1);
  await page.locator('#footer-links-editor').screenshot({ path: join(screenshotDirectory, 'footer-buttons-editor.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#board-edit').click();
  assert.equal(await page.locator('#slot-footer .footer-components, #slot-footer [data-footer-child]').count(), 0);
  await page.locator('#language-select').selectOption('zh-CN');
  console.log('PASS content-sized preview disclosures, flat single-button settings, safe escaped preview navigation, bilingual/mobile UI and targeted YAML');

  await loadPaste(raw);
  await page.locator('#language-select').selectOption('en');
  await page.locator('#renumber-priorities').uncheck();
  await openPanel('tray-panel');
  await page.locator('[data-action="footer-instance-add"]').focus();
  const beforeNewFooter = await page.evaluate(() => scrollY);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#property-enabled').isChecked(), false, 'Keyboard creation leaves the new Footer disabled');
  assert.equal(await page.evaluate(() => scrollY), beforeNewFooter, 'Disabled creation does not move the document');
  await page.locator('#footer-link-label-0').fill('About native');
  await page.locator('#footer-link-url-0').fill('/about-native');
  await page.locator('[data-action="footer-link-save"][data-index="0"]').click();
  await page.locator('#property-position').selectOption('header');
  await page.locator('#footer-style-0').selectOption('pill');
  await page.locator('#board-effect').click();
  const nativeButton = page.locator('[data-effect-position="header"] [data-footer-link="0"]');
  assert.equal(await nativeButton.textContent(), 'About native');
  assert.equal(await nativeButton.evaluate(node => getComputedStyle(node).borderRadius), '999px');
  await closePanel();
  await openPanel('tray-panel');
  await page.locator('[data-action="footer-instance-add"]').click();
  await page.locator('#property-position').selectOption('left');
  await page.locator('#footer-style-0').selectOption('outline');
  assert.equal(await page.locator('[data-effect-source="footer"]').count(), 3);
  await page.locator('#language-select').selectOption('zh-CN');
  assert.equal(await page.locator('#footer-style-0').inputValue(), 'outline');
  const nativeYaml = await generate();
  assert.equal((nativeYaml.match(/source: [^\n]*footer/g) || []).length, 3);
  assert.doesNotMatch(nativeYaml, /custom-button|buttonStyle/);
  const nativeCss = await page.locator('#output-styles').inputValue();
  assert.match(nativeCss, /footer > ul > li > a\[href="\/about-native"\]/);
  assert.match(nativeCss, /border-radius: 999px/);
  assert.match(nativeCss, /border-radius: \.35rem/);
  await page.locator('#output-language').selectOption('en');
  assert.match(await page.locator('#output-dialog').textContent(), /YAML alone does not apply button styles/);
  await page.locator('[data-action="copy-styles"]').click();
  assert.match(await page.locator('#copy-status').textContent(), /[Ss]tyles/);
  await page.locator('[data-action="close-output"]').click();
  await openPanel('properties-panel');
  await assertDeleteButton('footer-instance-remove');
  await page.locator('[data-action="footer-instance-remove"]').click();
  assert.equal(await page.locator('[data-effect-source="footer"]').count(), 2);
  await nativeButton.click();
  assert.equal(await page.locator('#footer-link-label-0').inputValue(), 'About native');
  await page.locator('.effect-scroll').screenshot({ path: join(screenshotDirectory, 'native-footer-style-preview.png') });
  await closePanel();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#theme-toggle').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#language-select').selectOption('zh-CN');
  console.log('PASS native multiple Footer instances, independent slots, keyboard add/remove, style preview and separate SCSS export without new plugins');

  await loadPaste(raw);
  await page.locator('#language-select').selectOption('en');
  await page.locator('#board-effect').click();
  await openPanel('tray-panel');
  assert.equal(await page.locator('#tray-panel .component-create [data-action="footer-instance-add"]').count(), 1);
  assert.equal(await page.locator('#layout-board [data-action="footer-instance-add"]').count(), 0);
  await page.locator('#spacer-instance-add').click();
  assert.match(await page.locator('#properties-panel').textContent(), /Spacer/);
  for (const key of ['grow', 'shrink', 'basis', 'order', 'align', 'justify']) assert.equal(await page.locator(`#property-${key}`).count(), 0, `Ungrouped properties omit ${key}`);
  assert.equal(await page.locator('#property-enabled').isChecked(), false, 'Click creation leaves the new Spacer disabled');
  assert.equal(await page.locator('#property-group').isVisible(), true, 'Disabled new components retain the group field');
  assert.doesNotMatch(await page.locator('#properties-panel').textContent(), /Group options/);
  await page.locator('#property-position').selectOption('header');
  await page.locator('#property-enabled').uncheck();
  assert.equal(await page.locator('#property-group').isVisible(), true, 'Disabled components retain the group assignment entry point');
  await page.locator('#property-group').fill('spacing-demo');
  await page.locator('#property-group').press('Tab');
  assert.equal(await page.locator('#property-basis').isEnabled(), true);
  assert.equal(await page.locator('#property-group').count(), 0, 'Joining a group enables the component and hides the group field');
  await page.locator('#property-enabled').uncheck();
  await page.locator('#property-group').fill('');
  await page.locator('#property-group').press('Tab');
  assert.equal(await page.locator('#property-basis').count(), 0, 'Leaving a group removes its member controls immediately');
  await page.locator('#board-edit').click();
  await page.locator('#language-select').selectOption('zh-CN');
  assert.equal(await page.locator('#property-basis').count(), 0);
  assert.doesNotMatch(await page.locator('#properties-panel').textContent(), /组内布局（groupOptions）/);
  assert.equal(await page.locator('#property-group').count(), 0);
  await page.locator('#property-enabled').uncheck();
  await page.locator('#property-group').fill('spacing-demo');
  await page.locator('#property-group').press('Tab');
  assert.equal(await page.locator('#property-basis').isVisible(), true, 'Joining a group reveals member controls in Edit layout');
  const groupedYaml = await generate();
  await page.locator('[data-action="close-output"]').click();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const locale of ['en', 'zh-CN']) {
      await page.locator('#language-select').selectOption(locale);
      for (const view of ['edit', 'effect']) {
        await page.locator(`#board-${view}`).click();
        await openPanel('properties-panel');
        assert.equal(await page.locator('#property-enabled').isChecked(), true);
        assert.equal(await page.locator('#property-group, label[for="property-group"], #property-group-hint').count(), 0);
        assert.equal(await page.locator('#property-basis').isVisible(), true, 'Enabled grouped components keep their member options');
      }
    }
  }
  assert.equal(await generate(), groupedYaml, 'Group-field visibility and view/locale changes preserve configuration');
  await page.locator('[data-action="close-output"]').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPanel('properties-panel');
  await page.locator('#property-enabled').uncheck();
  assert.equal(await page.locator('#property-group').inputValue(), 'spacing-demo', 'Hiding the field preserves group membership');
  await page.locator('#property-enabled').check();
  assert.equal(await page.locator('#property-group').count(), 0);
  await page.locator('#language-select').selectOption('en');
  await page.locator('#board-effect').click();
  for (const [selector, value] of [['#property-grow', 'false'], ['#property-shrink', 'false'], ['#property-align', 'stretch'], ['#property-justify', 'between']]) await page.locator(selector).selectOption(value);
  assert.match(await page.locator('#property-justify-hint').textContent(), /ignore in Flex/);
  await page.locator('#property-basis').fill('160px');
  await page.locator('#property-basis').press('Tab');
  await page.locator('#property-order').fill('-2');
  await page.locator('#property-order').press('Tab');
  const spacerMember = page.locator('[data-effect-group="spacing-demo"] > [data-effect-member]').first();
  assert.deepEqual(await spacerMember.evaluate(node => { const css = getComputedStyle(node); return [css.flexBasis, css.flexGrow, css.flexShrink, css.order, css.alignSelf]; }), ['160px', '0', '0', '-2', 'stretch']);
  assert.ok(Math.abs(await spacerMember.evaluate(node => node.offsetWidth) - 160) < 2);
  await openPanel('groups-panel');
  await page.locator('#edit-group').selectOption('spacing-demo');
  await page.locator('#group-direction').selectOption('column');
  assert.ok(Math.abs(await spacerMember.evaluate(node => node.offsetHeight) - 160) < 2, 'Column basis determines initial height');
  await page.locator('#group-direction').selectOption('row');
  await openPanel('properties-panel');
  await page.locator('#property-basis').fill('160');
  await page.locator('#property-basis').press('Tab');
  assert.match(await status(), /valid non-negative CSS basis/);
  assert.equal(await spacerMember.evaluate(node => getComputedStyle(node).flexBasis), '160px');
  await page.locator('#property-basis').fill('25%');
  await page.locator('#property-basis').press('Tab');
  assert.equal(await spacerMember.evaluate(node => getComputedStyle(node).flexBasis), '25%');
  await openPanel('tray-panel');
  await page.locator('#spacer-instance-add').click();
  await page.locator('#property-position').selectOption('right');
  assert.equal(await page.locator('[data-effect-source="spacer"]').count(), 3);
  const spacerYaml = await generate();
  assert.equal((spacerYaml.match(/source: [^\n]*spacer/g) || []).length, 3);
  assert.match(spacerYaml, /basis: "25%"/);
  assert.match(spacerYaml, /shrink: false/);
  await page.locator('[data-action="close-output"]').click();
  await openPanel('properties-panel');
  await assertDeleteButton('spacer-instance-remove');
  await page.locator('[data-action="spacer-instance-remove"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-effect-source="spacer"]').count(), 2);
  console.log('PASS tray creation, multiple native Spacers, independent placement/removal and real group basis/grow/shrink/order/align with validation');

  await page.locator('#footer-instance-add').click();
  assert.deepEqual(await page.locator('#footer-visual-0 option').evaluateAll(nodes => nodes.map(node => node.value)), ['text', 'image', 'remote']);
  assert.equal(await page.locator('#property-enabled').isChecked(), false);
  await page.locator('#property-enabled').check();
  assert.equal(await page.locator('[data-footer-icon]').count(), 0);
  let visualButton = page.locator('[data-effect-source="footer"] [data-footer-link]').last();
  assert.equal(await visualButton.textContent(), 'New button');
  await page.locator('#footer-visual-0').selectOption('image');
  const imageData = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16; const drawing = canvas.getContext('2d'); drawing.fillStyle = '#226655'; drawing.fillRect(0, 0, 16, 16); return canvas.toDataURL('image/png'); });
  await page.locator('#footer-image-0').setInputFiles({ name: 'local-button.png', mimeType: 'image/png', buffer: Buffer.from(imageData.split(',')[1], 'base64') });
  await page.waitForFunction(() => Boolean(document.querySelector('[data-effect-source="footer"] img.footer-visual')));
  assert.equal(await visualButton.locator('img').getAttribute('src'), imageData);
  assert.equal(await visualButton.locator('img').evaluate(node => node.complete && node.naturalWidth === 16), true);
  assert.equal(await visualButton.evaluate(node => getComputedStyle(node).minHeight), '44px');
  const imageYaml = await generate();
  assert.doesNotMatch(imageYaml, /data:image|buttonStyle|image:/);
  const imageStyles = await page.locator('#output-styles').inputValue();
  assert.ok(imageStyles.includes(imageData));
  const nativeImage = await page.evaluate(styles => {
    const style = document.createElement('style'); style.textContent = styles;
    const footer = document.createElement('footer'); footer.innerHTML = '<ul><li><a href="/about">New button</a></li></ul>';
    document.head.append(style); document.body.append(footer);
    const link = footer.querySelector('a');
    const result = [getComputedStyle(link).fontSize, getComputedStyle(link, '::before').backgroundImage, link.textContent];
    footer.remove(); style.remove(); return result;
  }, imageStyles);
  assert.equal(nativeImage[0], '0px');
  assert.ok(nativeImage[1].includes('data:image/png;base64,'));
  assert.equal(nativeImage[2], 'New button');
  await page.locator('[data-action="close-output"]').click();
  await openPanel('properties-panel');
  await page.locator('#footer-image-0').setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg onload="alert(1)"></svg>') });
  assert.match(await status(), /valid PNG, JPEG or WebP/);
  assert.equal(await visualButton.locator('img').getAttribute('src'), imageData);
  await page.locator('#language-select').selectOption('zh-CN');
  await page.locator('#footer-style-0').selectOption('pill');
  await page.locator('#language-select').selectOption('en');
  assert.equal(await page.locator('#footer-visual-0').inputValue(), 'image');
  assert.equal(await page.locator('#footer-style-0').inputValue(), 'pill');
  await page.locator('#footer-links-editor').screenshot({ path: join(screenshotDirectory, 'native-image-button-editor.png') });
  await closePanel();
  await page.locator('.effect-scroll').screenshot({ path: join(screenshotDirectory, 'native-image-button-preview.png') });
  console.log('PASS text/local/external appearance choices without built-in icons, accessible image labels, native CSS export and raster/SVG safety without YAML options or image requests');

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const edge of ['bottom', 'top']) {
      if (await page.locator('html').getAttribute('data-tool-dock') !== edge) await page.locator('#dock-position').click();
      for (const id of ['tray-panel', 'plugins-panel', 'properties-panel', 'groups-panel', 'pages-panel']) {
        await openPanel(id);
        if (id === 'groups-panel') await page.locator('#edit-group').selectOption('toolbar');
        await page.evaluate(() => scrollTo(0, Math.min(450, document.documentElement.scrollHeight - innerHeight)));
        await page.waitForTimeout(50);
        const before = await page.evaluate(() => scrollY);
        for (let iteration = 0; iteration < 5; iteration++) {
          if (id === 'properties-panel') { await page.locator('#property-priority').fill(String(70 + iteration)); await page.locator('#property-priority').press('Tab'); }
          else if (id === 'groups-panel') { await page.locator('#group-direction').selectOption(iteration % 2 ? 'row' : 'column'); }
          else if (id === 'pages-panel') { await page.locator('#page-template').selectOption(iteration % 2 ? 'default' : 'full-width'); }
          else if (id === 'plugins-panel') { const checkbox = page.locator('#plugins-panel input[type="checkbox"]').first(); await checkbox.setChecked(!await checkbox.isChecked()); }
          else { await page.locator('#language-select').selectOption(iteration % 2 ? 'en' : 'zh-CN'); }
          await page.waitForTimeout(40);
          assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) <= 2, `No cumulative page drift: ${id} ${edge} ${viewport.width}`);
        }
      }
    }
    await closePanel();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#language-select').selectOption('zh-CN');
  console.log('PASS repeated effect edits in all five floating panels preserve page scroll on desktop/mobile at both dock edges');

  await loadPaste(raw);
  await page.locator('#language-select').selectOption('en');
  await page.locator('#board-edit').click();
  await page.locator('#slot-left').evaluate(node => node.scrollIntoView({ block: 'start' }));
  await openPanel('tray-panel');
  assert.equal(await page.locator('.frame [data-control="card-group"]').count(), 0, 'Canvas cards do not repeat group selectors');
  assert.ok(await page.locator('.frame .group-container').filter({ hasText: 'toolbar' }).count() > 0, 'Keep the shared toolbar group');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const locale of ['zh-CN', 'en']) {
      await page.locator('#language-select').selectOption(locale);
      assert.equal(await page.locator('#component-tray select, #component-tray .card-badges, #component-tray .component-description, #component-tray .footer-components').count(), 0);
      for (const row of await page.locator('#tray-panel .tray-strip').all()) {
        assert.equal(await row.evaluate(node => getComputedStyle(node).whiteSpace), 'nowrap');
        assert.ok((await row.boundingBox()).height <= 38);
      }
      const colors = await page.locator('#tray-panel .tray-strip').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
      assert.equal(new Set(colors).size, 3, 'Existing, new Footer and new Spacer rows use distinct colors');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
  }
  await page.screenshot({ path: join(screenshotDirectory, 'compact-tray-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#slot-left').evaluate(node => node.scrollIntoView({ block: 'start' }));
  await page.locator('#tray-panel > .panel-body').evaluate(node => { node.scrollTop = 0; });
  await page.screenshot({ path: join(screenshotDirectory, 'compact-tray-desktop.png') });
  const creation = await page.locator('#footer-instance-add').boundingBox();
  const destination = await page.locator('#slot-left > .slot-body').boundingBox();
  await page.mouse.move(creation.x + creation.width / 2, creation.y + creation.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x + 20, Math.max(100, destination.y + 30), { steps: 12 });
  await page.mouse.up();
  assert.equal(await page.locator('#slot-left [data-footer-child]').count(), 0, 'Independent buttons have no nested child cards');
  assert.equal(await page.locator('#slot-left [data-entry-id]').count(), 7, 'Dragging a creation row creates one native Footer in the target slot');
  const createdYaml = await generate();
  assert.equal((createdYaml.match(/source: [^\n]*footer/g) || []).length, 2);
  await page.locator('[data-action="close-output"]').click();
  await openPanel('tray-panel');
  const spacing = await page.locator('#spacer-instance-add').boundingBox();
  await page.mouse.move(spacing.x + 20, spacing.y + 15);
  await page.mouse.down();
  await page.mouse.move(spacing.x - 30, spacing.y + 20, { steps: 3 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  assert.equal(await generate(), createdYaml, 'Cancelling a creation drag does not create an instance');
  await page.locator('[data-action="close-output"]').click();
  await openPanel('tray-panel');
  const creationTransfer = await page.evaluateHandle(() => new DataTransfer());
  await page.locator('#spacer-instance-add').dispatchEvent('dragstart', { dataTransfer: creationTransfer });
  await page.locator('#slot-header > .slot-body').dispatchEvent('drop', { dataTransfer: creationTransfer, clientY: 0 });
  assert.equal(await page.locator('#slot-header [data-entry-id]').count(), 1, 'Native fallback can create a Spacer in a slot');
  console.log('PASS compact name-only tray rows, three semantic colors, bilingual/mobile bounds, pointer-created Footer, cancelled creation and native-created Spacer');

  await loadPaste(raw);
  await page.locator('#language-select').selectOption('en');
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const edge of ['bottom', 'top']) {
      if (await page.locator('html').getAttribute('data-tool-dock') !== edge) await page.locator('#dock-position').click();
      await page.evaluate(() => window.scrollTo(0, 0));
      const headerTop = await page.locator('.topbar').evaluate(node => node.getBoundingClientRect().top);
      if (edge === 'bottom') assert.equal(headerTop, 0, 'No blank space above app-shell with the bottom dock');
      else assert.ok(headerTop > (await page.locator('.board-modes').boundingBox()).height, 'Only the top dock gets necessary clearance');
      for (const id of toolPanels) {
        await openPanel(id);
        const beforeClose = await page.evaluate(() => scrollY);
        await page.locator(`#${id}-summary`).click({ position: { x: 20, y: 15 } });
        assert.equal(await page.locator('.panel.is-pinned').count(), 0, `${id}: the entire heading closes the panel`);
        assert.equal(await page.evaluate(() => scrollY), beforeClose);
      }
      for (const view of ['edit', 'effect']) {
        await page.locator(`#board-${view}`).click();
        await openPanel('tray-panel');
        const beforeSelection = await page.evaluate(() => scrollY);
        await page.getByRole('button', { name: 'Edit Tag List', exact: true }).click();
        assert.equal(await page.locator('#tool-properties-panel').getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('#property-enabled').isChecked(), false, 'Clicking a tray row never enables it');
        assert.equal(await page.locator('.effect-selected').count(), 0, 'Disabled selections have no preview outline');
        assert.equal(await page.evaluate(() => scrollY), beforeSelection, 'Disabled selections never move the document');
        const tagId = await page.locator('#selected-component').inputValue();
        await page.locator('#property-enabled').check();
        const enabledTarget = page.locator(view === 'edit' ? `.frame [data-entry-id="${tagId}"]` : `[data-effect-entry="${tagId}"]`);
        const enableOffset = edge === 'top' ? (await page.locator('.board-modes').boundingBox()).y + (await page.locator('.board-modes').boundingBox()).height + 16 : 16;
        const enabledPosition = await enabledTarget.evaluate((node, offset) => {
          const documentTop = node.getBoundingClientRect().top + scrollY;
          const maximumScroll = document.documentElement.scrollHeight - innerHeight;
          return { actual: node.getBoundingClientRect().top, expected: documentTop - Math.min(maximumScroll, Math.max(0, documentTop - offset)) };
        }, enableOffset);
        assert.ok(Math.abs(enabledPosition.actual - enabledPosition.expected) < 3, `Manual enable scrolls to the component within document limits: ${view} ${edge} ${viewport.width}`);
        const beforeDisable = await page.evaluate(() => scrollY);
        await page.locator('#property-enabled').uncheck();
        assert.equal(await page.evaluate(() => scrollY), await page.evaluate(previous => Math.min(previous, Math.max(0, document.documentElement.scrollHeight - innerHeight)), beforeDisable), 'Disabling preserves scroll within the shortened document limits');
        const titleId = await page.locator('#selected-component option').filter({ hasText: 'Page Title' }).getAttribute('value');
        await page.locator('#selected-component').selectOption(titleId);
        assert.equal(await page.locator('#property-enabled').isChecked(), true);
        const target = page.locator(view === 'edit' ? `.frame [data-entry-id="${titleId}"]` : `[data-effect-entry="${titleId}"]`);
        const top = await target.evaluate(node => node.getBoundingClientRect().top);
        const expected = edge === 'top' ? (await page.locator('.board-modes').boundingBox()).y + (await page.locator('.board-modes').boundingBox()).height + 16 : 16;
        assert.ok(Math.abs(top - expected) < 3, `Enabled component is brought below the dock: ${view} ${edge} ${viewport.width}`);
        if (view === 'effect') {
          assert.equal(await page.locator('.effect-selected').count(), 1);
          assert.equal(await target.evaluate(node => node.classList.contains('effect-selected')), true);
          const outline = await target.evaluate(node => {
            const style = getComputedStyle(node);
            return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) * parseFloat(getComputedStyle(node.closest('.effect-page')).zoom) };
          });
          assert.equal(outline.style, 'dashed');
          assert.ok(Math.abs(outline.width - 3) < .1, 'Selection outline stays clear after preview scaling');
          await closePanel();
          assert.equal(await page.locator('.effect-selected').count(), 0, 'Closing the panel restores the clean preview');
          await openPanel('properties-panel');
          assert.equal(await target.evaluate(node => node.classList.contains('effect-selected')), true);
        }
        await openPanel('groups-panel');
        await page.locator('#edit-group').selectOption('toolbar');
        const group = page.locator(view === 'edit' ? '[data-group-disclosure]' : '[data-effect-group]').filter({ hasText: view === 'edit' ? 'toolbar' : 'Search' }).first();
        assert.ok(Math.abs((await group.boundingBox()).y - expected) < 3, `Group selection locates the actual container: ${view} ${edge} ${viewport.width}`);
        await closePanel();
        for (const type of ['footer', 'spacer']) {
          await openPanel('tray-panel');
          const beforeCreate = await page.evaluate(() => scrollY);
          await page.locator(`#${type}-instance-add`).click();
          assert.equal(await page.locator('#property-enabled').isChecked(), false, `${type} click creates disabled in ${view}`);
          const createdId = await page.locator('#selected-component').inputValue();
          assert.equal(await page.locator(`[data-effect-entry="${createdId}"], .frame [data-entry-id="${createdId}"]`).count(), 0);
          assert.equal(await page.evaluate(() => scrollY), beforeCreate);
          await page.locator(`[data-action="${type}-instance-remove"]`).click();
        }
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#board-edit').click();
  await openPanel('tray-panel');
  await page.locator('#footer-instance-add').click();
  assert.equal(await page.locator('#footer-links-editor [data-footer-row]').count(), 1);
  assert.equal(await page.locator('[data-action="footer-link-add"], .frame [data-footer-child]').count(), 0);
  await page.locator('#footer-links-editor').screenshot({ path: join(screenshotDirectory, 'single-button-settings.png') });
  const legacy = raw.replace('        GitHub:', '        About: /about\n        GitHub:');
  await loadPaste(legacy);
  await page.getByRole('button', { name: 'Edit Footer', exact: true }).click();
  assert.equal(await page.locator('.component-delete').count(), 0, 'Imported components cannot be deleted');
  assert.match(await page.locator('#footer-links-editor').textContent(), /preserved read-only/);
  assert.equal(await page.locator('#footer-links-editor input').count(), 0);
  assert.equal(await generate(), legacy, 'Imported multiple links are never silently dropped');
  await page.locator('[data-action="close-output"]').click();
  console.log('PASS tray click without enable, explicit component/group navigation, whole-heading close, flat single buttons, preserved legacy Footer and no blank top margin on desktop/mobile at both dock edges');

  const external = await browser.newContext({ offline: true, locale: 'en-US', viewport: { width: 1440, height: 1000 } });
  try {
    const externalPage = await external.newPage();
    const iconRequests = [];
    const externalErrors = [];
    externalPage.on('pageerror', error => externalErrors.push(error.message));
    externalPage.on('request', request => { if (/^https?:/.test(request.url())) iconRequests.push(request.url()); });
    await external.route('https://icons.example/**', route => route.request().url().includes('missing') ? route.abort() : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="teal"/></svg>' }));
    await externalPage.goto(fileUrl);
    await externalPage.locator('#board-effect').click();
    await externalPage.locator('#tool-tray-panel').click();
    await externalPage.locator('#footer-instance-add').click();
    assert.equal(await externalPage.locator('#property-enabled').isChecked(), false);
    await externalPage.locator('#property-enabled').check();
    await externalPage.locator('#footer-visual-0').selectOption('remote');
    const resource = externalPage.locator('#properties-panel a[href="https://appicons.co"]');
    assert.equal(await resource.getAttribute('target'), '_blank');
    assert.equal(await resource.getAttribute('rel'), 'noopener noreferrer');
    assert.match(await externalPage.locator('#properties-panel').textContent(), /Find icons at Appicons/);
    await externalPage.locator('#language-select').selectOption('zh-CN');
    assert.match(await externalPage.locator('#properties-panel').textContent(), /可以到 Appicons 查找图标/);
    await externalPage.locator('#language-select').selectOption('en');
    const remoteField = externalPage.locator('#footer-remote-0');
    const remoteButton = externalPage.locator('[data-effect-source="footer"] [data-footer-link]').last();
    assert.match(await externalPage.locator('#properties-panel').textContent(), /require internet/);
    assert.equal(iconRequests.length, 0, 'Choosing external mode alone makes no request');
    await remoteField.fill('https://icons.example/github.svg?color=%23fff&size=24');
    await remoteField.press('Tab');
    await externalPage.waitForFunction(() => { const image = document.querySelector('[data-effect-source="footer"] img.footer-visual'); return image?.complete && image.naturalWidth === 24; });
    assert.equal(await remoteButton.locator('img').getAttribute('referrerpolicy'), 'no-referrer');
    assert.equal(await remoteButton.locator('.sr-only').textContent(), 'New button');
    await remoteField.fill('javascript:alert(1)');
    await remoteField.press('Tab');
    assert.match(await externalPage.locator('#status-text').textContent(), /valid HTTPS icon URL/);
    assert.ok((await remoteButton.locator('img').getAttribute('src')).startsWith('https://icons.example/'));
    await remoteField.fill('https://icons.example/missing.svg');
    await remoteField.press('Tab');
    await externalPage.waitForFunction(() => document.querySelector('[data-effect-source="footer"] img.footer-visual')?.hidden === true);
    assert.equal(await remoteButton.locator('.sr-only').count(), 0);
    assert.match(await remoteButton.textContent(), /New button/);
    await remoteField.fill('https://icons.example/github.svg');
    await remoteField.press('Tab');
    await externalPage.locator('#language-select').selectOption('zh-CN');
    assert.equal(await remoteField.inputValue(), 'https://icons.example/github.svg');
    assert.match(await externalPage.locator('#properties-panel').textContent(), /需联网/);
    await externalPage.setViewportSize({ width: 390, height: 844 });
    assert.equal(await externalPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await externalPage.locator('[data-action="close-tool-panel"]').click();
    await externalPage.locator('#generate-config').click();
    assert.match(await externalPage.locator('#output-styles').inputValue(), /https:\/\/icons.example\/github.svg/);
    assert.doesNotMatch(await externalPage.locator('#output-yaml').inputValue(), /icons.example|remoteUrl/);
    assert.ok(iconRequests.length > 0 && iconRequests.every(url => url.startsWith('https://icons.example/')));
    assert.deepEqual(externalErrors, []);
    console.log('PASS opt-in external SVG icons, HTTPS validation, label fallback, bilingual/mobile controls and separate CSS export with isolated mocked requests');
  } finally { await external.close(); }

  for (const [browserLocale, expected] of [['en-US', 'en'], ['zh-TW', 'zh-CN']]) {
    const clean = await browser.newContext({ offline: true, locale: browserLocale });
    const cleanPage = await clean.newPage();
    await cleanPage.goto(fileUrl);
    assert.equal(await cleanPage.locator('html').getAttribute('data-tool-dock'), 'bottom');
    await cleanPage.locator('#dock-position').click();
    assert.equal(await cleanPage.locator('html').getAttribute('data-tool-dock'), 'top');
    await cleanPage.reload();
    assert.equal(await cleanPage.locator('html').getAttribute('data-tool-dock'), 'top', 'Dock preference survives reload');
    assert.equal(await cleanPage.locator('html').getAttribute('lang'), expected);
    const cleanRequests = [];
    cleanPage.on('request', request => { if (/^https?:/.test(request.url())) cleanRequests.push(request.url()); });
    await clean.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
    });
    await cleanPage.reload();
    assert.equal(await cleanPage.locator('html').getAttribute('data-tool-dock'), 'bottom', 'Blocked storage falls back to the bottom bar');
    await cleanPage.locator('#dock-position').click();
    assert.equal(await cleanPage.locator('html').getAttribute('data-tool-dock'), 'top', 'Dock can move with storage blocked');
    assert.equal(await cleanPage.locator('html').getAttribute('lang'), expected);
    await cleanPage.locator('#language-select').selectOption(expected === 'en' ? 'zh-CN' : 'en');
    await cleanPage.locator('#generate-config').click();
    assert.equal(await cleanPage.locator('#output-yaml').inputValue(), raw);
    assert.deepEqual(cleanRequests, []);
    await clean.close();
  }
  assert.equal(await page.locator('iframe, #site-preview-panel').count(), 0);
  assert.deepEqual(network, []);
  assertNoErrors();
  console.log('PASS browser-language fallback, denied storage, zero iframe and zero HTTP requests in both locales');
} finally { await browser.close(); }
