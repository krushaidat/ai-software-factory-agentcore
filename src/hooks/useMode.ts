import { useContext } from 'react';
import { ModeContext } from '../context/ModeContext';

export function useMode() {
  return useContext(ModeContext);
}
