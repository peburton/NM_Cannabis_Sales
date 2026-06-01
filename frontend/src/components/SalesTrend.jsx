import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                     "Jul","Aug","Sep","Oct","Nov","Dec"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a1d1a", border: "1px solid #2a2e2a",
      padding: "12px 16px", borderRadius: "4px",
      fontFamily: "DM Mono, monospace", fontSize: "12px"
    }}>
      <p style={{ color: "#9aa89a", marginBottom: 8, letterSpacing: "0.05em" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 4 }}>
          {p.name}: ${(p.value / 1e6).toFixed(1)}M
        </p>
      ))}
    </div>
  );
};

export default function SalesTrend({ query, selectedYear }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("both");

  useEffect(() => {
    setLoading(true);
    const yearFilter = selectedYear === "all" ? "" : `WHERE year = ${selectedYear}`;
    query(`
      SELECT
        year, month,
        ROUND(SUM(medical_sales) / 1e6, 2)   AS medical,
        ROUND(SUM(adult_use_sales) / 1e6, 2) AS adult_use,
        ROUND(SUM(total_sales) / 1e6, 2)     AS total
      FROM licensee
      ${yearFilter}
      GROUP BY year, month
      ORDER BY year, month
    `).then((rows) => {
      const formatted = rows.map((r) => ({
        ...r,
        label: `${MONTH_NAMES[Number(r.month) - 1]} ${r.year}`,
      }));
      setData(formatted);
      setLoading(false);
    });
  }, [query, selectedYear]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Querying sales trends...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div className="section-title">Sales Over Time</div>
          <div className="section-sub">Monthly revenue · millions USD</div>
        </div>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          style={{
            fontFamily: "DM Mono, monospace", fontSize: "12px",
            background: "#1a1d1a", border: "1px solid #2a2e2a",
            color: "#e8ede8", padding: "6px 10px", borderRadius: "4px", cursor: "pointer"
          }}
        >
          <option value="both">Medical + Adult-Use</option>
          <option value="total">Total Only</option>
          <option value="medical">Medical Only</option>
          <option value="adult_use">Adult-Use Only</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e2a" />
          <XAxis
            dataKey="label"
            angle={-45}
            textAnchor="end"
            tick={{ fill: "#5a665a", fontFamily: "DM Mono", fontSize: 11 }}
            interval={selectedYear === "all" ? 3 : 0}
          />
          <YAxis
            tick={{ fill: "#5a665a", fontFamily: "DM Mono", fontSize: 11 }}
            tickFormatter={(v) => `$${v}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: "DM Mono", fontSize: 11, color: "#9aa89a", paddingTop: 16 }}
          />
          {(metric === "both" || metric === "adult_use") && (
            <Line
              type="monotone" dataKey="adult_use" name="Adult-Use"
              stroke="#4caf72" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
            />
          )}
          {(metric === "both" || metric === "medical") && (
            <Line
              type="monotone" dataKey="medical" name="Medical"
              stroke="#3db8a0" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
            />
          )}
          {metric === "total" && (
            <Line
              type="monotone" dataKey="total" name="Total"
              stroke="#d4a843" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}