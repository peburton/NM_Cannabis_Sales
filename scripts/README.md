# Scripts

Three Python scripts make up the data pipeline. Run them in order when setting up the project or updating with new monthly data.

---

## Setup

```bash
cd NM_Cannabis_Sales
source venv/bin/activate  # or venv/bin/activate.fish
pip install requests pandas openpyxl xlrd duckdb motherduck
export MOTHERDUCK_TOKEN=your_token_here
```

---

## nm_cannabis_downloader.py

Downloads all monthly `.xlsx` sales report files from the NM CROP portal into `data/raw/<year>/`.

The CROP portal doesn't have a public API — we reverse engineered it from browser network traffic. Each file has a UUID, and the script hits two endpoints:

- `GetWidgetFiles` — lists files in a folder by year
- `GetWidgetFileLink` — resolves a file UUID to a download URL

The script is **idempotent**: files already present on disk are skipped, so it's safe to rerun every month without re-downloading everything.

```bash
python scripts/nm_cannabis_downloader.py
```

**Output:** `data/raw/2022/`, `data/raw/2023/`, ... `data/raw/2026/`

---

## nm_cannabis_etl.py

Reads every `.xlsx` file from `data/raw/`, normalizes the schema, and loads into two MotherDuck tables.

**What it normalizes:**
- Drops the ~250 empty junk columns present in older city files
- Renames `Recreational Sales` → `adult_use_sales` to match newer file naming
- Parses `month` and `year` from filenames and adds a `report_date` column
- Detects file type (city vs. licensee) from the filename

**Tables created:**

`sales_by_licensee` — one row per dispensary per month
| Column | Type | Description |
|---|---|---|
| licensee | VARCHAR | Dispensary name |
| address | VARCHAR | Street address |
| city | VARCHAR | City |
| state | VARCHAR | State (NM) |
| zip | VARCHAR | ZIP code |
| medical_sales | DOUBLE | Medical revenue |
| adult_use_sales | DOUBLE | Adult-use revenue |
| total_sales | DOUBLE | Total revenue |
| month | INTEGER | Month number |
| year | INTEGER | Year |
| report_date | DATE | First day of the report month |

`sales_by_city` — one row per city per month
| Column | Type | Description |
|---|---|---|
| city | VARCHAR | City name (uppercased) |
| medical_sales | DOUBLE | Medical revenue |
| medical_tickets | BIGINT | Medical transaction count |
| adult_use_sales | DOUBLE | Adult-use revenue |
| adult_use_tickets | BIGINT | Adult-use transaction count |
| total_tickets | BIGINT | Total transactions |
| total_sales | DOUBLE | Total revenue |
| month | INTEGER | Month number |
| year | INTEGER | Year |
| report_date | DATE | First day of the report month |

Also **idempotent**: checks which year/month combos are already loaded and skips them.

```bash
python scripts/nm_cannabis_etl.py
```

> **Note:** The `nm_cannabis` database must be created manually in the [MotherDuck web portal](https://app.motherduck.com) before running this script.

---

## nm_cannabis_export.py

Exports both MotherDuck tables to Snappy-compressed Parquet files for static serving in the frontend.

```bash
python scripts/nm_cannabis_export.py
```

**Output:**
- `frontend/public/data/sales_by_licensee.parquet`
- `frontend/public/data/sales_by_city.parquet`

These files are committed to the repo and served as static assets by Vercel. The React frontend queries them directly in the browser using DuckDB WASM — no backend required.
