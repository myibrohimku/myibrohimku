import React from 'react';
import { Trash, RotateCcw, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import './SantriTrashModal.css';

export default function SantriTrashModal({
  isOpen,
  onClose,
  trashData,
  onRestoreClick,
  onPermanentDeleteClick
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tong Sampah (Arsip)" maxWidth="500px">
      <div className="modal-content-wrapper animate-fade-in-up">
        <p className="page-subtitle">
          Daftar santri yang dihapus. Klik tombol putar untuk mengembalikan data ke tabel utama.
        </p>
        
        {trashData.length === 0 ? (
          <div className="loading-container" style={{ padding: 'var(--sp-12)' }}>
            <Trash size={48} style={{ opacity: 0.1, marginBottom: 'var(--sp-4)' }} />
            <p>Tong sampah kosong</p>
          </div>
        ) : (
          <div className="trash-list-container">
            {trashData.map((s) => (
              <div key={s.id} className="trash-item">
                <div className="trash-item-info">
                  <span className="trash-item-name">{s.nama}</span>
                  <span className="trash-item-nia">NIA: {s.nia}</span>
                </div>
                <div className="trash-actions">
                  <button 
                    className="btn-restore"
                    onClick={() => onRestoreClick(s)}
                    title="Kembalikan Data"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button 
                    className="btn-permanent-delete"
                    onClick={() => onPermanentDeleteClick(s)}
                    title="Hapus Permanen"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="form-footer" style={{ border: 'none', padding: '0' }}>
          <Button variant="ghost" icon={X} onClick={onClose} className="w-full">Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}
