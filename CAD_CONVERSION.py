#!/usr/bin/env python3
"""
CAD_CONVERSION.py - Refactored Reusable Wrapper
===============================================
Wraps backend.app.cad_converter.convert_image_to_cad for standalone CLI execution.
"""

import sys
import os
from backend.app.cad_converter import convert_image_to_cad, CAD_RECONSTRUCTION_PROMPT
from backend.app.config import settings

def main():
    print("=" * 60)
    print("CAD RECONSTRUCTION ENGINE (GPT IMAGE 2)")
    print("=" * 60)
    
    input_image_path = sys.argv[1] if len(sys.argv) > 1 else "DATA_DIRECTORY/11130.png"
    output_image_path = sys.argv[2] if len(sys.argv) > 2 else "CAD_REVIEW_DIRECTORY/11130_cad.png"
    
    if not os.path.exists(input_image_path):
        print(f"Error: Input file not found: {input_image_path}")
        sys.exit(1)
        
    print(f"Input image  : {input_image_path}")
    print(f"Output render : {output_image_path}")
    print("Sending image to GPT Image 2... please wait.")

    try:
        res = convert_image_to_cad(
            input_image_path=input_image_path,
            output_image_path=output_image_path,
            auveco="11130",
            phantom="11130_PHANTOM",
            model="gpt-image-2",
            quality="medium"
        )
        print("Done! Render successfully saved to:", res["output_path"])
    except Exception as e:
        print("Error during CAD conversion:", str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()