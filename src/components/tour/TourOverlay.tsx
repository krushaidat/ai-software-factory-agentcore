import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../../config/colors';
import { useTour } from '../../hooks/useTour';
import { TOUR_STEPS } from './tourSteps';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 12;

function getTargetRect(selector: string): Rect | null {
  if (selector === 'body') return null; // center-screen step
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function getCardPosition(
  rect: Rect | null,
  cardW: number,
  cardH: number,
): { top: number; left: number } {
  if (!rect) {
    // center screen
    return {
      top: window.innerHeight / 2 - cardH / 2,
      left: window.innerWidth / 2 - cardW / 2,
    };
  }

  const gap = 16;
  let top = rect.top + rect.height + gap;
  let left = rect.left + rect.width / 2 - cardW / 2;

  // If card goes below viewport, position above
  if (top + cardH > window.innerHeight - 20) {
    top = rect.top - cardH - gap;
  }

  // If card goes above viewport, position below anyway
  if (top < 20) {
    top = rect.top + rect.height + gap;
  }

  // Clamp horizontal
  if (left < 20) left = 20;
  if (left + cardW > window.innerWidth - 20) {
    left = window.innerWidth - cardW - 20;
  }

  return { top, left };
}

export function TourOverlay() {
  const { currentStep, totalSteps, nextStep, prevStep, endTour, isActive } =
    useTour();
  const [rect, setRect] = useState<Rect | null>(null);

  const CARD_W = 380;
  const CARD_H = 220;

  const updateRect = useCallback(() => {
    if (currentStep === null) return;
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    const r = getTargetRect(step.target);
    setRect(r);

    // Scroll target into view
    if (step.target !== 'body') {
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isActive) return;
    // Delay rect calculation to allow navigation to settle
    const timer = setTimeout(updateRect, 200);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, currentStep, updateRect]);

  // Escape key to close
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, endTour, nextStep, prevStep]);

  if (!isActive || currentStep === null) return null;

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  const cardPos = getCardPosition(rect, CARD_W, CARD_H);

  // Build clip-path for spotlight hole
  const clipPath = rect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${rect.left}px ${rect.top}px,
        ${rect.left}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top}px,
        ${rect.left}px ${rect.top}px
      )`
    : undefined;

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'auto',
        }}
        onClick={(e) => {
          // Click on overlay background to advance
          if (e.target === e.currentTarget) nextStep();
        }}
      >
        {/* Semi-transparent overlay with spotlight cutout */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            clipPath: clipPath,
            transition: 'clip-path 0.4s ease-in-out',
          }}
        />

        {/* Spotlight border glow */}
        {rect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              position: 'absolute',
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: 12,
              border: `2px solid ${C.accent}`,
              boxShadow: `0 0 20px ${C.accentDim}, 0 0 40px rgba(14,165,160,0.1)`,
              pointerEvents: 'none',
              transition: 'top 0.4s, left 0.4s, width 0.4s, height 0.4s',
            }}
          />
        )}

        {/* Tour card */}
        <motion.div
          key={`card-${currentStep}`}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: cardPos.top,
            left: cardPos.left,
            width: CARD_W,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 24,
            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`,
            zIndex: 9999,
            transition: 'top 0.4s ease, left 0.4s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Step counter */}
          <div
            style={{
              fontSize: 11,
              color: C.accent,
              fontWeight: 600,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Step {currentStep + 1} of {totalSteps}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.text,
              marginBottom: 10,
              lineHeight: 1.3,
            }}
          >
            {step.title}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 13,
              color: C.muted,
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            {step.description}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 7,
                    border: `1px solid ${C.border}`,
                    background: 'transparent',
                    color: C.muted,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                style={{
                  padding: '6px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 7,
                  border: `1px solid ${C.accentBorder}`,
                  background: C.accentDim,
                  color: C.accent,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {currentStep < totalSteps - 1 ? 'Next' : 'Finish'}
              </button>
            </div>

            <button
              onClick={endTour}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                border: 'none',
                background: 'transparent',
                color: C.dim,
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.color = C.muted;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.color = C.dim;
              }}
            >
              Skip tour
            </button>
          </div>

          {/* Progress dots */}
          <div
            className="flex items-center justify-center gap-1"
            style={{ marginTop: 16 }}
          >
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStep ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === currentStep
                      ? C.accent
                      : i < currentStep
                        ? C.accentBorder
                        : C.border,
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
