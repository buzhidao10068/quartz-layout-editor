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

## Boundary

Only editor index.html, existing tests and docs/spec/task artifacts. The user's Quartz site is read-only source reference; never build/start/write/delete or execute git/npm/npx there. No branch, commit, push or deployment is authorized.
