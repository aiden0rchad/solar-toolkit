import { useEffect } from 'react';
import { X } from 'lucide-react';
import { PRO_URL } from '../entitlement/config';

const ProUpsellModal = ({ onClose }) => {
  useEffect(() => {
    const closeOnEscape = event => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    // `--scrim` is the one ink-derived alpha in the system. Never blurred: a
    // blurred backdrop is a glass effect, and there is no glass here.
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      {/* The one permitted shadow in the interface, and it is permitted only
          because this sheet genuinely floats above the page. It is cast in
          `--scrim`, so it is the same ink as the backdrop and carries no hue. */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-upsell-title"
        className="relative w-full max-w-md border-t-2 border-rule-heavy bg-overlay px-6 pb-7 pt-5"
        style={{ boxShadow: '0 24px 56px -16px var(--scrim)' }}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 bg-transparent p-1 text-ink-3 hover:text-ink"><X size={16} /></button>
        <h2
          id="pro-upsell-title"
          className="pr-8 font-semibold text-ink"
          style={{ fontSize: 'var(--size-22)', lineHeight: 'var(--lh-22)', letterSpacing: 'var(--track-22)' }}
        >
          Build a client proposal with Pro
        </h2>
        <p
          className="mt-2 text-ink-2"
          style={{ fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' }}
        >
          Export brings results from each tool into one branded, printable client proposal. Your calculator stays fully usable on the free plan.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <a href={PRO_URL} className="eyebrow flex-1 bg-ink px-5 py-3 text-center text-surface hover:bg-ink-2">Upgrade to Pro</a>
          <button type="button" onClick={onClose} className="eyebrow bg-transparent px-5 py-3 text-ink-3 hover:text-ink">Not now</button>
        </div>
      </section>
    </div>
  );
};

export default ProUpsellModal;
