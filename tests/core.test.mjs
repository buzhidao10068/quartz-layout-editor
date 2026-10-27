import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';
import { loadCore, plain, root } from './load-core.mjs';

const core = loadCore();
const defaultRaw = readFileSync(new URL('../fixtures/default-config.yaml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const localPath = new URL('../fixtures/local/real-config.yaml', import.meta.url);
const entryNamed = (state, name) => state.entries.find(entry => entry.shortName === name);

test('full native footers accept multiple or no links while independent buttons stay single-link', () => {
  const state = core.load(defaultRaw);
  state.renumber = false;
  const original = entryNamed(state, 'footer');
  const originalSpan = plain(original.span);
  const footer = core.addFooter(state, 'footer');
  const second = core.addFooter(state, 'footer');
  const button = core.addFooter(state);
  const spacer = core.addSpacer(state);
  const rows = [{ label: 'About <&"', url: '/about' }, { label: 'GitHub', url: 'https://github.com/example' }];
  assert.equal(footer.footerKind, 'footer');
  core.updateFooterLinks(state, footer.id, rows);
  core.updateFooterLinks(state, second.id, []);
  core.place(state, footer.id, 'header', undefined, 'footer-row');
  core.place(state, second.id, 'right');
  core.updateEntry(state, second.id, { enabled: false });
  core.place(state, spacer.id, 'afterBody');
  assert.throws(() => core.updateFooterLinks(state, button.id, rows), /只能包含一个按钮/);
  const beforeInvalid = core.generate(state);
  for (const invalid of [[{ label: 'Bad', url: 'javascript:alert(1)' }], [{ label: 'Same', url: '/' }, { label: 'Same', url: '/two' }], [{ label: '__proto__', url: '/' }]]) {
    assert.throws(() => core.updateFooterLinks(state, footer.id, invalid));
    assert.equal(core.generate(state), beforeInvalid);
  }
  const output = core.generate(state);
  const loaded = core.load(output);
  assert.equal(core.generate(loaded), output);
  assert.doesNotMatch(output, /footerKind|full-footer|buttonStyle/);
  assert.deepEqual(plain(original.span), originalSpan);
  assert.equal(new Set([footer.id, second.id, button.id, spacer.id]).size, 4);
  const imported = loaded.entries.find(entry => entry.layout?.group === 'footer-row');
  assert.deepEqual(plain(imported.footerLinks), rows);
  assert.equal(loaded.entries.find(entry => entry.layout?.position === 'right' && entry.footerLinks?.length === 0).enabled, false);
  core.updateFooterLinks(loaded, imported.id, [...rows, { label: 'Contact', url: 'mailto:hello@example.org' }]);
  assert.ok(independent(output, core.generate(loaded)).every(path => path.startsWith(`plugins.${imported.id}.options.links`)));
  core.removeAddedFooter(state, footer.id);
  core.removeAddedFooter(state, second.id);
  core.removeAddedFooter(state, button.id);
  core.removeAddedSpacer(state, spacer.id);
  delete state.groups['footer-row'];
  assert.equal(core.generate(state), defaultRaw);
  assert.throws(() => core.removeAddedFooter(state, original.id));
});

test('imported multi-link footer editing preserves opaque options and composes with layout and enabled', () => {
  const source = core.CATALOG.find(entry => entry.displayName === 'Footer').source;
  const raw = `configuration:\n  pageTitle: Test\nplugins:\n  - source: "${source}"\n    options:\n      opaque: 'keep unchanged' # untouched\n      links:\n        GitHub: https://github.com/example\n        Discord: https://discord.gg/example\n`;
  const state = core.load(raw);
  const footer = state.entries[0];
  assert.equal(footer.footerKind, 'footer');
  assert.equal(core.generate(state), raw);
  core.updateFooterLinks(state, footer.id, [{ label: 'About', url: '/about' }, { label: 'Home', url: '/' }]);
  core.updateEntry(state, footer.id, { enabled: false, layout: { position: 'afterBody', priority: 10 } });
  const output = core.generate(state);
  assert.match(output, /opaque: 'keep unchanged' # untouched/);
  assert.ok(independent(raw, output).every(path => /^plugins\.0\.(options\.links|enabled|layout)/.test(path)));
  assert.equal(core.generate(core.load(output)), output);
  core.updateFooterLinks(state, footer.id, []);
  assert.equal(core.load(core.generate(state)).entries[0].footerLinks.length, 0);
});

test('new independent Footer instances require exactly one link without mutating on rejection', () => {
  const state = core.load(defaultRaw);
  const entry = core.addFooter(state);
  const before = core.generate(state);
  assert.throws(() => core.updateFooterLinks(state, entry.id, []), /只能包含一个按钮/);
  assert.throws(() => core.updateFooterLinks(state, entry.id, [{ label: 'One', url: '/one' }, { label: 'Two', url: '/two' }]), /只能包含一个按钮/);
  assert.equal(core.generate(state), before);
  core.updateFooterLinks(state, entry.id, [{ label: 'One', url: '/one' }]);
  assert.equal(entry.footerLinks.length, 1);
  assert.equal(entryNamed(core.load(core.generate(state)), 'footer').footerLinks.length, 1);
});

test('multiple native Spacers compose with Footer append, groups, removal and reimport', () => {
  const state = core.load(defaultRaw);
  state.renumber = false;
  const first = core.addSpacer(state);
  const footer = core.addFooter(state);
  const second = core.addSpacer(state);
  core.place(state, first.id, 'header', undefined, 'space-row');
  core.updateEntry(state, first.id, { layout: { ...first.layout, groupOptions: { grow: true, shrink: false, basis: '160px', order: -2, align: 'stretch', justify: 'between' } } });
  core.place(state, second.id, 'right');
  core.updateEntry(state, second.id, { enabled: false });
  const output = core.generate(state);
  const loaded = core.load(output);
  assert.equal(loaded.entries.filter(entry => entry.shortName === 'spacer').length, 3);
  assert.equal(core.generate(loaded), output);
  assert.match(output, /basis: "160px"/);
  assert.deepEqual(plain(loaded.entries.find(entry => entry.layout?.group === 'space-row').layout.groupOptions), plain(first.layout.groupOptions));
  assert.deepEqual(independent(defaultRaw, output).sort(), ['layout.groups.space-row', 'plugins']);
  core.removeAddedSpacer(state, first.id);
  core.removeAddedFooter(state, footer.id);
  core.removeAddedSpacer(state, second.id);
  delete state.groups['space-row'];
  assert.equal(core.generate(state), defaultRaw);
  assert.throws(() => core.removeAddedSpacer(state, entryNamed(state, 'spacer').id));
});

test('Footer icon and embedded raster styles stay separate from YAML and reject unsafe images', () => {
  const state = core.load(defaultRaw);
  const url = entryNamed(state, 'footer').footerLinks[0].url;
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwZkAAAAASUVORK5CYII=';
  assert.equal(core.validFooterImage(image), true);
  const iconCss = core.footerStyles(state, { [url]: { style: 'pill', mode: 'icon', icon: 'star' } });
  assert.match(iconCss, /::before/);
  assert.match(iconCss, /font-size: 0/);
  const imageCss = core.footerStyles(state, { [url]: { mode: 'image', image } });
  assert.match(imageCss, /background: url\("data:image\/png;base64,/);
  for (const unsafe of ['https://example.org/icon.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,abc', image + '"; color: red', 'data:image/png;base64,' + 'A'.repeat(1400001)]) {
    assert.equal(core.validFooterImage(unsafe), false);
    assert.equal(core.footerStyles(state, { [url]: { mode: 'image', image: unsafe } }), '');
  }
  assert.equal(core.footerStyles(state, { [url]: { mode: 'text', image, icon: 'star' } }), '');
  assert.equal(core.generate(state), defaultRaw);
});

test('external Footer icons validate HTTPS URLs and export safe CSS without YAML changes', () => {
  const state = core.load(defaultRaw);
  const url = entryNamed(state, 'footer').footerLinks[0].url;
  for (const remoteUrl of ['https://icons.example/github.svg', 'https://cdn.example:8443/icon.png?color=%23fff&size=24', 'https://icons.example/image?name=(home);v=1']) {
    assert.equal(core.validFooterIconUrl(remoteUrl), true);
    assert.equal(core.footerAppearance({ mode: 'remote', remoteUrl }).image, remoteUrl);
    const styles = core.footerStyles(state, { [url]: { mode: 'remote', remoteUrl } });
    assert.match(styles, /background: url\("https:\/\//);
    assert.match(styles, /font-size: 0/);
    assert.doesNotMatch(styles, /undefined|<script/);
    assert.equal(core.footerStyles(state, { [url]: { mode: 'text', remoteUrl } }), '');
  }
  for (const remoteUrl of ['http://icons.example/a.svg', '//icons.example/a.svg', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'file:///icon.png', 'https://user:pass@icons.example/a.svg', 'https://icons.example/a";color:red', 'https://icons.example/a\\b', 'https://icons.example/${bad}', 'https://-bad.example/icon', 'https://icons.example:99999/a', 'https://icons.example/a\n', 'https://icons.example/' + 'x'.repeat(4096)]) {
    assert.equal(core.validFooterIconUrl(remoteUrl), false, remoteUrl);
    assert.equal(core.footerStyles(state, { [url]: { mode: 'remote', remoteUrl } }), '');
  }
  assert.equal(core.generate(state), defaultRaw);
});

test('multiple native Footer instances keep independent placement and round-trip without new plugin options', () => {
  const state = core.load(defaultRaw);
  state.renumber = false;
  const original = entryNamed(state, 'footer');
  const ids = [];
  for (const position of core.POSITIONS) {
    const entry = core.addFooter(state);
    ids.push(entry.id);
    assert.equal(entry.source, original.source);
    core.updateFooterLinks(state, entry.id, [{ label: `About ${position}`, url: `/about#${position}` }]);
    core.place(state, entry.id, position);
  }
  assert.equal(new Set(ids).size, 6);
  const output = core.generate(state);
  const loaded = core.load(output);
  assert.equal(loaded.entries.length, state.entries.length);
  assert.equal(core.generate(loaded), output);
  for (const position of core.POSITIONS) {
    assert.ok(loaded.entries.some(entry => entry.footerLinks?.[0]?.label === `About ${position}` && entry.layout.position === position));
  }
  const paths = independent(defaultRaw, output);
  assert.deepEqual(paths, ['plugins']);
  const originalLines = output.trimEnd().split('\n');
  originalLines.splice(loaded.entries[45].span[0], loaded.entries[50].span[1] - loaded.entries[45].span[0] + 1);
  assert.equal(originalLines.join('\n') + '\n', defaultRaw);
  assert.doesNotMatch(output, /buttonStyle|custom-button|style:/);
});

test('new Footer append preserves all original text, composes with root patches and can be removed', () => {
  const source = core.CATALOG.find(entry => entry.displayName === 'Footer').source;
  for (const suffix of ['', '\n', '\n# trailing comment\n', '\nlayout:\n  groups: {}\n  byPageType: {}\n']) {
    const raw = `configuration:\n  pageTitle: Test # untouched\nplugins:\n  - source: "${source}"\n    options:\n      opaque: 'leave unchanged'${suffix}`;
    const state = core.load(raw);
    const entry = core.addFooter(state);
    const second = core.addFooter(state);
    core.updateEntry(state, second.id, { enabled: false });
    const output = core.generate(state);
    assert.match(output, /opaque: 'leave unchanged'/);
    assert.equal(core.load(output).entries.length, 3);
    assert.equal(core.load(output).entries[2].enabled, false);
    core.removeAddedFooter(state, second.id);
    core.removeAddedFooter(state, entry.id);
    assert.equal(core.generate(state), raw);
    assert.throws(() => core.removeAddedFooter(state, 0));
    core.addFooter(state);
    core.updatePageType(state, 'content', { exclude: ['footer'] });
    assert.equal(core.load(core.generate(state)).entries.length, 2);
    independent(raw, core.generate(state));
  }
});

test('native custom.scss styles are separate, target actual Footer markup and escape selector data', () => {
  const state = core.load(defaultRaw);
  const entry = core.addFooter(state);
  const url = '/about?x="</style><script>&y=${danger}';
  core.updateFooterLinks(state, entry.id, [{ label: 'About', url }]);
  const yaml = core.generate(state);
  for (const style of Object.keys(core.FOOTER_STYLES)) {
    const css = core.footerStyles(state, { [url]: style });
    assert.match(css, /footer > ul > li > a\[href=/);
    assert.match(css, /var\(--secondary\)/);
    assert.match(css, /:focus-visible/);
    assert.doesNotMatch(css, /<|\$\{|undefined/);
    assert.equal(core.generate(state), yaml);
  }
  assert.match(core.footerStyles(state, { [url]: 'x; color:red', '/missing': 'pill' }), /footer:has\(> ul > li:only-child/);
  assert.match(core.footerStyles(state, {}), /footer:has\(> ul > li:only-child/);
});

test('new Footer buttons and full footers hide credits while imported full footers keep them', () => {
  const state = core.load(defaultRaw);
  const button = core.addFooter(state);
  core.updateFooterLinks(state, button.id, [{ label: '独立按钮', url: '/independent' }]);
  const full = core.addFooter(state, 'footer');
  core.updateFooterLinks(state, full.id, [
    { label: 'About', url: '/new-about' },
    { label: 'Contact', url: '/new-contact' }
  ]);
  const css = core.footerStyles(state, {});
  assert.match(css, /footer:has\(> ul > li:only-child > a\[href="\/independent"\]\) > p \{ display: none; \}/);
  assert.match(css, /nth-child\(1\).*\/new-about.*nth-child\(2\).*\/new-contact/);
  assert.match(css, /not\(:has\(> ul > li:nth-child\(3\)\)\) > p \{ display: none; \}/);
  assert.doesNotMatch(css, /<|\$\{|undefined/);
  const emptyFull = core.addFooter(state, 'footer');
  core.updateFooterLinks(state, emptyFull.id, []);
  assert.match(core.footerStyles(state, {}), /footer:has\(> ul:empty\) > p \{ display: none; \}/);
  const importedLink = state.entries.find(entry => entry.footerKind === 'footer' && !entry.added).footerLinks[0].url;
  assert.equal(core.footerStyles(state, { [importedLink]: 'pill' }).includes(`href="${importedLink}"]) > p`), false);
});

test('footer default contains only the project GitHub link and preserves no-op bytes', () => {
  const state = core.load(defaultRaw);
  const footer = entryNamed(state, 'footer');
  assert.equal(footer.footerMeta.error, null);
  assert.equal(footer.footerLinks.find(link => link.label === 'GitHub').url, 'https://github.com/buzhidao10068/quartz-layout-editor');
  assert.equal(footer.footerLinks.length, 1);
  assert.equal(core.generate(state), defaultRaw);
  const spacedRaw = defaultRaw.replace('        GitHub:', '        Example Link:');
  const spacedState = core.load(spacedRaw);
  assert.equal(entryNamed(spacedState, 'footer').footerLinks[0].label, 'Example Link');
  assert.equal(core.generate(spacedState), spacedRaw);
});

test('footer child buttons patch only links and preserve opaque sibling options', () => {
  const raw = defaultRaw.replace('      links:\n        GitHub:', '      copyright: |\n        Keep this opaque text\n      links:\n        GitHub:');
  const state = core.load(raw);
  const footer = entryNamed(state, 'footer');
  const rows = [{ label: '关于我们 <&"', url: '/about#team' }, { label: 'Home', url: '/' }];
  core.updateFooterLinks(state, footer.id, rows);
  const output = core.generate(state);
  assert.ok(independent(raw, output).every(path => path.startsWith(`plugins.${footer.id}.options.links`)));
  assert.match(output, /      copyright: \|\n        Keep this opaque text/);
  assert.deepEqual(plain(entryNamed(core.load(output), 'footer').footerLinks), rows);
  core.updateFooterLinks(state, footer.id, []);
  assert.match(core.generate(state), /      links: \{\}/);
});

for (const options of ['', '    options: {} # keep\n', '    options:\n      copyright: custom # keep\n', '    options:\n      links: {}\n']) {
  test(`footer links insertion composes with enabled and layout patches: ${JSON.stringify(options)}`, () => {
    const raw = `configuration:\n  pageTitle: Test\nplugins:\n  - source: "${core.CATALOG.find(entry => entry.displayName === 'Footer').source}"\n${options}`;
    const state = core.load(raw);
    const footer = entryNamed(state, 'footer');
    core.updateFooterLinks(state, footer.id, [{ label: 'About', url: '/about' }]);
    core.updateEntry(state, footer.id, { enabled: false, layout: { position: 'header', priority: 10 } });
    const output = core.generate(state);
    const loaded = core.load(output);
    assert.equal(loaded.entries[0].enabled, false);
    assert.equal(loaded.entries[0].layout.position, 'header');
    assert.deepEqual(plain(loaded.entries[0].footerLinks), [{ label: 'About', url: '/about' }]);
    independent(raw, output);
    if (options.includes('# keep')) assert.match(output, /# keep/);
  });
}

test('unsupported footer links remain opaque and read-only without preventing layout edits', () => {
  for (const options of ['{ links: { About: /about } }', '\n      links: { About: /about }', '\n      links: &buttons\n        About: /about', '\n      links:\n        About: /about\n        About: /other']) {
    const raw = `configuration:\n  pageTitle: Test\nplugins:\n  - source: "${core.CATALOG.find(entry => entry.displayName === 'Footer').source}"\n    options: ${options}\n`;
    const state = core.load(raw);
    assert.ok(state.entries[0].footerMeta.error);
    assert.equal(core.generate(state), raw);
    assert.throws(() => core.updateFooterLinks(state, 0, []), /只读/);
    core.updateEntry(state, 0, { enabled: false });
    independent(raw.replace('        About: /other\n', ''), core.generate(state).replace('        About: /other\n', ''));
  }
});

test('footer links reject unsafe URLs, duplicate labels and prototype keys without mutation', () => {
  const state = core.load(defaultRaw);
  const footer = entryNamed(state, 'footer');
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', '/\\evil.test', '', 'https://', ' /about', 'java\nscript:x']) {
    assert.throws(() => core.updateFooterLinks(state, footer.id, [{ label: 'Test', url }]), /地址/);
  }
  for (const label of ['', '__proto__', 'constructor', 'prototype', ' A ', 'A\nB']) {
    assert.throws(() => core.updateFooterLinks(state, footer.id, [{ label, url: '/about' }]));
  }
  assert.throws(() => core.updateFooterLinks(state, footer.id, [{ label: 'A', url: '/' }, { label: 'A', url: '/about' }]), /唯一/);
  assert.equal(core.generate(state), defaultRaw);
});
const independent = (before, after) => {
  const result = spawnSync(process.env.PYTHON || 'python', ['tests/yaml_paths_diff.py'], {
    cwd: root, input: JSON.stringify({ before, after }), encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout).paths;
};

for (const [name, raw] of [['default', defaultRaw], ['local', existsSync(localPath) ? readFileSync(localPath, 'utf8') : null]]) {
  for (const [variant, transform] of [
    ['LF', text => text], ['CRLF', text => text.replace(/\n/g, '\r\n')],
    ['BOM', text => `\uFEFF${text}`], ['no-final-newline', text => text.replace(/\n$/, '')],
  ]) {
    test(`${name}: ${variant} no-op preserves normalized bytes and YAML paths`, { skip: raw === null }, () => {
      const input = transform(raw);
      const state = core.load(input);
      const output = core.generate(state);
      assert.equal(output, core.originalText(state));
      if (variant === 'LF' || variant === 'no-final-newline') assert.equal(output, input);
      assert.equal(core.diffLines(input, output).filter(line => line.type !== 'same').length, 0);
      assert.deepEqual(independent(input, output), []);
      assert.equal(typeof entryNamed(state, 'explorer').enabled, 'boolean');
    });
  }
}

test('default snapshot and real fixture parse with correct counts', () => {
  const state = core.load(defaultRaw);
  assert.equal(state.entries.length, 45);
  assert.equal(core.CATALOG.length, 18);
  assert.equal(entryNamed(state, 'explorer').layout.position, 'left');
  assert.equal(entryNamed(state, 'tag-list').enabled, false);
  assert.equal(entryNamed(state, 'search').layout.groupOptions.grow, true);
  assert.deepEqual(plain(state.byPageType['404'].positions), { beforeBody: [], left: [], right: [] });
});

test('real fixture matches runtime slot sorting and group priority', { skip: !existsSync(localPath) }, () => {
  const state = core.load(readFileSync(localPath, 'utf8'));
  assert.equal(state.entries.length, 46);
  const names = position => core.slotEntries(state, position).map(item => item.kind === 'entry' ? item.entry.shortName : `${item.name}[${item.members.map(entry => entry.shortName).join(',')}]`);
  assert.deepEqual(plain(names('header')), []);
  assert.deepEqual(plain(names('left')), ['page-title', 'spacer', 'toolbar[search,darkmode,reader-mode]', 'explorer']);
  assert.deepEqual(plain(names('right')), ['graph', 'table-of-contents', 'backlinks']);
  assert.deepEqual(plain(names('beforeBody')), ['breadcrumbs', 'article-title', 'note-properties', 'content-meta']);
  assert.deepEqual(plain(names('afterBody')), ['comments']);
  assert.deepEqual(plain(names('footer')), ['footer']);
  assert.deepEqual(plain(state.entries.filter(entry => entry.catalog && !entry.enabled).map(entry => entry.shortName)).sort(), ['recent-notes', 'stacked-pages', 'tag-list']);
  assert.equal(entryNamed(state, 'obsidian-plugin-excalidraw').catalog, null);
});

test('changing one position preserves all other plugin and configuration paths', () => {
  const state = core.load(defaultRaw);
  const entry = entryNamed(state, 'graph');
  core.updateEntry(state, entry.id, { layout: { ...entry.layout, position: 'left' } });
  const output = core.generate(state);
  assert.deepEqual(independent(defaultRaw, output), [`plugins.${entry.id}.layout.position`]);
  assert.equal(output.split('plugins:')[0], defaultRaw.split('plugins:')[0]);
  const before = state.rawLines.slice(0, entry.layoutSpan[0]).join('\n');
  assert.equal(output.slice(0, before.length), before);
});

test('enabling and placing a previously implicit disabled component adds only two paths', () => {
  const state = core.load(defaultRaw);
  state.renumber = false;
  const entry = entryNamed(state, 'recent-notes');
  core.place(state, entry.id, 'afterBody');
  const output = core.generate(state);
  assert.deepEqual(independent(defaultRaw, output).sort(), [`plugins.${entry.id}.enabled`, `plugins.${entry.id}.layout`].sort());
  assert.equal(core.load(output).entries[entry.id].enabled, true);
  assert.equal(core.load(output).entries[entry.id].layout.position, 'afterBody');
});

test('multiple patches do not shift unrelated line coordinates', () => {
  const state = core.load(defaultRaw);
  const graph = entryNamed(state, 'graph');
  const footer = entryNamed(state, 'footer');
  const recent = entryNamed(state, 'recent-notes');
  core.updateEntry(state, graph.id, { layout: { ...graph.layout, position: 'header' } });
  core.updateEntry(state, footer.id, { enabled: false });
  core.updateEntry(state, recent.id, { enabled: true, layout: { position: 'afterBody', priority: 60 } });
  assert.deepEqual(independent(defaultRaw, core.generate(state)).sort(), [
    `plugins.${graph.id}.layout.position`, `plugins.${footer.id}.enabled`, `plugins.${recent.id}.enabled`, `plugins.${recent.id}.layout`,
  ].sort());
});

test('byPageType can only clear or exclude and preserves groups exactly', () => {
  const state = core.load(defaultRaw);
  core.updatePageType(state, 'content', { positions: { right: [] }, template: 'full-width', exclude: ['reader-mode'] });
  const output = core.generate(state);
  assert.match(output, /right: \[\]/);
  assert.deepEqual(independent(defaultRaw, output).sort(), ['layout.byPageType.content.positions', 'layout.byPageType.content.template', 'layout.byPageType.content.exclude'].sort());
  assert.equal(output.split('  groups:')[1].split('  byPageType:')[0], defaultRaw.split('  groups:')[1].split('  byPageType:')[0]);
  core.updatePageType(state, 'content', { template: null });
  assert.equal(state.byPageType.content.template, undefined);
});

test('false is preserved in tri-state groupOptions and deleting a value removes it', () => {
  const state = core.load(defaultRaw);
  const entry = entryNamed(state, 'search');
  core.updateEntry(state, entry.id, { layout: { ...entry.layout, groupOptions: { grow: true, shrink: false, order: 0, basis: '50%', align: 'start', justify: 'between' } } });
  const output = core.generate(state);
  assert.equal(core.load(output).entries[entry.id].layout.groupOptions.shrink, false);
  assert.ok(independent(defaultRaw, output).every(path => path.startsWith(`plugins.${entry.id}.layout.groupOptions`)));
});

test('removing layout does not disable plugin and uses real manifest defaults', () => {
  const state = core.load(defaultRaw);
  const entry = entryNamed(state, 'backlinks');
  core.updateEntry(state, entry.id, { layout: null });
  const parsed = core.load(core.generate(state));
  const implicit = entryNamed(parsed, 'backlinks');
  assert.equal(implicit.enabled, true);
  assert.equal(implicit.layout, null);
  assert.equal(core.effectiveLayout(implicit).priority, 30);
  assert.ok(core.slotEntries(parsed, 'right').some(item => item.entry?.id === implicit.id));
});

test('moving to tray disables rather than deleting layout and emits valid YAML', () => {
  const state = core.load(defaultRaw);
  const entry = entryNamed(state, 'table-of-contents');
  const originalLayout = plain(entry.layout);
  core.place(state, entry.id, 'tray');
  assert.equal(entry.enabled, false);
  assert.deepEqual(plain(entry.layout), originalLayout);
  assert.deepEqual(independent(defaultRaw, core.generate(state)), [`plugins.${entry.id}.enabled`]);
});

test('keyboard-style reorder and drag placement share priority logic', () => {
  const state = core.load(defaultRaw);
  const graph = entryNamed(state, 'graph');
  core.place(state, graph.id, 'right', 2);
  assert.deepEqual(plain(core.slotEntries(state, 'right').map(item => item.entry.shortName)), ['table-of-contents', 'backlinks', 'graph']);
  assert.deepEqual(plain(core.slotEntries(state, 'right').map(item => core.effectiveLayout(item.entry).priority)), [10, 20, 30]);
  independent(defaultRaw, core.generate(state));
});

test('group moves preserve grow while inside group and clear groupOptions on exit', () => {
  const state = core.load(defaultRaw);
  const search = entryNamed(state, 'search');
  core.place(state, search.id, 'left', 1, 'toolbar');
  assert.equal(search.layout.groupOptions.grow, true);
  assert.equal(state.groups.toolbar.priority, 30);
  core.place(state, search.id, 'header');
  assert.equal(search.layout.group, undefined);
  assert.equal(search.layout.groupOptions, undefined);
  independent(defaultRaw, core.generate(state));
});

test('disabled renumber uses neighbor midpoint without changing other priorities', () => {
  const state = core.load(defaultRaw);
  state.renumber = false;
  const entry = entryNamed(state, 'breadcrumbs');
  core.place(state, entry.id, 'right', 1);
  assert.equal(entry.layout.priority, 20);
  assert.equal(entryNamed(state, 'graph').layout.priority, 10);
  assert.equal(entryNamed(state, 'backlinks').layout.priority, 50);
});

test('returning edited entry to its original values generates an empty diff', () => {
  const state = core.load(defaultRaw);
  const entry = entryNamed(state, 'graph');
  const layout = plain(entry.layout);
  core.updateEntry(state, entry.id, { layout: { ...layout, position: 'left' } });
  core.updateEntry(state, entry.id, { layout });
  assert.equal(core.generate(state), defaultRaw);
});

test('nested plugin options remain opaque and byte-for-byte unchanged', () => {
  const raw = 'configuration:\n  pageTitle: Test\nplugins:\n  - source: "@quartz-community/graph"\n    options:\n      nested:\n        position: "never edit this"\n        enabled: false\n      text: |\n        # keep <markup> and spacing\n        layout: untouched\n    enabled: true # retain enabled comment\n    layout:\n      position: right\n      priority: 10\n';
  const state = core.load(raw);
  core.updateEntry(state, 0, { enabled: false });
  const output = core.generate(state);
  assert.equal(output, raw.replace('enabled: true # retain enabled comment', 'enabled: false # retain enabled comment'));
  assert.deepEqual(independent(raw, output), ['plugins.0.enabled']);
});

test('missing enabled and root layout are inserted with correct indentation', () => {
  const raw = 'configuration:\n  pageTitle: Test\nplugins:\n  - source: "@quartz-community/graph"\n';
  const state = core.load(raw);
  core.updateEntry(state, 0, { enabled: false, layout: { position: 'left', priority: 12 } });
  core.updatePageType(state, 'content', { positions: { right: [] } });
  const output = core.generate(state);
  const parsed = core.load(output);
  assert.equal(parsed.entries[0].enabled, false);
  assert.equal(parsed.entries[0].layout.position, 'left');
  assert.deepEqual(independent(raw, output).sort(), ['layout', 'plugins.0.enabled', 'plugins.0.layout'].sort());
});

test('invalid positions load visibly unplaced but edits cannot emit invalid layouts', () => {
  const raw = defaultRaw.replace('position: right', 'position: body');
  const state = core.load(raw);
  const entry = entryNamed(state, 'table-of-contents');
  assert.equal(core.slotEntries(state, 'right').some(item => item.entry?.id === entry.id), false);
  assert.throws(() => core.updateEntry(state, entry.id, { layout: { ...entry.layout, position: 'body' } }));
});

test('unsupported or ambiguous YAML fails with actionable errors', () => {
  const cases = [
    defaultRaw.replace('enabled: true', 'enabled: yes'),
    defaultRaw.replace('priority: 30', 'priority: .inf'),
    defaultRaw.replace('group: toolbar', 'group: *toolbar'),
    defaultRaw.replace('group: toolbar', 'group: toolbar\n      group: duplicate'),
    defaultRaw.replace('group: toolbar', '__proto__: malicious'),
    defaultRaw.replace('      position: left', '     position: left'),
    defaultRaw.replace('  - source:', '\t- source:'),
    'configuration:\n  pageTitle: Test\nplugins:\n',
    defaultRaw.replace('plugins:', 'plugins: &shared'),
  ];
  for (const raw of cases) assert.throws(() => core.load(raw));
});

test('input source kind never affects parsed layout', () => {
  const pasted = core.load(defaultRaw, { kind: 'paste' });
  const file = core.load(defaultRaw, { kind: 'file', name: 'quartz.config.yaml' });
  assert.deepEqual(plain(pasted.entries), plain(file.entries));
  assert.equal(core.generate(pasted), core.generate(file));
});

test('group reverse direction and wrap use the actual Quartz string enums', () => {
  const state = core.load(defaultRaw);
  state.groups.toolbar = { ...state.groups.toolbar, direction: 'row-reverse', wrap: 'wrap-reverse' };
  independent(defaultRaw, core.generate(state));
  const parsed = core.load(core.generate(state));
  assert.equal(parsed.groups.toolbar.wrap, 'wrap-reverse');
  state.groups.toolbar.wrap = true;
  assert.throws(() => core.generate(state));
});

test('moving one component with renumber off changes only its layout paths (AC3)', () => {
  const state = core.load(defaultRaw);
  state.renumber = false;
  const entry = entryNamed(state, 'graph');
  core.place(state, entry.id, 'left');
  const paths = independent(defaultRaw, core.generate(state));
  assert.ok(paths.length > 0);
  assert.ok(paths.every(path => path.startsWith(`plugins.${entry.id}.layout.`)));
});

test('pure move shares place for standalone and grouped keyboard ordering', () => {
  const state = core.load(defaultRaw);
  const graph = entryNamed(state, 'graph');
  core.move(state, graph.id, 1);
  assert.deepEqual(plain(core.slotEntries(state, 'right').map(item => item.entry.shortName)), ['table-of-contents', 'graph', 'backlinks']);
  const search = entryNamed(state, 'search');
  core.move(state, search.id, 1);
  const group = core.slotEntries(state, 'left').find(item => item.name === 'toolbar');
  assert.deepEqual(plain(group.members.map(item => item.shortName)), ['darkmode', 'search', 'reader-mode']);
  independent(defaultRaw, core.generate(state));
});

test('edits cannot remove required explicit layout position or priority', () => {
  const state = core.load(defaultRaw);
  const entry = entryNamed(state, 'graph');
  assert.throws(() => core.updateEntry(state, entry.id, { layout: { position: 'right' } }));
  assert.throws(() => core.updateEntry(state, entry.id, { layout: { priority: 10 } }));
});

test('all catalog components have Chinese names and descriptions without changing canonical identifiers', () => {
  assert.equal(core.CATALOG.length, 18);
  for (const component of core.CATALOG) {
    assert.match(component.chineseName, /[\u4e00-\u9fff]/);
    assert.match(component.description, /[\u4e00-\u9fff]/);
    assert.match(component.source, /^@quartz-community\//);
    assert.equal(typeof component.displayName, 'string');
  }
  const website = core.CATALOG.find(component => component.source.endsWith('/page-title'));
  const article = core.CATALOG.find(component => component.source.endsWith('/article-title'));
  assert.equal(website.chineseName, '网站标题');
  assert.equal(website.displayName, 'Page Title');
  assert.equal(article.chineseName, '文章标题');
  assert.match(website.description, /不是当前文章标题/);
  assert.equal(core.generate(core.load(defaultRaw)), defaultRaw);
});

function translationCore() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ui = html.match(/<script id="quartz-editor-ui">([\s\S]*?)<\/script>/)[1];
  const context = vm.createContext({ QuartzEditor: core });
  const prefix = ui.slice(0, ui.indexOf('  document.addEventListener("pointerdown"'));
  vm.runInContext(`${prefix}\ncore = QuartzEditor; globalThis.translations = { COPY, ENGLISH_DESCRIPTIONS, errorText, translate, setLanguage(value) { state.ui.locale = value; } };\n})();`, context);
  return { html, translations: context.translations };
}

test('every embedded UI key and component explanation has Chinese and English coverage', () => {
  const { translations } = translationCore();
  for (const [key, pair] of Object.entries(translations.COPY)) {
    assert.equal(pair.length, 2, key);
    assert.ok(pair.every(value => typeof value === 'string' && value.length > 0), key);
    const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(placeholders(pair[0]), placeholders(pair[1]), key);
  }
  for (const component of core.CATALOG) {
    const shortName = component.source.split('/').pop();
    assert.ok(translations.ENGLISH_DESCRIPTIONS[shortName], shortName);
    assert.doesNotMatch(translations.ENGLISH_DESCRIPTIONS[shortName], /[\u4e00-\u9fff]/);
  }
});

test('all parser validation templates translate into English and retain source line metadata', () => {
  const { html, translations } = translationCore();
  translations.setLanguage('en');
  const coreSource = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
  const templates = [...coreSource.matchAll(/fail\(("[^"]*"|`[^`]*`)/g)].map(match => match[1].slice(1, -1));
  assert.ok(templates.length > 60);
  for (const template of templates) {
    const reason = template.replace(/\$\{[^}]+\}/g, 'test-field');
    const output = translations.errorText({ reason, line: 2 });
    assert.match(output, /^Line 3:/);
    assert.doesNotMatch(output, /[\u4e00-\u9fff]/, reason);
  }
  let error;
  try { core.load(defaultRaw.replace('enabled: true', 'enabled: yes')); } catch (failure) { error = failure; }
  assert.equal(typeof error.line, 'number');
  assert.equal(error.reason, 'enabled 必须是 true 或 false');
  assert.match(translations.errorText(error), /^Line \d+: enabled must be true or false$/);
  translations.setLanguage('zh-CN');
  assert.match(translations.errorText(error), /^第 \d+ 行：enabled 必须是 true 或 false$/);
});

test('draft resolver applies display rules at the Quartz 800/1200 breakpoints without changing YAML', () => {
  const state = core.load(defaultRaw);
  const before = core.generate(state);
  const spacer = entryNamed(state, 'spacer');
  const toc = entryNamed(state, 'table-of-contents');
  const ids = model => Object.values(model.slots).flatMap(items => items.flatMap(item => item.kind === 'entry' ? [item.entry.id] : item.members.map(entry => entry.id)));
  assert.equal(core.resolveDraftLayout(state, { width: 800 }).viewport, 'mobile');
  assert.equal(core.resolveDraftLayout(state, { width: 801 }).viewport, 'tablet');
  assert.equal(core.resolveDraftLayout(state, { width: 1200 }).viewport, 'desktop');
  assert.ok(ids(core.resolveDraftLayout(state, { width: 390 })).includes(spacer.id));
  assert.ok(!ids(core.resolveDraftLayout(state, { width: 1440 })).includes(spacer.id));
  assert.ok(!ids(core.resolveDraftLayout(state, { width: 1000 })).includes(toc.id));
  assert.ok(ids(core.resolveDraftLayout(state, { width: 1440 })).includes(toc.id));
  assert.equal(core.generate(state), before);
});

test('draft exclusions happen before grouping and hidden members do not change effective group priority', () => {
  const state = core.load(defaultRaw);
  delete state.groups.toolbar.priority;
  const search = entryNamed(state, 'search');
  search.layout.display = 'mobile-only';
  let model = core.resolveDraftLayout(state, { width: 1440 });
  let group = model.slots.left.find(item => item.kind === 'group');
  assert.equal(group.priority, 20);
  assert.ok(!group.members.some(entry => entry.id === search.id));
  state.byPageType.content = { exclude: ['search'], positions: { right: [] } };
  model = core.resolveDraftLayout(state, { width: 1440 });
  group = model.slots.left.find(item => item.kind === 'group');
  assert.equal(group.priority, 30);
  assert.equal(model.slots.right.length, 0);
  assert.ok(model.hidden.some(item => item.id === search.id && item.reason === 'excluded'));
});

test('draft templates correspond to actual frame source, including all five absent minimal slots', () => {
  const state = core.load(defaultRaw);
  state.byPageType.content = { template: 'minimal' };
  let model = core.resolveDraftLayout(state);
  assert.deepEqual(plain(model.frameSlots), ['footer']);
  for (const position of ['header', 'left', 'beforeBody', 'afterBody', 'right']) assert.equal(model.slots[position].length, 0);
  state.byPageType.content.template = 'full-width';
  model = core.resolveDraftLayout(state);
  assert.deepEqual(plain(model.frameSlots), ['header', 'beforeBody', 'afterBody', 'footer']);
  assert.equal(model.slots.left.length, 0);
  assert.equal(model.slots.right.length, 0);
  state.byPageType.content.template = 'custom-frame';
  model = core.resolveDraftLayout(state);
  assert.equal(model.template, 'default');
  assert.equal(model.unsupportedTemplate, true);
});

test('draft built-in conditions and unknown custom predicates use explicit sample context', () => {
  const state = core.load(defaultRaw);
  const breadcrumb = entryNamed(state, 'breadcrumbs');
  assert.ok(core.resolveDraftLayout(state, { isIndex: true }).hidden.some(item => item.id === breadcrumb.id && item.reason === 'condition'));
  const graph = entryNamed(state, 'graph');
  for (const [condition, key] of [['has-tags', 'hasTags'], ['has-backlinks', 'hasBacklinks'], ['has-toc', 'hasToc']]) {
    graph.layout.condition = condition;
    assert.ok(core.resolveDraftLayout(state, { [key]: false }).hidden.some(item => item.id === graph.id && item.reason === 'condition'));
    assert.ok(!core.resolveDraftLayout(state, { [key]: true }).hidden.some(item => item.id === graph.id));
  }
  graph.layout.condition = '<custom>';
  assert.deepEqual(plain(core.resolveDraftLayout(state).unknownConditions), ['<custom>']);
});
