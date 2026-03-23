import React, { createContext, useState, useCallback } from 'react';
import { type BrandId, type BrandProfile, getBrandProfile } from '../config/branding';

interface BrandingContextValue {
  brandId: BrandId;
  setBrandId: (id: BrandId) => void;
  t: (key: keyof BrandProfile) => string;
}

export const BrandingContext = createContext<BrandingContextValue>({
  brandId: 'bosch-bmw',
  setBrandId: () => {},
  t: () => '',
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [brandId, setBrandIdState] = useState<BrandId>(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get('brand');
    if (b === 'bosch-bmw' || b === 'generic') return b;
    return 'bosch-bmw';
  });

  const setBrandId = useCallback((id: BrandId) => {
    setBrandIdState(id);
    const url = new URL(window.location.href);
    url.searchParams.set('brand', id);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const t = useCallback(
    (key: keyof BrandProfile): string => {
      const profile = getBrandProfile(brandId);
      const val = profile[key];
      if (typeof val === 'string') return val;
      return JSON.stringify(val);
    },
    [brandId],
  );

  return (
    <BrandingContext.Provider value={{ brandId, setBrandId, t }}>
      {children}
    </BrandingContext.Provider>
  );
}
