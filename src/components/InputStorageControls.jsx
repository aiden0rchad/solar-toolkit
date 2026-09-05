import { useSyncExternalStore } from 'react';
import { inputStore } from '../state/store';

export default function InputStorageControls({ onReset, toolTitle }) {
  const { remember, unavailable } = useSyncExternalStore(inputStore.subscribe, inputStore.getStatus, inputStore.getStatus);
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-rule text-ink-2 pb-3 text-xs print:hidden">
      <label className="flex items-center gap-2">
        <input type="checkbox" style={{ accentColor: 'var(--ink)' }} checked={remember} onChange={event => inputStore.setRemember(event.target.checked)} aria-describedby="input-storage-note" />
        Remember inputs on this device
      </label>
      <button type="button" onClick={onReset} aria-label={`Reset ${toolTitle} to defaults`} className="underline underline-offset-4">Reset to defaults</button>
      <p id="input-storage-note" role="status" className="w-full text-ink-3">
        {unavailable ? 'Browser storage is unavailable or full. Keep this tab open to retain current changes; persistent copies may need to be cleared in browser settings.'
          : remember ? 'Saved on this device, including proposal details. Uncheck on shared devices.'
          : 'Saved for this browser tab. Nothing is uploaded.'}
      </p>
    </div>
  );
}
