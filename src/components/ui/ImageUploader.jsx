import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import './ImageUploader.css';

export default function ImageUploader({ label, value, onChange, onRemove, accept = 'image/*', maxSize = 2 }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Ukuran maksimal ${maxSize}MB`);
      return;
    }
    onChange(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="image-uploader">
      {label && <label className="image-uploader__label">{label}</label>}
      {value ? (
        <div className="image-uploader__preview" onClick={() => inputRef.current?.click()} style={{ cursor: 'pointer' }}>
          <img src={typeof value === 'string' ? value : URL.createObjectURL(value)} alt="Preview" />
          {onRemove && (
            <button 
              className="image-uploader__remove" 
              onClick={(e) => {
                e.stopPropagation(); // Mencegah input file terbuka saat klik hapus
                onRemove();
              }} 
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`image-uploader__dropzone ${dragOver ? 'image-uploader__dropzone--active' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload size={24} />
          <span>Klik atau drag gambar</span>
          <span className="image-uploader__hint">PNG, JPG (maks {maxSize}MB)</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        style={{ display: 'none' }}
      />
      {error && <span className="image-uploader__error">{error}</span>}
    </div>
  );
}
