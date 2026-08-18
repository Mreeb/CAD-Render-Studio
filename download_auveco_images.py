#!/usr/bin/env python3
"""
download_auveco_images.py - Refactored Reusable Wrapper
======================================================
Wraps backend.app.downloader logic for CLI execution while sharing state with the backend service.
"""

import sys
import os
import argparse
from backend.app.downloader import downloader_service
from backend.app.config import settings

def parse_args():
    parser = argparse.ArgumentParser(description="Download product images from auveco.com based on Excel workbook.")
    parser.add_argument("--excel", "-e", default=settings.EXCEL_FILE, help="Path to input Excel workbook (.xlsx).")
    parser.add_argument("--output-dir", "-o", default=settings.DATA_DIRECTORY, help="Path to output PNG directory.")
    parser.add_argument("--max-downloads", "-m", type=int, default=100, help="Maximum number of NEW images to download.")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between web requests.")
    parser.add_argument("--timeout", type=int, default=25, help="HTTP request timeout.")
    return parser.parse_args()

def main():
    args = parse_args()
    print("=" * 60)
    print("AUVECO PRODUCT IMAGE DOWNLOADER (REFACTORED MODULE)")
    print("=" * 60)
    print(f"Excel workbook path : {os.path.abspath(args.excel)}")
    print(f"Output directory    : {os.path.abspath(args.output_dir)}")
    print(f"MAX_NEW_DOWNLOADS   : {args.max_downloads}")
    print("-" * 60)

    try:
        downloader_service.start_download(
            max_downloads=args.max_downloads,
            delay=args.delay,
            timeout=args.timeout
        )
        if downloader_service.thread:
            downloader_service.thread.join()

        state = downloader_service.get_state()
        print("\n" + "=" * 60)
        print("SUMMARY REPORT")
        print("=" * 60)
        print(f"Total Excel rows scanned          : {state.get('total_scanned', 0)}")
        print(f"Eligible rows found               : {state.get('eligible_found', 0)}")
        print(f"Unique serial numbers found       : {state.get('unique_serials', 0)}")
        print(f"Images already present            : {state.get('already_present', 0)}")
        print(f"Duplicate serial numbers skipped  : {state.get('duplicates_skipped', 0)}")
        print(f"New images successfully downloaded: {state.get('downloaded_count', 0)}")
        print(f"Products not found                : {state.get('not_found_count', 0)}")
        print(f"Failed downloads                  : {state.get('failed_count', 0)}")
        print(f"Status                            : {state.get('status', 'unknown')}")
        print("=" * 60)

    except Exception as e:
        print(f"Error executing downloader: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
