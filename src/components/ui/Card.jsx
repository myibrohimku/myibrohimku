import './Card.css';

export default function Card({
  children,
  className = '',
  padding = true,
  hover = false,
  onClick,
  ...props
}) {
  return (
    <div
      className={`card ${padding ? 'card--padded' : ''} ${hover ? 'card--hover' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, title, value, trend, trendValue, color = 'primary', children }) {
  const trendClass = trend === 'up' ? 'stat-card__trend--up' : 'stat-card__trend--down';

  return (
    <div className={`card card--padded stat-card stat-card--${color}`}>
      <div className="stat-card__bg" />
      <div className="stat-card__header">
        <div className="stat-card__info">
          <span className="stat-card__title">{title}</span>
        </div>
        {Icon && (
          <div className={`stat-card__icon stat-card__icon--${color}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
      <div className="stat-card__value">{value}</div>
      {trendValue && (
        <div className={`stat-card__trend ${trendClass}`}>
          <span>{trend === 'up' ? '↑' : '↓'} {trendValue}</span>
          <span className="stat-card__trend-label">dari bulan lalu</span>
        </div>
      )}
      {children}
    </div>
  );
}
