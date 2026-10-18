# Single-File HTML Conventions

This project ships one artifact: `index.html`. No build step, no package manager, no runtime dependencies. These conventions exist because that constraint changes what "good code" means here.

---

## Hard constraints

- **Zero external requests.** No CDN scripts, no Google Fonts, no remote images. The tool must work offline from `file://`. A single `<link>` to a CDN breaks the primary use case.
- **No build tooling.** Author `index.html` directly. Do not introduce bundlers, transpilers, or `node_modules`. If a feature seems to require them, reconsider the feature.
- **No framework.** Vanilla DOM APIs only. The generic `hook-guidelines.md` and `state-management.md` in this directory describe React-shaped projects and do not apply.

---

## Structure

Three inline sections in `index.html`, in this order:

1. `<style>` — design tokens on `:root`, then layout, then components
2. `<body>` markup — static skeleton; dynamic content gets rendered into known container IDs
3. `<script>` — plain script, no modules (`file://` blocks ES module imports under CORS)

Keep the script organized in this order so a reader can follow data flow top to bottom:

```
constants / catalog data
  → parse functions
  → emit functions
  → state object
  → render functions
  → event handlers
  → init
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

There is no lint or typecheck step. Verification is manual and must actually be performed, not assumed:

1. Open the file from `file://` with the network disconnected.
2. Walk the primary flow with the keyboard only.
3. Check both light and dark mode.
4. Narrow the window to phone width and confirm no horizontal scroll.

When a change touches parsing or output, run the fixture assertions described in the task's `implement.md` before claiming the change works.
