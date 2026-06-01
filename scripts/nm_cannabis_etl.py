"""
NM Cannabis Sales ETL
----------------------
Reads all .xlsx files from data/raw/, normalizes them, and loads into MotherDuck.

Tables created:
  - sales_by_licensee  (one row per licensee per month)
  - sales_by_city      (one row per city per month)

Usage:
    export MOTHERDUCK_TOKEN=your_token_here
    python nm_cannabis_etl.py

Dependencies:
    pip install pandas openpyxl xlrd duckdb motherduck
"""

import os
import re
import pandas as pd
import duckdb

# ── Config ────────────────────────────────────────────────────────────────────
RAW_DIR        = "data/raw"
MOTHERDUCK_DB  = "nm_cannabis"   # The DB must be created manually in the MotherDuck web portal first
                               # https://app.motherduck.com → New Database

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3,     "april": 4,
    "may": 5,     "june": 6,     "july": 7,       "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_month_year(filename: str) -> tuple[int, int] | tuple[None, None]:
    """Extract (month_int, year_int) from a filename like 'April 2025 Market Sales by City.xlsx'."""
    name = filename.lower()
    year_match = re.search(r"(202[2-9]|203\d)", name)
    year = int(year_match.group()) if year_match else None

    month = None
    for month_name, month_num in MONTH_MAP.items():
        if month_name in name:
            month = month_num
            break

    return month, year


def is_city_file(filename: str) -> bool:
    name = filename.lower()
    return "city" in name


def is_licensee_file(filename: str) -> bool:
    name = filename.lower()
    return "licensee" in name or "license" in name


