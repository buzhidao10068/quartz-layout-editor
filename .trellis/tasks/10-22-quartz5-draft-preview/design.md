# Design and source evidence

## Inspected Quartz 5 source (read-only)

- components/frames/DefaultFrame.tsx: left sidebar; center page-header(header, beforeBody), Content, divider, page-footer(afterBody); right sidebar; footer as grid sibling.
- components/frames/FullWidthFrame.tsx: only center(header, beforeBody, body, afterBody) and footer.
- components/frames/MinimalFrame.tsx: only body and footer. Five slots, including beforeBody, are absent.
- styles/variables.scss: 800px mobile, 1200px desktop; sidebar 320px, maximum page width 1500px. Mobile left sidebar becomes a row; tablet right sidebar follows content above footer. Footer occupies center column on desktop.
- styles/base.scss: desktop-only hidden <=800px, mobile-only visible <=800px. Right sidebar is a row below 1200px; unwrapped direct .toc is hidden there. Header and sidebars have 6rem top spacing outside mobile.
- plugins/loader/config-loader.ts: exclude before build/group resolution, then clear positions and apply template. Explicit pass before implicit fallback; group priority resolves before display/condition wrappers render.
- components/Flex.tsx: direction/wrap/gap defaults row/nowrap/1rem; per-member defaults grow0/shrink1/basis auto/order0/align center/justify center.
- plugins/loader/conditions.ts: not-index and has-tags/backlinks/toc read content context; unknown predicates warn and act unconditional unless separately registered.

## Implementation

Add pure resolveDraftLayout(state, context) using the existing slotEntries algorithm on a filtered non-mutating state view. Preserve group priority before removing condition/display-hidden members; track omissions and unsupported assumptions. Frames expose visible slots and resolved items from one model.

Correct edit geometry independently from preview: all editable slots remain reachable, even when a page override would hide them. A separate draft visual surface has fixed simulated desktop/tablet/mobile widths with contained scrolling and uses the same source slot IDs and entry IDs as the model. Groups use validated CSS values via style properties, not raw HTML CSS interpolation.

All components render safe built-in sample markup, not executable Quartz components or user HTML. Sample content flags explain conditions. Use a mapping legend and data attributes for tests and user comparison. Preserve locale, selection and output; opening preview only changes UI view, never config. Add no requests, build step or runtime dependency.

## Persistent workspace tools (2026-10-23)

Latest bar refinement: replace the seven-entry right rail with a single bottom floating bar at every viewport, switchable to a top bar. Wide screens show a horizontal row; narrow/short screens use two rows. Add one bilingual position-toggle control, store only the validated edge preference with guarded localStorage, and keep session drafts and selection intact. Keep symmetric vertical breathing space to avoid page/canvas displacement when changing edges; no obsolete right padding. Measure actual bar bounds to offset top-edge panels beneath it and cap bottom-edge panels above it. Existing fixed overlays and independent scroll memory remain unchanged.

Latest user correction: panels must float above the underlying page without occupying layout space. This supersedes the non-overlay column/row decisions below. Use one fixed existing panel with z-index above the canvas, beside the desktop dock or clear of the bottom dock on narrow/short screens. Remove active-panel grid columns/rows, opening scroll alignment and closing anchor compensation; focus with preventScroll. Keep independent body scrolling, per-context memory, hidden defaults and draft preservation. Test canvas geometry and page scroll before/after opening and closing rather than forbidding canvas overlap. Covered content is accessed after dismissal; do not duplicate controls or make the overlay modal.

Scroll refinement: retain scroll offsets per panel/context (selected component, group or page type), including close/reopen and locale/view rerenders. Reset only when loading another source. Reveal a panel only when outside the usable viewport; do not realign an already visible desktop column. Preserve a visible board anchor when closing a narrow-screen row. Contain wheel/touch overscroll in panels, route heading wheel to their body, and size the body using the actual translated heading and dock heights. Preserve native non-panel scrolling, Ctrl+wheel zoom and existing drag scrolling. Keep the non-overlay grid layout unchanged.

Correction after user review: the earlier retained in-document panels and narrow-screen overlay are rejected. All five panels now start hidden and remain absent after closing. The active existing node participates in workspace grid flow: a sticky desktop column, or an ordinary row above the board on narrow/short screens. Canvas and preview never extend beneath it. Opening scrolls the panel into sight; component/group actions explicitly reveal their destination. This supersedes the retained-panel and sheet choices below.

Keep edit/preview switching and all five panel shortcuts in one compact edge dock, in both views and at either end of the document. Reserve its space instead of floating over the canvas. Shortcuts reveal one existing panel as a viewport-pinned, independently scrollable drawer; never duplicate inputs or IDs. Desktop reserves additional drawer space; small screens use a bottom dock and a dismissible sheet above it. Closing or Escape restores shortcut focus, and switching panels preserves input drafts, disclosure state and YAML. Existing in-document panels and keyboard/drag interactions remain available when no drawer is pinned. Use paired offline translations and native DOM/CSS only. Validate geometry, navigation, draft retention, mobile overflow and unchanged output.

## Native-only buttons (2026-10-23)

Read-only runtime evidence: `buildLayoutForEntries` iterates configured entries and instantiates each constructor using that entry's options, permitting repeated native Footer entries with independent layouts. Verified upstream `quartz-community/footer/main/src/components/Footer.tsx` renders a credit paragraph and `footer > ul > li > a` links; its only option is `links`. Its stylesheet uses Quartz theme variables. The site's existing `quartz/styles/custom.scss` is the native customization hook.

Append newly created native Footer entries before the next top-level YAML section. Keep original spans immutable and original entries untouched; remove only in-memory added entries. Existing movement, visibility, priority and links validation are reused. Selectable fixed styles live in UI state keyed by target URL, apply through safe DOM CSS properties in the sample, and export separately using escaped CSS attribute selectors. Never insert styles into YAML. Disclose repeated credits, URL sharing, session-only style choices and short-name exclusion scope. No plugin artifacts, installation, site writes or build are required here.
