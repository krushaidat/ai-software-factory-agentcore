import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';
import { ENV } from '../config/env';

interface User {
  username: string;
  displayName: string;
  token: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  needsNewPassword: boolean;
  completeNewPassword: (newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  loading: false,
  error: null,
  needsNewPassword: false,
  completeNewPassword: async () => {},
});

const userPool = ENV.cognitoUserPoolId
  ? new CognitoUserPool({
      UserPoolId: ENV.cognitoUserPoolId,
      ClientId: ENV.cognitoClientId,
    })
  : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true initially to check session
  const [error, setError] = useState<string | null>(null);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    if (!userPool) {
      setLoading(false);
      return;
    }
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err: Error | null, session: any) => {
        if (err || !session?.isValid()) {
          setLoading(false);
          return;
        }
        const idToken = session.getIdToken();
        const payload = idToken.decodePayload();
        setUser({
          username: payload.email || payload['cognito:username'] || 'User',
          displayName: payload.name || payload.email || 'User',
          token: idToken.getJwtToken(),
        });
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    if (!userPool) {
      setError('Authentication not configured');
      throw new Error('Authentication not configured');
    }

    setLoading(true);
    setError(null);

    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    const cogUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    return new Promise<void>((resolve, reject) => {
      cogUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          const idToken = session.getIdToken();
          const payload = idToken.decodePayload();
          setUser({
            username: payload.email || payload['cognito:username'] || username,
            displayName: payload.name || payload.email || username,
            token: idToken.getJwtToken(),
          });
          setLoading(false);
          setNeedsNewPassword(false);
          resolve();
        },
        onFailure: (err) => {
          setLoading(false);
          const msg = err.message || 'Login failed';
          setError(msg);
          reject(new Error(msg));
        },
        newPasswordRequired: () => {
          // Cognito forces a password change on first login with temp password
          setCognitoUser(cogUser);
          setNeedsNewPassword(true);
          setLoading(false);
          resolve(); // Don't reject — the UI will show the new password form
        },
      });
    });
  }, []);

  const completeNewPassword = useCallback(async (newPassword: string) => {
    if (!cognitoUser) {
      setError('No pending password change');
      throw new Error('No pending password change');
    }

    setLoading(true);
    setError(null);

    return new Promise<void>((resolve, reject) => {
      cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
        onSuccess: (session) => {
          const idToken = session.getIdToken();
          const payload = idToken.decodePayload();
          setUser({
            username: payload.email || payload['cognito:username'] || '',
            displayName: payload.name || payload.email || '',
            token: idToken.getJwtToken(),
          });
          setLoading(false);
          setNeedsNewPassword(false);
          setCognitoUser(null);
          resolve();
        },
        onFailure: (err) => {
          setLoading(false);
          const msg = err.message || 'Password change failed';
          setError(msg);
          reject(new Error(msg));
        },
      });
    });
  }, [cognitoUser]);

  const logout = useCallback(() => {
    if (userPool) {
      const currentUser = userPool.getCurrentUser();
      if (currentUser) {
        currentUser.signOut();
      }
    }
    setUser(null);
    setError(null);
    setNeedsNewPassword(false);
    setCognitoUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        error,
        needsNewPassword,
        completeNewPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
