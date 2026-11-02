import './FilterPill.css';

export default function FilterPill({ filters, active, onChange }) {
  return (
    <div className="filter-pills">
      {filters.map((f) => (
        <button
          key={f.value}
          className={`filter-pill ${active === f.value ? 'filter-pill--active' : ''} ${f.color ? `filter-pill--${f.color}` : ''}`}
          onClick={() => onChange(f.value)}
          type="button"
        >
          {f.label}
          {f.count !== undefined && <span className="filter-pill__count">{f.count}</span>}
        </button>
      ))}
    </div>
  );
}
