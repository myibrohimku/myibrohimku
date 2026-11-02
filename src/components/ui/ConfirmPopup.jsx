import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import './ConfirmPopup.css';

export default function ConfirmPopup({ isOpen, onConfirm, onCancel, title = 'Konfirmasi', message = 'Yakin ingin melanjutkan?', confirmText = 'Ya, Hapus', cancelText = 'Batal', variant = 'danger' }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-popup__icon confirm-popup__icon--${variant}`}>
          <AlertTriangle size={28} />
        </div>
        <h3 className="confirm-popup__title">{title}</h3>
        <p className="confirm-popup__message">{message}</p>
        <div className="confirm-popup__actions">
          <Button variant="ghost" onClick={onCancel}>{cancelText}</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}