def normalize_licensee_df(df: pd.DataFrame, month: int, year: int) -> pd.DataFrame:
    """Clean and normalize a licensee sales dataframe."""
    # Drop fully empty columns and rows
    df = df.dropna(axis=1, how="all").dropna(subset=["Licensee"])

    # Standardize column names
    df = df.rename(columns={
        "Licensee":       "licensee",
        "Address":        "address",
        "City":           "city",
        "State":          "state",
        "Zip":            "zip",
        "Medical Sales":  "medical_sales",
        "Adult-Use Sales": "adult_use_sales",
        "Total Sales":    "total_sales",
    })

    # Keep only known columns (drop any extra junk)
    keep = ["licensee", "address", "city", "state", "zip",
            "medical_sales", "adult_use_sales", "total_sales"]
    df = df[[c for c in keep if c in df.columns]]

    # Add time columns
    df["month"] = month
    df["year"]  = year
    df["report_date"] = pd.Timestamp(year=year, month=month, day=1)

    # Clean up types
    for col in ["medical_sales", "adult_use_sales", "total_sales"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df["zip"] = df["zip"].astype(str).str.strip().str.split(".").str[0]

    return df.reset_index(drop=True)


def normalize_city_df(df: pd.DataFrame, month: int, year: int) -> pd.DataFrame:
    """Clean and normalize a city sales dataframe."""
    # Drop fully empty columns and rows
    df = df.dropna(axis=1, how="all").dropna(subset=["City"])

    # Standardize column names — note "Recreational Sales" = "Adult-Use Sales"
    df = df.rename(columns={
        "City":                  "city",
        "Medical Sales":         "medical_sales",
        "Medical Tickets":       "medical_tickets",
        "Recreational Sales":    "adult_use_sales",   # normalize naming
        "Adult-Use Sales":       "adult_use_sales",
        "Recreational Tickets":  "adult_use_tickets",
        "Adult-Use Tickets":     "adult_use_tickets",
        "Total Tickets":         "total_tickets",
        "Total Sales":           "total_sales",
    })

    keep = ["city", "medical_sales", "medical_tickets",
            "adult_use_sales", "adult_use_tickets",
            "total_tickets", "total_sales"]
    df = df[[c for c in keep if c in df.columns]]

    # Add time columns
    df["month"] = month
    df["year"]  = year
    df["report_date"] = pd.Timestamp(year=year, month=month, day=1)

    # Clean up types
    for col in ["medical_sales", "adult_use_sales", "total_sales"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in ["medical_tickets", "adult_use_tickets", "total_tickets"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")

    df["city"] = df["city"].str.strip().str.upper()

    return df.reset_index(drop=True)


# ── Main ETL ──────────────────────────────────────────────────────────────────

def main():
    token = os.environ.get("MOTHERDUCK_TOKEN")
    if not token:
        raise EnvironmentError(
            "MOTHERDUCK_TOKEN not set. Run: export MOTHERDUCK_TOKEN=your_token_here"
        )

    print(f"Connecting to MotherDuck database '{MOTHERDUCK_DB}'...")
    con = duckdb.connect(f"md:{MOTHERDUCK_DB}?motherduck_token={token}")

    # Create tables if they don't exist
    con.execute("""
        CREATE TABLE IF NOT EXISTS sales_by_licensee (
            licensee        VARCHAR,
            address         VARCHAR,
            city            VARCHAR,
            state           VARCHAR,
            zip             VARCHAR,
            medical_sales   DOUBLE,
            adult_use_sales DOUBLE,
            total_sales     DOUBLE,
            month           INTEGER,
            year            INTEGER,
            report_date     DATE
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS sales_by_city (
            city              VARCHAR,
            medical_sales     DOUBLE,
            medical_tickets   BIGINT,
            adult_use_sales   DOUBLE,
            adult_use_tickets BIGINT,
            total_tickets     BIGINT,
            total_sales       DOUBLE,
            month             INTEGER,
            year              INTEGER,
            report_date       DATE
        )
    """)

    # Track what's already loaded to avoid duplicates
    loaded_licensee = set(
        con.execute("SELECT year, month FROM sales_by_licensee GROUP BY year, month").fetchall()
    )
    loaded_city = set(
        con.execute("SELECT year, month FROM sales_by_city GROUP BY year, month").fetchall()
    )

    licensee_count = 0
    city_count     = 0
    skipped        = 0
    errors         = 0

    for year_dir in sorted(os.listdir(RAW_DIR)):
        year_path = os.path.join(RAW_DIR, year_dir)
        if not os.path.isdir(year_path):
            continue

        print(f"\n📁 {year_dir}")

        for filename in sorted(os.listdir(year_path)):
            if not filename.endswith(".xlsx"):
                continue

            filepath = os.path.join(year_path, filename)
            month, year = parse_month_year(filename)

            if not month or not year:
                print(f"  ⚠ could not parse date from: {filename}")
                continue

            try:
                if is_licensee_file(filename):
                    if (year, month) in loaded_licensee:
                        print(f"  ✓ already loaded: {filename}")
                        skipped += 1
                        continue
                    df = pd.read_excel(filepath)
                    df = normalize_licensee_df(df, month, year)
                    con.execute("INSERT INTO sales_by_licensee SELECT * FROM df")
                    loaded_licensee.add((year, month))
                    print(f"  ↑ licensee: {filename} ({len(df)} rows)")
                    licensee_count += len(df)

                elif is_city_file(filename):
                    if (year, month) in loaded_city:
                        print(f"  ✓ already loaded: {filename}")
                        skipped += 1
                        continue
                    df = pd.read_excel(filepath)
                    df = normalize_city_df(df, month, year)
                    con.execute("INSERT INTO sales_by_city SELECT * FROM df")
                    loaded_city.add((year, month))
                    print(f"  ↑ city:     {filename} ({len(df)} rows)")
                    city_count += len(df)

                else:
                    print(f"  ? unknown file type, skipping: {filename}")

            except Exception as e:
                print(f"  ✗ ERROR loading {filename}: {e}")
                errors += 1

    print(f"""
✅ ETL complete
   Licensee rows inserted : {licensee_count}
   City rows inserted     : {city_count}
   Skipped (already loaded): {skipped}
   Errors                 : {errors}
""")
    con.close()


if __name__ == "__main__":
    main()
