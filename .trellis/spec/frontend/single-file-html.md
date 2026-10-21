# Single-File HTML Conventions

This project ships one artifact: `index.html`. No build step, no package manager, no runtime dependencies. These conventions exist because that constraint changes what "good code" means here.

---

## Hard constraints

- **Zero external requests.** No CDN scripts, no Google Fonts, no remote images. The tool must work offline from `file://`. A single `<link>` to a CDN breaks the primary use case.
- **No build tooling.** Author `index.html` directly. Do not introduce bundlers, transpilers, or `node_modules`. If a feature seems to require them, reconsider the feature.
- **No framework.** Vanilla DOM APIs only. The generic `hook-guidelines.md` and `state-management.md` in this directory describe React-shaped projects and do not apply.

---

## Structure

Inline sections in `index.html`, in this order:

1. `<style>` — design tokens on `:root`, then layout, then components
2. `<body>` markup — static skeleton; dynamic content gets rendered into known container IDs
3. `<script type="text/plain" id="default-config">` — the bundled default config as raw text
4. `<script id="core">` — pure logic: catalog data, normalize, parse, emit, diff, slot ordering
5. `<script>` — UI: state object, render functions, event handlers, init

Both script blocks are plain scripts, not modules (`file://` blocks ES module imports under CORS).

### The core / UI boundary

`core` must not reference `document`, `window`, `localStorage`, or any other browser global. Tests load the `core` block's source into a Node `vm` context and call its functions directly, so a single DOM reference in `core` breaks every test.

If a function needs both parsing and DOM access, split it: the pure half goes in `core`, the DOM half in the UI script.

Within each block, order code so a reader can follow data flow top to bottom:

```
core:  catalog data → normalize → parse → emit → diff → slot ordering
UI:    state object → render functions → event handlers → init
```

---

## State

A single plain `state` object. Mutate it directly, then call `render()`. No reactive layer, no proxies, no observers.

Rationale: the app is small and every interaction already redraws a panel. An observer layer would add indirection without removing any code.

Rendering must be a pure function of `state`. Never read UI values back out of the DOM to make decisions — if a value matters, it lives in `state`.

---

## Browser storage

`localStorage` is per-origin and per-browser. Each `file://` page and each published artifact has its own origin, so stored values never travel with the file.

- Wrap every read and write in `try/catch`. Private windows, blocked site data, and some `file://` configurations throw on access.
- The page must render correctly when storage comes back empty.
- Use it only for per-viewer conveniences (theme choice, a collapsed panel). Never for data the user would lose work by losing.

---

## Accessibility

Not optional, and not satisfied by drag-and-drop alone.

- Every drag interaction needs a keyboard equivalent that calls the **same underlying function**. Do not implement a mouse path and a separate, weaker keyboard path.
- Interactive elements get `tabindex="0"` and respond to Enter/Space.
- Use `:focus-visible` for focus rings.
- State must never be conveyed by color alone — pair it with a border style, an icon, or a text label.
- Announce the result of an action through an `aria-live="polite"` region.

---

## Theming

Define colors as custom properties on `:root`. Redefine for dark mode twice:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* ... */ }
}
:root[data-theme="dark"] { /* ... */ }
```

The `:not([data-theme="light"])` guard lets a manual light-mode choice win over the system preference. Give `body` an explicit background — never rely on the browser default.

---

## Text handling

Any string that reaches the DOM must be escaped. Build an `esc()` helper and use it in every template literal that interpolates parsed data. Config files can contain `<`, `&`, and quotes; parsed YAML is untrusted input.

Prefer `textContent` over `innerHTML` for single values.

---

## Forbidden patterns

| Pattern | Why |
|---|---|
| `innerHTML` with uninterpolated-but-unescaped data | XSS via config file contents |
| Reading state from DOM attributes | Breaks the pure-render invariant |
| `alert()` / `confirm()` for normal flow | Blocks the page; use inline status text |
| Mouse-only interactions | Fails the accessibility requirement |
| External resource references | Breaks offline use |
| ES module `import` | Blocked by CORS on `file://` |

---

## Verification

There is no lint or typecheck step. Before claiming a change works:

1. `node --test tests/core.test.mjs` — required for any change to the `core` block. The AC10 tests inside it call `tests/yaml_paths_diff.py` (Python + PyYAML). Use an explicit file path: this Windows Node 24 installation does not discover tests from a `tests/` directory argument.
2. For UI changes: open the file from `file://` with the network disconnected, walk the primary flow using only the keyboard, check light and dark mode, and narrow to phone width to confirm there is no horizontal scroll.

A skipped test is not a passed test. Tests that depend on `fixtures/local/` skip when it is absent; report them as skipped.

### Round-trip and type safeguards

- Keep source spans immutable and apply patches from the end toward the beginning. When multiple insertions share the same line, apply them in reverse creation order so their final order stays correct. Test simultaneous insertion of `enabled`, plugin `layout`, and a root `layout` section.
- Patch root `groups` and `byPageType` independently. Do not regenerate the untouched sibling section merely because one subsection changed.
- Read actual Quartz runtime types rather than inferring from field names. Group `wrap` is `nowrap | wrap | wrap-reverse`, not a boolean. Explicit edited plugin layouts require both `position` and `priority`.
- Automatic priority renumbering intentionally changes affected neighbors and group priorities. Test single-plugin-only semantic diffs with renumbering disabled, and explain the distinction in the UI documentation.
- The browser check uses `PLAYWRIGHT_MODULE` and optionally `BROWSER_EXECUTABLE`; never introduce a runtime dependency or a personal absolute path into the shipped HTML. Keyboard and grip-based drag tests must call the same pure core movement functions.

---

## Off-limits

The user's Quartz site lives at `H:\learn\github\buzhidao10068\Quartz`. Reading and copying files from it is allowed. Never modify or delete anything there, and never run `git`, `npm`, `npx`, or a Quartz build inside it — builds write to `public/`, `.quartz/`, and `node_modules/`. Stage 0 of the task copies its real config to `fixtures/local/real-config.yaml` once; after that, use the copy.
