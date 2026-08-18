import sqlite3
from contextlib import contextmanager
from typing import Generator
from backend.app.config import settings

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for thread-safe SQLite connection."""
    conn = sqlite3.connect(settings.DATABASE_FILE, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initializes the database tables."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Conversions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            auveco TEXT NOT NULL,
            phantom TEXT NOT NULL,
            source_filename TEXT,
            source_path TEXT,
            review_path TEXT,
            approved_path TEXT,
            status TEXT NOT NULL DEFAULT 'eligible',
            attempt INTEGER DEFAULT 1,
            model TEXT DEFAULT 'gpt-image-2',
            quality TEXT DEFAULT 'medium',
            excel_row INTEGER,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(auveco, phantom)
        );
        """)

        # History table for versions/attempts
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversion_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversion_id INTEGER,
            auveco TEXT NOT NULL,
            phantom TEXT NOT NULL,
            attempt INTEGER NOT NULL,
            model TEXT DEFAULT 'gpt-image-2',
            quality TEXT DEFAULT 'medium',
            review_path TEXT,
            status TEXT NOT NULL,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversion_id) REFERENCES conversions(id) ON DELETE CASCADE
        );
        """)

        # Anomalies table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS anomalies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            excel_row INTEGER,
            auveco TEXT,
            phantom TEXT,
            filename TEXT,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Downloader state table (Single row enforcing system state)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS downloader_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            status TEXT NOT NULL DEFAULT 'idle',
            total_scanned INTEGER DEFAULT 0,
            eligible_found INTEGER DEFAULT 0,
            unique_serials INTEGER DEFAULT 0,
            already_present INTEGER DEFAULT 0,
            duplicates_skipped INTEGER DEFAULT 0,
            downloaded_count INTEGER DEFAULT 0,
            not_found_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            current_serial TEXT DEFAULT '',
            max_downloads INTEGER DEFAULT 100,
            started_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # Ensure default downloader state row exists
        cursor.execute("""
        INSERT OR IGNORE INTO downloader_state (id, status) VALUES (1, 'idle');
        """)

        # Indexes for fast lookup
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversions_auveco ON conversions(auveco);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversions_phantom ON conversions(phantom);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_category ON anomalies(category);")
