import { SearchX } from 'lucide-react';
import './Table.css';

export default function Table({ columns, data, onSort, actions, onRowClick }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`table__th table__th--${col.key} ${col.sortable ? 'table__th--sortable' : ''}`}
                onClick={() => col.sortable && onSort?.(col.key)}
                style={{
                  ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                  textAlign: col.align || 'left'
                }}
              >
                {col.label}
              </th>
            ))}
            {actions && (
              <th className="table__th" style={{ width: '88px', textAlign: 'left' }}>
                Aksi
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="table__empty"
              >
                <div className="table__empty-inner">
                  <div className="table__empty-icon">
                    <SearchX size={24} />
                  </div>
                  <div className="table__empty-title">Tidak ada data ditemukan</div>
                  <div className="table__empty-desc">
                    Coba ubah kata kunci pencarian atau hapus filter yang aktif
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row._unique_id || row.id || `row-${idx}`}
                className={`table__row ${onRowClick ? 'table__row--clickable' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`table__td table__td--${col.key}`}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td
                    className="table__td--actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(row, idx)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
