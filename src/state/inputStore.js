const VERSION = 1;
const MAX_BYTES = 1_000_000;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const isSafeValue = (value, depth = 0) => {
  if (depth > 12) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 10_000;
  if (Array.isArray(value)) return value.length <= 500 && value.every(item => isSafeValue(item, depth + 1));
  return isRecord(value) && Object.keys(value).length <= 100
    && Object.entries(value).every(([key, item]) => !['__proto__', 'prototype', 'constructor'].includes(key) && isSafeValue(item, depth + 1));
};

export const matchesShape = (value, initial) => {
  if (initial === null) return value === null;
  if (typeof initial === 'number') return Number.isFinite(value);
  if (Array.isArray(initial)) return Array.isArray(value)
    && value.every(item => initial.length > 0 && matchesShape(item, initial[0]));
  if (isRecord(initial)) return isRecord(value)
    && Object.keys(initial).every(key => Object.hasOwn(value, key) && matchesShape(value[key], initial[key]));
  return typeof value === typeof initial;
};

// Storage is injected for tests; browser access stays inside try/catch for private mode.
export function createInputStore({ namespace, session = () => window.sessionStorage, local = () => window.localStorage, migrateProposal = false }) {
  const key = `${namespace}:inputs`;
  const rememberKey = `${namespace}:remember`;
  let initialized = false;
  let values = {};
  let status = { remember: false, unavailable: false };
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener());
  const access = (storage, operation) => {
    try { return operation(storage()); }
    catch {
      if (!status.unavailable) { status = { ...status, unavailable: true }; notify(); }
      return undefined;
    }
  };
  const parse = raw => {
    if (!raw || raw.length > MAX_BYTES) return null;
    try {
      const data = JSON.parse(raw);
      return data.version === VERSION && isRecord(data.tools) && isSafeValue(data.tools) ? data.tools : null;
    } catch { return null; }
  };
  const initialize = () => {
    if (initialized) return;
    initialized = true;
    const remembered = access(local, storage => storage.getItem(rememberKey)) === 'true';
    status = { ...status, remember: remembered };
    values = parse(access(session, storage => storage.getItem(key)))
      ?? (status.remember ? parse(access(local, storage => storage.getItem(key))) : null) ?? {};
    // Old versions shared one proposal key. Only Pro may import it, once per tab.
    if (migrateProposal && !Object.hasOwn(values, 'app')) {
      const raw = access(local, storage => storage.getItem('solartoolkit-proposal'));
      try {
        const proposal = raw && raw.length <= MAX_BYTES ? JSON.parse(raw) : null;
        if (isProposal(proposal)) values.app = { proposalData: proposal };
      } catch { /* A malformed legacy proposal is never imported. */ }
      values.app ??= {};
      persist();
    }
  };
  const persist = () => {
    // A cleared numeric input may hold NaN until edited. Keep it in memory only.
    const serialized = JSON.stringify({ version: VERSION, tools: values }, (_key, value) =>
      typeof value === 'number' && !Number.isFinite(value) ? undefined : value);
    access(session, storage => storage.setItem(key, serialized));
    if (status.remember) access(local, storage => storage.setItem(key, serialized));
  };
  return {
    read(tool, field, initial, validate = value => matchesShape(value, initial)) {
      initialize();
      const value = values[tool]?.[field];
      if (value === undefined) return initial;
      try { return isSafeValue(value) && validate(value) ? value : initial; }
      catch { return initial; }
    },
    write(tool, field, value) {
      initialize();
      values[tool] = { ...values[tool], [field]: value };
      persist();
    },
    reset(tool) {
      initialize();
      // An empty scope prevents legacy proposal data reappearing after reset.
      values[tool] = {};
      persist();
    },
    setRemember(remember) {
      initialize();
      status = { remember, unavailable: false };
      if (remember) {
        access(local, storage => storage.setItem(rememberKey, 'true'));
      } else {
        access(local, storage => { storage.removeItem(key); storage.removeItem(rememberKey); });
      }
      persist();
      notify();
    },
    getStatus() { initialize(); return status; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export const EMPTY_PROPOSAL = { clientName: '', roi: null, usage: null, audit: null, ev: null, blackout: null, bill: null };

export const isProposal = value => {
  if (!isRecord(value) || !isSafeValue(value) || typeof value.clientName !== 'string') return false;
  const scalarFields = {
    roi: ['monthlyBillNow', 'monthlyBillNew', 'breakEven', 'lifetimeSavings', 'solarSize', 'batterySize'],
    usage: ['dailyKwh', 'monthlyBill', 'sqFt', 'recommendedSystem'],
    audit: ['totalAddedKwh', 'monthlyCost', 'systemIncrease'],
    ev: ['selectedEV', 'year', 'trim', 'savings'],
    blackout: ['batterySize', 'totalWatts', 'estimatedHours'],
    bill: ['totalBill', 'solarSaves', 'remaining'],
  };
  return Object.entries(scalarFields).every(([section, fields]) => {
    const data = value[section];
    if (data === null) return true;
    if (!isRecord(data) || !fields.every(field => ['string', 'number'].includes(typeof data[field]))) return false;
    if (section === 'bill') return fields.every(field => Number.isFinite(data[field]));
    if (section === 'audit') return Number.isFinite(data.monthlyCost) && Array.isArray(data.items) && data.items.every(item =>
      isRecord(item) && typeof item.name === 'string' && typeof item.icon === 'string' && Number.isFinite(item.kwh));
    return true;
  });
};
