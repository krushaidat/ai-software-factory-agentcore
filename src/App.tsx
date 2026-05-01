import { C } from './config/colors';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { BrandingProvider } from './context/BrandingContext';
import { ModeProvider } from './context/ModeContext';
import { ToastProvider } from './context/ToastContext';
import { TourProvider } from './context/TourContext';
import { PipelineProvider } from './context/PipelineContext';
import { LoginPage } from './pages/LoginPage';
import { WorkspaceShell } from './workspace/WorkspaceShell';

function AuthenticatedApp() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: C.dim, fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <BrandingProvider>
      <ModeProvider>
        <PipelineProvider>
          <ToastProvider>
            <TourProvider>
              <WorkspaceShell />
            </TourProvider>
          </ToastProvider>
        </PipelineProvider>
      </ModeProvider>
    </BrandingProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
