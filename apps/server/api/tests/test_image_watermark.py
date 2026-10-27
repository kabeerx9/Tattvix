from datetime import UTC, datetime
from io import BytesIO

from django.test import SimpleTestCase
from PIL import Image

from api.image_watermark import (
    WatermarkError,
    _escape_unsupported_characters,
    watermark_identity_image,
)


def jpeg_bytes(*, size=(800, 500), exif=None):
    image = Image.new("RGB", size, "white")
    output = BytesIO()
    image.save(output, format="JPEG", exif=exif or b"")
    return output.getvalue()


class WatermarkIdentityImageTests(SimpleTestCase):
    def test_renders_a_jpeg_with_burned_in_footer_and_no_source_metadata(self):
        source = Image.new("RGB", (800, 500), "white")
        exif = Image.Exif()
        exif[270] = "private document"
        source_bytes = BytesIO()
        source.save(source_bytes, format="JPEG", exif=exif)

        rendered = watermark_identity_image(
            source_bytes.getvalue(),
            property_name="Hotel Azure",
            shared_at=datetime(2026, 10, 27, 14, 32, tzinfo=UTC),
        )

        with Image.open(BytesIO(rendered)) as output:
            self.assertEqual(output.format, "JPEG")
            self.assertEqual(output.width, 800)
            self.assertGreater(output.height, 500)
            self.assertNotIn(270, output.getexif())
            self.assertLess(sum(output.getpixel((20, output.height - 5))), 100)
            interior_pixels = list(output.crop((0, 0, 800, 350)).getdata())
            self.assertTrue(any(pixel != (255, 255, 255) for pixel in interior_pixels))

    def test_appends_footer_below_the_original_image_rectangle(self):
        source = Image.new("RGB", (800, 500), "white")
        encoded = BytesIO()
        source.save(encoded, format="JPEG", quality=100)

        rendered = watermark_identity_image(
            encoded.getvalue(),
            property_name="Hotel Azure",
            shared_at=datetime(2026, 10, 27, tzinfo=UTC),
        )

        with Image.open(BytesIO(rendered)) as output:
            self.assertEqual(output.width, 800)
            self.assertGreater(output.height, 500)
            self.assertLess(sum(output.getpixel((20, output.height - 5))), 100)

    def test_supports_devanagari_property_names(self):
        rendered = watermark_identity_image(
            jpeg_bytes(),
            property_name="तत्त्विक्स होटल",
            shared_at=datetime(2026, 10, 27, tzinfo=UTC),
        )

        with Image.open(BytesIO(rendered)) as output:
            self.assertEqual(output.format, "JPEG")

    def test_normalizes_png_and_webp_with_transparency_to_jpeg(self):
        for image_format in ("PNG", "WEBP"):
            with self.subTest(image_format=image_format):
                source = Image.new("RGBA", (320, 240), (0, 0, 0, 0))
                source.putpixel((0, 0), (255, 0, 0, 128))
                encoded = BytesIO()
                source.save(encoded, format=image_format)

                rendered = watermark_identity_image(
                    encoded.getvalue(),
                    property_name="Hotel Azure",
                    shared_at=datetime(2026, 10, 27, tzinfo=UTC),
                )

                with Image.open(BytesIO(rendered)) as output:
                    self.assertEqual(output.format, "JPEG")
                    self.assertEqual(output.width, 640)
                    self.assertGreater(output.height, 240)
                    self.assertGreater(min(output.getpixel((0, 0))), 100)

    def test_upscales_tiny_accepted_images_for_a_legible_footer(self):
        tiny = Image.new("RGBA", (1, 1), (255, 255, 255, 255))
        encoded = BytesIO()
        tiny.save(encoded, format="PNG")

        rendered = watermark_identity_image(
            encoded.getvalue(),
            property_name="Hotel Azure",
            shared_at=datetime(2026, 10, 27, tzinfo=UTC),
        )

        with Image.open(BytesIO(rendered)) as output:
            self.assertGreaterEqual(output.width, 640)
            self.assertGreater(output.height, 640)
            self.assertLess(sum(output.getpixel((20, output.height - 5))), 100)

    def test_applies_exif_orientation_before_rendering(self):
        exif = Image.Exif()
        exif[274] = 6

        rendered = watermark_identity_image(
            jpeg_bytes(size=(500, 800), exif=exif.tobytes()),
            property_name="Hotel Azure",
            shared_at=datetime(2026, 10, 27, tzinfo=UTC),
        )

        with Image.open(BytesIO(rendered)) as output:
            self.assertEqual(output.width, 800)
            self.assertGreater(output.height, 500)
            self.assertNotIn(274, output.getexif())

    def test_handles_full_255_character_property_names_without_truncation(self):
        property_name = "Grand Hotel " * 21 + "ABC"
        self.assertEqual(len(property_name), 255)
        rendered = watermark_identity_image(
            jpeg_bytes(),
            property_name=property_name,
            shared_at=datetime(2026, 10, 27, tzinfo=UTC),
        )
        self.assertGreater(len(rendered), 0)

    def test_renders_supported_hotel_scripts_without_host_fonts(self):
        property_names = (
            "Ακρόπολη Hotel",
            "Отель Таттвикс",
            "فندق تاتفيكس",
            "তত্ত্বিক্স হোটেল",
            "તત્ત્વિક્સ હોટેલ",
            "ਤੱਤਵਿਕਸ ਹੋਟਲ",
            "ತತ್ತ್ವಿಕ್ಸ್ ಹೋಟೆಲ್",
            "തത്ത്വിക്സ് ഹോട്ടൽ",
            "ତତ୍ତ୍ୱିକ୍ସ ହୋଟେଲ",
            "தத்விக்ஸ் ஹோட்டல்",
            "తత్విక్స్ హోటల్",
        )
        for property_name in property_names:
            with self.subTest(property_name=property_name):
                rendered = watermark_identity_image(
                    jpeg_bytes(),
                    property_name=property_name,
                    shared_at=datetime(2026, 10, 27, tzinfo=UTC),
                )
                self.assertTrue(rendered.startswith(b"\xff\xd8\xff"))

    def test_spells_unbundled_glyphs_visibly_instead_of_rejecting_property_name(self):
        self.assertEqual(
            _escape_unsupported_characters("ホテル 🏨"),
            "U+30DBU+30C6U+30EB U+1F3E8",
        )

        rendered = watermark_identity_image(
            jpeg_bytes(),
            property_name="ホテル 🏨",
            shared_at=datetime(2026, 10, 27, tzinfo=UTC),
        )
        self.assertTrue(rendered.startswith(b"\xff\xd8\xff"))

    def test_rejects_corrupt_animated_and_excessive_pixel_images(self):
        animated = BytesIO()
        first = Image.new("RGB", (20, 20), "white")
        second = Image.new("RGB", (20, 20), "black")
        first.save(animated, format="GIF", save_all=True, append_images=[second])

        cases = (b"not-an-image", animated.getvalue(), jpeg_bytes(size=(8000, 5000)))
        for data in cases:
            with self.subTest(data=data[:16]):
                with self.assertRaises(WatermarkError):
                    watermark_identity_image(
                        data,
                        property_name="Hotel Azure",
                        shared_at=datetime(2026, 10, 27, tzinfo=UTC),
                    )

    def test_rejects_extreme_aspect_images_even_within_axis_and_pixel_limits(self):
        with self.assertRaises(WatermarkError):
            watermark_identity_image(
                jpeg_bytes(size=(8192, 1)),
                property_name="Hotel Azure",
                shared_at=datetime(2026, 10, 27, tzinfo=UTC),
            )
