"""Bounded, deterministic rendering for hotel-shared identity image copies."""

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps, UnidentifiedImageError

MAX_INPUT_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 16_000_000
MAX_IMAGE_AXIS = 8_192
MAX_IMAGE_ASPECT_RATIO = 12
MAX_WATERMARK_TILE_WIDTH = 1_024
MAX_WATERMARK_TILE_HEIGHT = 256
MIN_CONTENT_WIDTH = 640
SUPPORTED_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})
ASSETS_DIR = Path(__file__).parent / "assets" / "fonts"
LATIN_FONT = ASSETS_DIR / "NotoSans-Variable.ttf"
DEVANAGARI_FONT = ASSETS_DIR / "NotoSansDevanagari-Variable.ttf"
SCRIPT_FONTS = (
    ((0x0600, 0x06FF), ASSETS_DIR / "NotoSansArabic-Variable.ttf"),
    ((0x0750, 0x077F), ASSETS_DIR / "NotoSansArabic-Variable.ttf"),
    ((0x0900, 0x097F), DEVANAGARI_FONT),
    ((0x0980, 0x09FF), ASSETS_DIR / "NotoSansBengali-Variable.ttf"),
    ((0x0A00, 0x0A7F), ASSETS_DIR / "NotoSansGurmukhi-Variable.ttf"),
    ((0x0A80, 0x0AFF), ASSETS_DIR / "NotoSansGujarati-Variable.ttf"),
    ((0x0B00, 0x0B7F), ASSETS_DIR / "NotoSansOriya-Variable.ttf"),
    ((0x0B80, 0x0BFF), ASSETS_DIR / "NotoSansTamil-Variable.ttf"),
    ((0x0C00, 0x0C7F), ASSETS_DIR / "NotoSansTelugu-Variable.ttf"),
    ((0x0C80, 0x0CFF), ASSETS_DIR / "NotoSansKannada-Variable.ttf"),
    ((0x0D00, 0x0D7F), ASSETS_DIR / "NotoSansMalayalam-Variable.ttf"),
)
MAX_PROPERTY_NAME_CHARACTERS = 255


class WatermarkError(ValueError):
    """The supplied identity image cannot safely be shared."""


def watermark_identity_image(data: bytes, *, property_name: str, shared_at: datetime) -> bytes:
    """Return an orientation-correct, metadata-free JPEG bearing hotel-use marks."""
    if not isinstance(data, bytes) or not data or len(data) > MAX_INPUT_BYTES:
        raise WatermarkError("Image data is empty or exceeds the 8 MiB limit.")
    if not isinstance(property_name, str) or not property_name.strip():
        raise WatermarkError("Property name is required for the watermark.")
    if len(property_name) > MAX_PROPERTY_NAME_CHARACTERS:
        raise WatermarkError("Property name exceeds the 255-character limit.")
    if shared_at.tzinfo is None or shared_at.utcoffset() is None:
        raise WatermarkError("Watermark sharing date must be timezone-aware.")
    property_name = _escape_unsupported_characters(property_name)
    try:
        with Image.open(BytesIO(data)) as opened:
            if opened.format not in SUPPORTED_FORMATS or getattr(opened, "is_animated", False):
                raise WatermarkError("Only single-frame JPEG, PNG, and WebP images are supported.")
            width, height = opened.size
            if (
                width < 1
                or height < 1
                or width > MAX_IMAGE_AXIS
                or height > MAX_IMAGE_AXIS
                or width * height > MAX_IMAGE_PIXELS
                or max(width, height) > min(width, height) * MAX_IMAGE_ASPECT_RATIO
            ):
                raise WatermarkError("Image dimensions exceed the safe rendering limit.")
            image = ImageOps.exif_transpose(opened)
            image.load()
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        if isinstance(exc, WatermarkError):
            raise
        raise WatermarkError("Image data could not be decoded safely.") from exc
    image = _normalize_content_size(_flatten_to_rgb(image))
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    _draw_repeated_watermark(overlay, property_name)
    content = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    footer = _build_footer(content.width, content.height, property_name, shared_at)
    rendered = Image.new("RGB", (content.width, content.height + footer.height), "black")
    rendered.paste(content, (0, 0))
    rendered.paste(footer, (0, content.height))
    output = BytesIO()
    rendered.save(output, format="JPEG", quality=90, optimize=True, progressive=True)
    return output.getvalue()


def _flatten_to_rgb(image: Image.Image) -> Image.Image:
    if image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info):
        background = Image.new("RGBA", image.size, "white")
        background.alpha_composite(image.convert("RGBA"))
        return background.convert("RGB")
    return image.convert("RGB")


