# Bilingual display design

## Translation boundary

Embed paired Chinese/English strings and component explanations in the plain UI script. A translation helper renders from current UI locale and message parameters. Keep canonical manifest/source names and YAML values intact. Chinese display metadata in the pure core does not affect parsing or generation.

## State and feedback

Keep configuration and UI state separate within the existing state object. Store status and clipboard feedback as translation keys plus parameters; store core error reason and line metadata so current errors can switch language without reparsing DOM text. Preserve existing error message compatibility in the core.

Language switches re-render without reloading config, clearing drafts, resetting selection, or regenerating output. The output dialog includes its own accessible language selector. Document lang/title track locale. Only language/theme preferences use guarded localStorage calls; configuration stays in memory.

## Interaction and offline constraints

Keep drag and keyboard movement on the same existing pure core functions. Defer renders during pointer interaction so a text-field blur cannot replace a clicked button before its click arrives. Pointer up/cancel and drag end release deferred rendering.

Remove all running-site preview markup, CSS, iframe/URL logic and test-server code. There is no preview exception to zero network. The guide describes manual config application and checking the user's site outside the editor; the editor never starts/builds/writes the site.

## Verification

Retain core semantic/YAML regressions. Add translation-pair placeholder and full parser-error-template coverage. Browser tests exercise both locales offline, state and modal preservation, parser/validation feedback, language persistence/fallback, denied storage, keyboard/drag/click behavior and 390px mobile layouts. Assert no iframe and no HTTP requests in both languages.
