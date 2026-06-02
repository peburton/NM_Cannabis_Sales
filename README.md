# NM Cannabis Sales Dashboard

A full-stack data pipeline and analytics dashboard tracking New Mexico cannabis market sales since legalization in 2022.

Live at: [your-url.vercel.app](https://your-url.vercel.app)

---

## What it does

New Mexico's Regulation & Licensing Department publishes monthly cannabis sales reports as Excel files. This project automates pulling that data, loading it into a cloud database, and serving it through an interactive dashboard — all with a stack that runs essentially free.

---

## Architecture

```
GitHub Actions (runs on the 15th of every month)
       │
       │  spins up a disposable Ubuntu VM
       ▼
nm_cannabis_downloader.py
       │
       │  hits CROP public API → downloads .xlsx files to VM disk
       ▼
nm_cannabis_etl.py
       │
       │  pandas → normalized DataFrames → MotherDuck (DuckDB)
       ▼
nm_cannabis_export.py
       │
       │  MotherDuck → .parquet files → frontend/public/data/
       ▼
git commit + push (parquet files only)
       │
       │  VM is destroyed — .xlsx files are gone
       ▼
Vercel (auto-deploys on push to main)
       │
       │  DuckDB WASM queries parquet files in the browser
       ▼
React + Vite dashboard
```

No backend server. No API keys exposed in the browser. The raw `.xlsx` files never touch the repo — they live briefly on the GitHub Actions runner during each pipeline run, then disappear. Only the Parquet files are committed.

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
| CI/CD | GitHub Actions | Automated monthly pipeline on a disposable runner |
| Hosting | Vercel | Free static hosting, auto-deploys on push |

---

## Project Structure

```
NM_Cannabis_Sales/
├── .github/
│   └── workflows/
│       └── monthly-pipeline.yml  # automated data pipeline
├── scripts/                      # Python data pipeline
│   ├── nm_cannabis_downloader.py
│   ├── nm_cannabis_etl.py
│   └── nm_cannabis_export.py
├── frontend/                     # React dashboard
│   ├── public/
│   │   └── data/                 # Parquet files served statically
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── vercel.json
│   └── vite.config.js
├── requirements.txt              # Python dependencies
└── venv/                         # Python virtual environment (gitignored)
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

Create a database called `nm_cannabis` in the [MotherDuck web portal](https://app.motherduck.com), then:

```bash
export MOTHERDUCK_TOKEN=your_token_here
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

Data updates are fully automated via GitHub Actions. On the 15th of every month a disposable Ubuntu runner:

1. Downloads any new `.xlsx` files from the CROP portal
2. Normalizes and loads them into MotherDuck
3. Exports updated Parquet files
4. Commits the Parquet files to `main` and destroys itself
5. Vercel detects the push and auto-redeploys the dashboard

You can also trigger a manual run anytime from the **Actions** tab in your GitHub repo.

To set up the automation on a fresh clone, add your MotherDuck token as a GitHub secret:

**Repo → Settings → Secrets and variables → Actions → New repository secret**
- Name: `MOTHERDUCK_TOKEN`
- Value: your token from [app.motherduck.com](https://app.motherduck.com)

Also ensure workflow write permissions are enabled:

**Repo → Settings → Actions → General → Workflow permissions → Read and write permissions**

---

## Data Sources

All data is sourced from the [NM Cannabis Reporting Online Portal (CROP)](https://crop.rld.nm.gov/data-catalog.html), published by the New Mexico Regulation & Licensing Department. Two report types are available:

- **Sales by Licensee** — individual dispensary revenue broken down by medical and adult-use
- **Sales by City** — aggregated city-level revenue with transaction ticket counts

Data goes back to April 2022 (the first month of adult-use sales in New Mexico).

---

## License

MIT
