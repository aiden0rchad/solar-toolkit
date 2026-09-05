import { describe, expect, it } from 'vitest';
import { createInputStore, EMPTY_PROPOSAL, isProposal, matchesShape } from './inputStore';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
};
const setup = (options = {}) => {
  const session = memoryStorage();
  const local = memoryStorage();
  const config = { namespace: 'test', session: () => session, local: () => local, ...options };
  return { session, local, store: createInputStore(config), reload: () => createInputStore(config) };
};

describe('calculator input persistence', () => {
  it('restores edited bill, EV and array inputs after navigation and reload', () => {
    const { store, reload, local } = setup();
    const bill = [{ id: 'generation', amount: 291 }];
    store.write('bill', 'lineItems', bill);
    store.write('ev', 'iceMPG', 17.5);
    store.write('blackout', 'activeLoads', [{ name: 'Fridge', watts: 150, active: false }]);
    expect(store.read('bill', 'lineItems', [{ id: '', amount: 0 }])).toEqual(bill);
    const restored = reload();
    expect(restored.read('ev', 'iceMPG', 25)).toBe(17.5);
    expect(restored.read('blackout', 'activeLoads', [{ name: '', watts: 0, active: true }])[0].active).toBe(false);
    expect(local.getItem('test:inputs')).toBeNull();
  });

  it('resets only one tool and uses current defaults for untouched fields', () => {
    const { store, reload } = setup();
    store.write('bill', 'amount', 291);
    store.write('ev', 'iceMPG', 17.5);
    store.reset('bill');
    expect(reload().read('bill', 'amount', 150)).toBe(150);
    expect(store.read('ev', 'iceMPG', 25)).toBe(17.5);
    expect(store.read('ev', 'gasPrice', 4.95)).toBe(4.95);
  });

  it('retains only explicitly opted-in data across new sessions', () => {
    const { store, local } = setup();
    store.write('ev', 'iceMPG', 17.5);
    store.setRemember(true);
    const nextSession = () => createInputStore({ namespace: 'test', session: memoryStorage, local: () => local });
    expect(nextSession().read('ev', 'iceMPG', 25)).toBe(17.5);
    store.setRemember(false);
    expect(nextSession().read('ev', 'iceMPG', 25)).toBe(25);
    expect(store.read('ev', 'iceMPG', 25)).toBe(17.5);
    expect(local.getItem('test:inputs')).toBeNull();
    expect(local.getItem('test:remember')).toBeNull();
  });

  it('isolates free and Pro, even on a shared browser origin', () => {
    const session = memoryStorage();
    const local = memoryStorage();
    const free = createInputStore({ namespace: 'solar-toolkit:free', session: () => session, local: () => local });
    const pro = createInputStore({ namespace: 'solar-toolkit:pro', session: () => session, local: () => local });
    pro.write('app', 'proposalData', { ...EMPTY_PROPOSAL, clientName: 'Private client' });
    pro.setRemember(true);
    expect(free.read('app', 'proposalData', EMPTY_PROPOSAL, isProposal)).toEqual(EMPTY_PROPOSAL);
    expect(free.getStatus().remember).toBe(false);
  });

  it.each([
    '{bad', '{"version":2,"tools":{"ev":{"iceMPG":10}}}', '{"version":1,"tools":[]}',
    '{"version":1,"tools":{"ev":{"__proto__":{"x":1}}}}',
  ])('ignores malformed, incompatible or unsafe envelopes: %s', raw => {
    const { session, store } = setup();
    session.setItem('test:inputs', raw);
    expect(store.read('ev', 'iceMPG', 25)).toBe(25);
  });

  it('validates field shape and explicit validators before restoration', () => {
    const { store, reload } = setup();
    store.write('ev', 'iceMPG', '17.5');
    store.write('ev', 'selectedEV', { id: 'old-model' });
    store.write('solar', 'override', 12000);
    store.write('solar', 'monthly', [1, 'oops']);
    const restored = reload();
    expect(restored.read('ev', 'iceMPG', 25)).toBe(25);
    expect(restored.read('ev', 'selectedEV', { id: 'new-model', eff: 4 })).toEqual({ id: 'new-model', eff: 4 });
    expect(restored.read('solar', 'override', null, value => value === null || Number.isFinite(value))).toBe(12000);
    expect(restored.read('solar', 'monthly', [1, 2])).toEqual([1, 2]);
    expect(restored.read('solar', 'override', null, () => { throw new Error('bad validator'); })).toBeNull();
  });

  it('rejects oversized payloads and nonfinite restored numbers', () => {
    const { session, store, reload } = setup();
    session.setItem('test:inputs', ' '.repeat(1_000_001));
    expect(store.read('ev', 'iceMPG', 25)).toBe(25);
    store.write('ev', 'iceMPG', NaN);
    expect(reload().read('ev', 'iceMPG', 25)).toBe(25);
    expect(matchesShape(Infinity, 25)).toBe(false);
  });

  it('keeps navigation state in memory when browser storage throws', () => {
    const blocked = () => { throw new Error('denied'); };
    const store = createInputStore({ namespace: 'test', session: blocked, local: blocked });
    store.write('ev', 'iceMPG', 17.5);
    expect(store.read('ev', 'iceMPG', 25)).toBe(17.5);
    expect(store.getStatus().unavailable).toBe(true);
    expect(() => store.setRemember(false)).not.toThrow();
    store.reset('ev');
    expect(store.read('ev', 'iceMPG', 25)).toBe(25);
  });

  it('notifies the UI when storage fills up or remember changes', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
    const { store } = setup({ session: () => full });
    let notices = 0;
    store.subscribe(() => notices++);
    store.write('ev', 'iceMPG', 17.5);
    expect(notices).toBe(1);
    expect(store.getStatus().unavailable).toBe(true);
    store.setRemember(true);
    expect(notices).toBeGreaterThan(1);
  });
});

