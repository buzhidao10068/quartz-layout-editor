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
