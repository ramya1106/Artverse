import React, { createContext, useContext, useState, useCallback } from 'react';
import { loginAdmin, setAdminToken, clearAdminToken } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const logout = useCallback(() => {
    clearAdminToken();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
