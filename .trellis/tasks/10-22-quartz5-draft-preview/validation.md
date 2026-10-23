# Validation — October 22, 2026

## Release 0.3 preparation — October 23, 2026

- User requested GitHub push, a version increment and updated Releases. Selected 0.3 after confirming 0.2 is the latest published tag and local main matches origin/main.
- Updated the static title, both translated titles/version badges, README and browser version assertion; added bilingual release notes covering all accumulated changes since 0.2.
- Final versioned verification passed: 48 core tests, 0 failures/skips, complete offline Edge/Playwright suite and `git diff --check` (checkout line-ending notices only).
- Confirmed local site configuration and generated screenshots remain ignored. Publication scope is main, annotated tag 0.3, release notes and the offline `index.html` asset. No Quartz site operations or direct Cloudflare deployment.

## Top/bottom floating bar — October 23, 2026

- Final rerun: 48 core tests passed, 0 failed or skipped; complete offline Edge/Playwright suite passed. This replaces the historical right-edge dock described below; floating overlay panels remain above the canvas.
- Verified the default bottom bar and optional top bar in both views at 1440×1000, 1024×768, 390×844, 320×568 and 844×390. All seven entries and the position toggle stay reachable at either document end; panels remain inside the viewport and clear of the bar.
- Switching position preserves page scroll, canvas geometry, keyboard focus, input drafts, panel scroll context and generated YAML. Validated stored preference across reload and working fallback when storage is blocked, plus bilingual labels and responsive wrapping.
- Existing panel wheel containment, heading routing, independent scroll memory, real held-pointer drag/wheel, edge scrolling, Footer CRUD/styles and preview conditions remain green. Zero HTTP requests, iframes or browser errors.
- Reviewed regenerated top/bottom desktop and mobile screenshots. `git diff --check` passes with checkout line-ending notices only. No dependencies, site writes/builds, commit, push, release or deployment.

## Persistent workspace tools — October 23, 2026

### User-review correction: hidden defaults and no overlays

Final rerun passed: 48 core tests (0 failed/skipped), complete offline Edge browser suite and `git diff --check` (only LF/CRLF notices). The earlier sheet/retained-panel implementation described below is superseded. Tests explicitly open panels as users now must, check zero visible panels initially and after closing, one active panel only, and nonintersecting panel/canvas/dock rectangles in edit and effect modes at 1440×1000, 1024×768, 390×844, 320×568 and 844×390. Desktop uses an actual grid column; narrow/short screens use a row above the board, not an overlay. Reviewed regenerated desktop/mobile screenshots. Component/group navigation, keyboard dismissal, draft/scroll retention, drag wheel/edge/cancel behavior, Footer controls and unchanged YAML all pass. No publication or site writes.

- `node --test tests/core.test.mjs`: 48 passed, 0 failed, 0 skipped.
- Complete offline Edge/Playwright suite passed after final UI changes. Five panel entries and both view controls remain in bounds at page top/bottom in edit/effect at 1440×1000, 1024×768, 390×844, 320×568 and 844×390.
- Verified one pinned panel, no desktop canvas overlap or dock overlap, independent panel scrolling, draft and scroll retention, keyboard/summary/button dismissal with focus return, language/view switching and unchanged YAML.
- Real held-pointer wheel scrolling inside the mobile tray scrolls the tray, not the page; Escape cancels drag before dismissing its panel. Existing native fallback, wheel/edge drag, Footer CRUD/styles and preview tests still pass.
- Zero horizontal overflow, requests, iframes or browser errors. Visually reviewed `persistent-tools-desktop.png` and `persistent-tools-mobile.png` in ignored screenshot output. `git diff --check` passed (only checkout LF/CRLF notices). No commit/push/deploy or Quartz site writes.

## Floating overlay correction — October 23, 2026

- Panel-heading/default-link refinement: removed native disclosure triangles only from the five active tool panel headings, retaining keyboard/title dismissal and all other disclosures. Bundled Footer defaults and fixture now contain only GitHub pointing to the project repository, with Discord removed; imported user links remain untouched. Core 48/48 and full offline browser suite passed, including marker-free heading styles across both views/all five viewports, single default GitHub row, and explicit additional links for CRUD/reorder coverage. `git diff --check` passed with checkout line-ending notices only. No publication.

