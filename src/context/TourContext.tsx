import { createContext, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOUR_STEPS } from '../components/tour/tourSteps';

export interface TourContextValue {
  currentStep: number | null;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  isActive: boolean;
}

export const TourContext = createContext<TourContextValue>({
  currentStep: null,
  totalSteps: TOUR_STEPS.length,
  startTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  endTour: () => {},
  isActive: false,
});

export function TourProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const navigate = useNavigate();

  const navigateToStep = useCallback(
    (stepIndex: number) => {
      const step = TOUR_STEPS[stepIndex];
      if (!step || !step.navigateTo) return;
      // navigateTo can be a full path or just a search-string like "?view=overview".
      // For search-only, preserve the current pathname.
      const target = step.navigateTo.startsWith('?')
        ? `/${window.location.pathname.replace(/^\//, '')}${step.navigateTo}`.replace(/\/?\?/, '/?')
        : step.navigateTo;
      navigate(target);
    },
    [navigate],
  );

  const startTour = useCallback(() => {
    // Apply step 0's navigateTo (if any) and open the overlay.
    const first = TOUR_STEPS[0];
    if (first?.navigateTo) {
      const target = first.navigateTo.startsWith('?')
        ? `/${first.navigateTo}`
        : first.navigateTo;
      navigate(target);
    }
    setTimeout(() => setCurrentStep(0), 150);
  }, [navigate]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      if (next >= TOUR_STEPS.length) {
        return null; // tour complete
      }
      navigateToStep(next);
      return next;
    });
  }, [navigateToStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev === null || prev === 0) return prev;
      const next = prev - 1;
      navigateToStep(next);
      return next;
    });
  }, [navigateToStep]);

  const endTour = useCallback(() => {
    setCurrentStep(null);
  }, []);

  return (
    <TourContext.Provider
      value={{
        currentStep,
        totalSteps: TOUR_STEPS.length,
        startTour,
        nextStep,
        prevStep,
        endTour,
        isActive: currentStep !== null,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
