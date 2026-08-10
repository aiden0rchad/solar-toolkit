import { useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import { PRO_URL } from '../entitlement/config';

const ProUpsellModal = ({ onClose }) => {
  useEffect(() => {
    const closeOnEscape = event => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="pro-upsell-title" className="relative w-full max-w-md rounded-2xl border border-sky-400/20 bg-slate-900 p-7 shadow-2xl shadow-black/50">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"><X size={18} /></button>
        <span className="mb-5 inline-flex rounded-xl bg-sky-500/15 p-3 text-sky-400"><FileText size={25} aria-hidden="true" /></span>
        <h2 id="pro-upsell-title" className="text-2xl font-black text-slate-100">Build a client proposal with Pro</h2>
        <p className="mt-3 leading-relaxed text-slate-400">Export brings results from each tool into one branded, printable client proposal. Your calculator stays fully usable on the free plan.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a href={PRO_URL} className="flex-1 rounded-xl bg-sky-400 px-5 py-3 text-center font-black text-slate-950 hover:bg-sky-300">Upgrade to Pro</a>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-300 hover:bg-slate-800">Not now</button>
        </div>
      </section>
    </div>
  );
};

export default ProUpsellModal;
