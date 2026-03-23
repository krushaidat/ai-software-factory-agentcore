import { useContext } from 'react';
import { BrandingContext } from '../context/BrandingContext';

export function useBranding() {
  return useContext(BrandingContext);
}
