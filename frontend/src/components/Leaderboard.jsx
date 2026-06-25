import { useState, useEffect } from "react";

export default function Leaderboard({ query, selectedYear }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("total_sales");
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const yearFilter = selectedYear === "all" ? "" : `WHERE year = ${selectedYear}`;
    query(`
      SELECT
        licensee,
        city,
        state,
        ROUND(SUM(total_sales), 2)     AS total_sales,
        ROUND(SUM(medical_sales), 2)   AS medical_sales,
        ROUND(SUM(adult_use_sales), 2) AS adult_use_sales
      FROM licensee
      ${yearFilter}
      GROUP BY licensee, city, state
      ORDER BY ${metric} DESC
      LIMIT ${limit}
    `).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [query, selectedYear, metric, limit]);


  const filteredRows = rows.filter(row=>
    row.licensee?.toLowerCase().includes(search.toLowerCase()) ||
    row.city?.toLowerCase().includes(search.toLowerCase())
  );

  const maxVal = filteredRows.length > 0 ? Number(filteredRows[0][metric]) : 1;

  const fmt = (v) => {
    const n = Number(v);
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Ranking licensees...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div className="section-title">Top Licensees</div>
          <div className="section-sub">Ranked by sales volume</div>
        </div>
        <div className="leaderboard-controls">
          <input
            type="text"
            placeholder="Search licensee or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: "12px",
              background: "#1a1d1a",
              border: "1px solid #2a2e2a",
              color: "#e8ede8",
              padding: "6px 10px",
              borderRadius: "4px",
              width: "220px",
            }}
          />
          <label>Sort by</label>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="total_sales">Total Sales</option>
            <option value="adult_use_sales">Adult-Use Sales</option>
            <option value="medical_sales">Medical Sales</option>
          </select>
          <label>Show</label>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      </div>
      
      {search && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#5a665a", marginBottom: 12 }}>
          {filteredRows.length} result{filteredRows.length !== 1 ? "s" : ""} for "{search}"
        </p>
      )}
      <table className="lb-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Licensee</th>
            <th>City</th>
            <th className="right">Total Sales</th>
            <th className="right">Adult-Use</th>
            <th className="right">Medical</th>
            <th className="lb-bar-cell"></th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, i) => (
            <tr key={i}>
              <td className="lb-rank">{i + 1}</td>
              <td style={{ maxWidth: 280, fontSize: 13 }}>{row.licensee}</td>
              <td style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#9aa89a" }}>
                {row.city}, {row.state}
              </td>
              <td className="right sales-green">{fmt(row.total_sales)}</td>
              <td className="right" style={{ color: "#4caf72", opacity: 0.75 }}>{fmt(row.adult_use_sales)}</td>
              <td className="right sales-teal">{fmt(row.medical_sales)}</td>
              <td className="lb-bar-cell">
                <div className="lb-bar-wrap">
                  <div
                    className="lb-bar-fill"
                    style={{ width: `${(Number(row[metric]) / maxVal) * 100}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
