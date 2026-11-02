import './Badge.css';

const BADGE_VARIANTS = {
  // Status
  'aktif': 'badge--green',
  'nonaktif': 'badge--neutral',
  'lunas': 'badge--green',
  'paid': 'badge--green',
  'unpaid': 'badge--red',
  'belum lunas': 'badge--red',
  'overdue': 'badge--yellow',
  'pending': 'badge--yellow',
  // Instansi
  'sma': 'badge--blue',
  'smk': 'badge--orange',
  'ma': 'badge--purple',
  'mts': 'badge--yellow',
  'smp': 'badge--teal',
  // Categories
  'spp': 'badge--orange',
  'infaq': 'badge--green',
  'makan': 'badge--blue',
  'lainnya': 'badge--neutral',
  // Income/Outcome
  'income': 'badge--green',
  'outcome': 'badge--red',
};

export default function Badge({ children, variant, className = '' }) {
  const text = typeof children === 'string' ? children.toLowerCase() : '';
  const autoVariant = variant || BADGE_VARIANTS[text] || 'badge--neutral';

  return (
    <span className={`badge ${autoVariant} ${className}`}>
      {children}
    </span>
  );
}
