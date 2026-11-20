# backend/images.py
#
# WHAT: Checking an uploaded file and turning it into an RGB image the
#   classifier can use.
#
# CONTENT, NOT CLAIMS: the browser-supplied filename and content type
#   are ignored. A file is accepted only if Pillow can actually decode
#   it as a JPEG or PNG.
#
# RESOURCE LIMITS: the resolution is read from the image header and
#   checked BEFORE the image is decoded, so a small file that would
#   expand into an enormous image (a "decompression bomb") is refused
#   cheaply.

import hashlib
import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

from errors import ApiError

ALLOWED_FORMATS = {"JPEG", "PNG"}

INVALID_IMAGE_MESSAGE = "The file could not be read as an image. Please upload a JPEG or PNG photo."

# Saved format -> (content type, file extension).
STORED_FORMATS = {"JPEG": ("image/jpeg", "jpg"), "PNG": ("image/png", "png")}

JPEG_QUALITY = 90


@dataclass(frozen=True)
class CleanPhoto:
    """A re-encoded photo, ready to store, with its metadata removed."""

    data: bytes
    mime_type: str
    extension: str
    width: int
    height: int
    sha256: str


def decode_upload_image(data: bytes, max_pixels: int) -> Image.Image:
    if not data:
        raise ApiError(400, "empty_file", "The uploaded file is empty.")

    try:
        # Reads only the header: format and size, not the pixels.
        image = Image.open(io.BytesIO(data))
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError):
        raise ApiError(400, "invalid_image", INVALID_IMAGE_MESSAGE) from None

    try:
        if image.format not in ALLOWED_FORMATS:
            raise ApiError(415, "unsupported_media_type", "Please upload a JPEG or PNG image.")

        width, height = image.size
        if width * height > max_pixels:
            raise ApiError(
                413,
                "image_too_large",
                "The image resolution is too large. Please upload a smaller photo.",
            )

        try:
            # Full decode: this is where truncated or corrupted files fail.
            image.load()
            # Phone cameras often save photos sideways with a rotation tag.
            # Applying it lets the model see the leaf the right way up.
            upright = ImageOps.exif_transpose(image)
            return upright.convert("RGB")
        except (OSError, ValueError, SyntaxError, Image.DecompressionBombError):
            raise ApiError(400, "invalid_image", INVALID_IMAGE_MESSAGE) from None
    finally:
        image.close()


def encode_clean_photo(original: bytes, upright_rgb: Image.Image) -> CleanPhoto:
    """
    Re-encodes a decoded photo in its original format, keeping the pixels
    only. A phone photo's metadata can include the GPS position of where
    it was taken, which could be the reporter's home, so none of it is
    carried over.
    """
    with Image.open(io.BytesIO(original)) as source:
        mime_type, extension = STORED_FORMATS[source.format]
        image_format = source.format

    # A new image has no metadata to inherit; a copy would keep some.
    clean = Image.new("RGB", upright_rgb.size)
    clean.paste(upright_rgb)

    buffer = io.BytesIO()
    if image_format == "JPEG":
        clean.save(buffer, format="JPEG", quality=JPEG_QUALITY)
    else:
        clean.save(buffer, format="PNG")
    data = buffer.getvalue()

    return CleanPhoto(
        data=data,
        mime_type=mime_type,
        extension=extension,
        width=clean.width,
        height=clean.height,
        sha256=hashlib.sha256(data).hexdigest(),
    )
