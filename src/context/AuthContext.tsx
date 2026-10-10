'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Restaurant } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setRestaurant: (rest: Restaurant | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('restoqr_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        setUser(data.user);
        setRestaurant(data.restaurant);
      } catch (err) {
        console.warn('Session verification failed:', err);
        localStorage.removeItem('restoqr_token');
        setUser(null);
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('restoqr_token', res.token);
    setUser(res.user);
    setRestaurant(res.restaurant);
    return res.redirectUrl;
  };

  const logout = () => {
    localStorage.removeItem('restoqr_token');
    setUser(null);
    setRestaurant(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setRestaurant(data.restaurant);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, restaurant, loading, login, logout, refreshUser, setRestaurant }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
