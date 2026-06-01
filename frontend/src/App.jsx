import { useState, useEffect, useCallback } from "react";
import { useDuckDB } from "./hooks/useDuckDB";
import SalesTrend from "./components/SalesTrend";
import Leaderboard from "./components/Leaderboard";
import CityComparison from "./components/CityComparison";
import StatCard from "./components/StatCard";
import "./App.css";

const PARQUET_BASE = `${window.location.origin}/data`;

export default function App() {
  const { loading: dbLoading, error: dbError, query } = useDuckDB();
  const [dataReady, setDataReady] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedYear, setSelectedYear] = useState("all");
  const [activeTab, setActiveTab] = useState("trends");

  const runQuery = useCallback(
    async (sql) => {
      if (!dataReady) return [];
      return query(sql);
    },
    [dataReady, query]
  );

  // Register parquet files once DuckDB is ready
  useEffect(() => {
    if (dbLoading || dbError) return;
    (async () => {
      try {
        await query(
          `CREATE OR REPLACE VIEW licensee AS SELECT * FROM read_parquet('${PARQUET_BASE}/sales_by_licensee.parquet')`
        );
        await query(
          `CREATE OR REPLACE VIEW city AS SELECT * FROM read_parquet('${PARQUET_BASE}/sales_by_city.parquet')`
        );
        setDataReady(true);
      } catch (e) {
        console.error("Failed to register parquet views:", e);
      }
    })();
  }, [dbLoading, dbError]);

  // Load summary stats
  useEffect(() => {
    if (!dataReady) return;
    (async () => {
      const yearFilter =
        selectedYear === "all" ? "" : `WHERE year = ${selectedYear}`;
      const [totals] = await query(`
        SELECT
          ROUND(SUM(total_sales) / 1e6, 1)    AS total_sales_m,
          ROUND(SUM(medical_sales) / 1e6, 1)  AS medical_m,
          ROUND(SUM(adult_use_sales) / 1e6, 1) AS adult_use_m,
          COUNT(DISTINCT licensee)             AS licensee_count
        FROM licensee ${yearFilter}
      `);
      setStats(totals);
    })();
  }, [dataReady, selectedYear]);

  const years = ["all", "2022", "2023", "2024", "2025", "2026"];

  if (dbError) {
    return (
      <div className="error-state">
        <p>Failed to initialize database: {dbError}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-title">
            <span className="header-eyebrow">New Mexico</span>
            <h1>Cannabis Market</h1>
            <span className="header-sub">Sales Intelligence Dashboard</span>
          </div>
          <div className="year-filter">
            {years.map((y) => (
              <button
                key={y}
                className={`year-btn ${selectedYear === y ? "active" : ""}`}
                onClick={() => setSelectedYear(y)}
              >
                {y === "all" ? "All Years" : y}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="main">
        {/* Stats Row */}
        <div className="stats-row">
          <StatCard
            label="Total Sales"
            value={stats ? `$${stats.total_sales_m}M` : "—"}
            loading={!stats}
            accent="green"
          />
          <StatCard
            label="Adult-Use Sales"
            value={stats ? `$${stats.adult_use_m}M` : "—"}
            loading={!stats}
            accent="teal"
          />
          <StatCard
            label="Medical Sales"
            value={stats ? `$${stats.medical_m}M` : "—"}
            loading={!stats}
            accent="sage"
          />
          <StatCard
            label="Active Licensees"
            value={stats ? stats.licensee_count?.toLocaleString() : "—"}
            loading={!stats}
            accent="amber"
          />
        </div>

        {/* Tab Nav */}
        <nav className="tab-nav">
          {[
            { id: "trends", label: "Sales Trends" },
            { id: "leaderboard", label: "Top Licensees" },
            { id: "cities", label: "City Breakdown" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Panels */}
        <div className="panel">
          {!dataReady ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {activeTab === "trends" && (
                <SalesTrend query={runQuery} selectedYear={selectedYear} />
              )}
              {activeTab === "leaderboard" && (
                <Leaderboard query={runQuery} selectedYear={selectedYear} />
              )}
              {activeTab === "cities" && (
                <CityComparison query={runQuery} selectedYear={selectedYear} />
              )}
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>
          Data sourced from{" "}
          <a href="https://crop.rld.nm.gov" target="_blank" rel="noreferrer">
            NM Regulation & Licensing Department
          </a>{" "}
          · Updated monthly
        </p>
      </footer>
    </div>
  );
}