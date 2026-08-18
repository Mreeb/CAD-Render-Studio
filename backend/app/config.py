import os
import sys
from pathlib import Path
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    # Frozen PyInstaller executable - outer directory where CAD_Render_Studio.exe lives
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    # Normal development environment
    BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")

class Settings:
    def __init__(self):
        self.EXCEL_FILE = os.getenv("EXCEL_FILE", str(BASE_DIR / "Fiverr List for Auveco-1.xlsx"))
        self.DATA_DIRECTORY = os.getenv("DATA_DIRECTORY", str(BASE_DIR / "DATA_DIRECTORY"))
        self.CAD_REVIEW_DIRECTORY = os.getenv("CAD_REVIEW_DIRECTORY", str(BASE_DIR / "CAD_REVIEW_DIRECTORY"))
        self.CAD_DIRECTORY = os.getenv("CAD_DIRECTORY", str(BASE_DIR / "CAD_DIRECTORY"))
        self.DATABASE_FILE = os.getenv("DATABASE_FILE", str(BASE_DIR / "cad_manager.db"))
        
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
        self.CONFIRMATION_THRESHOLD = int(os.getenv("CONFIRMATION_THRESHOLD", "10"))
        self.MAX_CONCURRENT_CONVERSIONS = int(os.getenv("MAX_CONCURRENT_CONVERSIONS", "2"))
        self.RETRY_COUNT = int(os.getenv("RETRY_COUNT", "3"))
        self.RETRY_BASE_DELAY = float(os.getenv("RETRY_BASE_DELAY", "2.0"))
        
        self.QUALITY_PRESETS = {
            "medium": {
                "name": "Medium",
                "model": "gpt-image-2",
                "quality": "medium",
                "description": "Standard medium quality CAD reconstruction"
            },
            "high": {
                "name": "High",
                "model": "gpt-image-2",
                "quality": "high",
                "description": "High quality CAD reconstruction with enhanced detail"
            }
        }
        self.create_directories()

    def create_directories(self):
        for path_str in [self.DATA_DIRECTORY, self.CAD_REVIEW_DIRECTORY, self.CAD_DIRECTORY]:
            os.makedirs(path_str, exist_ok=True)

settings = Settings()
