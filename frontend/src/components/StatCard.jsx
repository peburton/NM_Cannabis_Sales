export default function StatCard({ label, value, loading, accent }) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-label">{label}</div>
      {loading ? (
        <div className="stat-loading" />
      ) : (
        <div className="stat-value">{value}</div>
      )}
    </div>
  );
}