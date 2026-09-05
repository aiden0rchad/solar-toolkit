import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { inputStore } from './store';

export const ToolStateContext = createContext('app');

export function useToolState(key, initial, validate) {
  const tool = useContext(ToolStateContext);
  const fallback = useRef();
  const initialized = useRef(false);
  if (!initialized.current) {
    fallback.current = typeof initial === 'function' ? initial() : initial;
    initialized.current = true;
  }
  const [value, setValue] = useState(() => inputStore.read(tool, key, fallback.current, validate));
  const current = useRef(value);
  const setStoredValue = useCallback(update => {
    const next = typeof update === 'function' ? update(current.current) : update;
    current.current = next;
    inputStore.write(tool, key, next);
    setValue(next);
  }, [tool, key]);
  return [value, setStoredValue];
}
