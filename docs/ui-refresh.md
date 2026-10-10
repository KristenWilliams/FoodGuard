# FoodGuard UI Refresh

## Design References

- Apple HIG typography and materials: https://developer.apple.com/design/human-interface-guidelines/
- applecn: https://github.com/STiXzoOR/applecn
- Liquid Glass React: https://github.com/rdev/liquid-glass-react

Only visual principles were referenced. No Apple font files, icons, or third-party glass runtime were bundled.

## Assets

- `public/demo/gummy-label-demo.png`: generated with the built-in Image Gen tool. Fictional gummy food label, no real brand or manufacturer. Required label values: 1450 kJ, protein 3 g, fat 0.2 g, carbs 82 g, sugars 60 g, sodium 60 mg per 100 g. For testing only.
- `assets/design/foodguard-ui-concept.png`: generated scan/discover layout reference. Cool gray background, white surfaces, emerald actions, readable Chinese system typography, editorial news list, original mint large-eye assistant.
- `src/components/AssistantAvatar.tsx`: original code-native animated mascot, shared across assistant and report states.

## Intentional Differences From Concept

- Content corners are limited to 8 px; the bottom navigation is a capsule.
- Use the inspected gummy label asset rather than the concept's illustrative package text.
- News headlines and dates come from publishers, never from the generated concept.
- No heavy 3D or glass library. CSS motion respects reduced-motion preferences.
- The assistant entry occupies a reserved header position rather than covering list controls at the bottom.
- If recent news cannot be verified, show an honest empty or offline state, not fabricated headlines.

## News Rules

Only items with publisher dates within 30 days appear in recent updates. Official reference pages are separate. A small bounded regional cache prevents repeated source fetching. No new persistent service or database is required.
