#!/usr/bin/env python3
"""Regenerate the Android res/ launcher + splash bitmaps from ``../assets``.

The native ``android/`` project is produced by ``expo prebuild``, which copies
the icon assets into ``res/mipmap-*`` / ``res/drawable-*`` only once. Run this
after changing the icons so the APK ships the new artwork.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
SPLASH = {"mdpi": 288, "hdpi": 432, "xhdpi": 576, "xxhdpi": 864, "xxxhdpi": 1152}


def load(name: str) -> Image.Image:
    return Image.open(ASSETS / name).convert("RGBA")


def save_webp(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGBA").save(path, format="WEBP", quality=95, method=6)


def circle_mask(img: Image.Image) -> Image.Image:
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def main() -> None:
    icon = load("icon.png")
    foreground = load("android-icon-foreground.png")
    background = load("android-icon-background.png")
    monochrome = load("android-icon-monochrome.png")
    splash = load("splash-icon.png")

    for dpi, size in LEGACY.items():
        target = RES / f"mipmap-{dpi}"
        square = icon.resize((size, size), Image.LANCZOS)
        save_webp(square, target / "ic_launcher.webp")
        save_webp(circle_mask(square), target / "ic_launcher_round.webp")

    for dpi, size in ADAPTIVE.items():
        target = RES / f"mipmap-{dpi}"
        save_webp(background.resize((size, size), Image.LANCZOS), target / "ic_launcher_background.webp")
        save_webp(foreground.resize((size, size), Image.LANCZOS), target / "ic_launcher_foreground.webp")
        save_webp(monochrome.resize((size, size), Image.LANCZOS), target / "ic_launcher_monochrome.webp")

    for dpi, size in SPLASH.items():
        target = RES / f"drawable-{dpi}"
        target.mkdir(parents=True, exist_ok=True)
        splash.resize((size, size), Image.LANCZOS).save(target / "splashscreen_logo.png", optimize=True)

    print("Android res regenerated in", RES)


if __name__ == "__main__":
    main()
