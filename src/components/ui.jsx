import { useId } from 'react';
import { Battery, Info, Sun } from 'lucide-react';

// --- SHARED COMPONENTS ---

export const Card = ({ children, className = "" }) => (
  <div className={`bg-surface border border-line rounded-lg overflow-hidden ${className}`}>
    {children}
  </div>
);

export const InputField = ({ label, value, onChange, onBlur, unit, step = "0.1", tooltip, min = 0, disabled = false, readOnly = false }) => {
  // Generated id ties the label to the input — without it every numeric field in the
  // app is announced as an unlabelled spin button.
  const id = useId();
  return (
    <div className={`mb-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <label htmlFor={id} className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-2">
        {label}
        {tooltip && (
          <span className="group relative inline-flex">
            <Info size={13} className="text-ink-3 cursor-help" />
            <span className="absolute left-full top-1/2 z-50 ml-2 hidden w-48 -translate-y-1/2 rounded-md border border-line bg-surface p-2 text-xs font-normal leading-relaxed text-ink-2 group-hover:block">
              {tooltip}
            </span>
          </span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          value={isNaN(value) ? '' : value}
          onChange={(e) => {
            if (!readOnly) {
              const val = e.target.value;
              onChange(val === '' ? NaN : parseFloat(val));
            }
          }}
          onBlur={onBlur}
          min={min}
          disabled={disabled || readOnly}
          readOnly={readOnly}
          style={unit ? { paddingRight: `${unit.length * 0.5 + 1.25}rem` } : undefined}
          className={`tnum h-9 w-full rounded-md border border-line bg-field px-3 text-sm text-ink hover:border-baseline [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${readOnly ? 'cursor-not-allowed text-ink-3' : ''}`}
          step={step}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-3">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

export const ProposalSelector = ({ mode, setMode }) => (
  <div className="mb-6 flex gap-1 rounded-lg bg-field p-1">
    <button
      onClick={() => setMode('new')}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium ${mode === 'new'
        ? 'border-line bg-surface text-ink'
        : 'border-transparent text-ink-3 hover:text-ink-2'
        }`}
    >
      <Sun size={16} /> New Solar + Battery
    </button>
    <button
      onClick={() => setMode('retrofit')}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium ${mode === 'retrofit'
        ? 'border-line bg-surface text-ink'
        : 'border-transparent text-ink-3 hover:text-ink-2'
        }`}
    >
      <Battery size={16} /> Add Battery to Solar
    </button>
  </div>
);

export const ChartTab = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`rounded-md border px-3 py-1.5 text-[13px] font-medium ${active
      ? 'border-line bg-surface text-ink'
      : 'border-transparent text-ink-3 hover:text-ink-2'
      }`}
  >
    {label}
  </button>
);
