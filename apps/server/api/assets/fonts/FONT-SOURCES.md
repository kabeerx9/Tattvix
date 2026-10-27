# Bundled watermark fonts

- `NotoSans-Variable.ttf` is Noto Sans from the official
  [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/notosans).
- `NotoSansArabic-Variable.ttf`, `NotoSansDevanagari-Variable.ttf`, and the
  Bengali, Gujarati, Gurmukhi, Kannada, Malayalam, Oriya, Tamil, and Telugu
  Noto Sans fonts are from their corresponding `ofl/notosans*` directories in
  the official [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl).

All bundled fonts are distributed under the SIL Open Font License 1.1. The complete license
is bundled in `OFL-1.1.txt`. These files allow the supported hotel-name scripts
to render deterministically without relying on host-installed fonts. The
renderer uses Noto Sans for Latin, Greek, and Cyrillic; dedicated bundled fonts
for Arabic and the listed Indic scripts; and spells unsupported characters as a
visible `U+XXXX` codepoint token. It does not reject a valid hotel name or emit
silent missing-glyph boxes. CJK fonts are intentionally not bundled: covering
Japanese, Simplified/Traditional Chinese, and Korean reliably would require a
much larger family than this bounded server asset set.
