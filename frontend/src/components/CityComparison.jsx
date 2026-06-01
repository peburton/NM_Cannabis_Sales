import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a1d1a", border: "1px solid #2a2e2a",
      padding: "12px 16px", borderRadius: "4px",
      fontFamily: "DM Mono, monospace", fontSize: "12px"
    }}>
      <p style={{ color: "#9aa89a", marginBottom: 8 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 4 }}>
          {p.name}: ${p.value >= 1000 ? (p.value / 1000).toFixed(2) + 'B' : p.value.toFixed(1) + 'M'}
        </p>
      ))}
    </div>
  );
};

export default function CityComparison({ query, selectedYear }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    setLoading(true);
    const yearFilter = selectedYear === "all" ? "" : `WHERE year = ${selectedYear}`;
    query(`
      SELECT
        city,
        ROUND(SUM(adult_use_sales) / 1e6, 2) AS adult_use,
        ROUND(SUM(medical_sales) / 1e6, 2)   AS medical,
        ROUND(SUM(total_sales) / 1e6, 2)     AS total
      FROM city
      ${yearFilter}
      GROUP BY city
      ORDER BY total DESC
      LIMIT ${limit}
    `).then((rows) => {
      setData(rows.map(r => ({
        ...r,
        adult_use: Number(r.adult_use),
        medical: Number(r.medical),
        total: Number(r.total),
      })));
      setLoading(false);
    });
  }, [query, selectedYear, limit]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Aggregating city data...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div className="section-title">Sales by City</div>
          <div className="section-sub">Cumulative revenue · USD</div>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={{
            fontFamily: "DM Mono, monospace", fontSize: "12px",
            background: "#1a1d1a", border: "1px solid #2a2e2a",
            color: "#e8ede8", padding: "6px 10px", borderRadius: "4px", cursor: "pointer"
          }}
        >
          <option value={10}>Top 10 Cities</option>
          <option value={15}>Top 15 Cities</option>
          <option value={25}>Top 25 Cities</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e2a" vertical={false} />
          <XAxis
            dataKey="city"
            angle={-45}
            textAnchor="end"
            tick={{ fill: "#5a665a", fontFamily: "DM Mono", fontSize: 11 }}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#5a665a", fontFamily: "DM Mono", fontSize: 11 }}
            tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: "DM Mono", fontSize: 11, color: "#9aa89a", paddingTop: 16 }}
          />
          <Bar dataKey="adult_use" name="Adult-Use" stackId="a" fill="#4caf72" radius={[0,0,0,0]} />
          <Bar dataKey="medical"   name="Medical"   stackId="a" fill="#3db8a0" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}