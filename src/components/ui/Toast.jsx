import { useApp } from '../../context/AppContext';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import './Toast.css';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

export default function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || Info;
        return (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <Icon size={18} />
            <span className="toast__message">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
