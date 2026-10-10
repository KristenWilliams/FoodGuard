# Transparent Animated Expressions

Created with the built-in `image_gen` tool on 2026-10-08. Original lemon-shaped,
large-eyed clay mascot. No brand artwork was used as a reference.

## Assets

Sources are retained without pixel edits in `public/expressions/v2/`:

- `smile.png`: gentle smile, open eyes and blink.
- `happy.png`: delighted smile, open eyes and blink.
- `attentive.png`: calm expression, open eyes and blink.
- `alert.png`: coral-colored concerned expression, open eyes and blink.
- `sleep.png`: closed-eye rest and quiet breathing.
- `gaze.png`: a 3-column, 2-row sheet with forward, left, right, up, down and blink.

Other sheets have two square cells in one row. All have genuine alpha transparency.
The prompt set and source image filenames are saved in
`assets/design/expressions-v2-prompts.json`. The gaze sheet received one targeted
background-extraction pass before acceptance.

## Rendering

`AssistantAvatar` renders a fixed-size CSS sprite viewport. PNG files are static
source sheets; the application supplies actual frame animation. A short blink
occurs every 5.6 seconds, with staggered timing between component instances.
Gaze selects one of five eye-direction frames. Idle sleep keeps the existing
18-second timer and alternates the rest/breathing frames every four seconds.

The screenshot's legacy text badges were in `IngredientTagList`; these now use
the same raster avatar as report summaries, history, additive details and the
assistant. Expressions indicate attention to ingredients, not a safety verdict.
No score or new medical conclusion was introduced.

`prefers-reduced-motion` disables frame/bobbing animation. No animation timer is
created for each list item. Source sheets are local bundled assets, so displaying
or animating them requires neither a network call nor a server change.

## Verification

Run TypeScript, ESLint, the browser expression acceptance script and Android
installation checks after changing the asset mapping or CSS frame coordinates.
Check all asset/cell margins for alpha=0, the open/closed frame pixel change,
fixed 30px list/50px assistant/76px report dimensions, light/dark display,
320/390/768/1440px widths, reduced motion, directional gaze, sleep/wake and
navigation persistence. Keep Android history and settings by using `install -r`.

Acceptance on 2026-10-08: TypeScript, ESLint and Android debug build passed.
Browser checks passed for all six assets, fully transparent cell margins,
open/closed pixel changes, four viewport widths, dark mode, five gaze directions,
sleep/wake, stable dimensions and reduced motion. Android `emulator-5554`
checks passed for bundled asset decode, transparency, blink pixel changes,
navigation and sleep/wake; all 20 existing history entries and preferences
were unchanged during testing. No page errors were observed in either run.

APK: `releases/FoodGuard-expressions-v2-20261008.apk` (33,420,671 bytes).
SHA256: `EFE8593C5E52E92A64CEE6143770FD892A788611710B6279259AA0C4D9A56F7D`.
Acceptance evidence was retained locally during development; private device
state and raw QA artifacts are not distributed in this repository.
