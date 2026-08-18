import os
import time
import base64
from io import BytesIO
from typing import Optional, Dict, Any
from PIL import Image
from openai import OpenAI, OpenAIError, RateLimitError, APIConnectionError, InternalServerError
from backend.app.config import settings

CAD_RECONSTRUCTION_PROMPT = """
Do not merely enhance, retouch, cut out, or reproduce the original photograph.

Use the reference image strictly as visual evidence of the object's design.
Reconstruct the depicted object as an accurate, clean, CAD-quality 3D model,
and then create a completely new photorealistic product render of that
reconstructed model.

ACCURACY AND DESIGN PRESERVATION

Faithfully preserve everything visible in the reference image, including:

- Overall shape, proportions, dimensions, and silhouette
- Number, placement, and relationship of separate components
- Component lengths, widths, diameters, thicknesses, and spacing
- Profiles, edges, curves, corners, holes, slots, grooves, seams, joints,
  threads, fasteners, openings, and surface transitions
- Original materials, colors, coatings, finishes, transparency,
  reflectivity, roughness, and surface characteristics
- Visible manufacturing details, assembly structure, and functional features
- Any deliberate asymmetry or irregularity belonging to the actual product

Treat differently colored or differently finished areas as potentially
separate materials or components. Preserve those distinctions exactly as
shown in the reference.

Do not redesign, beautify, modernize, simplify, repair, idealize, or upgrade
the object.

Do not convert its materials into polished metal unless the reference clearly
shows polished metal.

Do not add bevels, grooves, seams, rings, threads, openings, reflections,
decorative elements, or mechanical features that are not supported by the
reference image.

If a detail is unclear or partially hidden, infer it conservatively from the
visible geometry and maintain natural structural continuity. Do not invent
prominent features on unseen surfaces.

CAMERA ORIENTATION AND OBJECT DIRECTION

Match the reference image's camera viewpoint, object orientation, and direction
as closely as possible.

- Preserve the exact left-to-right or top-to-bottom direction of the object
- Preserve which end or component appears on each side of the image
- Keep the object at the same rotational angle as the reference
- If the reference object is horizontal, keep it perfectly horizontal
- If the reference object is vertical, keep it perfectly vertical
- Do not tilt the object diagonally
- Do not rotate, mirror, flip, reverse, or turn the object
- Do not switch which end faces left, right, upward, or downward
- Do not change the viewing side, camera elevation, or viewing direction
- Use a straight-on product view matching the reference
- Use an orthographic or long-lens appearance with minimal perspective distortion
- Center the object while preserving its original directional alignment
- Keep approximately equal and visually balanced margins around the object
- Improve the rendering quality without changing the object's pose or composition

The finished render must maintain the same recognizable viewpoint, alignment,
composition, and direction as the reference photograph.

RENDERING INSTRUCTIONS

Create a completely new professional engineering-product visualization:

- Keep the entire object fully visible, centered, and unobstructed
- Use physically based materials matching the reference object
- Reproduce the correct color, coating, finish, roughness, reflectivity,
  transparency, and texture of every component
- Use realistic but restrained material reflections
- Use precise geometry, clean edges, and accurate surface transitions
- Use professional ray-traced studio lighting
- Keep the entire object sharply focused
- Place the object on a seamless pure-white studio background
- Add only a soft, natural contact shadow beneath the object
- Produce high-definition, photorealistic commercial CAD-render quality

IMAGE RECONSTRUCTION

Generate the object and scene entirely from scratch.

Do not reuse pixels from the original photograph. Do not retain the original
background, supporting surface, lighting, shadows, reflections, blur, noise,
compression artifacts, dust, or photographic defects.

Match the original camera viewpoint and object direction, but reconstruct the
object using clean CAD-quality geometry rather than copying or editing the
original photograph.

Preserve surface marks, textures, seams, and imperfections only when they
appear to be genuine physical characteristics of the product itself.

The final result must look like a newly created visualization exported from
professional CAD-rendering software. It must not look like an edited
photograph, background removal, filter, cutout, sketch, illustration, or
approximate redesign.

OUTPUT RESTRICTIONS

Show exactly one complete object unless the reference clearly depicts multiple
permanently connected components belonging to the same product.

Do not include text, dimensions, arrows, annotations, borders, logos,
watermarks, hands, packaging, tools, stands, scenery, or additional objects.
"""

