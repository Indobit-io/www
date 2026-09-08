export default function Stat({
  label,
  value,
  sub,
  valueClass = "",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-cmc-text-muted">{label}</div>
      <div className={`mono mt-1 text-xl font-semibold ${valueClass}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[12px] text-cmc-text-secondary">{sub}</div> : null}
    </div>
  );
}
