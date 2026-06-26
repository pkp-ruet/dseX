"""
Generate the PWA icon set (run once, or whenever the brand mark changes).

    python scripts/gen_icons.py

Writes to frontend/public/icons/:
  - icon-192.png            (rounded, "any" purpose — also the notification icon)
  - icon-512.png            (rounded, "any" purpose — install splash)
  - icon-512-maskable.png   (full-bleed; mark kept inside the maskable safe zone)

This is a placeholder mark (brand-blue + white ascending bars). To use a real
logo, just overwrite the three PNGs with the same filenames/sizes.
"""
import os

from PIL import Image, ImageDraw

BLUE = (37, 99, 235, 255)   # --primary #2563EB
WHITE = (255, 255, 255, 255)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "icons")


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # Full-bleed background (the OS applies its own mask). Keep the mark inside
        # the central safe zone (~56%) so circle/squircle crops never clip it.
        d.rectangle([0, 0, size, size], fill=BLUE)
        margin = size * 0.22
    else:
        # Rounded square for the "any" purpose icon.
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=BLUE)
        margin = size * 0.25

    # Three ascending bars (a small "stocks going up" mark).
    box = size - 2 * margin
    gap = box * 0.12
    bar_w = (box - 2 * gap) / 3
    base_y = size - margin
    for i, hf in enumerate((0.45, 0.72, 1.0)):
        x0 = margin + i * (bar_w + gap)
        h = box * hf
        d.rounded_rectangle(
            [x0, base_y - h, x0 + bar_w, base_y],
            radius=bar_w * 0.32,
            fill=WHITE,
        )
    return img


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-512-maskable.png", 512, True),
    ]
    for name, size, maskable in targets:
        path = os.path.join(OUT_DIR, name)
        draw_icon(size, maskable).save(path, "PNG")
        print(f"wrote {os.path.normpath(path)} ({size}x{size}{', maskable' if maskable else ''})")


if __name__ == "__main__":
    main()