- Latest user request supersedes previous non-overlay geometry: panels now float above the canvas without occupying a column or row. Historical checks below describe the prior implementation.
- Full offline Edge/Playwright suite passed. All five panels in edit/effect at 1440×1000, 1024×768, 390×844, 320×568 and 844×390 remain inside the viewport and clear of the dock. Opening and closing preserve canvas rectangles and page scroll within 2px browser rounding tolerance; panels use fixed positioning above the canvas.
- Panel boundaries, heading wheel routing, switch/reopen/context scroll memory, draft/locale retention, Escape/focus return, real held-pointer drag/wheel and edge scrolling remain green. Covered underlying controls are accessed after dismissing the overlay. Generated YAML is unchanged by viewing.
- Core regression: 48 passed, 0 failed, 0 skipped. Zero HTTP requests, iframes or browser errors. Desktop and mobile overlay screenshots visually inspected.
- No dependencies, Quartz-site writes/builds, commit, push, release or deployment.

## Panel scrolling follow-up — October 23, 2026

- Core regression: 48 passed, 0 failed, 0 skipped. Full offline Edge/Playwright suite passed after additional scroll assertions.
- At 844×390, verified all five overflowing panel bodies: wheel scroll stays inside the panel, top/bottom edges do not move the page, heading wheel scrolls the body, and switch/close/reopen/native-heading dismissal retain each offset.
- Verified separate property offsets when selecting Page Title, then Graph, then Page Title again; loading another configuration resets history. Viewing and scrolling leave generated YAML unchanged.
- Verified already-visible desktop panel switching does not realign the page, and closing a narrow-screen panel via its persistent shortcut preserves the visible canvas anchor. Existing desktop/tablet/mobile/short-screen non-overlay geometry, drafts, locale/view switching, real held-pointer drag/wheel and edge scrolling remain green.
- Zero HTTP requests, iframes or browser errors. No dependencies, Quartz-site writes/builds, commit, push, release or deployment.

## Source correspondence

The user's installed Quartz 5 frame TSX, styles/variables.scss, styles/base.scss, components/Flex.tsx and loader/conditions code were inspected read-only. No git/npm/npx/build/start/write/delete operations ran in the site directory.

Fixed editor header/footer geometry: header is inside the center column above beforeBody; footer is below the center column rather than spanning sidebars. Minimal now correctly warns about five omitted slots, including beforeBody. Runtime order/exclusion/group behavior and 800/1200 breakpoints are represented in the pure draft resolver.

## Implemented

- Edit/effect views share live draft state; opening preview never generates or applies YAML.
- Desktop/tablet/mobile, page-type overrides, default/full-width/minimal frames, built-in conditions and sample article context.
- All 18 known component samples with source/entry/slot mapping, optional region labels and mapping-to-card navigation.
- Group flex direction/wrap/gap/member configuration, with CSS-property validation and no config HTML/style interpolation.
- Fit-to-width default and original-size viewing; mobile has contained overflow.
- Bilingual controls, samples, hidden-component reasons and honest unknown-condition/frame warnings. No iframe or network.

## Checks

- `node --test tests/core.test.mjs`: 37 passed, 0 failed, 0 skipped.
- `node tests/browser-check.mjs`: existing offline/bilingual regressions and new effect/geometry checks passed.
- Browser measured center-column header/footer, original 320px sidebars, header/beforeBody/body/afterBody order, narrow right sidebar placement, mobile left row, full-width/minimal slots, fit scaling and unchanged generated YAML when only viewing.
- Verified moving Graph into header changes its effect location immediately, page exclusion/clearing, conditions, group direction/wrap and mapped component navigation. Zero HTTP requests/iframe and browser error assertions remain green.
- Desktop effect screenshot inspected after adding fit-to-width; generated screenshots remain under ignored scratch/screenshots/.

## Limits and handoff

This is a Quartz-layout-aligned offline draft renderer, not the actual Quartz runtime. Article/title/date/link data and widgets are examples. Custom content, options, themes, components and services are not executed; exact pixel fidelity is not claimed. Custom predicates/templates require site verification.

The earlier bilingual work remains uncommitted and is preserved. No commit, push, release or Cloudflare deployment occurred. Task remains in progress pending visual review/publication authorization.

## Ergonomics follow-up — October 23, 2026

The October 22 handoff above is historical; version 0.2 was subsequently published. This follow-up changes only the local editor, tests and documentation; it does not publish a new version.

