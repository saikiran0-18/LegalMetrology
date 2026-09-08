import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('packsure_token'));
  const [loading, setLoading] = useState(true);

  // Set up global Axios interceptor to attach JWT token to all requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const storedToken = localStorage.getItem('packsure_token');
        if (storedToken) {
          config.headers.Authorization = `Bearer ${storedToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle 401 Unauthorized (session expired)
    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // If 401 from protected endpoint, clear stale credentials
          if (!error.config.url.includes('/api/auth/')) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // Fetch current user if token exists on mount
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.user) {
          setUser(res.data.user);
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const saveAuthSession = (sessionToken, sessionUser) => {
    localStorage.setItem('packsure_token', sessionToken);
    localStorage.setItem('packsure_user', JSON.stringify(sessionUser));
    setToken(sessionToken);
    setUser(sessionUser);
  };

  const loginWithGoogle = async (credential) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, { credential });
      if (res.data?.token && res.data?.user) {
        saveAuthSession(res.data.token, res.data.user);
        return { success: true };
      }
      return { success: false, error: 'Incomplete authentication response' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Google authentication failed';
      return { success: false, error: errorMsg };
    }
  };

  const loginWithDemo = async (role = 'Inspector') => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/demo`, { role });
      if (res.data?.token && res.data?.user) {
        saveAuthSession(res.data.token, res.data.user);
        return { success: true };
      }
      return { success: false, error: 'Demo authentication failed' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Demo login failed';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('packsure_token');
    localStorage.removeItem('packsure_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        loginWithGoogle,
        loginWithDemo,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
