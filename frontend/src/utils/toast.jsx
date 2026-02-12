import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Toast API:
 * showToast({
 *   message: string,
 *   type?: "success" | "info" | "warning" | "danger" | string,
 *   icon?: React.ComponentType<{ size?: number }>,
 *   duration?: number (ms),
 * })
 */

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ message, type = "info", icon: Icon = null, duration = 2200 } = {}) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      setToasts((prev) => [
        ...prev,
        {
          id,
          message: String(message ?? ""),
          type,
          Icon,
          duration: Number.isFinite(duration) ? duration : 2200,
        },
      ]);

      const tm = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, tm);

      return id;
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast, removeToast }), [showToast, removeToast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={removeToast} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider />");
  return ctx;
}

function ToastViewport({ toasts, onClose }) {
  return (
    <div className="mcToastViewport" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const { id, type, message, Icon } = toast;

  return (
    <div className={`mcToast mcToast--${type}`} role="status">
      <div className="mcToastLeft">
        {Icon ? (
          <span className="mcToastIcon" aria-hidden="true">
            <Icon size={16} />
          </span>
        ) : null}

        <div className="mcToastMsg">{message}</div>
      </div>

      {/* Botón opcional (si lo quieres, quita el style display:none) */}
      <button
        type="button"
        className="mcToastClose"
        onClick={() => onClose(id)}
        aria-label="Close toast"
        style={{ display: "none" }}
      >
        ×
      </button>
    </div>
  );
}