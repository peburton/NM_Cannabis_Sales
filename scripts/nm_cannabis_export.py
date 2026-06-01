"""
NM Cannabis Sales — MotherDuck to Parquet Export
--------------------------------------------------
Exports sales_by_licensee and sales_by_city tables from MotherDuck
to Parquet files for static serving with DuckDB WASM.

Output:
    frontend/public/data/sales_by_licensee.parquet
    frontend/public/data/sales_by_city.parquet

Usage:
    export MOTHERDUCK_TOKEN=your_token_here
    python scripts/nm_cannabis_export.py

Run this once after ETL, and again each month when new data is loaded.
Can be automated with GitHub Actions.

Dependencies:
    pip install duckdb motherduck (be careful of version some versions do not work with remote DB)
"""

import os
import duckdb

# ── Config ────────────────────────────────────────────────────────────────────
MOTHERDUCK_DB = "nm_cannabis"
OUTPUT_DIR    = "frontend/public/data"

EXPORTS = [
    {
        "table":    "sales_by_licensee",
        "filename": "sales_by_licensee.parquet",
        "query":    "SELECT * FROM nm_cannabis.sales_by_licensee",
    },
    {
        "table":    "sales_by_city",
        "filename": "sales_by_city.parquet",
        "query":    "SELECT * FROM nm_cannabis.sales_by_city",
    },
]


def main():
    token = os.environ.get("MOTHERDUCK_TOKEN")
    if not token:
        raise EnvironmentError(
            "MOTHERDUCK_TOKEN not set. Run: export MOTHERDUCK_TOKEN=your_token_here"
        )

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Connecting to MotherDuck '{MOTHERDUCK_DB}'...")
    con = duckdb.connect(f"md:{MOTHERDUCK_DB}?motherduck_token={token}")

    for export in EXPORTS:
        dest = os.path.join(OUTPUT_DIR, export["filename"])
        print(f"  Exporting {export['table']} → {dest} ...", end=" ", flush=True)

        con.execute(f"""
            COPY ({export['query']})
            TO '{dest}'
            (FORMAT PARQUET, COMPRESSION SNAPPY)
        """)

        # Print row count for verification
        count = con.execute(f"SELECT COUNT(*) FROM '{dest}'").fetchone()[0]
        print(f"done ({count:,} rows)")

    con.close()
    print("\n✅ Export complete. Parquet files are in frontend/public/data/")
    print("   Commit them to your repo or run 'npm run dev' to test locally.")


if __name__ == "__main__":
    main()