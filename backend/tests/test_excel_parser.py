import pytest
from backend.app.excel_parser import extract_first_serial, is_cell_blank, sanitize_filename, validate_image_file

def test_extract_first_serial_simple():
    assert extract_first_serial("12345") == "12345"
    assert extract_first_serial(" 00123 ") == "00123"

def test_extract_first_serial_separators():
    # Should extract first serial number separated by comma, semicolon, slash, pipe, newline
    assert extract_first_serial("10066, 10067, 10068") == "10066"
    assert extract_first_serial("00789; 00790") == "00789"
    assert extract_first_serial("11130/11131") == "11130"
    assert extract_first_serial("12345|67890") == "12345"
    assert extract_first_serial("9999\n8888") == "9999"

def test_extract_first_serial_preserve_internal_hyphens():
    # Internal hyphens MUST NOT be split
    assert extract_first_serial("87756-3N100") == "87756-3N100"
    assert extract_first_serial("87756-3N100, 99999") == "87756-3N100"

def test_is_cell_blank():
    assert is_cell_blank(None) is True
    assert is_cell_blank("") is True
    assert is_cell_blank("   ") is True
    assert is_cell_blank("\xa0") is True
    assert is_cell_blank("123") is False

def test_sanitize_filename():
    assert sanitize_filename("12345.png") == "12345.png"
    assert sanitize_filename("123/45:67.png") == "123_45_67.png"
