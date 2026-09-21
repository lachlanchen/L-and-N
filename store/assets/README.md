# Store assets

## 2026-09-21 set (1.0.4: 59 pairs, kept takes, hear-each-word buttons)

Seven screens per store, all real captures of the live web build (the same UI the native shells wrap), taken with the store browser at iPhone 6.5" (414×896 @3x) and iPad 13" (1032×1376 @2x) viewports, composited by `tools/store/compose_store.py` over the AI-generated backdrop with a caption:

| # | Screen | Caption |
| --- | --- | --- |
| 01 | Practice, English (light) | Hear it. See it. Say it better. |
| 02 | Listen exam, answering, with hear-each-word buttons | Which word did you hear? |
| 03 | Listen result with per-word replay | See every miss. Replay any word. |
| 04 | Practice, Mandarin | 蓝 or 南? Every l/n final. |
| 05 | Practice, Cantonese under the Traditional Chinese interface | 你 or 理? 21 Cantonese finals. |
| 06 | Learn, 3D mouth model (captured in a software-WebGL Chrome) | See where /l/ lets air flow. |
| 07 | Progress with kept-take replay buttons (seeded sample history) | Replay your best attempts. |

Files: `google-play-phone-01..07.png` (1080×1920), `app-store-iphone-65-01..07.png` (1242×2688), `app-store-ipad-13-01..07.png` (2064×2752). The Learn capture (06) needs a browser with WebGL; the store Chrome has none, so `tools/store/capture_screens.py` skips it there and `capture_learn.py` takes it in a `--use-angle=swiftshader` Chrome. The Google Play images keep the "created or edited using AI" disclosure because of the backdrop. The 1.0 set is kept under `previous-1.0/`.


The Google Play phone screenshots preserve verified captures of the app UI. They are composited over `google-play-screenshot-bg.png` and exported at 1080 × 1920.

The backdrop was produced with the built-in image-generation workflow using this final prompt:

> Create a premium, very minimal portrait background for a speech-practice learning app focused on distinguishing L and N sounds. Use a calm deep navy-to-indigo gradient with subtle coral and cyan glow arcs suggesting a sound wave and airflow. Keep the center and lower center calm for an app screenshot. No text, letters, logos, watermark, app UI, phones, people, literal mouth, or busy pattern.

Google Play disclosure:

- `google-play-phone-01.png` through `google-play-phone-04.png`: labeled as created or edited using AI.
- `google-play-icon.png` and `google-play-feature.png`: not labeled as AI-generated.

Source captures remain in `docs/images/`.

Apple App Store assets:

- `app-store-iphone-65.png`: verified iPhone simulator capture, 1242 × 2688.
- `app-store-ipad-13.png`: verified iPad Pro 13-inch simulator capture, 2064 × 2752.
- `app-store-watch-series-11.png`: verified Apple Watch Series 11 simulator capture, 416 × 496.
- `app-store-waiting-for-review.png`: secret-free App Store Connect evidence showing version 1.0 in **Waiting for Review** state.
