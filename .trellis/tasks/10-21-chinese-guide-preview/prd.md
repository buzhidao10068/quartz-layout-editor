# Chinese / English i18n and onboarding

## Goal

Provide complete Chinese/English UI switching and a beginner guide. Per the user's latest request, remove the running-site preview entirely; this is a static offline editor suitable for Cloudflare hosting.

## Boundary

Change index.html, existing tests, README and task/spec documentation only. Preserve canonical YAML keys, source names, default config, movement and emission semantics. Never modify, start, build, delete, or run git/npm/npx inside the user's Quartz site. No new branch, commit, push, tag, release or deployment is authorized by this request.

## Acceptance

- Both languages cover visible UI, component descriptions, enum labels, accessibility labels, dynamic status, validation errors with line numbers, guide and output dialog.
- The language selector updates document lang/title and safely stores only locale preference. With no preference, use Chinese for zh browser languages and English otherwise. Denied storage does not break the editor.
- Switching locale preserves loaded configuration, edits, selection, input/paste drafts, source-change confirmation, group/page state and generated output. Canonical YAML values remain unchanged.
- All 18 component descriptions exist in both languages; Chinese names retain English references. Explain Page Title versus Article Title.
- Remove all site-preview controls, URL input, iframe, state, handlers, CSS, server tests and current usage documentation. Both locales make zero HTTP requests.
- Retain the four-step input/edit/generate/manual-apply guide. Explain that this editor does not change or run the user's site.
- Core and bilingual browser checks pass, including metadata/error translation coverage, keyboard movement, click-after-blur, locale persistence, blocked storage and mobile layout.

## Revised scope

The initial running-site preview proposal was revoked before publication. The task directory retains its original identifier to preserve the active task/context pointer; the current requirements are i18n and no preview.
