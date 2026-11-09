import { createContext, useContext, useState, useCallback, useRef } from 'react';

const UIContext = createContext(null);

export const useUI = () => useContext(UIContext);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextToastId = useRef(0);

  const toast = useCallback((message, type = 'success') => {
    const id = ++nextToastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setDialog({ message, resolve });
    });
  }, []);

  const closeDialog = (confirmed) => {
    if (dialog) {
      dialog.resolve(confirmed);
    }
    setDialog(null);
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="fixed right-4 top-4 z-[100] space-y-2" role="status">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              item.type === 'error' ? 'bg-red-600' : 'bg-leaf-700'
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm">
            <p className="mb-5 text-sm">{dialog.message}</p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => closeDialog(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => closeDialog(true)}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}
