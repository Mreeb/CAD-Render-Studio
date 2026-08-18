import os
import re
import openpyxl
from PIL import Image
from typing import List, Dict, Tuple, Set, Any, Optional
from backend.app.config import settings

def extract_first_serial(raw_val: Any) -> str:
    """
    Extracts the first serial number from a cell value.
    Splits by commas, semicolons, forward slashes, pipes, line breaks.
    Does NOT split by internal hyphens or minus signs.
    Preserves leading zeros.
    """
    if raw_val is None:
        return ""
    val_str = str(raw_val).strip().replace('\xa0', '')
    if not val_str:
        return ""
    
    parts = re.split(r'[,;/|\r\n]', val_str)
    for p in parts:
        cleaned = p.strip()
        if cleaned:
            return cleaned
    return ""

def is_cell_blank(val: Any) -> bool:
    if val is None:
        return True
    val_str = str(val).strip().replace('\xa0', '')
    return val_str == ""

def sanitize_filename(filename: str) -> str:
    """Sanitizes invalid Windows filename characters."""
    return re.sub(r'[<>:"/\\|?*]', '_', filename)

def build_data_dir_index(data_dir: str) -> Dict[str, Tuple[str, str]]:
    """
    Builds an O(1) lookup dictionary mapping lowercase file stem -> (full_path, filename).
    """
    index: Dict[str, Tuple[str, str]] = {}
    if not os.path.exists(data_dir):
        return index

    supported_exts = {'.png', '.jpg', '.jpeg', '.webp'}
    try:
        for entry in os.listdir(data_dir):
            entry_path = os.path.join(data_dir, entry)
            if os.path.isfile(entry_path):
                stem, ext = os.path.splitext(entry)
                if ext.lower() in supported_exts:
                    index[stem.lower()] = (entry_path, entry)
    except Exception:
        pass
    return index

def validate_image_file(image_path: str) -> bool:
    """Validates that an image file exists, is non-empty, and can be opened with Pillow."""
    if not os.path.exists(image_path) or os.path.getsize(image_path) == 0:
        return False
    try:
        with Image.open(image_path) as img:
            img.verify()
        return True
    except Exception:
        return False

class ExcelAnalysisResult:
    def __init__(self):
        self.total_rows_scanned: int = 0
        self.valid_mappings: List[Dict[str, Any]] = [] # [{excel_row, auveco, phantom, source_path, source_filename}]
        self.anomalies: List[Dict[str, Any]] = [] # [{category, excel_row, auveco, phantom, filename, details}]
        self.unmapped_source_files: List[Dict[str, Any]] = []

