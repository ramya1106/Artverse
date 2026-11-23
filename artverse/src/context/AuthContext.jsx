import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  loginAdmin,
  setAdminToken,
  clearAdminToken,
  getAdminToken,
  checkAdminSession,
  setUnauthorizedHandler,
} from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(!!getAdminToken()); // validating a saved session
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    clearAdminToken();
    setIsAuthenticated(false);
  }, []);

  // Restore session after a page refresh (token must still be valid server-side)
  useEffect(() => {
    if (!getAdminToken()) return;
    checkAdminSession()
      .then(() => setIsAuthenticated(true))
      .catch(() => clearAdminToken())
      .finally(() => setChecking(false));
  }, []);

  // Any admin API call that gets a 401 logs the admin out
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(() => {});
  }, [logout]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const { token } = await loginAdmin(username, password);
      setAdminToken(token);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, checking, login, logout, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
