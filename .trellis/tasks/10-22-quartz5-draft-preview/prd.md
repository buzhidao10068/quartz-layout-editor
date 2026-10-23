# Quartz 5 frame mapping and offline draft preview

## Goal

Fix the editor's geometric mismatch with actual Quartz 5 and show how the current unsaved layout will look. Keep the existing bilingual editor and offline static deployment. No running-site iframe or local-service connection.

## Acceptance

- Default editor frame: left sidebar, center column containing header then beforeBody then pageBody then afterBody, right sidebar; footer below the center column, not spanning the page. Mobile order is left, center, right, footer.
- A draft effect view updates from current state without generating/applying YAML. Every rendered component identifies the exact plugin short name and source slot; returning to edit preserves all changes.
- Shared pure resolution reproduces runtime exclusions before grouping, explicit/implicit priority order, page slot clearing, three templates, display wrappers at 800px and four built-in conditions with explicit sample context controls.
- Desktop/tablet/mobile frames follow the inspected 1200/800px Quartz breakpoints. Full-width omits sidebars; minimal renders only body and footer (five slots omitted).
- Group priority, direction, wrap, gap and member grow/shrink/basis/order/align/justify are reflected without injecting unsafe CSS. Unknown custom conditions/templates are explicitly flagged; custom plugin execution, themes, options, content and live services are not claimed to be reproduced.
- All 18 known components have representative visual samples. Preview clearly distinguishes layout correspondence from exact theme/content rendering. No external resource requests, iframe, site operations or writes.
- All controls, explanatory text, samples and mapping legend are bilingual and keyboard accessible. Existing locale/state persistence, output, drag and keyboard behavior remain tested.
- Regression tests verify model rules plus DOM/geometry correspondence, instant draft changes, source mapping, page templates, viewport/conditions, locale and offline use.

## Follow-up acceptance (2026-10-23)

- Edit/effect controls remain reachable throughout long-page scrolling on desktop and mobile, and choosing a view makes its content visible.
- Internal component drags can reach targets outside the initial viewport through continuous top/bottom edge scrolling. Scrolling stops on completion/cancellation or when leaving the page.
- The tray, selected component settings (including Stacked Pages), group settings, page overrides and canvas group contents can collapse independently without changing YAML or discarding input drafts. Keyboard toggles, locale/view preservation and intentional navigation to hidden destinations remain usable.
- The repository link appears as an accessible GitHub icon in the top toolbar, without loading any external asset.
- Holding a component grip supports actual mouse-wheel scrolling in both directions without losing the drag. Existing edge scroll and keyboard movement remain usable; Escape cancels cleanly.
- Effect-region annotations clearly outline all slots and the sample article. Preview text remains legible on a wide canvas, with original-size viewing retained and no layout-label overflow.
- Tags/backlinks/TOC sample controls visibly update corresponding data or explain missing widgets. They also retain explicit condition behavior and never silently enable plugins or modify YAML.

## Boundary

Only editor index.html, existing tests and docs/spec/task artifacts. The user's Quartz site is read-only source reference; never build/start/write/delete or execute git/npm/npx there. No branch, commit, push or deployment is authorized.
# Footer button and disclosure follow-up (2026-10-23)

- Effect-mode property edits must not stretch collapsed or shorter group/page panels into blank selected-looking containers; content and open state remain accessible.
- Add bilingual, specially marked Footer child button components using the real `options.links` mapping. Support label/target editing, add/remove/reorder, safe offline preview and targeted YAML output; no invented plugin or independent button layout.
- Unsupported footer links stay read-only and unchanged. Other options remain opaque. Verify independent semantic diffs, URL safety, escaping, mobile, keyboard and locale behavior. No publication is authorized by this follow-up.

## Persistent controls follow-up (2026-10-23)

- Latest bar request: combine the seven persistent view/panel entries in a bottom floating bar, with a top/bottom position toggle. Support both edges on desktop/mobile and both views, retain drafts, remember only the position preference safely, and keep panel overlays clear of the bar. Remove the desktop right rail.

- Latest user correction supersedes the following non-overlay requirement: the page layout stays underneath and the panel floats above, taking no layout space. Opening/switching/closing must not shrink, push down or scroll the canvas. Preserve all five shortcuts, independent scrolling, context memory and draft retention; keep the dock reachable at every screen size.

- User review correction: no legacy panels or summaries before opening or after closing. The active panel must occupy an actual layout column/row, never cover the canvas on any screen size, including effect preview. Selection actions may reveal their relevant panel.

- All five panel shortcuts and both view buttons stay visible while scrolling in edit and effect views. Reserve edge/bottom space to avoid covering the canvas.
- Open the existing panel as a single dismissible, independently scrollable pinned panel. Preserve drafts and YAML when switching, closing, changing locale or changing view. Support keyboard dismissal and narrow/short viewports, without external dependencies.

## Panel scrolling follow-up (2026-10-23)

- Independently remember panel scroll positions for the current session, including selected component/group/page contexts. Preserve them across switching, dismissal and locale/view rerenders; reset on source load.
- Route panel/heading wheel to the body without scrolling the page at boundaries. Retain normal canvas scrolling, Ctrl+wheel and grip-drag scrolling; contain touch overscroll.
- Fit bodies below their measured headings and above the dock. Avoid unnecessary desktop page jumps and preserve the visible canvas anchor when dismissing a narrow-screen row. Retain hidden defaults and non-overlay layout.

## Native-only clarification (2026-10-23)

- No external/custom button plugin, new dependency or unsupported YAML option. Multiple native Footer instances permit independent placements in the six slots; each instance owns its links and retains native credits.
- Selectable bilingual button styles preview offline and export separately through Quartz's native `quartz/styles/custom.scss`. Explain manual application, shared styles for identical URLs, session-only choices and exclusions applying to all Footer instances.
- Add/remove new instances, preserve imported entries/source bytes, validate independent placements and no-op reimport. Do not publish or modify the user's Quartz site.
