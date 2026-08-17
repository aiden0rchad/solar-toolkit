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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="pro-upsell-title" className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-modal">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-md p-1.5 text-ink-3 hover:bg-field hover:text-ink"><X size={18} /></button>
        <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-md bg-accent-wash text-accent"><FileText size={16} aria-hidden="true" /></span>
        <h2 id="pro-upsell-title" className="text-xl font-semibold text-ink">Build a client proposal with Pro</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">Export brings results from each tool into one branded, printable client proposal. Your calculator stays fully usable on the free plan.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a href={PRO_URL} className="flex-1 rounded-lg bg-ink px-5 py-2.5 text-center text-sm font-medium text-surface hover:bg-ink-2">Upgrade to Pro</a>
          <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 text-sm font-medium text-ink-2 hover:text-ink">Not now</button>
        </div>
      </section>
    </div>
  );
};

export default ProUpsellModal;
