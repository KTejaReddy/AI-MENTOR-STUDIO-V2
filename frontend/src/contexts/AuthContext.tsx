import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, fetchProfile } from '@/lib/api/client';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  is_email_verified?: boolean;
  created_at?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, userData: User, rememberMe?: boolean) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('profile') || sessionStorage.getItem('profile') || localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getAnyAccessToken(): string | null {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

function getAnyRefreshToken(): string | null {
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

function clearAllStorage() {
  const userDataKeys = [
    'access_token', 'refresh_token', 'user', 'profile', 'remember_me',
    'mentor-notes',
    'mentor-recent-topics', 'recent-topics',
    'mentor-ai-layout', 'mentor-ai-workspace',
    'mentor-tabs', 'mentor-active-tab', 'mentor-pinned-lessons',
  ];
  for (const key of userDataKeys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('tab-memory-')) localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event('auth:cache-flush'));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // On mount: verify token with backend — ONE attempt only.
  // The Axios 401 interceptor handles token refresh transparently.
  // If /auth/me fails even after the interceptor attempts refresh,
  // we are unauthenticated — no retries, no delays.
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const hash = window.location.hash.substring(1);
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const userRaw = params.get('user');
        
        if (accessToken && refreshToken && userRaw) {
          try {
            const userData = JSON.parse(decodeURIComponent(userRaw));
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);
            localStorage.setItem('profile', JSON.stringify(userData));
            localStorage.setItem('remember_me', 'true');
            // Clear hash from url without triggering navigation
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            
            const ADMIN_EMAILS = ['arkoreai0@gmail.com'];
            if (ADMIN_EMAILS.includes(userData.email)) {
              navigate('/ops-dashboard', { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          } catch (e) {
            console.error('[Auth] Failed to parse oauth data from hash');
          }
        }
      }

      const token = getAnyAccessToken();

      if (!token) {
        // if (import.meta.env.DEV) console.debug('[Auth] No token — unauthenticated');
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // if (import.meta.env.DEV) console.debug('[Auth] Access token present — verifying with /auth/me');

      try {
        const profile = await fetchProfile();
        if (!cancelled) {
          // if (import.meta.env.DEV) console.debug('[Auth] /auth/me succeeded — user authenticated');
          setUser(profile);
        }
      } catch {
        // if (import.meta.env.DEV) console.debug('[Auth] /auth/me failed — clearing authentication');
        if (!cancelled) {
          clearAllStorage();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    verify();
    return () => { cancelled = true; };
  }, []);

  // Listen for auth:expired (fired by API interceptor when a refresh
  // fails on a subsequent request during the session).
  useEffect(() => {
    const handleExpired = () => {
      // if (import.meta.env.DEV) console.debug('[Auth] auth:expired event — clearing session');
      clearAllStorage();
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = useCallback((token: string, refreshToken: string, userData: User, rememberMe?: boolean) => {
    clearAllStorage();
    const persist = rememberMe ?? true;
    const storage = persist ? localStorage : sessionStorage;
    localStorage.setItem('remember_me', String(persist));
    storage.setItem('access_token', token);
    storage.setItem('refresh_token', refreshToken);
    storage.setItem('profile', JSON.stringify(userData));
    setUser(userData);
    setIsLoading(false);

    const ADMIN_EMAILS = ['arkoreai0@gmail.com'];
    if (ADMIN_EMAILS.includes(userData.email)) {
      navigate('/ops-dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = getAnyRefreshToken();
      if (refreshToken) {
        await apiClient.post('/api/v1/auth/logout', {
          refresh_token: refreshToken,
        });
      }
    } catch {
      // Even if server call fails, clear local state
    }
    clearAllStorage();
    setUser(null);
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await apiClient.post('/api/v1/auth/logout-all', {
        refresh_token: getAnyRefreshToken(),
      });
    } catch {
      // Even if server call fails, clear local state
    }
    clearAllStorage();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      setUser(profile);
      localStorage.setItem('profile', JSON.stringify(profile));
    } catch {
      // Ignore — user may not be authenticated
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        logoutAll,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
