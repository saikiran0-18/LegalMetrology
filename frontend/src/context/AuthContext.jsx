import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('packsure_user');
    return saved ? JSON.parse(saved) : null;
  });
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

  // Fetch fresh user profile if token exists on mount
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
          localStorage.setItem('packsure_user', JSON.stringify(res.data.user));
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

  const register = async (email, password, name) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { email, password, name });
      if (res.data?.token && res.data?.user) {
        saveAuthSession(res.data.token, res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, error: 'Registration response invalid' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Registration failed';
      return { success: false, error: errorMsg };
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      if (res.data?.token && res.data?.user) {
        saveAuthSession(res.data.token, res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, error: 'Login response invalid' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Login failed';
      return { success: false, error: errorMsg };
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, { credential });
      if (res.data?.token && res.data?.user) {
        saveAuthSession(res.data.token, res.data.user);
        return { success: true, user: res.data.user };
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
        return { success: true, user: res.data.user };
      }
      return { success: false, error: 'Demo authentication failed' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Demo login failed';
      return { success: false, error: errorMsg };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await axios.put(`${API_URL}/api/auth/profile`, profileData);
      if (res.data?.user) {
        saveAuthSession(res.data.token || token, res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, error: 'Profile update failed' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save profile';
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
        isProfileComplete: Boolean(user?.profileCompleted),
        register,
        login,
        loginWithGoogle,
        loginWithDemo,
        updateProfile,
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
