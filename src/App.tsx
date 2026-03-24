import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { C } from './config/colors';
import { BrandingProvider } from './context/BrandingContext';
import { ModeProvider } from './context/ModeContext';
import { ToastProvider } from './context/ToastContext';
import { TourProvider } from './context/TourContext';
import { usePipeline } from './hooks/usePipeline';
import { Header } from './components/layout/Header';
import { ModeToggle } from './components/layout/ModeToggle';
import { PhaseNav } from './components/layout/PhaseNav';
import { OriginsPage } from './pages/OriginsPage';
import { PipelinePage } from './pages/PipelinePage';
import { ReportsPage } from './pages/ReportsPage';
import { CopilotButton } from './components/copilot/CopilotButton';
import { CopilotPanel } from './components/copilot/CopilotPanel';
import { ToastNotification } from './components/shared/ToastNotification';
import { TourOverlay } from './components/tour/TourOverlay';
import { CommandPalette } from './components/shared/CommandPalette';

function AppShell() {
  const pipeline = usePipeline();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  // Cmd+K / Ctrl+K keyboard shortcut for command palette
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCmdPaletteOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
      }}
    >
      <Header />

      <div
        className="mx-auto px-6 py-4"
        style={{ maxWidth: 1200 }}
      >
        <ModeToggle />
        <PhaseNav />

        <div style={{ marginTop: 16 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/origins" replace />} />
            <Route path="/origins" element={<OriginsPage pipeline={pipeline} />} />
            <Route path="/pipeline/:stageId?" element={<PipelinePage pipeline={pipeline} />} />
            <Route path="/reports/:tabId?" element={<ReportsPage />} />
          </Routes>
        </div>

        <footer
          className="flex items-center justify-between mt-12 py-4"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <span style={{ fontSize: 11, color: C.dim }}>
            Storm Reply x AWS — AI Software Factory Demo
          </span>
          <span style={{ fontSize: 11, color: C.dim }}>
            Powered by Amazon Bedrock {'\u00B7'} Storm Reply {'\u00D7'} AWS
          </span>
        </footer>
      </div>

      <CopilotButton onClick={() => setCopilotOpen(true)} />
      <CopilotPanel isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <ToastNotification />
      <TourOverlay />
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onOpenCopilot={() => setCopilotOpen(true)}
      />
    </div>
  );
}

function App() {
  return (
    <BrandingProvider>
      <ModeProvider>
        <ToastProvider>
          <TourProvider>
            <AppShell />
          </TourProvider>
        </ToastProvider>
      </ModeProvider>
    </BrandingProvider>
  );
}

export default App;
