import { useState, useRef, useEffect } from 'react';
import './NominalInput.css';

/**
 * NominalInput — Rupiah formatted input with memory feature.
 *
 * Props:
 *  - label: string
 *  - value: number (raw, e.g. 120000)
 *  - onChange: (rawNumber) => void
 *  - onConfirm: () => void — Enter pressed, move to next field
 *  - memoryKey: string — localStorage key for memory (stores frequently used values)
 *  - placeholder: string
 *  - disabled: boolean
 *  - max: number (default 9999999 = 7 digit)
 */
export default function NominalInput({
  label,
  value,
  onChange,
  onConfirm,
  memoryKey,
  placeholder = '0',
  disabled = false,
  max = 999999999999,
}) {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef(null);

  // Memory: track frequency of inputs
  const getMemory = () => {
    if (!memoryKey) return null;
    try {
      const raw = localStorage.getItem(`nominal-memory-${memoryKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };

  const saveToMemory = (num) => {
    if (!memoryKey || !num) return;
    const mem = getMemory();
    mem[num] = (mem[num] || 0) + 1;
    localStorage.setItem(`nominal-memory-${memoryKey}`, JSON.stringify(mem));
  };

  // Get most frequently used value (>= 2 times)
  const getMemoryHint = () => {
    const mem = getMemory();
    if (!mem) return null;
    let best = null;
    let bestCount = 1; // must be > 1 to show hint (>= 2x)
    for (const [k, count] of Object.entries(mem)) {
      if (count > bestCount) {
        best = parseInt(k);
        bestCount = count;
      }
    }
    return best;
  };

  const formatDisplay = (num) => {
    if (!num && num !== 0) return '';
    return Number(num).toLocaleString('id-ID');
  };

  // Sync display when value changes externally
  useEffect(() => {
    if (value) {
      setDisplayValue(formatDisplay(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const parseInput = (raw) => {
    // Remove all non-digit characters (dots, commas, spaces)
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return 0;
    const num = parseInt(digits, 10);
    return Math.min(num, max);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    const num = parseInput(raw);
    setDisplayValue(num ? formatDisplay(num) : '');
    onChange(num);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      setDisplayValue('');
      onChange(0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // If empty and memory hint exists, use it
      const hint = getMemoryHint();
      if (!value && hint) {
        setDisplayValue(formatDisplay(hint));
        onChange(hint);
        saveToMemory(hint);
      } else if (value) {
        saveToMemory(value);
      }
      // Gunakan sedikit delay agar React selesai re-render, 
      // tapi tetap cukup cepat agar browser menganggap ini masih dalam rangkaian aksi keyboard (untuk :focus-visible)
      setTimeout(() => {
        if (onConfirm) onConfirm();
      }, 0);
    }
  };

  const memoryHint = getMemoryHint();
  const showHint = !displayValue && !disabled && memoryHint;

  return (
    <div className="nominal-input">
      {label && <label className="nominal-input__label">{label}</label>}
      <div className="nominal-input__wrap">
        <span className="nominal-input__prefix">Rp</span>
        <input
          ref={inputRef}
          type="text"
          className="nominal-input__input"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          inputMode="numeric"
        />
        {showHint && (
          <span className="nominal-input__memory-hint">
            ↵ {formatDisplay(memoryHint)}
          </span>
        )}
      </div>
    </div>
  );
}