def parse_excel_and_analyze() -> ExcelAnalysisResult:
    """
    Parses the Excel workbook specified in settings.EXCEL_FILE,
    extracts serial numbers, maps to DATA_DIRECTORY using O(1) index, and identifies all 10 anomaly types.
    """
    result = ExcelAnalysisResult()
    excel_path = settings.EXCEL_FILE
    data_dir = settings.DATA_DIRECTORY

    if not os.path.exists(excel_path):
        return result

    try:
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        ws = wb.active
    except Exception as e:
        result.anomalies.append({
            "category": "excel_read_error",
            "details": f"Could not load Excel workbook: {str(e)}"
        })
        return result

    # Build O(1) index for source images in DATA_DIRECTORY
    data_dir_index = build_data_dir_index(data_dir)

    # Find headers
    auveco_col = None
    phantom_col = None

    for col_idx in range(1, ws.max_column + 1):
        header_val = str(ws.cell(1, col_idx).value or '').strip().lower()
        if 'auveco' in header_val and auveco_col is None:
            auveco_col = col_idx
        elif 'phantom' in header_val and phantom_col is None:
            phantom_col = col_idx

    # Fallbacks
    if auveco_col is None:
        auveco_col = 1
    if phantom_col is None:
        phantom_col = 2

    # Tracking sets for duplicate and mapping anomalies
    auveco_rows: Dict[str, List[Tuple[int, str]]] = {} # auveco_sn -> list of (excel_row, phantom_sn)
    phantom_rows: Dict[str, List[Tuple[int, str]]] = {} # phantom_sn -> list of (excel_row, auveco_sn)
    valid_source_stems: Set[str] = set()

    for r in range(2, ws.max_row + 1):
        result.total_rows_scanned += 1
        raw_a = ws.cell(r, auveco_col).value
        raw_b = ws.cell(r, phantom_col).value

        blank_a = is_cell_blank(raw_a)
        blank_b = is_cell_blank(raw_b)

        if blank_a and blank_b:
            result.anomalies.append({
                "category": "both_missing",
                "excel_row": r,
                "details": f"Row {r} has empty AuVeCo and Phantom cells"
            })
            continue

        if not blank_a and blank_b:
            auveco_sn = extract_first_serial(raw_a)
            result.anomalies.append({
                "category": "auveco_missing_phantom",
                "excel_row": r,
                "auveco": auveco_sn or str(raw_a),
                "details": f"Row {r} has AuVeCo '{raw_a}' but missing Phantom"
            })
            continue

        if blank_a and not blank_b:
            phantom_sn = extract_first_serial(raw_b)
            result.anomalies.append({
                "category": "phantom_missing_auveco",
                "excel_row": r,
                "phantom": phantom_sn or str(raw_b),
                "details": f"Row {r} has Phantom '{raw_b}' but missing AuVeCo"
            })
            continue

        # Both cells non-empty
        auveco_sn = extract_first_serial(raw_a)
        phantom_sn = extract_first_serial(raw_b)

        if not auveco_sn or not phantom_sn:
            result.anomalies.append({
                "category": "invalid_cell_format",
                "excel_row": r,
                "auveco": str(raw_a),
                "phantom": str(raw_b),
                "details": f"Row {r} cell formatting yielded empty serial number"
            })
            continue

        # Record for duplication checks
        if auveco_sn not in auveco_rows:
            auveco_rows[auveco_sn] = []
        auveco_rows[auveco_sn].append((r, phantom_sn))

        if phantom_sn not in phantom_rows:
            phantom_rows[phantom_sn] = []
        phantom_rows[phantom_sn].append((r, auveco_sn))

        valid_source_stems.add(auveco_sn.lower())

        # O(1) Lookup in DATA_DIRECTORY index
        img_info = data_dir_index.get(auveco_sn.lower())
        if not img_info:
            result.anomalies.append({
                "category": "missing_source_image",
                "excel_row": r,
                "auveco": auveco_sn,
                "phantom": phantom_sn,
                "details": f"Source image '{auveco_sn}.png' missing from DATA_DIRECTORY"
            })
            continue

        img_path, img_filename = img_info

        # Validate source image readability
        if not validate_image_file(img_path):
            result.anomalies.append({
                "category": "invalid_source_image",
                "excel_row": r,
                "auveco": auveco_sn,
                "phantom": phantom_sn,
                "filename": img_filename,
                "details": f"Source image '{img_filename}' is unreadable or corrupt"
            })
            continue

        # Valid mapping item candidate
        result.valid_mappings.append({
            "excel_row": r,
            "auveco": auveco_sn,
            "phantom": phantom_sn,
            "source_path": img_path,
            "source_filename": img_filename
        })

    # Cross-row duplicate & 1-to-many relationship checks
    for auv, instances in auveco_rows.items():
        if len(instances) > 1:
            rows_str = ", ".join([str(i[0]) for i in instances])
            phantoms_set = set([i[1] for i in instances])
            
            result.anomalies.append({
                "category": "duplicate_auveco",
                "auveco": auv,
                "details": f"AuVeCo serial '{auv}' appears in multiple rows ({rows_str})"
            })
            
            if len(phantoms_set) > 1:
                result.anomalies.append({
                    "category": "one_auveco_multi_phantom",
                    "auveco": auv,
                    "details": f"AuVeCo serial '{auv}' maps to multiple distinct Phantoms: {', '.join(phantoms_set)}"
                })

    for pht, instances in phantom_rows.items():
        if len(instances) > 1:
            rows_str = ", ".join([str(i[0]) for i in instances])
            auvecos_set = set([i[1] for i in instances])
            
            result.anomalies.append({
                "category": "duplicate_phantom",
                "phantom": pht,
                "details": f"Phantom serial '{pht}' appears in multiple rows ({rows_str})"
            })
            
            if len(auvecos_set) > 1:
                result.anomalies.append({
                    "category": "one_phantom_multi_auveco",
                    "phantom": pht,
                    "details": f"Phantom serial '{pht}' maps to multiple distinct AuVeCos: {', '.join(auvecos_set)}"
                })

    # Check unmapped source files in DATA_DIRECTORY
    for stem_lower, (img_path, img_filename) in data_dir_index.items():
        if stem_lower not in valid_source_stems:
            result.anomalies.append({
                "category": "unmapped_source_files",
                "filename": img_filename,
                "details": f"Image file '{img_filename}' in DATA_DIRECTORY has no corresponding Excel mapping"
            })
            result.unmapped_source_files.append({
                "filename": img_filename,
                "path": img_path
            })

    return result
