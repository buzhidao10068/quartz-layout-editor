# Validation — October 22, 2026

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