describe('legacy proposal migration', () => {
  it('imports a valid proposal once for Pro without deleting the legacy copy', () => {
    const { store, local, reload } = setup({ migrateProposal: true });
    const proposal = { ...EMPTY_PROPOSAL, clientName: 'Existing client' };
    local.setItem('solartoolkit-proposal', JSON.stringify(proposal));
    expect(store.read('app', 'proposalData', EMPTY_PROPOSAL, isProposal)).toEqual(proposal);
    expect(local.getItem('solartoolkit-proposal')).toBe(JSON.stringify(proposal));
    store.reset('app');
    expect(reload().read('app', 'proposalData', EMPTY_PROPOSAL, isProposal)).toEqual(EMPTY_PROPOSAL);
  });

  it('does not overwrite a newer Pro proposal or import legacy data into free', () => {
    const { store, local, reload } = setup({ migrateProposal: true });
    store.write('app', 'proposalData', { ...EMPTY_PROPOSAL, clientName: 'New client' });
    local.setItem('solartoolkit-proposal', JSON.stringify({ ...EMPTY_PROPOSAL, clientName: 'Old client' }));
    expect(reload().read('app', 'proposalData', EMPTY_PROPOSAL, isProposal).clientName).toBe('New client');
    const free = createInputStore({ namespace: 'free', session: memoryStorage, local: () => local });
    expect(free.read('app', 'proposalData', EMPTY_PROPOSAL, isProposal)).toEqual(EMPTY_PROPOSAL);
  });

  it.each(['{bad', JSON.stringify({ ...EMPTY_PROPOSAL, audit: {} }), JSON.stringify({ ...EMPTY_PROPOSAL, bill: { totalBill: '12', solarSaves: 5, remaining: 7 } })])('rejects a malformed legacy proposal: %s', raw => {
    const { store, local } = setup({ migrateProposal: true });
    local.setItem('solartoolkit-proposal', raw);
    expect(store.read('app', 'proposalData', EMPTY_PROPOSAL, isProposal)).toEqual(EMPTY_PROPOSAL);
  });
});
