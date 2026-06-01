# NM Cannabis Sales Dashboard

A full-stack data pipeline and analytics dashboard tracking New Mexico cannabis market sales since legalization in 2022.

Live at: [https://project-es7vc.vercel.app/](https://project-es7vc.vercel.app/)

---

## What it does

New Mexico's Regulation & Licensing Department publishes monthly cannabis sales reports as Excel files. This project automates pulling that data, loading it into a cloud database, and serving it through an interactive dashboard — all with a stack that runs essentially free.

---

## Architecture
```
CROP Portal (NM RLD)
       │
       │  Public API (reverse engineered)
       ▼
nm_cannabis_downloader.py
       │
       │  .xlsx files → data/raw/<year>/
       ▼
nm_cannabis_etl.py
       │
       │  pandas → normalized DataFrames → MotherDuck (DuckDB)
       ▼
nm_cannabis_export.py
       │
       │  DuckDB → .parquet files → frontend/public/data/
       ▼
React + Vite (frontend)
       │
       │  DuckDB WASM queries parquet files in the browser
       ▼
Vercel (static hosting)
```

The project has no backend server. No API keys exposed in the browser. The dashboard queries parquet files directly in the browser via DuckDB WebAssembly.

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Data source | NM CROP Portal API | Public, unauthenticated REST API |
| File format | `.xlsx` (Excel) | What the state publishes |
| ETL | Python + pandas + openpyxl/xlrd | Reads, normalizes, and loads Excel files |
| Database | MotherDuck (DuckDB) | Columnar, analytical, free tier |
| Storage format | Parquet (Snappy compressed) | Fast, compact, queryable in-browser |
| Frontend | React + Vite | Component-based UI, fast dev experience |
| Charting | Recharts | Composable React charts |
| In-browser SQL | DuckDB WASM | Queries parquet files client-side, zero latency |
| Hosting | Vercel | Free static hosting with custom domain support |

---

## Project Structure
```
NM_Cannabis_Sales/
├── scripts/               # Python data pipeline
│   ├── nm_cannabis_downloader.py
│   ├── nm_cannabis_etl.py
│   └── nm_cannabis_export.py
├── data/
│   └── raw/               # Downloaded .xlsx files (gitignored)
│       ├── 2022/
│       ├── 2023/
│       ├── 2024/
│       ├── 2025/
│       └── 2026/
├── frontend/              # React dashboard
│   ├── public/
│   │   └── data/          # Parquet files served statically
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── vercel.json
│   └── vite.config.js
└── venv/                  # Python virtual environment (gitignored)
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A free [MotherDuck](https://motherduck.com) account

### 1. Clone and set up Python environment

```bash
git clone https://github.com/yourusername/NM_Cannabis_Sales.git
cd NM_Cannabis_Sales
python -m venv venv
source venv/bin/activate  # or venv/bin/activate.fish on fish shell
pip install requests pandas openpyxl xlrd duckdb motherduck
```

### 2. Download the data

```bash
python scripts/nm_cannabis_downloader.py
```

### 3. Load into MotherDuck

Create a database called `nm_cannabis` in the [MotherDuck web portal](https://app.motherduck.com), also create an access token then:

```bash
export MOTHERDUCK_TOKEN="your_token_here"
python scripts/nm_cannabis_etl.py
```

### 4. Export to Parquet

```bash
python scripts/nm_cannabis_export.py
```

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Monthly Update Workflow

When NM publishes new data (usually mid-month):

```bash
source venv/bin/activate.fish
export MOTHERDUCK_TOKEN=your_token_here
python scripts/nm_cannabis_downloader.py
python scripts/nm_cannabis_etl.py
python scripts/nm_cannabis_export.py

git add frontend/public/data/
git commit -m "data: add <month> <year> sales data"
git push origin main
```

Vercel auto-deploys on push to `main`.

---

## Data Sources

All data is sourced from the [NM Cannabis Reporting Online Portal (CROP)](https://crop.rld.nm.gov/data-catalog.html), published by the New Mexico Regulation & Licensing Department. Two report types are available:

- **Sales by Licensee** — individual dispensary revenue broken down by medical and adult-use
- **Sales by City** — aggregated city-level revenue with transaction ticket counts

Data goes back to April 2022 (the first month of adult-use sales in New Mexico).

---

## License

MIT
