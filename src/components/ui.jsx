import { Battery, Info, Sun } from 'lucide-react';

// --- SHARED COMPONENTS ---

export const Card = ({ children, className = "" }) => (
  <div className={`glass-card rounded-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

export const InputField = ({ label, value, onChange, unit, step = "0.1", tooltip, min = 0, disabled = false, readOnly = false }) => (
  <div className={`mb-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
    <div className="flex items-center justify-between mb-1">
      <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
        {label}
        {tooltip && (
          <div className="group relative">
            <Info size={14} className="text-slate-400 cursor-help" />
            <div className="absolute left-full ml-2 w-48 p-2 bg-slate-900 text-slate-200 text-xs rounded-lg z-50 hidden group-hover:block top-1/2 -translate-y-1/2 border border-slate-700 shadow-xl">
              {tooltip}
            </div>
          </div>
        )}
      </label>
      <span className="text-xs text-slate-400 font-mono">{unit}</span>
    </div>
    <input
      type="number"
      value={isNaN(value) ? '' : value}
      onChange={(e) => {
        if (!readOnly) {
          const val = e.target.value;
          onChange(val === '' ? NaN : parseFloat(val));
        }
      }}
      min={min}
      disabled={disabled || readOnly}
      readOnly={readOnly}
      className={`w-full px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-medium transition-all ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      step={step}
    />
  </div>
);

export const ProposalSelector = ({ mode, setMode }) => (
  <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
    <button
      onClick={() => setMode('new')}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'new' ? 'bg-sky-500/20 text-sky-400 shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:text-slate-200'
        }`}
    >
      <Sun size={16} /> New Solar + Battery
    </button>
    <button
      onClick={() => setMode('retrofit')}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'retrofit' ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
        }`}
    >
      <Battery size={16} /> Add Battery to Solar
    </button>
  </div>
);

export const ChartTab = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${active
      ? 'bg-sky-500/20 text-sky-400 shadow-lg shadow-sky-500/10'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
  >
    {label}
  </button>
);
