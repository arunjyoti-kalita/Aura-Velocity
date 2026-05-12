import clsx from 'clsx';
import { useApp } from "../../contexts/useApp";

export function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={clsx("toast-item", toast.type)}>
          <span className="text-[13px] font-medium text-white">{toast.message}</span>
          {toast.action && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toast.action.onClick();
              }}
              className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