def convert_image_to_cad(
    input_image_path: str,
    output_image_path: str,
    auveco: str,
    phantom: str,
    job_id: Optional[int] = None,
    version: int = 1,
    model: str = "gpt-image-2",
    quality: str = "medium",
    api_key: Optional[str] = None,
    max_retries: Optional[int] = None,
    client_instance: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Executes OpenAI image edit call to reconstruct product image into a photorealistic CAD render.
    Validates decoded image with Pillow before atomically placing it in output_image_path.
    Retries transient failures (Rate limits, 5xx server errors) with exponential backoff.
    """
    key = api_key or settings.OPENAI_API_KEY
    if not key and not client_instance:
        raise ValueError("OPENAI_API_KEY environment variable is not configured.")

    client = client_instance or OpenAI(api_key=key)
    retries = max_retries if max_retries is not None else settings.RETRY_COUNT
    base_delay = settings.RETRY_BASE_DELAY

    if not os.path.exists(input_image_path):
        raise FileNotFoundError(f"Input source image not found at '{input_image_path}'")

    dest_dir = os.path.dirname(output_image_path)
    os.makedirs(dest_dir, exist_ok=True)
    tmp_output_path = f"{output_image_path}.tmp"

    last_exception = None

    for attempt in range(1, retries + 1):
        try:
            with open(input_image_path, "rb") as image_file:
                result = client.images.edit(
                    model=model,
                    image=image_file,
                    prompt=CAD_RECONSTRUCTION_PROMPT,
                    size="1536x1024",
                    quality=quality,
                    output_format="png"
                )

            if not result or not result.data or not result.data[0].b64_json:
                raise ValueError("OpenAI API response did not contain valid image data")

            b64_data = result.data[0].b64_json
            raw_bytes = base64.b64decode(b64_data)

            if not raw_bytes:
                raise ValueError("Decoded image byte payload is empty")

            # Validate decoded image with Pillow
            with Image.open(BytesIO(raw_bytes)) as pil_img:
                pil_img.verify()
                img_format = pil_img.format
                img_size = pil_img.size

            # Save to temporary file
            with open(tmp_output_path, "wb") as tmp_file:
                tmp_file.write(raw_bytes)

            # Atomic move to final review path
            if os.path.exists(output_image_path):
                os.remove(output_image_path)
            os.rename(tmp_output_path, output_image_path)

            return {
                "success": True,
                "output_path": output_image_path,
                "model": model,
                "quality": quality,
                "attempts": attempt,
                "width": img_size[0] if 'img_size' in locals() else 1536,
                "height": img_size[1] if 'img_size' in locals() else 1024,
                "format": img_format if 'img_format' in locals() else "PNG"
            }

        except (RateLimitError, APIConnectionError, InternalServerError) as e:
            last_exception = e
            if os.path.exists(tmp_output_path):
                try: os.remove(tmp_output_path)
                except OSError: pass

            if attempt < retries:
                sleep_duration = base_delay * (2 ** (attempt - 1))
                time.sleep(sleep_duration)
            else:
                raise RuntimeError(f"OpenAI API request failed after {retries} retries: {str(e)}") from e

        except Exception as e:
            # Permanent validation, auth, or parameter error
            if os.path.exists(tmp_output_path):
                try: os.remove(tmp_output_path)
                except OSError: pass
            raise e

    raise RuntimeError(f"CAD conversion failed: {str(last_exception)}")
