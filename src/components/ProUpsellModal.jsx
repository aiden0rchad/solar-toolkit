import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { PRO_URL } from '../entitlement/config';

/**
 * What `aria-modal` promises and what a dialog has to actually do.
 *
 * Declaring `role="dialog"` and `aria-modal="true"` tells a screen reader the
 * rest of the page is inert. Nothing here made that true: focus stayed on the
 * export button behind the scrim, TAB walked straight out of the sheet into a
 * page that is still fully focusable, and closing left focus wherever the last
 * click had put it. A reader was told a modal opened and then left reading the
 * page underneath it.
 *
 * So the effect below does the three things the role is claiming. It moves
 * focus into the sheet on mount; it keeps TAB and SHIFT+TAB inside the sheet's
 * own focusable set, wrapping at both ends; and on unmount it returns focus to
 * whatever opened the dialog, so closing puts the reader back on the control
 * they pressed rather than at the top of the document.
 *
 * The focusable set is queried per keystroke rather than cached: it is at most
 * four nodes, and a cached list goes stale the moment anything in the sheet
 * renders conditionally.
 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ProUpsellModal = ({ onClose }) => {
  const sheetRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const sheet = sheetRef.current;
    sheet?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !sheet) return;

      const focusable = Array.from(sheet.querySelectorAll(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        sheet.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      // `sheet` itself is tabindex="-1" and holds focus on mount, so the first
      // TAB has to be steered explicitly — it would otherwise leave for the
      // page behind the scrim.
      if (!sheet.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [onClose]);

  return (
    // `--scrim` is the one ink-derived alpha in the system. Never blurred: a
    // blurred backdrop is a glass effect, and there is no glass here.
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      {/* The one permitted shadow in the interface, and it is permitted only
          because this sheet genuinely floats above the page. It is cast in
          `--scrim`, so it is the same ink as the backdrop and carries no hue. */}
      <section
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-upsell-title"
        className="relative w-full max-w-md border-t-2 border-rule-strong bg-overlay px-6 pb-7 pt-5 focus:outline-none"
        style={{ boxShadow: '0 24px 56px -16px var(--scrim)' }}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 bg-transparent p-1 text-ink-3 hover:text-ink"><X size={16} /></button>
        <h2
          id="pro-upsell-title"
          className="pr-8 font-semibold text-ink"
          style={{ fontSize: 'var(--size-20)', lineHeight: 'var(--lh-20)', letterSpacing: 'var(--track-20)' }}
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
