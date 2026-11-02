import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import './Input.css';

export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  icon: Icon,
  className = '',
  id,
  name,
  required = false,
  formatType, // 'titleCase', 'numberOnly', 'nisn', 'nik', 'uppercase'
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const isPassword = type === 'password';
  const isSearch = type === 'search';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  
  const shakeTimeoutRef = useRef(null);

  const triggerShake = () => {
    setIsShaking(true);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => setIsShaking(false), 300);
  };

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, []);

  const handleChange = (e) => {
    if (!onChange) return;
    
    let rawValue = e.target.value;
    let formattedValue = rawValue;

    if (formatType === 'uppercase') {
      formattedValue = rawValue.toUpperCase();
    } else if (formatType === 'titleCase') {
      // Auto Title Case
      formattedValue = rawValue
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
    } else if (formatType === 'numberOnly' || formatType === 'nisn' || formatType === 'nik') {
      // Only numbers
      if (/[^0-9]/.test(rawValue)) {
        triggerShake();
      }
      formattedValue = rawValue.replace(/[^0-9]/g, '');

      // Check max length
      let maxLength = null;
      if (formatType === 'nisn') maxLength = 10;
      if (formatType === 'nik') maxLength = 16;
      if (formatType === 'numberOnly') maxLength = 15; // default reasonable max for phone

      if (maxLength && formattedValue.length > maxLength) {
        triggerShake();
        formattedValue = formattedValue.slice(0, maxLength);
      }
    }

    // Call the original onChange with a synthetic-like event structure
    onChange({
      ...e,
      target: { ...e.target, value: formattedValue, name: name }
    });
  };

  return (
    <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
      {label && (
        <label className="input-group__label" htmlFor={id}>
          {label}
          {required && <span className="input-group__required">*</span>}
        </label>
      )}
      <div className={`input-group__wrapper ${isShaking ? 'input-group__wrapper--shake' : ''}`}>
        {(Icon || isSearch) && (
          <span className="input-group__icon-left">
            {isSearch ? <Search size={16} /> : <Icon size={16} />}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={inputType}
          className={`input-group__input ${Icon || isSearch ? 'input-group__input--icon-left' : ''} ${isPassword ? 'input-group__input--icon-right' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="input-group__icon-right"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
}
