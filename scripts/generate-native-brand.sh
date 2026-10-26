#!/usr/bin/env bash
set -euo pipefail

# Requires ImageMagick 7. Run from any directory; regenerate after changing the
# canonical Threshold paths in apps/web/src/components/brand.tsx and brand-mark.svg.
cd "$(dirname "$0")/.."
assets=apps/native/assets/images
command -v magick >/dev/null

# The actual glyph is 390 x 468 within the 1024 canvas. Its furthest corner
# stays within Android's central 66/108 safe circle, including themed icons.
magick -background none -density 1152 "$assets/brand-mark.svg" -resize 624x624 \
  -gravity center -extent 1024x1024 "$assets/android-icon-foreground.png"
cp "$assets/android-icon-foreground.png" "$assets/android-icon-monochrome.png"
magick -size 1024x1024 xc:white "$assets/android-icon-background.png"
magick "$assets/android-icon-foreground.png" -background white \
  -alpha remove -alpha off "$assets/icon.png"
magick -background none -density 1152 "$assets/brand-mark.svg" -resize 48x48 "$assets/favicon.png"

# Preserve the existing launch screen's smaller mark (256 x 307 pixels).
magick -background none -density 1152 "$assets/brand-mark.svg" -resize 410x410 \
  -gravity center -extent 1024x1024 -background white \
  -alpha remove -alpha off -depth 8 "$assets/splash-icon.png"
