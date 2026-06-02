"""
NM Cannabis Sales Data Downloader
----------------------------------
Uses the CROP (Cannabis Reporting Online Portal) public API to:
  1. Enumerate all year folders
  2. List all .xlsx files within each folder
  3. Download any files not already present locally

Usage:
    python nm_cannabis_downloader.py

Dependencies:
    pip install requests
"""

import os
import re
import requests

# ── API config (all public, no auth required) ─────────────────────────────────
BASE_URL    = "https://klvg4oyd4j.execute-api.us-west-2.amazonaws.com/prod"
WIDGET_ID   = "b9dd339b-de1d-406b-abaf-c30c1f3d783a"
ACCOUNT_GUID = "1ee897135beb4b1c82715d36398de4c5"
ROOT_FOLDER_ID = "9957fddd-766f-4333-af61-cc5e13e85951"
"""
# Known year folder IDs from the root listing (update as new years are added)
YEAR_FOLDERS = {
    "2022": "fa7004d3-f466-482d-97b2-7b57648d8b6d",
    "2023": "f0c2ac93-4afd-479a-8410-16b5924562f7",
    "2024": "1ae70aa3-5f89-41d7-bb2c-ca2b194019b0",
    "2025": "dd39327e-357c-4576-8ee6-80cbdb42f5de",
    "2026": "e1433770-23dd-42d9-a249-f0063ccb99bb",
}
"""
# Where to save downloaded files
DOWNLOAD_DIR = "data/raw"


def get_common_params(folder_id: str) -> dict:
    return {
        "widgetId":     WIDGET_ID,
        "rootFolderId": ROOT_FOLDER_ID,
        "folderId":     folder_id,
        "authTokenGUID": "",
        "accountGUID":  ACCOUNT_GUID,
    }


def list_files_in_folder(folder_id: str) -> list[dict]:
    """Return list of file metadata dicts for a given folder."""
    resp = requests.get(
        f"{BASE_URL}/GetWidgetFiles",
        params=get_common_params(folder_id),
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", {}).get("files", [])


def get_download_url(file_id: str) -> str | None:
    """Resolve a fileId to a direct download URL."""
    resp = requests.get(
        f"{BASE_URL}/GetWidgetFileLink",
        params={
            "fileId":       file_id,
            "widgetId":     WIDGET_ID,
            "authTokenGUID": "",
            "accountGUID":  ACCOUNT_GUID,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    # Handle multiple possible response shapes:
    # 1. {"data": {"link": "https://..."}}
    # 2. {"data": "https://..."}
    # 3. "https://..." (raw string)
    if isinstance(data, str):
        return data
    inner = data.get("data")
    if isinstance(inner, str):
        return inner
    if isinstance(inner, dict):
        return inner.get("link")
    return None


def safe_filename(name: str) -> str:
    """Strip characters that are unsafe in filenames."""
    return re.sub(r'[\\/*?:"<>|]', "_", name)


def download_file(url: str, dest_path: str) -> None:
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)


def main():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    # Optionally re-fetch year folders dynamically in case new years are added
    # (comment out YEAR_FOLDERS above and uncomment below)
     root_data = requests.get(f"{BASE_URL}/GetWidgetFiles",
         params=get_common_params(ROOT_FOLDER_ID), timeout=15).json()
     year_folders = {f["name"]: f["folderId"]
                     for f in root_data["data"]["folders"]}

    total_downloaded = 0

    for year, folder_id in sorted(YEAR_FOLDERS.items()):
        print(f"\n📁 {year}")
        files = list_files_in_folder(folder_id)

        if not files:
            print("  (no files found)")
            continue

        year_dir = os.path.join(DOWNLOAD_DIR, year)
        os.makedirs(year_dir, exist_ok=True)

        for file_meta in files:
            file_id   = file_meta.get("fileId") or file_meta.get("id")
            file_name = safe_filename(file_meta.get("name", file_id))

            if not file_name.endswith(".xlsx"):
                file_name += ".xlsx"

            dest_path = os.path.join(year_dir, file_name)

            if os.path.exists(dest_path):
                print(f"  ✓ already exists: {file_name}")
                continue

            print(f"  ↓ downloading: {file_name} ...", end=" ", flush=True)
            try:
                url = get_download_url(file_id)
                if not url:
                    print("no URL returned, skipping")
                    continue
                download_file(url, dest_path)
                print("done")
                total_downloaded += 1
            except Exception as e:
                print(f"ERROR: {e}")

    print(f"\n✅ Done. {total_downloaded} new file(s) downloaded to '{DOWNLOAD_DIR}/'")


if __name__ == "__main__":
    main()
