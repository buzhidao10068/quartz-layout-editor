# Execution

## Top/bottom floating bar (2026-10-23)

1. Replace right-side rail CSS with a horizontal bottom bar and responsive wrapped rows, plus bilingual keyboard-accessible edge toggle.
2. Guard and validate stored edge preference, preserve focus/drafts/page scroll, and derive overlay bounds from the current bar geometry.
3. Extend offline regressions to both edges, both views and five viewports; verify preference reload, blocked storage, context memory and unchanged YAML.

## Overlay correction (2026-10-23)

1. Follow latest user direction: replace desktop grid column and narrow-screen grid row with a fixed panel above the unchanged canvas; keep it clear of the persistent dock.
2. Remove opening scroll alignment and closing anchor compensation while preserving body sizing, scroll containment, context memory and draft retention.
3. Replace non-overlap-with-canvas assertions with before/after canvas geometry and page-scroll stability across five viewport sizes in both views. Close overlays before testing covered underlying controls; retain actual pointer/keyboard checks.

## Panel scrolling follow-up (2026-10-23)

1. Snapshot active body scroll using its rendered context key; restore separate session offsets after sizing, and clear safely when loading another source.
2. Contain panel overscroll and route heading/body wheel to the body while retaining Ctrl+wheel, canvas and drag behavior.
3. Calculate usable body height from translated heading and dock measurements; reveal only offscreen panels and retain a visible canvas anchor on close.
4. Extend offline browser checks for all five panels, scroll boundaries, switch/reopen memory, context changes, page stability and source reset. Preserve non-overlay workspace geometry and unchanged YAML.

## Original execution

1. Fix center-column header/footer mapping and minimal five-slot warning.
2. Add pure draft resolution for page overrides, frames, display, conditions and group ordering.
3. Add bilingual edit/effect view switch, viewport/context controls, representative component widgets and slot mapping legend.
4. Add core/model and browser/geometry regressions; run full offline bilingual checks.
5. Record source evidence, preview scope/limitations and validation. No site operations or publishing.

## Layout ergonomics follow-up (2026-10-23)

1. Keep the edit/effect switch available while scrolling, with a compact floating control and a visible return to the selected view.
2. Scroll continuously near viewport edges during internal component drags; stop on drop, cancellation, window exit and loss of focus.
3. Collapse the component tray, selected-component settings (including Stacked Pages), group containers and page overrides independently. Preserve disclosure state and field drafts across renders and locale switches.
4. Move the project link to the top toolbar as an accessible inline GitHub icon; retain offline behavior.
5. Add offline browser regression coverage for floating controls, disclosures, drag scrolling and cleanup, keyboard access, mobile widths and unchanged YAML.

These changes extend the existing in-progress editor/preview task. No release, commit, push or deployment is part of this follow-up.

## Wheel and preview feedback follow-up (2026-10-23)

1. Add pointer-based grip dragging so wheel input remains available while holding a component; preserve native drag fallback and shared drop/edge-scroll/cleanup logic.
2. Expand the effect canvas to workspace width, use legible system fonts and high-contrast scale-compensated region outlines including the article body. Keep original geometry and optional 1:1 viewing.
3. Connect tags/backlinks/TOC sample flags to representative widget content, retain explicit layout-condition resolution, and explain when disabled/hidden widgets cannot appear. Do not enable plugins or edit YAML implicitly.
4. Test real mouse-held wheel scrolling and drop, region bounds/contrast and all three sample controls with and without explicit layout conditions; run offline regression.
# Footer button and disclosure follow-up (2026-10-23)

1. Reproduced preview rail panels stretching to the selected properties panel's height (1192px vs 237/484px body). Align grid children to start so closed details occupy only their summary and open panels hug their own contents.
2. Verified `docs/plugins/Footer.md` in the read-only Quartz checkout and current v5 documentation: links are a label-to-URL mapping.
3. Add special footer child cards and bilingual property CRUD/reorder; preview labels use actual configuration, never navigation. Footer controls placement/enabled/visibility for all its children.
4. Parse only the narrow footer links span; unsupported syntax remains read-only. Validate edited names and protocols, preserve opaque sibling options, and compose insertions with enabled/layout patches.
5. Add core independent-YAML and offline browser regression coverage. No commit, push, release or deployment.

## Persistent workspace tools follow-up (2026-10-23)

User review correction: hide all five panel nodes by default and after closing; remove the retained legacy rails from layout. Replace fixed/sheet positioning with a real workspace column (desktop sticky) or row above the board (narrow/short, non-sticky). Remove preview spanning under the column; always reveal component/group action destinations. Adapt browser flows to explicitly open their panels and assert zero default/closed visible panels, one active panel and nonintersecting canvas/panel rectangles at all five viewport sizes in both modes.

1. Combined both view controls and five bilingual panel shortcuts in a reserved right-edge dock, switching to a bottom dock on narrow/short screens.
2. Reuse existing panel DOM with a single pinned drawer, independent body scrolling, explicit close, native summary dismissal and Escape focus restoration. Preserve input drafts, panel scrolling, locale and view state; navigation reveals the appropriate destination.
3. Measure dock height after render/resize so translated wrapped mobile labels cannot overlap the pinned panel. Reserve drawer space on desktop and support tray wheel/edge scrolling during grip dragging.
4. Passed all 48 core tests and the complete offline browser suite, including five screen sizes, both views, top/bottom accessibility, unchanged YAML, native disclosures, keyboard dismissal, draft retention, tray drag cancellation and no requests/iframes/errors. Reviewed desktop/mobile screenshots. No publication or site changes.

## Native-only multi-instance follow-up (2026-10-23)

1. Verify native Footer constructor/options/DOM and runtime per-entry instantiation; no local/custom plugin implementation.
2. Append native Footer instances with independent placement and existing links editing; support removing newly added instances while preserving imported source spans.
3. Add bilingual native/text/outline/filled/pill choices, safe offline preview and separate manual custom.scss output/copy guidance. Preserve credit and disclose URL sharing/session scope.
4. Verify core append/remove/reimport/escaping and full offline browser keyboard, multilingual, mobile and output behavior. No site writes/builds or publication.
