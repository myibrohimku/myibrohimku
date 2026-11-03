import { useState, useRef, useEffect, memo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './Dropdown.css';

const Dropdown = memo(({ label, options, value, onChange, placeholder = 'Pilih...', multi = false, size = 'md', direction = 'down', disabled = false, icon: Icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = multi
    ? (value || [])
    : value;

  const displayText = multi
    ? (selected.length > 0 ? `${selected.length} dipilih` : placeholder)
    : (options.find(o => o.value === selected)?.label || placeholder);

  const handleSelect = (opt) => {
    if (disabled) return;
    if (multi) {
      const arr = [...selected];
      const idx = arr.indexOf(opt.value);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(opt.value);
      onChange(arr);
    } else {
      onChange(opt.value);
      setOpen(false);
    }
  };

  return (
    <div className={`dropdown dropdown--${size} dropdown--${direction} ${open ? 'dropdown--open' : ''} ${disabled ? 'dropdown--disabled' : ''}`} ref={ref}>
      {label && <span className="dropdown__label">{label}</span>}
      <button 
        className={`dropdown__trigger ${open ? 'dropdown__trigger--active' : ''}`} 
        onClick={() => !disabled && setOpen(!open)} 
        type="button"
        disabled={disabled}
      >
        {Icon && <Icon size={16} className="dropdown__icon" />}
        <span className="dropdown__text">{disabled ? 'Tidak tersedia' : displayText}</span>
        <ChevronDown size={16} className={`dropdown__chevron ${open ? 'dropdown__chevron--open' : ''}`} />
      </button>
      {open && (
        <div className="dropdown__menu">
          {options.length > 0 ? (
            options.map((opt) => {
              const isSelected = multi ? selected.includes(opt.value) : selected === opt.value;
              return (
                <button
                  key={opt.value}
                  className={`dropdown__item ${isSelected ? 'dropdown__item--selected' : ''}`}
                  onClick={() => handleSelect(opt)}
                  type="button"
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} />}
                </button>
              );
            })
          ) : (
            <div className="dropdown__empty">Data tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;
