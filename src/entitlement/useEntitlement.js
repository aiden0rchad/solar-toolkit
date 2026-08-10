import { createContext, useContext } from 'react';

export const EntitlementContext = createContext(null);

export const useEntitlement = () => {
  const entitlement = useContext(EntitlementContext);
  if (!entitlement) throw new Error('useEntitlement must be used within EntitlementProvider');
  return entitlement;
};
