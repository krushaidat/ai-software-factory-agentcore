import { createContext, useState, useCallback, type ReactNode } from 'react';

interface User {
  username: string;
  displayName: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  loading: false,
  error: null,
});

const STORAGE_KEY = 'ai-sw-factory-auth';

// Single hardcoded credential
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'StormReply2025!';
const DISPLAY_NAME = 'Storm Reply';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    // Simulate a tiny delay so the UI feels real
    await new Promise((r) => setTimeout(r, 400));

    if (username.toLowerCase() === VALID_USERNAME && password === VALID_PASSWORD) {
      const userData: User = {
        username: VALID_USERNAME,
        displayName: DISPLAY_NAME,
      };
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setLoading(false);
    } else {
      setLoading(false);
      setError('Invalid username or password');
      throw new Error('Invalid credentials');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
