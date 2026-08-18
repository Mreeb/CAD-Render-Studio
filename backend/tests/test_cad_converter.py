import os
import base64
from unittest.mock import MagicMock
from PIL import Image
from io import BytesIO
import pytest
from backend.app.cad_converter import convert_image_to_cad

def create_sample_png_bytes():
    img = Image.new('RGB', (100, 100), color='red')
    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

def test_convert_image_to_cad_mocked(tmp_path):
    # Create sample input image
    input_file = tmp_path / "test_input.png"
    output_file = tmp_path / "test_output.png"
    
    sample_bytes = create_sample_png_bytes()
    input_file.write_bytes(sample_bytes)

    # Mock OpenAI client response
    mock_b64 = base64.b64encode(sample_bytes).decode('utf-8')
    mock_item = MagicMock()
    mock_item.b64_json = mock_b64
    
    mock_result = MagicMock()
    mock_result.data = [mock_item]

    mock_client = MagicMock()
    mock_client.images.edit.return_value = mock_result

    res = convert_image_to_cad(
        input_image_path=str(input_file),
        output_image_path=str(output_file),
        auveco="12345",
        phantom="P12345",
        model="gpt-image-2",
        quality="medium",
        client_instance=mock_client
    )

    assert res["success"] is True
    assert os.path.exists(str(output_file))
    assert os.path.getsize(str(output_file)) > 0
    mock_client.images.edit.assert_called_once()
