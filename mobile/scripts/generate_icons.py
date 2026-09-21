#!/usr/bin/env python3
"""Regenerate the app icon set.

Renders a glassmorphism-friendly "family shopping list" motif (a white rounded
card with checklist rows) on a blue→cyan gradient, then exports every asset the
Expo project expects:

- icon.png                     (1024, opaque)  iOS / primary icon
- android-icon-background.png  (512,  opaque)  adaptive background
- android-icon-foreground.png  (512,  alpha)   adaptive foreground (safe zone)
- android-icon-monochrome.png  (432,  alpha)   Android 13+ themed icon
- splash-icon.png              (1024, alpha)   splash logo
- favicon.png                  (48,   alpha)   web favicon
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / "assets"

# Brand colors (match the mobile design system gradient).
TOP = (59, 130, 246)      # #3B82F6
BOTTOM = (34, 211, 238)   # #22D3EE
BLUE = (59, 130, 246)
SOFT_BLUE = (219, 234, 254)   # #DBEAFE
SOFT_BLUE_BORDER = (191, 219, 254)  # #BFDBFE
WHITE = (255, 255, 255, 255)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gradient_bg(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(TOP, BOTTOM, y / (size - 1)) + (255,))

    # Soft top-left sheen for a subtle "glass" highlight.
    sheen = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen)
    sd.ellipse(
        [-int(size * 0.45), -int(size * 0.6), int(size * 1.05), int(size * 0.85)],
        fill=(255, 255, 255, 44),
    )
    sheen = sheen.filter(ImageFilter.GaussianBlur(int(size * 0.14)))
    return Image.alpha_composite(img, sheen)


def draw_motif(img: Image.Image, size: int, card_scale: float, color: bool = True) -> None:
    """Draw the checklist motif centered on ``img``."""
    d = ImageDraw.Draw(img)
    cw = int(size * card_scale)
    x0 = (size - cw) // 2
    y0 = (size - cw) // 2
    x1 = x0 + cw
    y1 = y0 + cw

    if color:
        card_fill = WHITE
        card_outline = None
        card_outline_w = 0
        bar = SOFT_BLUE + (255,)
        circle_outline = SOFT_BLUE_BORDER + (255,)
        check_fill = BLUE + (255,)
        check_color = WHITE
    else:
        card_fill = None
        card_outline = WHITE
        card_outline_w = max(3, int(size * 0.012))
        bar = WHITE
        circle_outline = WHITE
        check_fill = None
        check_color = WHITE

    d.rounded_rectangle(
        [x0, y0, x1, y1],
        radius=int(cw * 0.22),
        fill=card_fill,
        outline=card_outline,
        width=card_outline_w,
    )

    pad = int(cw * 0.20)
    circle_d = int(cw * 0.16)
    circle_r = circle_d // 2
    bar_h = int(cw * 0.085)
    bar_r = bar_h // 2
    inner_top = y0 + pad
    inner_bottom = y1 - pad
    gap = (inner_bottom - inner_top - circle_d) / 2.0

    left_x = x0 + pad + circle_d + int(cw * 0.06)
    right_x = x1 - pad

    for i in range(3):
        cy = int(inner_top + circle_d / 2 + i * gap)
        cx = x0 + pad + circle_r

        if i == 0:
            d.ellipse(
                [cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r],
                fill=check_fill if color else None,
                outline=circle_outline if not color else None,
                width=max(3, int(circle_d * 0.10)) if not color else 0,
            )
            lw = max(4, int(circle_d * 0.16))
            pts = [
                (cx - circle_r * 0.45, cy + circle_r * 0.05),
                (cx - circle_r * 0.12, cy + circle_r * 0.38),
                (cx + circle_r * 0.52, cy - circle_r * 0.35),
            ]
            d.line(pts, fill=check_color, width=lw, joint="curve")
        else:
            d.ellipse(
                [cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r],
                outline=circle_outline,
                width=max(3, int(circle_d * 0.10)),
            )

        bar_right = right_x if i != 2 else right_x - int(cw * 0.22)
        d.rounded_rectangle(
            [left_x, cy - bar_h // 2, bar_right, cy + bar_h // 2],
            radius=bar_r,
            fill=bar,
        )


def render_icon(size: int) -> Image.Image:
    ss = size * 2
    img = gradient_bg(ss)
    motif = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    draw_motif(motif, ss, 0.50, color=True)
    img = Image.alpha_composite(img, motif)
    return img.resize((size, size), Image.LANCZOS).convert("RGB")


def render_background(size: int) -> Image.Image:
    ss = size * 2
    return gradient_bg(ss).resize((size, size), Image.LANCZOS).convert("RGB")


def render_foreground(size: int) -> Image.Image:
    ss = size * 2
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    draw_motif(img, ss, 0.40, color=True)
    return img.resize((size, size), Image.LANCZOS)


def render_monochrome(size: int) -> Image.Image:
    ss = size * 2
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    draw_motif(img, ss, 0.40, color=False)
    return img.resize((size, size), Image.LANCZOS)


def render_splash(size: int) -> Image.Image:
    """Rounded gradient logo (with margin) for the white splash screen."""
    ss = size * 2
    bg = gradient_bg(ss)
    motif = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    draw_motif(motif, ss, 0.50, color=True)
    logo = Image.alpha_composite(bg, motif)

    mask = Image.new("L", (ss, ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, ss - 1, ss - 1], radius=int(ss * 0.22), fill=255
    )
    logo.putalpha(mask)

    inner = int(ss * 0.82)
    inner_logo = logo.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    off = (ss - inner) // 2
    canvas.paste(inner_logo, (off, off), inner_logo)
    return canvas.resize((size, size), Image.LANCZOS)


def render_favicon(size: int) -> Image.Image:
    ss = size * 2
    img = gradient_bg(ss)
    motif = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    draw_motif(motif, ss, 0.50, color=True)
    img = Image.alpha_composite(img, motif)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    render_icon(1024).save(ASSETS / "icon.png", optimize=True)
    render_background(512).save(ASSETS / "android-icon-background.png", optimize=True)
    render_foreground(512).save(ASSETS / "android-icon-foreground.png", optimize=True)
    render_monochrome(432).save(ASSETS / "android-icon-monochrome.png", optimize=True)
    render_splash(1024).save(ASSETS / "splash-icon.png", optimize=True)
    render_favicon(48).save(ASSETS / "favicon.png", optimize=True)
    print("Icons regenerated in", ASSETS)


if __name__ == "__main__":
    main()
