import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadCore, plain, root } from './load-core.mjs';

const core = loadCore();
const defaultRaw = readFileSync(new URL('../fixtures/default-config.yaml', import.meta.url), 'utf8');
const localPath = new URL('../fixtures/local/real-config.yaml', import.meta.url);
const entryNamed = (state, name) => state.entries.find(entry => entry.shortName === name);
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
