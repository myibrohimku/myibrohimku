import { useState } from 'react';
import { Home, ChevronDown, ChevronUp, UserCheck, UserMinus, BookOpen, RefreshCw } from 'lucide-react';
import { useRoomStats } from '../../hooks/useRoomStats';
import './RoomInfoCard.css';

/** Strip prefix "Kamar " agar label lebih ringkas */
const shortKamar = (name) => name.replace(/^kamar\s+/i, '');

/** Warna status */
const STATUS_COLORS = {
  aktif:    { label: 'Aktif',    cls: 'room-status--aktif' },
  nonAktif: { label: 'Non-aktif', cls: 'room-status--nonaktif' },
  keluar:   { label: 'Keluar',   cls: 'room-status--boyong' },
  alumni:    { label: 'Alumni',    cls: 'room-status--lulus' },
};

function RoomRow({ room }) {
  const [open, setOpen] = useState(false);
  const hasExtra = room.nonAktif > 0 || room.keluar > 0 || room.alumni > 0 || room.instansi.length > 0;
  const isKamarPengurus = room.namaKamar.toLowerCase().includes('pengurus');

  return (
    <div className={`room-row ${open ? 'room-row--open' : ''}`}>
      {/* ── Header baris kamar ── */}
      <button
        className="room-row__header"
        onClick={() => hasExtra && setOpen(o => !o)}
        aria-expanded={open}
        disabled={!hasExtra}
      >
        <div className="room-row__left">
          <Home size={14} className="room-row__icon" />
          <span className="room-row__name">{shortKamar(room.namaKamar)}</span>
          <span className="room-row__total">{room.total} santri</span>
        </div>

        <div className="room-row__right">
          {/* Anggota (pure atau gabungan untuk kamar pengurus) */}
          {(isKamarPengurus ? room.aktif : room.anggota) > 0 && (
            <span className={`room-badge ${STATUS_COLORS.aktif.cls}`} title="Anggota Kamar">
              <UserCheck size={11} /> {isKamarPengurus ? room.aktif : room.anggota} anggota
            </span>
          )}

          {/* Tidak ikut laundry */}
          {room.noLaundry > 0 && (
            <span className="room-badge room-badge--nolaundry" title="Nilai iuran laundry 0 / Tidak ikut">
              {room.noLaundry} no loundry
            </span>
          )}

          {/* Non-aktif / Keluar / Alumni — ringkas */}
          {room.nonAktif > 0 && (
            <span className={`room-badge ${STATUS_COLORS.nonAktif.cls}`}>
              <UserMinus size={11} /> {room.nonAktif}
            </span>
          )}
          {room.keluar > 0 && (
            <span className={`room-badge ${STATUS_COLORS.keluar.cls}`}>
              {room.keluar} keluar
            </span>
          )}
          {room.alumni > 0 && (
            <span className={`room-badge ${STATUS_COLORS.alumni.cls}`}>
              {room.alumni} alumni
            </span>
          )}

          {hasExtra && (
            <span className="room-row__chevron">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </div>
      </button>

      {/* ── Detail expandable ── */}
      {open && (
        <div className="room-row__detail">
          {/* Status breakdown */}
          <div className="room-detail__section">
            <p className="room-detail__title">Status Penghuni</p>
            <div className="room-detail__pills">
              <span className={`room-badge ${STATUS_COLORS.aktif.cls}`}>
                Anggota: {isKamarPengurus ? room.aktif : room.anggota}
              </span>
              {room.noLaundry > 0 && (
                <span className="room-badge room-badge--nolaundry">
                  No Loundry: {room.noLaundry}
                </span>
              )}
              {room.nonAktif > 0 && (
                <span className={`room-badge ${STATUS_COLORS.nonAktif.cls}`}>
                  Non-aktif: {room.nonAktif}
                </span>
              )}
              {room.keluar > 0 && (
                <span className={`room-badge ${STATUS_COLORS.keluar.cls}`}>
                  Keluar: {room.keluar}
                </span>
              )}
              {room.alumni > 0 && (
                <span className={`room-badge ${STATUS_COLORS.alumni.cls}`}>
                  Alumni: {room.alumni}
                </span>
              )}
            </div>
          </div>

          {/* Instansi pendidikan — hanya yang ada */}
          {room.instansi.length > 0 && (
            <div className="room-detail__section">
              <p className="room-detail__title">
                <BookOpen size={12} /> Instansi Pendidikan (santri aktif)
              </p>
              <div className="room-detail__instansi">
                {room.instansi.map((ins, i) => (
                  <div key={i} className="room-instansi__item">
                    <span className="room-instansi__name">{ins.nama}</span>
                    <span className="room-instansi__count">{ins.count}</span>
                    <div className="room-instansi__bar">
                      <div
                        className="room-instansi__bar-fill"
                        style={{
                          width: `${Math.round((ins.count / room.aktif) * 100)}%`
                        }}
                      />
                    </div>
                    <span className="room-instansi__pct">
                      {Math.round((ins.count / room.aktif) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoomInfoCard() {
  const { rooms, loading, error, refetch } = useRoomStats();

  const totalAll    = rooms.reduce((s, r) => s + r.total,    0);
  const totalAktif  = rooms.reduce((s, r) => s + r.aktif,    0);
  const totalKeluar = rooms.reduce((s, r) => s + r.keluar,   0);
  const totalAlumni = rooms.reduce((s, r) => s + r.alumni,   0);

  return (
    <div className="card card--padded room-info-card">
      {/* ── Card Header ── */}
      <div className="room-info__header">
        <div className="room-info__title-area">
          <div className="room-info__icon-wrap">
            <Home size={18} />
          </div>
          <div>
            <h3 className="room-info__title">Informasi Kamar</h3>
            {!loading && (
              <p className="room-info__subtitle">
                {rooms.length} kamar · {totalAktif} aktif dari {totalAll} santri
              </p>
            )}
          </div>
        </div>
        <div className="room-info__header-right">
          {!loading && (
            <div className="room-info__summary-pills">
              {totalKeluar > 0 && (
                <span className={`room-badge ${STATUS_COLORS.keluar.cls}`}>
                  {totalKeluar} keluar
                </span>
              )}
              {totalAlumni > 0 && (
                <span className={`room-badge ${STATUS_COLORS.alumni.cls}`}>
                  {totalAlumni} alumni
                </span>
              )}
            </div>
          )}
          <button className="room-info__refresh" onClick={refetch} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="room-info__loading">
          <div className="spinner" />
          <span>Memuat data kamar...</span>
        </div>
      ) : error ? (
        <p className="room-info__error">Gagal memuat: {error}</p>
      ) : rooms.length === 0 ? (
        <p className="room-info__empty">Tidak ada data kamar.</p>
      ) : (
        <div className="room-info__list">
          {rooms.map(room => (
            <RoomRow key={room.kamarId} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
