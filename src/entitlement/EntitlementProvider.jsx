import { EntitlementContext } from './useEntitlement';

export const EntitlementProvider = ({ children }) => (
  // The Pro build overrides this provider; do not add license logic here.
  <EntitlementContext.Provider value={{ isPro: false, plan: 'free' }}>
    {children}
  </EntitlementContext.Provider>
);