def _normalize_content_size(image: Image.Image) -> Image.Image:
    """Give tiny accepted uploads enough physical space for a readable mark."""
    if image.width >= MIN_CONTENT_WIDTH:
        return image
    scale = MIN_CONTENT_WIDTH / image.width
    return image.resize(
        (MIN_CONTENT_WIDTH, max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )


def _draw_repeated_watermark(overlay: Image.Image, property_name: str) -> None:
    width, height = overlay.size
    size = max(16, min(48, min(width, height) // 24))
    tile_width = min(MAX_WATERMARK_TILE_WIDTH, max(256, width))
    tile_height = min(MAX_WATERMARK_TILE_HEIGHT, max(48, size * 3))
    wording = _repeated_wording(property_name, tile_width - size * 2, size)
    tile = Image.new("RGBA", (tile_width, tile_height), (0, 0, 0, 0))
    _draw_text(tile, (size, size // 2), wording, size, (65, 65, 65, 70))
    diagonal = tile.rotate(32, expand=True, resample=Image.Resampling.BICUBIC)
    for y in range(-diagonal.height, height + diagonal.height, max(160, height // 3)):
        for x in range(-diagonal.width, width + diagonal.width, max(220, width // 2)):
            overlay.alpha_composite(diagonal, (x, y))


def _repeated_wording(property_name: str, max_width: int, size: int) -> str:
    """Keep the background stamp bounded; the footer always carries the full name."""
    prefix = "For hotel check-in only · "
    if _text_width(f"{prefix}{property_name}", size) <= max_width:
        return f"{prefix}{property_name}"
    visible_name = property_name
    while visible_name and _text_width(f"{prefix}{visible_name}…", size) > max_width:
        visible_name = visible_name[:-1]
    return f"{prefix}{visible_name.rstrip()}…"


def _build_footer(width: int, image_height: int, property_name: str, shared_at: datetime) -> Image.Image:
    padding = max(12, min(width, image_height) // 45)
    size, lines = _footer_text_layout(property_name, width, image_height, padding)
    lines.extend(("For hotel check-in only", f"Shared: {shared_at.astimezone(UTC).strftime('%Y-%m-%d %H:%M UTC')}"))
    line_height = int(size * 1.45)
    footer_height = padding * 2 + line_height * len(lines)
    footer = Image.new("RGBA", (width, footer_height), (0, 0, 0, 255))
    y = padding
    for line in lines:
        _draw_text(footer, (padding, y), line, size, (255, 255, 255, 255))
        y += line_height
    return footer.convert("RGB")


def _footer_text_layout(name: str, width: int, height: int, padding: int) -> tuple[int, list[str]]:
    max_size = max(13, min(width, height) // 34)
    for size in range(max_size, 6, -1):
        lines = _wrap_text(name, width - padding * 2, size)
        line_height = int(size * 1.45)
        if padding * 2 + line_height * (len(lines) + 2) <= height:
            return size, lines
    return 7, _wrap_text(name, width - padding * 2, 7)


def _wrap_text(text: str, max_width: int, size: int) -> list[str]:
    lines, current = [], ""
    for character in text:
        candidate = f"{current}{character}"
        if current and _text_width(candidate, size) > max_width:
            lines.append(current)
            current = character
        else:
            current = candidate
    return [*lines, current] if current else lines


def _draw_text(image: Image.Image, position: tuple[int, int], text: str, size: int, fill) -> None:
    draw, x = ImageDraw.Draw(image), position[0]
    for segment, font_path in _font_segments(text):
        font = ImageFont.truetype(font_path, size)
        draw.text((x, position[1]), segment, font=font, fill=fill)
        x += int(draw.textlength(segment, font=font))


def _text_width(text: str, size: int) -> int:
    draw = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    return sum(int(draw.textlength(segment, font=ImageFont.truetype(path, size))) for segment, path in _font_segments(text))


def _font_segments(text: str) -> list[tuple[str, Path]]:
    segments, active_path, active_text = [], None, ""
    for character in text:
        path = _font_for_character(character)
        if path != active_path:
            if active_text:
                segments.append((active_text, active_path))
            active_path, active_text = path, character
        else:
            active_text += character
    if active_text:
        segments.append((active_text, active_path))
    return segments


def _font_for_character(character: str) -> Path:
    codepoint = ord(character)
    for (start, end), font in SCRIPT_FONTS:
        if start <= codepoint <= end:
            return font
    return LATIN_FONT


def _escape_unsupported_characters(text: str) -> str:
    """Use an explicit codepoint spelling where the bundled fonts lack a script."""
    rendered = []
    for character in text:
        codepoint = ord(character)
        supported = (
            character.isascii()
            or 0x00A0 <= codepoint <= 0x052F
            or 0x0300 <= codepoint <= 0x036F
            or any(start <= codepoint <= end for (start, end), _ in SCRIPT_FONTS)
        )
        rendered.append(character if supported else f"U+{codepoint:04X}")
    return "".join(rendered)
