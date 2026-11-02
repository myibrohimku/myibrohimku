import React from 'react';
import Badge from '../../ui/Badge';

export default function NominalMatrixTable({
  MONTHS,
  filteredSantri,
  checkedSantriIds, handleToggleSantri, handleSelectAllFiltered,
  matrixData, originalMatrix,
  bulkInput, handleMatrixChange, handleBulkInputChange, handleGlobalBulkChange
}) {
  return (
    <div className="matrix-table-container">
      <table className="matrix-table">
        <thead>
          <tr>
            <th className="sticky-col checkbox-col">
              <input 
                type="checkbox" 
                checked={filteredSantri.length > 0 && checkedSantriIds.size === filteredSantri.length}
                onChange={handleSelectAllFiltered}
                title="Pilih Semua (sesuai pencarian)"
              />
            </th>
            <th className="sticky-col name-col">Nama Santri</th>
            {MONTHS.map(m => (
              <th key={m.id}>{m.label}</th>
            ))}
          </tr>
          {/* BULK ACTION ROW */}
          <tr className="bulk-action-row">
            <td className="sticky-col checkbox-col"></td>
            <td className="sticky-col name-col">
              <div className="bulk-label" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-bold text-primary-300">Isi Massal</span>
                  {checkedSantriIds.size > 0 && (
                     <Badge variant="badge--green">{checkedSantriIds.size} terpilih</Badge>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  className="bulk-input"
                  placeholder="Isi 1 Tahun..."
                  onChange={(e) => handleGlobalBulkChange(e.target.value)}
                  disabled={checkedSantriIds.size === 0}
                  title={checkedSantriIds.size === 0 ? "Centang santri terlebih dahulu" : "Terapkan ke SEMUA bulan (1 Tahun) untuk santri tercentang"}
                  style={{ width: '100%' }}
                />
              </div>
            </td>
            {MONTHS.map(m => (
              <td key={m.id}>
                <input
                  type="text"
                  inputMode="numeric"
                  className="bulk-input"
                  placeholder="Massal..."
                  value={bulkInput[m.id] || ''}
                  onChange={(e) => handleBulkInputChange(m.id, e.target.value)}
                  disabled={checkedSantriIds.size === 0}
                  title={checkedSantriIds.size === 0 ? "Centang santri terlebih dahulu" : "Terapkan ke santri tercentang"}
                />
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredSantri.map(s => (
            <tr key={s.id} className={checkedSantriIds.has(s.id) ? 'row-selected' : ''}>
              <td className="sticky-col checkbox-col">
                <input 
                  type="checkbox" 
                  checked={checkedSantriIds.has(s.id)}
                  onChange={() => handleToggleSantri(s.id)}
                />
              </td>
              <td className="sticky-col name-col">
                <div className="santri-name-wrapper">
                  <span className="santri-name">{s.nama}</span>
                  <span className="santri-nia">{s.nia}</span>
                </div>
              </td>
              {MONTHS.map(m => {
                const val = matrixData[s.id]?.[m.id];
                const originalVal = originalMatrix[s.id]?.[m.id];
                const isSaved = originalVal !== undefined && originalVal !== '';
                const isChanged = val !== originalVal && val !== undefined;
                
                return (
                  <td key={m.id} className={`input-cell ${isSaved ? 'cell-saved' : ''} ${isChanged ? 'cell-changed' : ''}`}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={val !== undefined ? val : ''}
                      onChange={(e) => handleMatrixChange(s.id, m.id, e.target.value)}
                      placeholder={isSaved ? '' : '-'}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          {filteredSantri.length === 0 && (
            <tr>
              <td colSpan={14} className="text-center py-8 text-secondary">
                Tidak ada santri yang cocok dengan pencarian.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
