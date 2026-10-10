# Spectrum Startup Glyph

Generated with the built-in image_gen tool, transparent_background=true.
The original generated PNG is preserved without background extraction or image edits.
Project asset: foodguard-spectrum-v1.png.
Android asset: drawable-nodpi/foodguard_spectrum.png (identical PNG).
Only the startup screen changes; the launcher icon and assistant artwork stay unchanged.

## Final Prompt

Use case: logo-brand. Asset type: original transparent raster glyph for the FoodGuard Android startup animation. Primary request: a beautiful compact flowing color-spectrum / spectrogram wave, borderless and genuinely transparent. Subject: approximately 18 slender smooth vertical ribbons of spectral color, arranged as one elegant asymmetric undulating wave with two gentle peaks; varying ribbon heights, rounded tapered ends, consistent narrow spacing. A continuous clear spectrum runs across the ribbons: cool blue and cyan into emerald, lemon yellow, warm amber and coral red, with a small violet accent at one end. Style: refined luminous translucent glass-fiber ribbons, subtle dimensional highlights confined INSIDE the colored ribbons, crisp polished silhouette; visually balanced, readable at small icon size, not a bar chart UI. Composition: square canvas, centered glyph, the visible wave occupies about 70 percent of canvas width and 42 percent of canvas height; ample completely transparent margin on every side; no cropping. Intended animation: the individual ribbons will subtly rise and fall like a calm flowing spectrum, so keep the ribbons visually separable and coherent. Constraints: ONLY the colored wave; real PNG alpha transparency outside the ribbons and through all gaps. No background of any color, no background plate, no border, no circular or square enclosure, no frame, no surface, no cast shadow, no outer glow, no aura, no bokeh, no particles, no chart axes, no grid, no labels, no text, no watermark, no robot, no face, no shield, no checkmark, no pre-existing brand mark. Original design, not a copy of any operating-system assistant logo.

## Motion

The PNG itself is static. Android animates a small bitmap mesh for a gentle spectrum
wave, then fades out the existing system splash screen. No second activity, WebView
loading screen, network request, video decoder, or animated GIF is needed at runtime.
System-disabled animations skip this transition.

## Preview Verification

- Android preview version: 1.2.1-preview (versionCode 4).
- Debug APK build and both waveform unit tests passed.
- Installed over the existing app on the Android API 36 emulator without clearing data.
- The existing 20 history records, preferences, model choices and encrypted login
  configuration were unchanged; no credentials were printed or embedded in the APK.
- Native startup recording confirmed visible waveform motion, stable handoff size
  and no clipped edges. Other Android versions have not been visually verified.
- startup-native-preview.gif is a cropped recording of the real native splash,
  not an animated image used by the app. Its light surface is the Android window;
  the generated source PNG has transparent margins and gaps.
- APK: FoodGuard-spectrum-startup-1.2.1-preview-20261009.apk at the project root.

## Platform References

- https://developer.android.com/develop/ui/views/launch/splash-screen/migrate
- https://developer.android.com/develop/ui/views/launch/splash-screen
- https://developer.android.com/reference/android/graphics/Canvas
