# Mobile Assets

Place the following image files in this directory:

| File | Size | Usage |
|------|------|-------|
| `icon.png` | 1024×1024 | App icon (EAS Build) |
| `splash.png` | 1284×2778 | Splash screen |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |
| `favicon.png` | 32×32 | Web favicon |

## Logo specs

- Background color: `#1B6FEB` (Trainly primary blue)
- Logo mark: white "T" or custom SVG mark
- Padding: ~15% on all sides for adaptive icon safe zone

The `icon.png` provided by the user should be placed here as-is.
EAS Build reads paths from `app.json` → `expo.icon`, `expo.splash.image`, etc.
