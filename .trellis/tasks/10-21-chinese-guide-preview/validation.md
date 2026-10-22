# Validation — October 22, 2026

## Current implementation

- Chinese and English cover component names/descriptions, common non-layout plugins, guide, properties, enums, accessibility labels, warnings, errors, status and output/copy controls.
- The header and output dialog provide language selectors. Locale updates document lang/title, defaults from browser language and persists as a guarded localStorage preference. Configuration is never stored or uploaded.
- Changing locale preserves loaded YAML, edits, selected component, field/paste drafts, dirty-source confirmation and output text. Existing dynamic feedback is translated using message keys and parameters; parser errors keep reason/line metadata.
- Page Title is the website title, not Article Title. The four-step guide covers input, editing, reviewing generated YAML and manual application.
- Removed running-site preview completely: no URL input, iframe, preview state/handlers/CSS or temporary preview test server. Both languages are fully offline.
- Deferred pointer rendering fixes the field-blur/click-target race; drag end releases deferred state. Focus assertions explicitly focus the language menu before checking keyboard focus preservation.

## Checks

- `node --test tests/core.test.mjs`: 33 passed, 0 failed, 0 skipped. Includes original YAML semantic/path regressions, all 18 bilingual descriptions, translation placeholder parity and English coverage for all parser error templates.
- `node tests/browser-check.mjs`: Chinese baseline plus bilingual offline checks pass using existing Playwright/headless Edge. No runtime dependency was added.
- Browser coverage: keyboard and grip drag movement, input source equivalence, dirty confirmation, clipboard fallback, light/dark, Chinese/English mobile widths, English text coverage, translated enums, modal language switching without YAML changes, preserved drafts/selection, translated warnings/errors with source lines, saved language, keyboard switching, browser-locale fallback and denied storage.
- Both locales have zero HTTP requests and zero iframe elements. Browser errors are checked. Screenshots stay under ignored scratch/screenshots/.

## Handoff

No real Quartz site files were modified, started, built or deleted. No commit, push, tag, release bump or Cloudflare deployment was performed. Public release 0.1 remains unchanged until publication is authorized. The task remains in progress for visual review/publication decisions.
