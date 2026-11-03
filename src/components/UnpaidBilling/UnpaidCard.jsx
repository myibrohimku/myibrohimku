import { Send, FileText, ChevronDown, ChevronUp, CheckCircle, X } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatRupiah } from '../../data/dummyData';

export default function UnpaidCard({
  item,
  expandedId,
  toggleExpand,
  categories,
  categoryPrefix,
  year,
  handleSendSingleWA,
  handleSendWA,
  handlePrintPDF
}) {
  const isExpanded = expandedId === item.id;
  const hasDebt = item.totalTunggakan > 0;

  return (
    <div 
      className={`card unpaid-card ${isExpanded ? 'unpaid-card--expanded' : ''} ${hasDebt ? 'unpaid-card--has-debt' : 'unpaid-card--clean'}`}
      style={{ borderLeftColor: hasDebt ? 'var(--red-200)' : 'var(--green-200)' }}
    >
      <div className="unpaid-card__main" onClick={() => toggleExpand(item.id)}>
        <div className="unpaid-card__info">
          <div className="unpaid-card__header">
            <h3 className="unpaid-card__name">{item.nama}</h3>
            {item.isNonAktif && (
              <Badge variant="badge--red">NON-AKTIF</Badge>
            )}
            <Badge variant={hasDebt ? 'badge--red' : (item.hasTarget ? 'badge--green' : 'badge--neutral')}>
              {hasDebt ? 'TUNGGAKAN' : (item.hasTarget ? 'LUNAS' : 'BELUM DISET')}
            </Badge>
            <Badge variant="badge--neutral">{item.kamar}</Badge>
          </div>
          
          <div className="unpaid-card__amount">
            <span className="unpaid-card__total-label">Total Tunggakan:</span>
            <span className="unpaid-card__total-value" style={{ color: hasDebt ? 'var(--red-200)' : (item.hasTarget ? 'var(--green-200)' : 'var(--text-tertiary)') }}>
              {formatRupiah(item.totalTunggakan)}
            </span>
          </div>
        </div>
        <div className="unpaid-card__chevron">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="unpaid-card__details animate-fade-in">
          <div className="unpaid-card__item-list">
            {item.months.map((m) => (
              <div key={m.id} className={`unpaid-item ${m.isPaid ? 'unpaid-item--paid' : ''}`}>
                <div className="unpaid-item__label">
                  <span className="unpaid-item__cat">
                    {categories.find(c => c.value === categoryPrefix)?.label || 'Iuran'}
                  </span>
                  <span className="unpaid-item__month">{m.name} {year}</span>
                </div>
                <div className="unpaid-item__price" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {m.isCleared ? (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <X size={14} /> DIHAPUS
                    </span>
                  ) : m.isEmpty ? (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      TIDAK ADA TAGIHAN
                    </span>
                  ) : m.isPaid ? (
                    <span style={{ color: 'var(--green-300)', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> LUNAS
                    </span>
                  ) : (
                    <>
                      {formatRupiah(m.diff)}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSendSingleWA(item, m); }}
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          color: 'var(--primary-500)', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px',
                          borderRadius: '4px'
                        }}
                        title={`Kirim pengingat untuk bulan ${m.name}`}
                        className="hover-bg-primary-50"
                      >
                        <Send size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="unpaid-card__footer">
            <div className="unpaid-card__footer-total">
              <span className="unpaid-card__footer-label">Total Iuran ({year})</span>
              <span className="unpaid-card__footer-value">{formatRupiah(item.totalTarget)}</span>
            </div>
            <div className="unpaid-card__footer-total" style={{ textAlign: 'right' }}>
              <span className="unpaid-card__footer-label">Sisa Tunggakan</span>
              <span className="unpaid-card__footer-value" style={{ color: 'var(--red-200)' }}>{formatRupiah(item.totalTunggakan)}</span>
            </div>
          </div>

          <div className="unpaid-card__actions">
            <Button 
              variant="outline-primary" 
              icon={Send} 
              onClick={(e) => { e.stopPropagation(); handleSendWA(item); }}
              disabled={!hasDebt}
            >
              Kirim WA
            </Button>
            <Button 
              variant="outline" 
              icon={FileText} 
              onClick={(e) => { e.stopPropagation(); handlePrintPDF(item); }}
            >
              Cetak PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
