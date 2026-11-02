import { forwardRef } from 'react';
import './Button.css';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  icon: Icon,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
});

export default Button;
