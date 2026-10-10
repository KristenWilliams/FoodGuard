# Third-Party and Asset Notices

## Typeface

`public/fonts/LXGWWenKai-Regular-v1.522.woff2` is LXGW WenKai Regular, converted to WOFF2 without subsetting. It is licensed under **SIL Open Font License 1.1**, not the project's software license. Copyright notices and the complete license are preserved in [OFL-LXGW-WenKai.txt](public/fonts/OFL-LXGW-WenKai.txt). [Official upstream](https://github.com/lxgw/LxgwWenKai).

No STKaiti, Windows, Office or Apple system font file is redistributed.

## Application and generated artwork

- `assets/branding/foodguard-logo-source.png`: AI-generated project logo source, with derived Android launcher resources.
- `assets/startup/foodguard-spectrum-v1.png`: AI-generated transparent startup glyph. Native code supplies its animation; [prompt and verification](assets/startup/spectrum-v1-generation.md).
- `public/expressions/v2/`: AI-generated original mascot sprite sheets; animation is implemented in the application. [Prompts](assets/design/expressions-v2-prompts.json), [rendering notes](docs/expressions-v2.md).
- `assets/design/foodguard-ui-concept.png`: AI-generated design reference, not a screenshot of a working application.
- `public/demo/gummy-label-demo.png`: AI-generated fictional food label used for interaction testing.
- `public/demo/instant-noodle-ingredients.png` and `soy-sauce-ingredients.png`: Gemini-generated demonstration images supplied by the maintainer. These are not verified real-product labels.

Generated label text and nutrition values may contain errors. Do not use these demos as regulatory templates, factual product claims or accuracy-test ground truth. AI generation alone does not establish absence of third-party rights; the maintainer remains responsible for confirming rights before commercial distribution.

Apple HIG and public UI projects were consulted for design principles, not copied brand assets. No Apple or Claude branded character is bundled. Reference sites and official standards remain owned by their respective publishers; linking them is not endorsement of this app.

## Libraries

This project uses React, TypeScript, Vite, Chakra UI, Emotion, Capacitor, React Router, React Icons/Lucide, next-themes, ipaddr.js, linkedom and AndroidX. Supabase dependencies and migration files remain from the legacy implementation. Libraries and transitive dependencies retain their original licenses and notices; the project's license does not replace them.

Exact dependency versions are recorded in `package-lock.json`, `server/package-lock.json` and Android Gradle files. `node_modules/` is not distributed as source. Check dependency notices as well as artwork before a commercial/store release. This document is a source/asset inventory, not legal clearance.
