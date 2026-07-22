import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check the session cookie once on app load.
  useEffect(() => {
    let active = true;
    api
      .me()
      .then((u) => active && setUser(u))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // If any request reports the session is gone, drop the user everywhere.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('bound:unauthorized', onUnauthorized);
    return () => window.removeEventListener('bound:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const u = await api.register(data);
    setUser(u);
    return u;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const u = await api.loginWithGoogle(credential);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = { user, loading, login, register, loginWithGoogle, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
