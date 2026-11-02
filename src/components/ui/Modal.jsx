import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '600px',
  id,
  className = '',
  bodyClassName = ''
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${className}`} onClick={onClose} id={id}>
      <div
        className="modal"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {title && (
          <div className="modal__header">
            <h3 className="modal__title">{title}</h3>
            <button className="modal__close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        <div className={`modal__body ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

