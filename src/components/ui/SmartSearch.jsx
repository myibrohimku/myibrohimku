import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Check } from 'lucide-react';
import './SmartSearch.css';

/**
 * SmartSearch — Fuzzy search input with Enter-to-confirm and memory.
 *
 * Props:
 *  - label: string
 *  - placeholder: string
 *  - options: [{ id: string|number, label: string }]
 *  - value: selected option object { id, label } or null
 *  - onChange: (selectedOption | null) => void
 *  - onConfirm: () => void  — called after Enter confirms selection (for focus-next)
 *  - memoryKey: string — localStorage key for memory feature
 *  - disabled: boolean
 */
const SmartSearch = forwardRef(({
  label,
  placeholder = 'Ketik untuk mencari...',
  options = [],
  value = null,
  onChange,
  onConfirm,
  memoryKey,
  disabled = false,
  multiSelect = false,
}, ref) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const wrapperRef = useRef(null);

  // Expose focus method to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  // Memory: load last used value
  const memoryValue = memoryKey ? localStorage.getItem(`smart-search-${memoryKey}`) : null;
  const parsedMemory = memoryValue ? (() => { try { return JSON.parse(memoryValue); } catch { return null; } })() : null;

  // Sync isConfirmed when value changes externally
  useEffect(() => {
    setIsConfirmed(!!value);
    setQuery(value ? (value.label || '') : '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fuzzy filter: case-insensitive, trim spaces, match id or label
  const filtered = useCallback(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().replace(/\s+/g, '');
    return options.filter(opt => {
      const idMatch = String(opt.id).toLowerCase().replace(/\s+/g, '').includes(q);
      const labelMatch = String(opt.label).toLowerCase().replace(/\s+/g, '').includes(q);
      return idMatch || labelMatch;
    });
  }, [query, options])();

  const selectOption = (opt) => {
    if (value === null) {
      // In multi-payment mode where parent passes null, 
      // we must clear query immediately
      setQuery('');
      setIsConfirmed(false);
    } else {
      setQuery(opt.label);
      setIsConfirmed(true);
    }
    
    setIsOpen(false);
    onChange(opt);
    // Save to memory
    if (memoryKey) {
      localStorage.setItem(`smart-search-${memoryKey}`, JSON.stringify(opt));
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;

    // Android spacebar keyboard workaround for multiSelect
    if (multiSelect && val.endsWith(' ') && val.trim().length > 0) {
      if (isOpen && filtered.length > 0) {
        selectOption(filtered[activeIdx]);
        return;
      }
    }

    setQuery(val);
    setIsConfirmed(false);
    setIsOpen(true);
    setActiveIdx(0);
    onChange(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => Math.max(prev - 1, 0));
    } else if ((e.key === ' ' || e.code === 'Space') && multiSelect) {
      // Space = select & stay (only in multi-select mode like Jenis Pembayaran)
      if (isOpen && filtered.length > 0) {
        e.preventDefault();
        selectOption(filtered[activeIdx]);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isConfirmed) {
        // Already confirmed, move to next field
        onConfirm?.();
        return;
      }
      // If query is empty and we have memory, use memory
      if (!query.trim() && parsedMemory) {
        selectOption(parsedMemory);
        setTimeout(() => onConfirm?.(), 50);
        return;
      }
      // Select the active item from dropdown
      if (filtered.length > 0 && isOpen) {
        selectOption(filtered[activeIdx]);
        setTimeout(() => onConfirm?.(), 50);
      } else if (!query.trim()) {
        // Empty enter moves forward
        onConfirm?.();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleFocus = () => {
    if (!isConfirmed) {
      setIsOpen(true);
    }
  };

  // Show memory hint when input is empty and not confirmed
  const showMemoryHint = !query && !isConfirmed && parsedMemory && !isOpen;

  return (
    <div className="smart-search" ref={wrapperRef}>
      {label && <label className="smart-search__label">{label}</label>}
      <div className="smart-search__input-wrap">
        <input
          ref={inputRef}
          type="text"
          className={`smart-search__input ${isConfirmed ? 'smart-search__input--confirmed' : ''}`}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={disabled}
          autoComplete="off"
        />
        {showMemoryHint && (
          <span className="smart-search__memory-hint">
            ↵ {parsedMemory.label}
          </span>
        )}
        {isConfirmed && (
          <span className="smart-search__check">
            <Check size={16} />
          </span>
        )}
      </div>

      {isOpen && !isConfirmed && (
        <div className="smart-search__dropdown" ref={dropdownRef}>
          {filtered.length > 0 ? (
            filtered.map((opt, idx) => (
              <button
                key={opt.id}
                className={`smart-search__item ${idx === activeIdx ? 'smart-search__item--active' : ''}`}
                onClick={() => {
                  selectOption(opt);
                  setTimeout(() => onConfirm?.(), 50);
                }}
                type="button"
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <span className="smart-search__item-id">{opt.id}</span>
                <span className="smart-search__item-label">{opt.label}</span>
              </button>
            ))
          ) : (
            <div className="smart-search__empty">Tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
});

SmartSearch.displayName = 'SmartSearch';

export default SmartSearch;
