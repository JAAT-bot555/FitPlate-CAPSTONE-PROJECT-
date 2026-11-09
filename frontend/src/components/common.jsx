export const EMOJI = {
  breakfast: '🥣',
  lunch: '🍛',
  snack: '🥜',
  dinner: '🍲',
};

export function inr(amount) {
  return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

export function fmtQty(quantity, unit) {
  if (unit === 'g' && quantity >= 1000) {
    return `${+(quantity / 1000).toFixed(2)} kg`;
  }
  if (unit === 'ml' && quantity >= 1000) {
    return `${+(quantity / 1000).toFixed(2)} l`;
  }
  return `${+(+quantity).toFixed(1)} ${unit}`;
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-stone-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-leaf-500 border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="card border-red-200 bg-red-50 text-sm text-red-700">
      ⚠️ {error}{' '}
      {onRetry && (
        <button className="ml-2 font-semibold underline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ icon = '🍽️', title, children }) {
  return (
    <div className="card py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-2 font-display text-lg font-semibold">{title}</h3>
      <div className="mt-1 text-sm text-stone-500">{children}</div>
    </div>
  );
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="text-sm text-stone-500">{sub}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`card my-8 w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button
            aria-label="Close"
            className="text-xl text-stone-400 hover:text-stone-700"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Stat({ label, value, sub, tone = 'leaf' }) {
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-2xl font-bold ${
          tone === 'warn' ? 'text-red-600' : 'text-leaf-700'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-stone-500">{sub}</div>}
    </div>
  );
}