- Bottom floating edit/effect controls remain within desktop/mobile viewports at the top and bottom of the document, and clicking returns to the selected canvas.
- Native disclosures cover tray, selected component settings (tested with Stacked Pages), group settings, page overrides and individual canvas groups. Open choices, uncommitted input drafts and selected state survive re-rendering and locale/view changes. Selecting a component reopens its settings.
- Animation-frame drag scrolling works in both directions over non-drop areas, pauses in the middle, and stops on drop, cancellation or leaving the window. Drop highlighting re-hit-tests the scrolled document. Hovering a collapsed tray/group opens it after 600ms without rebuilding drag nodes.
- GitHub uses an inline accessible SVG in the top toolbar, with no external image request.
- Full offline browser regression passed, including new disclosure keyboard tests, unchanged YAML, mobile bounds, directional scrolling, off-screen drop, exit/cancel cleanup and hover-open tray coverage. Existing native grip drag/drop tests also passed.
- Core tests: 37 passed, 0 failed, 0 skipped. `git diff --check` passed (only existing Windows line-ending notices).
- Mobile screenshot inspected; light/dark screenshots remain under ignored `scratch/screenshots/`.
- No changes or commands in the user's Quartz site, no dependencies, no commit/push/release/deployment.

## Wheel and preview feedback follow-up — October 23, 2026

- Grip dragging now uses pointer capture and a 5px start threshold, sharing placement, hit-testing, hover-open and edge scrolling with the native fallback. Wheel input is handled only during an active drag (not Ctrl+wheel); Escape, pointer cancellation, drop and blur remove capture/ghost/highlights.
- Tested actual mouse down + movement + native wheel in both directions while still holding the grip, followed by placement in a different slot. Escape cancellation leaves placement intact. Existing native and keyboard regressions remain green.
- Effect view spans the workspace, improving default desktop scale from the narrow center rail. Uses local system fonts with higher-contrast body/navigation text, original-size viewing retained.
- Region annotations use solid teal boxes around all six slots and the sample article, with scale-compensated 3px rendered outlines and bold filled labels. Visual inspection caught a percentage-flex-basis label stretching down the sidebar; replaced it with auto basis and limited wrapping to row layouts. Added sidebar label-height/component-containment assertions; inspected final desktop screenshot.
- Tags and TOC sample flags remove their representative contents, backlinks switch between sample links and an empty state; explicit layout conditions still hide entire widgets. Controls display present/absent state and explain when corresponding widgets are unavailable, including the default disabled tag-list. Preview switches never enable plugins.
- Full offline browser suite passed, including new wheel/Escape, solid outline/scale, wide typography, all three flags, explicit has-backlinks condition, bilingual feedback, original-size/mobile bounds and unchanged-YAML assertions. Zero browser errors, HTTP requests or iframe.
- Core: 37 passed, 0 failed, 0 skipped. `git diff --check` passed with only Windows line-ending notices. No dependencies, site writes/builds, commit, push, release or deployment.
# Footer button and disclosure follow-up — October 23, 2026

- Reproduced effect-mode properties/group/page rail height stretching. Each grid child now aligns to start. Browser geometry asserts that open panels hug their own body height and closed panels occupy summary height only after a property edit; toggles preserve visible contents.
- Verified Quartz v5 Footer documentation: `links` maps labels to URLs. The UI marks buttons as Footer-owned special child components, with label/target editing, add/remove/reorder and a bilingual beginner explanation. Placement and visibility belong to Footer, not invented standalone plugins.
- Core: 45 passed, 0 failed, 0 skipped. Includes independent PyYAML semantic diffs, default labels with spaces, Unicode/HTML escaping, no-op round trips, opaque sibling options, empty/missing options and links, simultaneous enabled/layout insertions, unsupported syntax read-only preservation, duplicate/prototype labels and dangerous URL rejection.
- Complete offline browser suite passed: disclosure geometry, button CRUD/reorder, real configured preview text/targets, edit-without-navigation, targeted output, safe validation errors, locale changes preserving button drafts, keyboard save, children hiding with disabled Footer, bilingual/mobile layouts, and existing drag/preview/i18n workflows. Inspected the footer button editor screenshot. No browser errors, HTTP requests or iframe.
- `git diff --check` passed (Windows line-ending notices only). No dependencies, Quartz site writes/builds, commit, push, release or deployment.
- Native-only multi-instance follow-up (2026-10-23): core 48 passed, 0 failed, 0 skipped; complete offline browser regression passed. Verified native Footer append/remove, six independent placements, untouched original bytes, no-op reimport, concurrent root patches, URL/selector escaping, fixed styles separate from YAML, keyboard add/remove, bilingual style retention, copy/fallback, mobile bounds and theme switching. Inspected `scratch/screenshots/native-footer-style-preview.png`: native credit and independently placed pill button visible. Zero HTTP requests, iframes or browser errors; `git diff --check` passed with Windows line-ending notices only. No dependencies/new plugins, site writes/builds or publication. An initial browser run hit the existing asynchronous disclosure-toggle assertion; two subsequent full runs passed without altering disclosure behavior.
